# Shift Scheduler

> Smart employee shift scheduling system with optimization algorithms, availability management, and intelligent schedule generation.

[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/cloud/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

## Features

- **Automated Schedule Generation** - Uses constraint programming to optimize shift assignments
- **Smart Conflict Resolution** - Respects availability, vacations, labor laws, and holidays
- **Role-Based Access** - Separate dashboards for managers and employees
- **Audit Logging** - Complete history of all schedule changes
- **Real-time Validation** - Prevents invalid shift assignments

## Tech Stack

**Frontend:** React 18 • TypeScript • Vite • Tailwind CSS • React Query • Axios

**Backend:** Node.js • Express • TypeScript • MongoDB • Mongoose • JWT • bcrypt

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account ([free tier setup guide](backend/MONGODB_SETUP.md))

### Installation

```bash
# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB connection string
npm run dev

# Frontend setup (new terminal)
cd ..
npm install
npm run dev
```

Backend: http://localhost:5001
Frontend: http://localhost:5176

### First User

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manager",
    "email": "manager@company.com",
    "password": "password123",
    "role": "manager"
  }'
```

## How It Works

### Constraint Programming Algorithm

The scheduler uses a greedy constraint satisfaction algorithm with 50 optimization attempts:

**Hard Constraints (must satisfy):**
- Employee availability and vacation days
- Max 1 shift per day per employee
- No morning shift after night shift
- No 3 consecutive work days
- Holiday restrictions
- Friday morning-only, Saturday off

**Soft Constraints (optimized):**
- Fair shift distribution across employees
- Morning shift diversity
- Balanced shift types
- Minimum workload per employee

### API Endpoints

```
POST   /api/auth/register          - Register user
POST   /api/auth/login             - Login
GET    /api/employees              - List employees
POST   /api/availabilities         - Submit availability
POST   /api/schedules/generate     - Generate schedule (manager)
GET    /api/schedules?weekStart=YYYY-MM-DD - View schedules
POST   /api/vacations              - Add vacation
POST   /api/holidays               - Add holiday
GET    /api/audit                  - Audit logs
```

## Project Structure

```
project/
├── src/                    # React frontend
│   ├── components/
│   │   ├── manager/       # Manager dashboard
│   │   └── employee/      # Employee dashboard
│   ├── api/               # API client (Axios)
│   └── hooks/             # React hooks
│
└── backend/
    ├── src/
    │   ├── models/        # Mongoose schemas
    │   ├── routes/        # API routes
    │   ├── controllers/   # Business logic
    │   ├── services/      # Optimization algorithms
    │   └── middleware/    # Auth & logging
    └── scripts/           # Utilities
```

## License

ISC
