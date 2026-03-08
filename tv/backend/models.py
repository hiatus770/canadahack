from pydantic import BaseModel
from datetime import datetime


class CameraRegister(BaseModel):
    id: str
    name: str
    location: str
    resolution: str = "1280x720"
    port: int = 8554


class CameraHeartbeat(BaseModel):
    id: str
    timestamp: str


class AlertIn(BaseModel):
    camera_id: str
    camera_name: str
    location: str
    type: str  # "motion", "person", "pir_alarm", "door_open"
    timestamp: str
    details: dict = {}


class CameraOut(BaseModel):
    id: str
    name: str
    location: str
    node: str  # Tailscale IP or hostname
    resolution: str
    status: str  # "live" or "offline"
    port: int
    wifi: int
    battery: int
    motion: int
    last_seen: str
    recording: bool


class AlertOut(BaseModel):
    id: int
    camera_id: str
    camera_name: str
    location: str
    type: str
    timestamp: str
    details: dict


class CommandIn(BaseModel):
    command: str  # "start_recording", "stop_recording", "snapshot", "reboot"


class CameraManualAdd(BaseModel):
    name: str
    location: str
    node: str   # Tailscale IP or hostname
    port: int = 8554
