#!/bin/bash
# Kill existing processes
pkill -f tailcloud-backend 2>/dev/null
pkill -f "node.*vite" 2>/dev/null
sleep 1

# Rebuild and start backend
cd /home/hiatus/Hackathons/canadahack/cloud/backend
go build -o tailcloud-backend . && ./tailcloud-backend > /tmp/tailcloud-backend.log 2>&1 &
echo "Backend started (PID $!)"

# Start frontend
cd /home/hiatus/Hackathons/canadahack/cloud/frontend
npx vite --host 0.0.0.0 > /dev/null 2>&1 &
echo "Frontend started (PID $!)"

echo "Done — backend :8081, frontend :5173"
