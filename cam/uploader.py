import httpx
import threading
import logging
import time
from pathlib import Path
from collections import deque
import config

logger = logging.getLogger("uploader")


class CloudUploader:
    """Uploads recorded clips to TailCloud Drive via Taildrive shares."""

    def __init__(self):
        self._client = httpx.Client(timeout=30)
        self._queue: deque[dict] = deque()
        self._lock = threading.Lock()
        self._running = False
        self._thread = None
        self._uploaded: set[str] = set()
        self._upload_path: str | None = None  # resolved /{machine}/{share}

    def start(self):
        self._running = True
        self._resolve_upload_path()
        self._thread = threading.Thread(target=self._upload_loop, daemon=True)
        self._thread.start()
        logger.info(f"Cloud uploader started -> {config.TAILCLOUD_URL} path={self._upload_path}")

    def stop(self):
        self._running = False
        self._client.close()

    def _resolve_upload_path(self):
        """Discover the local machine name and ensure the share exists."""
        base = config.TAILCLOUD_URL.rstrip("/")
        share = config.TAILCLOUD_UPLOAD_SHARE

        # Discover local machine name from TailCloud backend
        machine = None
        try:
            resp = self._client.get(f"{base}/api/machines")
            if resp.status_code == 200:
                for m in resp.json():
                    if m.get("isSelf"):
                        machine = m["name"]
                        break
        except Exception as e:
            logger.warning(f"Could not discover machine name: {e}")

        if not machine:
            logger.warning("Could not determine local machine name, uploads will fail")
            return

        self._upload_path = f"/{machine}/{share}"

        # Create the share via mkdir (auto-creates Taildrive share at share level)
        try:
            resp = self._client.post(
                f"{base}/api/mkdir",
                params={"path": self._upload_path},
            )
            if resp.status_code == 200:
                logger.info(f"Ensured Taildrive share: {self._upload_path}")
            else:
                logger.info(f"Share mkdir returned {resp.status_code} (may already exist)")
        except Exception as e:
            logger.warning(f"Could not create share: {e}")

    def enqueue(self, clip_meta: dict):
        """Add a clip to the upload queue."""
        clip_id = clip_meta.get("id", "")
        if clip_id in self._uploaded:
            return
        with self._lock:
            self._queue.append(clip_meta)
        logger.info(f"Queued clip for upload: {clip_meta.get('filename')}")

    def _upload_one(self, clip_meta: dict) -> bool:
        """Upload a single clip. Returns True on success."""
        if not self._upload_path:
            logger.warning("No upload path resolved, skipping")
            return False

        filepath = Path(clip_meta["path"])
        if not filepath.exists():
            logger.warning(f"Clip file missing, skipping: {filepath}")
            return True  # Don't retry missing files

        try:
            with open(filepath, "rb") as f:
                resp = self._client.post(
                    f"{config.TAILCLOUD_URL.rstrip('/')}/api/upload",
                    params={"path": self._upload_path},
                    files={"file": (filepath.name, f, "video/mp4")},
                )
            if resp.status_code == 200:
                self._uploaded.add(clip_meta.get("id", ""))
                logger.info(f"Uploaded: {filepath.name}")
                return True
            else:
                logger.warning(f"Upload failed ({resp.status_code}): {filepath.name} - {resp.text}")
                return False
        except Exception as e:
            logger.warning(f"Upload error for {filepath.name}: {e}")
            return False

    def _upload_loop(self):
        """Background thread: process the upload queue."""
        while self._running:
            clip_meta = None
            with self._lock:
                if self._queue:
                    clip_meta = self._queue.popleft()

            if clip_meta:
                if not self._upload_one(clip_meta):
                    # Re-queue on failure for retry
                    with self._lock:
                        self._queue.append(clip_meta)
                    time.sleep(5)  # Back off before retry
            else:
                time.sleep(1)

    def sync_existing(self, clips: list[dict]):
        """Queue any existing clips that haven't been uploaded yet."""
        for clip in clips:
            self.enqueue(clip)

    @property
    def upload_path(self) -> str:
        return self._upload_path or "(not resolved)"

    @property
    def pending_count(self) -> int:
        with self._lock:
            return len(self._queue)

    @property
    def uploaded_count(self) -> int:
        return len(self._uploaded)


# Singleton
uploader = CloudUploader()
