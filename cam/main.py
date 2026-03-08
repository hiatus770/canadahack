import asyncio
import logging
import threading
import time

from fastapi import FastAPI, Response, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import config
from capture import camera
from detection import engine
from recorder import recorder
from alerter import alerter
from uploader import uploader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cam")

app = FastAPI(title=f"TailCam - {config.CAM_NAME}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Detection loop ──────────────────────────────────────────────────────────

def _detection_loop():
    """Background thread: runs detection on each frame and triggers alerts/recording."""
    while True:
        frame = camera.get_frame()
        if frame is not None:
            result = engine.process(frame)
            event = result.get("event")
            if event:
                # Send alert
                alerter.send_alert(event, {
                    "persons": result["persons"],
                    "motion_area": result["motion_area"],
                })
                # Record clip, then upload
                _record_and_upload(event)
        time.sleep(0.15)


def _record_and_upload(event_type: str):
    """Record a clip and queue it for upload to TailCloud."""
    def _do():
        meta = recorder.record_clip(camera.get_frame, event_type=event_type)
        if meta:
            uploader.enqueue(meta)
    threading.Thread(target=_do, daemon=True).start()


# ─── Lifecycle ────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    camera.start()
    logger.info(f"Camera started: {camera.resolution}")
    alerter.start()
    alerter.register(resolution=camera.resolution)
    uploader.start()
    uploader.sync_existing(recorder.list_clips())
    threading.Thread(target=_detection_loop, daemon=True).start()
    logger.info(f"TailCam '{config.CAM_NAME}' running on port {config.PORT}")


@app.on_event("shutdown")
def shutdown():
    camera.stop()
    alerter.stop()
    uploader.stop()


# ─── MJPEG Stream ────────────────────────────────────────────────────────────

def _mjpeg_generator(target_fps: int, quality: int):
    frame_interval = 1.0 / max(1, target_fps)
    while True:
        jpeg = camera.get_jpeg(quality=quality)
        if jpeg:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
            )
        time.sleep(frame_interval)


@app.get("/stream")
def stream(
    fps: int = Query(default=config.FPS, ge=1, le=30),
    quality: int = Query(default=65, ge=30, le=95),
):
    """MJPEG live stream."""
    return StreamingResponse(
        _mjpeg_generator(target_fps=fps, quality=quality),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ─── Snapshot ─────────────────────────────────────────────────────────────────

@app.get("/snapshot")
def snapshot():
    """Single JPEG frame."""
    jpeg = camera.get_jpeg(quality=80)
    if jpeg is None:
        return Response(status_code=503, content="Camera not ready")
    return Response(content=jpeg, media_type="image/jpeg")


# ─── Status ───────────────────────────────────────────────────────────────────

@app.get("/status")
def status():
    """Camera status JSON."""
    counts = engine.get_counts()
    try:
        import psutil
        battery = psutil.sensors_battery()
        battery_pct = int(battery.percent) if battery else 100
        cpu_pct = int(psutil.cpu_percent(interval=0.1))
    except Exception:
        battery_pct = 100
        cpu_pct = 0

    try:
        wifi_signal = 0
        with open("/proc/net/wireless") as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 4 and parts[0].endswith(':'):
                    # link quality is parts[2], strip trailing dot
                    quality = float(parts[2].rstrip('.'))
                    # quality is typically out of 70; normalize to 0-100
                    wifi_signal = min(100, int(quality / 70 * 100))
                    break
    except Exception:
        wifi_signal = 80

    return {
        "id": config.CAM_ID,
        "name": config.CAM_NAME,
        "location": config.CAM_LOCATION,
        "resolution": camera.resolution,
        "status": "live" if camera.is_running else "offline",
        "recording": recorder.is_recording or recorder.manual_recording,
        "battery": battery_pct,
        "wifi": wifi_signal,
        "motion": counts["motion_count"],
        "persons": counts["person_count"],
        "cpu": cpu_pct,
        "fps": camera.actual_fps,
        "port": config.PORT,
        "cloud_uploads": uploader.uploaded_count,
        "cloud_pending": uploader.pending_count,
    }


# ─── Clips ────────────────────────────────────────────────────────────────────

@app.get("/clips")
def list_clips():
    """List recorded clips."""
    return recorder.list_clips()


@app.get("/clips/{clip_id}")
def get_clip(clip_id: str):
    """Download a recorded clip."""
    path = recorder.get_clip_path(clip_id)
    if path is None:
        return Response(status_code=404, content="Clip not found")
    return FileResponse(path, media_type="video/mp4", filename=path.name)


@app.get("/clips/{clip_id}/thumb")
def get_clip_thumb(clip_id: str):
    """Return a JPEG thumbnail (first frame) of a recorded clip."""
    import cv2 as _cv2
    path = recorder.get_clip_path(clip_id)
    if path is None:
        return Response(status_code=404, content="Clip not found")
    cap = _cv2.VideoCapture(str(path))
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return Response(status_code=500, content="Could not read frame")
    _, buf = _cv2.imencode('.jpg', frame, [_cv2.IMWRITE_JPEG_QUALITY, 70])
    return Response(content=buf.tobytes(), media_type="image/jpeg")


# ─── Commands ─────────────────────────────────────────────────────────────────

@app.post("/command")
def command(body: dict):
    """Receive commands from TailTV backend."""
    cmd = body.get("command")
    if cmd == "start_recording":
        recorder.manual_recording = True
        _record_and_upload("manual")
        return {"status": "recording_started"}
    elif cmd == "stop_recording":
        recorder.manual_recording = False
        return {"status": "recording_stopped"}
    elif cmd == "snapshot":
        return {"status": "use GET /snapshot"}
    else:
        return JSONResponse(status_code=400, content={"error": f"Unknown command: {cmd}"})


# ─── Settings ─────────────────────────────────────────────────────────────────

SETTINGS_FILE = config.CLIPS_DIR.parent / "cam_settings.json"

def _load_settings() -> dict:
    """Load persisted settings from disk."""
    import json
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text())
        except Exception:
            pass
    return {}

