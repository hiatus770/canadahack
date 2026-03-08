# CanadaHack

A Tailscale-native home security and file sharing suite built around three integrated services: **TailCam**, **TailTV**, and **TailCloud**. All services communicate over your private Tailnet and are managed by a single system tray daemon.

---

## Architecture

```
┌─────────────┐     alerts/clips     ┌──────────────┐     React UI
│  TailCam    │ ──────────────────▶  │   TailTV     │ ◀──────────────
│  (cam/)     │                      │   (tv/)      │
│  Port 8554  │                      │   Port 8000  │
└─────────────┘                      └──────────────┘
       │  uploads clips
       ▼
┌─────────────┐
│  TailCloud  │     React UI
│  (cloud/)   │ ◀──────────────
│  Port 8081  │
└─────────────┘

All services managed by daemon/ (system tray)
```

---

## Services

### TailCam (`cam/`)
Per-device camera agent. Runs on any machine with a webcam or USB camera (also supports phones via browser WebSocket).

**Features:**
- MJPEG live stream and JPEG snapshot endpoints
- Motion detection (OpenCV) + person detection (YOLOv8n)
- Auto-records 10-second MP4 clips on detection events
- Uploads clips to TailCloud automatically
- Sends alerts to TailTV backend
- Configurable via environment variables or `/settings` API
- Browser-based phone camera support (`/webcam`)

**Stack:** Python, FastAPI, OpenCV, Ultralytics YOLOv8, uvicorn

**Key endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stream` | MJPEG live stream |
| GET | `/snapshot` | Single JPEG frame |
| GET | `/status` | Camera status + metrics |
| GET | `/clips` | List recorded clips |
| GET | `/clips/{id}` | Download a clip |
| GET | `/clips/{id}/thumb` | Clip thumbnail |
| POST | `/command` | Send command (`start_recording`, `stop_recording`) |
| GET/POST | `/settings` | Read/update camera settings |

---

### TailTV (`tv/`)
Central camera dashboard — aggregates all TailCam instances, displays live streams, and shows real-time alerts.

**Features:**
- Register and manage multiple cameras
- Proxied MJPEG streams and snapshots from each camera
- Real-time alert feed via WebSocket
- Clip browsing and download per camera
- Periodic camera health polling (every 10s)
- Tailscale `whois` for user identity

**Stack:**
- Backend: Python, FastAPI, SQLite (aiosqlite), httpx, WebSockets, uvicorn
- Frontend: React, Vite (port 5174)

**Key backend endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cameras` | List all cameras |
| POST | `/api/cameras/register` | Auto-register a TailCam |
| POST | `/api/cameras/add` | Manually add a camera |
| DELETE | `/api/cameras/{id}` | Remove a camera |
| GET | `/api/cameras/{id}/stream` | Proxied MJPEG stream |
| GET | `/api/cameras/{id}/clips` | List clips from camera |
| GET | `/api/alerts` | Alert history |
| POST | `/api/alerts` | Receive alert from TailCam |
| POST | `/api/cameras/{id}/command` | Send command to camera |
| WS | `/api/ws` | Real-time alert push |

---

### TailCloud (`cloud/`)
Tailscale-native file storage and sharing, backed by Taildrive WebDAV.

**Features:**
- Browse, upload, download, rename, and delete files
- File previews and comments
- Public share links (password-protected, heartbeat-reaped)
- Tailscale Serve integration for public share exposure
- Lists all Tailnet machines and their shares
- User identity via `tailscale whois`

**Stack:**
- Backend: Go, net/http (port 8081)
- Frontend: React, Vite (port 5173)

**Key backend endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/machines` | List Tailnet machines |
| GET | `/api/files` | Browse files |
| POST | `/api/upload` | Upload a file |
| DELETE | `/api/files` | Delete a file |
| POST | `/api/rename` | Rename a file |
| GET | `/api/shares` | List WebDAV shares |
| POST/DELETE | `/api/public-shares` | Manage public share links |
| GET | `/s/{id}` | Public share page |

---

### Daemon (`daemon/`)
GTK3 system tray application that manages all five service processes from a single icon.

**Features:**
- Start/stop individual services or all at once
- Crash detection with desktop notifications
- Health check every 5 seconds
- Log file quick-open from the tray menu
- Displays Tailnet URLs for each served endpoint
- Builds the Go backend before starting if needed

**Managed services:**
| Service | Port |
|---------|------|
| TailCloud Backend | 8081 |
| TailCloud Frontend | 5173 |
| TailTV Backend | 8000 |
| TailTV Frontend | 5174 |
| Camera Observer (TailCam) | 8554 |

**Dependencies:** GTK3, AyatanaAppIndicator3

---

## Getting Started

### Prerequisites
- [Tailscale](https://tailscale.com/) installed and authenticated on all devices
- Python 3.11+, Go 1.22+, Node.js 18+

### TailCam Setup

```bash
cd cam
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8554
```

**Environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `CAM_NAME` | `Camera-<id>` | Display name |
| `CAM_LOCATION` | `Unassigned` | Physical location |
| `TAILTV_BACKEND_URL` | `http://localhost:8000` | TailTV URL |
| `TAILCLOUD_URL` | `http://localhost:8081` | TailCloud URL |
| `CAMERA_INDEX` | `0` | OpenCV camera index |
| `FPS` | `10` | Capture framerate |
| `CLIP_DURATION` | `10` | Seconds per recorded clip |
| `MOTION_SENSITIVITY` | `1500` | Min contour area for motion |
| `PERSON_CONFIDENCE` | `0.45` | YOLOv8 detection threshold |

### TailTV Setup

```bash
# Backend
cd tv/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend
cd tv/frontend
npm install
npx vite --host 0.0.0.0 --port 5174
```

### TailCloud Setup

```bash
# Backend
cd cloud/backend
go build -o tailcloud-backend .
./tailcloud-backend

# Frontend
cd cloud/frontend
npm install
npx vite --host 0.0.0.0 --port 5173
```

### Daemon (All-in-one)

```bash
cd daemon
pip install pygobject
python tray.py
```

Or use the provided script to quickly restart TailCloud:

```bash
./restart.sh
```

---

## Project Structure

```
canadahack/
├── cam/                  # TailCam — camera agent
│   ├── main.py           # FastAPI app + endpoints
│   ├── capture.py        # Camera capture thread
│   ├── detection.py      # Motion + YOLOv8 person detection
│   ├── recorder.py       # Clip recording
│   ├── alerter.py        # Alert sender
│   ├── uploader.py       # TailCloud clip uploader
│   ├── config.py         # Configuration (env vars)
│   └── webcam.html       # Phone browser camera page
├── tv/
│   ├── backend/          # TailTV FastAPI backend (SQLite)
│   └── frontend/         # React camera dashboard
├── cloud/
│   ├── backend/          # TailCloud Go backend (WebDAV)
│   └── frontend/         # React file manager
├── daemon/
│   └── tray.py           # GTK3 system tray service manager
├── assets/               # Logos (TailCam, TailCloud)
└── restart.sh            # Quick restart script for TailCloud
```
