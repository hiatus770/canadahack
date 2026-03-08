import asyncio
import json
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Response, Query, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import db
from models import CameraRegister, CameraHeartbeat, AlertIn, CommandIn, CameraManualAdd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tailtv")

# ─── WebSocket connections for real-time alerts ──────────────────────────────

ws_clients: set[WebSocket] = set()


async def broadcast_alert(alert: dict):
    """Push an alert to all connected frontend clients."""
    dead = set()
    for ws in ws_clients:
        try:
            await ws.send_json(alert)
        except Exception:
            dead.add(ws)
    ws_clients.difference_update(dead)


# ─── Camera status polling ───────────────────────────────────────────────────

async def poll_camera_status():
    """Periodically poll each registered camera's /status endpoint."""
    async with httpx.AsyncClient(timeout=5) as client:
        while True:
            cameras = await db.get_cameras()
            for cam in cameras:
                node = cam.get("node", "")
                port = cam.get("port", 8554)
                if not node:
                    continue
                try:
                    resp = await client.get(f"http://{node}:{port}/status")
                    if resp.status_code == 200:
                        status_data = resp.json()
                        await db.update_camera_status(cam["id"], status_data)
                except Exception:
                    pass  # Camera offline or unreachable
            await asyncio.sleep(10)


# ─── App lifecycle ───────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_db()
    logger.info("TailTV backend started")
    task = asyncio.create_task(poll_camera_status())
    yield
    task.cancel()


