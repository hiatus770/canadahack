#!/bin/bash
# Kill existing processes
pkill -f "uvicorn main:app.*8000" 2>/dev/null
pkill -f "node.*vite.*tv" 2>/dev/null
sleep 1

# Start TV backend (uses venv)
cd /home/hiatus/Hackathons/canadahack/tv/backend
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/tailtv-backend.log 2>&1 &
echo "TV backend started (PID $!)"

# Start TV frontend
cd /home/hiatus/Hackathons/canadahack/tv/frontend
npx vite --host 0.0.0.0 > /dev/null 2>&1 &
echo "TV frontend started (PID $!)"

echo "Done — backend :8000, frontend :5174"
