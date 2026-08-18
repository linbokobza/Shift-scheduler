#!/bin/bash

set -e

cd /var/www/Shift-scheduler/Shift-scheduler

# --- Backup .env files (never in git, never overwrite) ---
echo "=== Backing up .env files ==="
[ -f backend/.env ] && cp backend/.env /tmp/shift-backend.env.bak && echo "backend/.env backed up"

if [ -n "$(git status --porcelain)" ]; then
  echo "=== WARNING: local changes will be discarded (VM is pull-only) ==="
  git status --short
  read -p "Continue and discard the above? [y/N] " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted. Resolve or commit the changes above manually, then re-run."
    exit 1
  fi
  git reset --hard HEAD
  git clean -fd
fi

echo "=== Pulling latest changes from git ==="
git pull

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