app = FastAPI(title="TailTV Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
#  CAMERA ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/cameras")
async def list_cameras():
    cameras = await db.get_cameras()
    return cameras


@app.get("/api/cameras/{cam_id}")
async def get_camera(cam_id: str):
    cam = await db.get_camera(cam_id)
    if cam is None:
        return JSONResponse(status_code=404, content={"error": "Camera not found"})
    return cam


@app.post("/api/cameras/register")
async def register_camera(body: CameraRegister, request: Request):
    """Called by cam instances on startup."""
    # Use the request's source IP as the camera's node address
    client_host = request.client.host if request.client else ""
    cam_data = body.model_dump()
    cam_data["node"] = client_host
    await db.remove_duplicate_node_port(client_host, body.port, body.id)
    await db.upsert_camera(cam_data)
    logger.info(f"Camera registered: {body.name} ({body.id}) from {client_host}")
    return {"status": "registered"}




@app.post("/api/cameras/add")
async def add_camera_manually(body: CameraManualAdd):
    """Manually add a camera by specifying its node IP and port."""
    import uuid
    cam_id = str(uuid.uuid4())[:8]
    cam_data = {
        "id": cam_id,
        "name": body.name,
        "location": body.location,
        "node": body.node,
        "port": body.port,
        "resolution": "1280x720",
    }
    await db.upsert_camera(cam_data)
    logger.info(f"Camera manually added: {body.name} at {body.node}:{body.port}")
    return {"status": "added", "id": cam_id}


@app.delete("/api/cameras/{cam_id}")
async def delete_camera(cam_id: str):
    cam = await db.get_camera(cam_id)
    if cam is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    await db.delete_camera(cam_id)
    return {"status": "deleted"}


@app.post("/api/cameras/heartbeat")
async def heartbeat(body: CameraHeartbeat):
    await db.update_heartbeat(body.id)
    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════════════════════
#  STREAM PROXY — proxies MJPEG from cam instances to frontend
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/cameras/{cam_id}/stream")
async def proxy_stream(
    cam_id: str,
    fps: int = Query(default=10, ge=1, le=30),
    quality: int = Query(default=65, ge=30, le=95),
):
    cam = await db.get_camera(cam_id)
    if cam is None:
        return JSONResponse(status_code=404, content={"error": "Camera not found"})

    node = cam.get("node", "")
    port = cam.get("port", 8554)
    if not node:
        return JSONResponse(status_code=502, content={"error": "No node address"})

    async def proxy_generator():
        async with httpx.AsyncClient(timeout=None) as client:
            try:
                params = {"fps": fps, "quality": quality}
                async with client.stream("GET", f"http://{node}:{port}/stream", params=params) as resp:
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        yield chunk
            except Exception as e:
                logger.warning(f"Stream proxy error for {cam_id}: {e}")

    return StreamingResponse(
        proxy_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/api/cameras/{cam_id}/snapshot")
async def proxy_snapshot(cam_id: str):
    cam = await db.get_camera(cam_id)
    if cam is None:
        return JSONResponse(status_code=404, content={"error": "Camera not found"})

    node = cam.get("node", "")
    port = cam.get("port", 8554)
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            resp = await client.get(f"http://{node}:{port}/snapshot")
            return Response(content=resp.content, media_type="image/jpeg")
        except Exception:
            return JSONResponse(status_code=502, content={"error": "Camera unreachable"})


# ═══════════════════════════════════════════════════════════════════════════════
#  CLIP PROXY — list and download clips from cam instances
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/cameras/{cam_id}/clips")
async def list_clips(cam_id: str):
    cam = await db.get_camera(cam_id)
    if cam is None:
        return JSONResponse(status_code=404, content={"error": "Camera not found"})

    node = cam.get("node", "")
    port = cam.get("port", 8554)
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            resp = await client.get(f"http://{node}:{port}/clips")
            return resp.json()
        except Exception:
            return JSONResponse(status_code=502, content={"error": "Camera unreachable"})


@app.get("/api/cameras/{cam_id}/clips/{clip_id}")
async def download_clip(cam_id: str, clip_id: str):
    cam = await db.get_camera(cam_id)
    if cam is None:
        return JSONResponse(status_code=404, content={"error": "Camera not found"})

    node = cam.get("node", "")
    port = cam.get("port", 8554)

    async def proxy_clip():
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                async with client.stream("GET", f"http://{node}:{port}/clips/{clip_id}") as resp:
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        yield chunk
            except Exception as e:
                logger.warning(f"Clip proxy error: {e}")

    return StreamingResponse(proxy_clip(), media_type="video/mp4")


@app.get("/api/cameras/{cam_id}/clips/{clip_id}/thumb")
async def clip_thumbnail(cam_id: str, clip_id: str):
    cam = await db.get_camera(cam_id)
    if cam is None:
        return JSONResponse(status_code=404, content={"error": "Camera not found"})

    node = cam.get("node", "")
    port = cam.get("port", 8554)
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(f"http://{node}:{port}/clips/{clip_id}/thumb")
            return Response(content=resp.content, media_type="image/jpeg")
        except Exception:
            return JSONResponse(status_code=502, content={"error": "Camera unreachable"})


# ═══════════════════════════════════════════════════════════════════════════════
#  ALERTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/alerts")
async def list_alerts(
    limit: int = Query(default=50, le=200),
    camera_id: str | None = Query(default=None),
):
    return await db.get_alerts(limit=limit, camera_id=camera_id)


@app.post("/api/alerts")
async def receive_alert(body: AlertIn):
    """Called by cam instances when they detect motion/person."""
    alert_data = body.model_dump()
    alert_id = await db.insert_alert(alert_data)
    alert_data["id"] = alert_id
    logger.info(f"Alert from {body.camera_name}: {body.type}")
    # Broadcast to frontend via WebSocket
    await broadcast_alert(alert_data)
    return {"status": "received", "id": alert_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  COMMANDS — send commands to cam instances
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/cameras/{cam_id}/command")
async def send_command(cam_id: str, body: CommandIn):
    cam = await db.get_camera(cam_id)
    if cam is None:
        return JSONResponse(status_code=404, content={"error": "Camera not found"})

    node = cam.get("node", "")
    port = cam.get("port", 8554)
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            resp = await client.post(
                f"http://{node}:{port}/command",
                json={"command": body.command},
            )
            return resp.json()
        except Exception:
            return JSONResponse(status_code=502, content={"error": "Camera unreachable"})


# ═══════════════════════════════════════════════════════════════════════════════
#  WEBSOCKET — real-time alert push to frontend
# ═══════════════════════════════════════════════════════════════════════════════

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_clients.add(websocket)
    logger.info(f"Frontend WebSocket connected ({len(ws_clients)} total)")
    try:
        while True:
            # Keep connection alive, receive pings/commands
            data = await websocket.receive_text()
            # Could handle commands from frontend here
    except WebSocketDisconnect:
        ws_clients.discard(websocket)
        logger.info(f"Frontend WebSocket disconnected ({len(ws_clients)} total)")


# ═══════════════════════════════════════════════════════════════════════════════
#  USER IDENTITY — uses tailscale whois like TailCloud does
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/whoami")
async def whoami(request: Request):
    """Identify the connecting user via Tailscale whois."""
    import subprocess, json as _json

    # Get client IP — prefer X-Forwarded-For (set by Vite proxy)
    client_ip = request.headers.get("x-forwarded-for", "")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else ""

    # Strip IPv6-mapped IPv4 prefix
    if client_ip.startswith("::ffff:"):
        client_ip = client_ip[7:]

    # Try tailscale whois on the client IP
    try:
        out = subprocess.check_output(
            ["tailscale", "whois", "--json", client_ip],
            timeout=5,
        )
        data = _json.loads(out)
        result = {"tailscaleIP": client_ip}
        node = data.get("Node", {})
        hostinfo = node.get("Hostinfo", {})
        if "Hostname" in hostinfo:
            result["hostname"] = hostinfo["Hostname"]
        profile = data.get("UserProfile", {})
        if "DisplayName" in profile:
            result["displayName"] = profile["DisplayName"]
        if "LoginName" in profile:
            result["loginName"] = profile["LoginName"]
        return result
    except Exception:
        pass

    # Fallback: use the local machine's tailscale identity
    try:
        out = subprocess.check_output(
            ["tailscale", "status", "--json"],
            timeout=5,
        )
        status = _json.loads(out)
        self_node = status.get("Self", {})
        hostname = self_node.get("HostName", "")
        user_id = self_node.get("UserID")
        display_name = ""
        login_name = ""
        if user_id is not None:
            users = status.get("User", {})
            user = users.get(str(int(user_id)), {})
            display_name = user.get("DisplayName", "")
            login_name = user.get("LoginName", "")
        return {
            "displayName": display_name,
            "loginName": login_name,
            "hostname": hostname,
            "tailscaleIP": client_ip,
        }
    except Exception as e:
        return {"displayName": "Unknown", "loginName": "", "hostname": "", "tailscaleIP": client_ip}


# ═══════════════════════════════════════════════════════════════════════════════
#  RUN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
