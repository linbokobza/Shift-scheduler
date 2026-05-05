#!/bin/bash

set -e

cd /var/www/Shift-scheduler/Shift-scheduler

# --- Backup .env files (never in git, never overwrite) ---
echo "=== Backing up .env files ==="
[ -f backend/.env ] && cp backend/.env /tmp/shift-backend.env.bak && echo "backend/.env backed up"

echo "=== Stashing local changes ==="
git stash --include-untracked 2>/dev/null || true

echo "=== Pulling latest changes from git ==="
git pull --rebase

echo "=== Restoring .env files ==="
[ -f /tmp/shift-backend.env.bak ] && cp /tmp/shift-backend.env.bak backend/.env && echo "backend/.env restored"

echo ""
echo "=== Installing frontend dependencies (locked) ==="
npm ci --legacy-peer-deps

echo ""
echo "=== Building frontend ==="
npm run build

echo ""
echo "=== Installing backend dependencies (locked) ==="
cd backend
npm ci

echo ""
echo "=== Building backend ==="
npm run build

echo ""
echo "=== Restarting server ==="
cd ..
pm2 restart all || pm2 start backend/dist/server.js --name shift-backend

echo ""
echo "=== Done! ==="
pm2 list
