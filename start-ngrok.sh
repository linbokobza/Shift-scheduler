#!/bin/bash

# ===========================================
#  Shift Scheduler - ngrok Setup Script
#  Run this on your Linux machine
# ===========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Shift Scheduler - ngrok Setup ===${NC}"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${YELLOW}ngrok is not installed. Installing...${NC}"
    curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok-v3-stable-linux-amd64.tgz | sudo tar xvz -C /usr/local/bin
    echo -e "${GREEN}ngrok installed successfully!${NC}"
fi

# Check if ngrok is authenticated
if ! ngrok config check &> /dev/null; then
    echo -e "${YELLOW}ngrok is not configured.${NC}"
    echo "1. Sign up at: https://ngrok.com/signup"
    echo "2. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo ""
    read -p "Paste your ngrok authtoken: " NGROK_TOKEN
    ngrok config add-authtoken "$NGROK_TOKEN"
    echo -e "${GREEN}ngrok configured!${NC}"
fi

echo ""
echo -e "${GREEN}Starting ngrok tunnel on port 5001...${NC}"
echo -e "${YELLOW}After ngrok starts, copy the https://xxxx.ngrok-free.app URL${NC}"
echo -e "${YELLOW}Then update your .env files:${NC}"
echo ""
echo "  1. In .env (root):      VITE_API_URL=https://xxxx.ngrok-free.app/api"
echo "  2. In backend/.env:     CORS_ORIGIN=http://localhost:5173,https://yyyy.ngrok-free.app"
echo "     (add ngrok frontend URL only if you expose frontend too)"
echo ""
echo -e "${GREEN}Starting ngrok...${NC}"
echo ""

ngrok http 5001
