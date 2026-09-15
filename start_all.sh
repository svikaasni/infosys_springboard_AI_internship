#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==================================================="
echo "  Starting BugSense AI Platform (Backend + Frontend)"
echo "==================================================="

# Function to kill child processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "Starting Backend Server on http://127.0.0.1:8000..."
cd "$DIR/backend"
if [ -d "venv" ]; then
    source venv/bin/activate
fi
python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &

echo "Starting Frontend Server on http://localhost:5173..."
cd "$DIR/frontend"
npm run dev &

echo ""
echo "Both servers are running!"
echo "Open: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."
wait
