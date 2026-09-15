#!/usr/bin/env bash
set -e

echo "==================================================="
echo "  BugSense AI - Complete Local Environment Setup"
echo "==================================================="
echo ""

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found. Please install Python 3.10+."
    exit 1
fi
python3 --version

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] node could not be found. Please install Node.js 18+."
    exit 1
fi
node --version

# Setup Backend Virtual Environment
echo ""
echo "Setting up Python virtual environment..."
cd "$(dirname "$0")/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Setup Frontend Packages
echo ""
echo "Installing frontend npm packages..."
cd ../frontend
npm install

echo ""
echo "==================================================="
echo "  Setup Complete!"
echo "  Run ./start_all.sh to start the platform"
echo "==================================================="
