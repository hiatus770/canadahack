import cv2
import threading
import time
import os
import subprocess
import tempfile
import wave
import numpy as np
from datetime import datetime
from pathlib import Path
import config

try:
    import sounddevice as sd
    _AUDIO_AVAILABLE = True
except Exception:
    _AUDIO_AVAILABLE = False

AUDIO_SAMPLE_RATE = 44100
AUDIO_CHANNELS = 1

class ClipRecorder:
    """Records short video clips when triggered."""

    def __init__(self):
        self._recording = False
        self._manual_recording = False
        self._lock = threading.Lock()
        self._clips: list[dict] = []
        self._load_existing_clips()

    def _load_existing_clips(self):
        """Load metadata for existing clips on disk."""
        for f in sorted(config.CLIPS_DIR.glob("*.mp4")):
            stat = f.stat()
            self._clips.append({
                "id": f.stem,
                "filename": f.name,
                "path": str(f),
                "timestamp": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size": stat.st_size,
            })

    def _record_audio(self, duration: float, wav_path: str):
        """Record audio to a WAV file."""
        try:
            frames = sd.rec(
                int(duration * AUDIO_SAMPLE_RATE),
                samplerate=AUDIO_SAMPLE_RATE,
                channels=AUDIO_CHANNELS,
                dtype='int16',
            )
            sd.wait()
            with wave.open(wav_path, 'wb') as wf:
                wf.setnchannels(AUDIO_CHANNELS)
                wf.setsampwidth(2)  # int16 = 2 bytes
                wf.setframerate(AUDIO_SAMPLE_RATE)
                wf.writeframes(frames.tobytes())
        except Exception:
            pass

    def record_clip(self, get_frame_fn, event_type: str = "motion") -> dict | None:
        """Record a clip of CLIP_DURATION seconds with audio. Returns clip metadata."""
        with self._lock:
            if self._recording:
                return None
            self._recording = True

        try:
            clip_id = datetime.now().strftime("%Y%m%d_%H%M%S") + f"_{event_type}"
            filename = f"{clip_id}.mp4"
            filepath = config.CLIPS_DIR / filename

            # Temp files for video-only and audio
            tmp_video = str(filepath) + ".tmp.mp4"
            tmp_audio = str(filepath) + ".tmp.wav"

            # Get first frame to determine size
            frame = get_frame_fn()
            if frame is None:
                return None
            h, w = frame.shape[:2]

            fourcc = cv2.VideoWriter_fourcc(*'avc1')
            writer = cv2.VideoWriter(tmp_video, fourcc, config.FPS, (w, h))

            # Start audio recording in parallel
            if _AUDIO_AVAILABLE:
                audio_thread = threading.Thread(
                    target=self._record_audio,
                    args=(config.CLIP_DURATION, tmp_audio),
                    daemon=True,
                )
                audio_thread.start()

            start = time.time()
            while time.time() - start < config.CLIP_DURATION:
                frame = get_frame_fn()
                if frame is not None:
                    writer.write(frame)
                time.sleep(1.0 / config.FPS)

            writer.release()

            if _AUDIO_AVAILABLE:
                audio_thread.join(timeout=config.CLIP_DURATION + 2)

            # Mux video + audio with ffmpeg if audio was recorded
            if _AUDIO_AVAILABLE and os.path.exists(tmp_audio):
                try:
                    subprocess.run(
                        [
                            'ffmpeg', '-y',
                            '-i', tmp_video,
                            '-i', tmp_audio,
                            '-c:v', 'copy',
                            '-c:a', 'aac',
                            '-shortest',
                            str(filepath),
                        ],
                        capture_output=True,
                        timeout=30,
                    )
                except Exception:
                    # Fallback: just use video without audio
                    os.rename(tmp_video, str(filepath))
                finally:
                    for f in [tmp_video, tmp_audio]:
                        try:
                            os.remove(f)
                        except OSError:
                            pass
            else:
                os.rename(tmp_video, str(filepath))

            meta = {
                "id": clip_id,
                "filename": filename,
                "path": str(filepath),
                "event_type": event_type,
                "timestamp": datetime.now().isoformat(),
                "duration": config.CLIP_DURATION,
                "size": filepath.stat().st_size,
            }
            self._clips.append(meta)
            return meta

        finally:
            with self._lock:
                self._recording = False

    def record_clip_async(self, get_frame_fn, event_type: str = "motion"):
        """Start recording in a background thread."""
        t = threading.Thread(target=self.record_clip, args=(get_frame_fn, event_type), daemon=True)
        t.start()

    def _enforce_max_clips(self):
        """Delete oldest clips if over limit."""
        while len(self._clips) > config.MAX_CLIPS:
            oldest = self._clips.pop(0)
            try:
                os.remove(oldest["path"])
            except OSError:
                pass

    def list_clips(self) -> list[dict]:
        return list(self._clips)

    def get_clip_path(self, clip_id: str) -> Path | None:
        for c in self._clips:
            if c["id"] == clip_id:
                p = Path(c["path"])
                if p.exists():
                    return p
        return None

    @property
    def is_recording(self) -> bool:
        return self._recording

    @property
    def manual_recording(self) -> bool:
        return self._manual_recording

    @manual_recording.setter
    def manual_recording(self, val: bool):
        self._manual_recording = val


# Singleton
recorder = ClipRecorder()
