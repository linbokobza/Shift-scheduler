#!/bin/bash

# ===========================================
#  Shift Scheduler - ngrok Setup Script
#  Run this on your Linux machine
# ===========================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Shift Scheduler - ngrok Setup ===${NC}"
echo ""

# --- Step 1: Check ngrok ---
if ! command -v ngrok &> /dev/null; then
    echo -e "${YELLOW}ngrok is not installed. Installing...${NC}"
    curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok-v3-stable-linux-amd64.tgz | sudo tar xvz -C /usr/local/bin
    echo -e "${GREEN}ngrok installed!${NC}"
fi

# --- Step 2: Check ngrok auth ---
if ! ngrok config check &> /dev/null 2>&1; then
    echo -e "${YELLOW}ngrok is not configured.${NC}"
    echo "1. Sign up at: https://ngrok.com/signup"
    echo "2. Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo ""
    read -p "Paste your ngrok authtoken: " NGROK_TOKEN
    ngrok config add-authtoken "$NGROK_TOKEN"
    echo -e "${GREEN}ngrok configured!${NC}"
fi

# --- Step 3: Start ngrok in background to get URL ---
echo -e "${YELLOW}Starting ngrok tunnel...${NC}"
ngrok http 5001 --log=stdout > /tmp/ngrok.log &
NGROK_PID=$!
sleep 3

# Get the ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "Failed to get ngrok URL. Check if ngrok is running."
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}ngrok URL: ${NGROK_URL}${NC}"

# --- Step 4: Build frontend with ngrok URL ---
echo -e "${YELLOW}Building frontend with ngrok URL...${NC}"
VITE_API_URL="${NGROK_URL}/api" npm run build

# --- Step 5: Update backend CORS ---
# Add ngrok URL to CORS_ORIGIN in backend/.env
if grep -q "CORS_ORIGIN=" backend/.env; then
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://localhost:5173,${NGROK_URL}|" backend/.env
else
    echo "CORS_ORIGIN=http://localhost:5173,${NGROK_URL}" >> backend/.env
fi

# Update FRONTEND_URL for password reset emails
if grep -q "FRONTEND_URL=" backend/.env; then
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=${NGROK_URL}|" backend/.env
else
    echo "FRONTEND_URL=${NGROK_URL}" >> backend/.env
fi

echo -e "${GREEN}Environment updated!${NC}"

# --- Step 6: Start backend ---
echo -e "${GREEN}Starting backend server...${NC}"
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  App is live at: ${NGROK_URL}${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

cd backend && npm run dev
