import os
import hashlib
import socket
from pathlib import Path

# Camera identity
_stable_id_seed = f"{socket.gethostname()}-{os.environ.get('CAMERA_INDEX', '0')}"
_stable_id = hashlib.sha1(_stable_id_seed.encode("utf-8")).hexdigest()[:8]
CAM_ID = os.environ.get("CAM_ID", _stable_id)
CAM_NAME = os.environ.get("CAM_NAME", f"Camera-{CAM_ID}")
CAM_LOCATION = os.environ.get("CAM_LOCATION", "Unassigned")

# TailTV backend URL (where to register + send alerts)
TAILTV_BACKEND_URL = os.environ.get("TAILTV_BACKEND_URL", "http://localhost:8000")

# Capture settings
CAMERA_INDEX = int(os.environ.get("CAMERA_INDEX", "0"))
FRAME_WIDTH = int(os.environ.get("FRAME_WIDTH", "960"))
FRAME_HEIGHT = int(os.environ.get("FRAME_HEIGHT", "540"))
FPS = int(os.environ.get("FPS", "10"))

# Detection settings
MOTION_SENSITIVITY = float(os.environ.get("MOTION_SENSITIVITY", "1500"))  # min contour area
PERSON_CONFIDENCE = float(os.environ.get("PERSON_CONFIDENCE", "0.45"))
DETECTION_INTERVAL = float(os.environ.get("DETECTION_INTERVAL", "0.8"))  # seconds between YOLO runs
PERSON_INPUT_SIZE = int(os.environ.get("PERSON_INPUT_SIZE", "640"))
MOTION_SCALE = float(os.environ.get("MOTION_SCALE", "0.5"))

# Recording settings
CLIP_DURATION = int(os.environ.get("CLIP_DURATION", "10"))  # seconds per clip
CLIPS_DIR = Path(os.environ.get("CLIPS_DIR", "./clips"))
CLIPS_DIR.mkdir(parents=True, exist_ok=True)
MAX_CLIPS = int(os.environ.get("MAX_CLIPS", "100"))

# Server settings
HOST = os.environ.get("CAM_HOST", "0.0.0.0")
PORT = int(os.environ.get("CAM_PORT", "8554"))

# Alert cooldown (seconds between alerts of same type)
ALERT_COOLDOWN = int(os.environ.get("ALERT_COOLDOWN", "30"))

# Heartbeat interval (seconds)
HEARTBEAT_INTERVAL = int(os.environ.get("HEARTBEAT_INTERVAL", "10"))
