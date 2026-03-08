#!/bin/bash
# Kill existing camera process
pkill -f "uvicorn main:app.*8554" 2>/dev/null
sleep 1

# Configure camera (override these as needed)
export TAILTV_BACKEND_URL="${TAILTV_BACKEND_URL:-http://localhost:8000}"
export CAM_NAME="${CAM_NAME:-Default Camera}"
export CAM_LOCATION="${CAM_LOCATION:-Unassigned}"

# Start camera observer (uses venv)
cd /home/hiatus/Hackathons/canadahack/cam
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8554 > /tmp/tailcam.log 2>&1 &
echo "Camera started (PID $!)"
echo "  Name: $CAM_NAME"
echo "  Location: $CAM_LOCATION"
echo "  Backend: $TAILTV_BACKEND_URL"
echo "  Streaming on :8554"
