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
                # Record clip
                recorder.record_clip_async(camera.get_frame, event_type=event)
        time.sleep(0.15)


# ─── Lifecycle ────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    camera.start()
    logger.info(f"Camera started: {camera.resolution}")
    alerter.start()
    alerter.register(resolution=camera.resolution)
    threading.Thread(target=_detection_loop, daemon=True).start()
    logger.info(f"TailCam '{config.CAM_NAME}' running on port {config.PORT}")


@app.on_event("shutdown")
def shutdown():
    camera.stop()
    alerter.stop()


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
        wifi_signal = 80  # Approximate — psutil can't easily read RSSI
    except Exception:
        battery_pct = 100
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
        "port": config.PORT,
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


# ─── Commands ─────────────────────────────────────────────────────────────────

@app.post("/command")
def command(body: dict):
    """Receive commands from TailTV backend."""
    cmd = body.get("command")
    if cmd == "start_recording":
        recorder.manual_recording = True
        recorder.record_clip_async(camera.get_frame, event_type="manual")
        return {"status": "recording_started"}
    elif cmd == "stop_recording":
        recorder.manual_recording = False
        return {"status": "recording_stopped"}
    elif cmd == "snapshot":
        return {"status": "use GET /snapshot"}
    else:
        return JSONResponse(status_code=400, content={"error": f"Unknown command: {cmd}"})


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