def _save_settings(data: dict):
    """Persist settings to disk."""
    import json
    SETTINGS_FILE.write_text(json.dumps(data, indent=2))

def _apply_settings(data: dict):
    """Apply settings to the running config."""
    if "tailtv_backend_url" in data:
        config.TAILTV_BACKEND_URL = data["tailtv_backend_url"]
    if "tailcloud_url" in data:
        config.TAILCLOUD_URL = data["tailcloud_url"]
    if "tailcloud_upload_share" in data:
        config.TAILCLOUD_UPLOAD_SHARE = data["tailcloud_upload_share"]
    if "cam_name" in data:
        config.CAM_NAME = data["cam_name"]
    if "cam_location" in data:
        config.CAM_LOCATION = data["cam_location"]
    if "clip_duration" in data:
        config.CLIP_DURATION = int(data["clip_duration"])
    if "motion_sensitivity" in data:
        config.MOTION_SENSITIVITY = float(data["motion_sensitivity"])
    if "person_confidence" in data:
        config.PERSON_CONFIDENCE = float(data["person_confidence"])

# Apply any saved settings on import
_apply_settings(_load_settings())


@app.get("/settings")
def get_settings():
    """Return current camera settings."""
    return {
        "cam_id": config.CAM_ID,
        "cam_name": config.CAM_NAME,
        "cam_location": config.CAM_LOCATION,
        "tailtv_backend_url": config.TAILTV_BACKEND_URL,
        "tailcloud_url": config.TAILCLOUD_URL,
        "tailcloud_upload_share": config.TAILCLOUD_UPLOAD_SHARE,
        "tailcloud_upload_path": uploader.upload_path,
        "clip_duration": config.CLIP_DURATION,
        "motion_sensitivity": config.MOTION_SENSITIVITY,
        "person_confidence": config.PERSON_CONFIDENCE,
        "fps": config.FPS,
        "resolution": f"{config.FRAME_WIDTH}x{config.FRAME_HEIGHT}",
    }


@app.post("/settings")
def update_settings(body: dict):
    """Update camera settings and persist them."""
    allowed = {
        "cam_name", "cam_location",
        "tailtv_backend_url", "tailcloud_url", "tailcloud_upload_share",
        "clip_duration", "motion_sensitivity", "person_confidence",
    }
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return JSONResponse(status_code=400, content={"error": "No valid settings provided"})

    # Merge with existing
    current = _load_settings()
    current.update(updates)
    _save_settings(current)
    _apply_settings(current)

    return {"status": "ok", "applied": list(updates.keys())}


# ─── Phone webcam page ───────────────────────────────────────────────────────

@app.get("/webcam", response_class=HTMLResponse)
def webcam_page():
    """Serve the browser-based webcam page for phones."""
    html_path = config.CLIPS_DIR.parent / "webcam.html"
    if html_path.exists():
        return HTMLResponse(html_path.read_text())
    return HTMLResponse("<h1>webcam.html not found</h1>", status_code=404)


# ─── Phone WebSocket Feed ────────────────────────────────────────────────────

_phone_frame: bytes | None = None
_phone_lock = threading.Lock()


@app.websocket("/ws/phone-feed")
async def phone_feed(websocket: WebSocket):
    """Receive JPEG frames from a phone browser and use them as the camera feed."""
    global _phone_frame
    await websocket.accept()
    logger.info("Phone camera connected")
    try:
        while True:
            data = await websocket.receive_bytes()
            with _phone_lock:
                _phone_frame = data
    except WebSocketDisconnect:
        logger.info("Phone camera disconnected")


@app.get("/phone-stream")
def phone_stream():
    """MJPEG stream from the phone camera feed."""
    def gen():
        while True:
            with _phone_lock:
                frame = _phone_frame
            if frame:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
                )
            time.sleep(1.0 / config.FPS)
    return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=False)
