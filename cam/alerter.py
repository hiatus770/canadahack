import httpx
import threading
import time
import logging
from datetime import datetime
import config

logger = logging.getLogger("alerter")


class Alerter:
    """Sends alerts and heartbeats to the TailTV backend."""

    def __init__(self):
        self._client = httpx.Client(timeout=5)
        self._heartbeat_thread = None
        self._running = False
        self.registered = False

    def start(self):
        self._running = True
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._heartbeat_thread.start()

    def stop(self):
        self._running = False
        self._client.close()

    def register(self, resolution: str = "1280x720"):
        """Register this camera with the TailTV backend."""
        try:
            resp = self._client.post(
                f"{config.TAILTV_BACKEND_URL}/api/cameras/register",
                json={
                    "id": config.CAM_ID,
                    "name": config.CAM_NAME,
                    "location": config.CAM_LOCATION,
                    "resolution": resolution,
                    "port": config.PORT,
                },
            )
            if resp.status_code == 200:
                self.registered = True
                logger.info("Registered with TailTV backend")
            else:
                logger.warning(f"Registration failed: {resp.status_code}")
        except Exception as e:
            logger.warning(f"Could not register with backend: {e}")

    def send_alert(self, event_type: str, details: dict | None = None):
        """Send an alert to the TailTV backend."""
        payload = {
            "camera_id": config.CAM_ID,
            "camera_name": config.CAM_NAME,
            "location": config.CAM_LOCATION,
            "type": event_type,
            "timestamp": datetime.now().isoformat(),
            "details": details or {},
        }
        try:
            self._client.post(
                f"{config.TAILTV_BACKEND_URL}/api/alerts",
                json=payload,
            )
            logger.info(f"Alert sent: {event_type}")
        except Exception as e:
            logger.warning(f"Could not send alert: {e}")

    def _heartbeat_loop(self):
        while self._running:
            try:
                self._client.post(
                    f"{config.TAILTV_BACKEND_URL}/api/cameras/heartbeat",
                    json={
                        "id": config.CAM_ID,
                        "timestamp": datetime.now().isoformat(),
                    },
                )
            except Exception:
                pass
            time.sleep(config.HEARTBEAT_INTERVAL)


# Singleton
alerter = Alerter()
