import cv2
import numpy as np
import time
import threading
from ultralytics import YOLO
import config

class MotionDetector:
    """Detects motion using background subtraction."""

    def __init__(self):
        self._bg_sub = cv2.createBackgroundSubtractorMOG2(
            history=500, varThreshold=50, detectShadows=True
        )
        self._kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        self.motion_detected = False
        self.motion_area = 0
        self._scale = max(0.2, min(1.0, float(config.MOTION_SCALE)))

    def detect(self, frame: np.ndarray) -> bool:
        # Run motion detection on a smaller frame for lower CPU usage.
        if self._scale < 1.0:
            frame = cv2.resize(frame, None, fx=self._scale, fy=self._scale, interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        mask = self._bg_sub.apply(gray)
        # Remove shadows (shadows = 127, foreground = 255)
        mask = cv2.threshold(mask, 200, 255, cv2.THRESH_BINARY)[1]
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, self._kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, self._kernel)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        total_area = sum(cv2.contourArea(c) for c in contours)
        # Convert area back to an approximation of original-frame pixels.
        total_area = total_area / (self._scale * self._scale)
        self.motion_area = total_area
        self.motion_detected = total_area > config.MOTION_SENSITIVITY
        return self.motion_detected


class PersonDetector:
    """Detects people using YOLOv8-nano."""

    def __init__(self):
        self._model = None
        self._lock = threading.Lock()
        self._last_run = 0
        self.persons_detected = 0
        self.last_boxes = []

    def _ensure_model(self):
        if self._model is None:
            self._model = YOLO("yolov8n.pt")

    def detect(self, frame: np.ndarray) -> int:
        now = time.time()
        if now - self._last_run < config.DETECTION_INTERVAL:
            return self.persons_detected
        self._last_run = now
        self._ensure_model()
        h, w = frame.shape[:2]
        max_side = max(h, w)
        if max_side > config.PERSON_INPUT_SIZE:
            scale = config.PERSON_INPUT_SIZE / max_side
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        with self._lock:
            results = self._model(
                frame,
                verbose=False,
                conf=config.PERSON_CONFIDENCE,
                imgsz=config.PERSON_INPUT_SIZE,
            )
            persons = []
            for r in results:
                for box in r.boxes:
                    # class 0 = person in COCO
                    if int(box.cls[0]) == 0:
                        persons.append(box.xyxy[0].tolist())
            self.persons_detected = len(persons)
            self.last_boxes = persons
        return self.persons_detected


class DetectionEngine:
    """Combines motion + person detection and tracks state."""

    def __init__(self):
        self.motion = MotionDetector()
        self.person = PersonDetector()
        self.motion_count = 0
        self.person_count = 0
        self._last_motion_time = 0
        self._last_person_time = 0
        self._lock = threading.Lock()

    def process(self, frame: np.ndarray) -> dict:
        """Process a frame. Returns detection results."""
        motion = self.motion.detect(frame)
        persons = self.person.detect(frame)
        now = time.time()
        event = None

        with self._lock:
            if motion and (now - self._last_motion_time > config.ALERT_COOLDOWN):
                self.motion_count += 1
                self._last_motion_time = now
                event = "motion"

            if persons > 0 and (now - self._last_person_time > config.ALERT_COOLDOWN):
                self.person_count += 1
                self._last_person_time = now
                event = "person"  # person takes priority over motion

        return {
            "motion": motion,
            "motion_area": self.motion.motion_area,
            "persons": persons,
            "person_boxes": self.person.last_boxes,
            "event": event,
            "motion_count": self.motion_count,
            "person_count": self.person_count,
        }

    def get_counts(self) -> dict:
        with self._lock:
            return {
                "motion_count": self.motion_count,
                "person_count": self.person_count,
            }


# Singleton
engine = DetectionEngine()
