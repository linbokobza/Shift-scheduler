# 🐳 Docker Setup Guide

Run the entire Shift Scheduler stack with Docker Compose.

## Prerequisites

- Docker Desktop installed
- Docker Compose installed (included with Docker Desktop)

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Services

The docker-compose.yml includes:

1. **MongoDB** (port 27017)
   - Official MongoDB 7.0 image
   - Persistent data volume
   - Credentials: admin / adminpassword

2. **Backend API** (port 5001)
   - Node.js + Express + TypeScript
   - Connects to MongoDB container
   - Auto-restarts on failure

3. **Frontend** (port 5176)
   - React + Vite dev server
   - Connects to backend API
   - Hot reload enabled

## Access

- **Frontend**: http://localhost:5176
- **Backend API**: http://localhost:5001
- **MongoDB**: mongodb://admin:adminpassword@localhost:27017

## Seed Database

After starting the containers:

```bash
# Enter backend container
docker-compose exec backend sh

# Run seed script
npm run seed

# Exit container
exit
```

## Development Workflow

### With Docker Compose

```bash
# Start services
docker-compose up -d

# Watch logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Rebuild after code changes
docker-compose up -d --build
```

### Without Docker (Local Development)

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

## Troubleshooting

### Port already in use

```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5001
kill -9 <PID>
```

### Container won't start

```bash
# View detailed logs
docker-compose logs backend

# Restart container
docker-compose restart backend

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database connection issues

```bash
# Check MongoDB is running
docker-compose ps

# Test MongoDB connection
docker-compose exec mongodb mongosh -u admin -p adminpassword

# View MongoDB logs
docker-compose logs mongodb
```

### Frontend can't connect to backend

1. Check backend is running: `docker-compose ps`
2. Check backend logs: `docker-compose logs backend`
3. Verify CORS settings in backend/.env
4. Check frontend .env has correct API_URL

## Production Deployment

### Environment Variables

Create production `.env` files:

**backend/.env.production**:
```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb://admin:STRONG_PASSWORD@mongodb:27017/shift-scheduler?authSource=admin
JWT_SECRET=GENERATE_A_STRONG_SECRET_HERE
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

**Frontend .env.production**:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

### Build for Production

```bash
# Build optimized images
docker-compose -f docker-compose.prod.yml build

# Start in production mode
docker-compose -f docker-compose.prod.yml up -d
```

## Useful Commands

```bash
# View running containers
docker-compose ps

# View logs for all services
docker-compose logs

# View logs for specific service
docker-compose logs backend
docker-compose logs -f frontend  # Follow logs

# Execute command in container
docker-compose exec backend npm run seed
docker-compose exec mongodb mongosh

# Stop services
docker-compose stop

# Start stopped services
docker-compose start

# Remove everything (including volumes)
docker-compose down -v

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Scale services (if needed)
docker-compose up -d --scale backend=3
```

## Network Architecture

```
┌─────────────────────────────────────────────────────┐
│              Docker Network (bridge)                 │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Frontend   │  │   Backend    │  │  MongoDB  │ │
│  │   (Vite)     │  │  (Express)   │  │  (Mongo)  │ │
│  │              │  │              │  │           │ │
│  │  Port 5176   │  │  Port 5001   │  │ Port 27017│ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│         │                 │                  │      │
└─────────┼─────────────────┼──────────────────┼──────┘
          │                 │                  │
          │                 │                  │
     Host:5176         Host:5001          Host:27017
```

## Data Persistence

MongoDB data is stored in a Docker volume:

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect shift-scheduler_mongodb_data

# Backup volume
docker run --rm -v shift-scheduler_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb-backup.tar.gz /data

# Restore volume
docker run --rm -v shift-scheduler_mongodb_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/mongodb-backup.tar.gz --strip 1"
```

## Health Checks

Check if services are healthy:

```bash
# Backend health
curl http://localhost:5001/health

# MongoDB health
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Frontend health
curl http://localhost:5176
```

## Best Practices

1. **Don't commit sensitive data**
   - Keep `.env` in `.gitignore`
   - Use `.env.example` for templates

2. **Use volumes for development**
   - Code changes reflect immediately
   - No need to rebuild constantly

3. **Use named volumes for data**
   - Persist database across restarts
   - Easy to backup/restore

4. **Monitor logs**
   - Use `docker-compose logs -f`
   - Set up log aggregation for production

5. **Resource limits**
   - Add memory/CPU limits in production
   - Prevent runaway containers

## Next Steps

- Configure reverse proxy (nginx)
- Set up SSL certificates (Let's Encrypt)
- Configure log rotation
- Set up monitoring (Prometheus/Grafana)
- Implement backups automation
- Configure CI/CD pipeline

---

**Happy Dockerizing!** 🐳
