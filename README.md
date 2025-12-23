# 🚀 Shift Scheduler - Intelligent Workforce Management System

> **Full-Stack TypeScript application with advanced constraint programming for optimal shift scheduling**

[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/cloud/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Optimization Algorithm](#-optimization-algorithm)
- [Project Structure](#-project-structure)
- [Development Status](#-development-status)
- [Future Enhancements](#-future-enhancements)

---

## 🎯 Overview

A sophisticated shift scheduling system that automates workforce planning using **constraint programming** and **optimization algorithms**. The system respects complex constraints (availability, vacation days, labor laws) while maximizing fairness and coverage.

### Business Problem Solved

- **Manual scheduling** takes hours and often results in unfair distribution
- **Hard to respect** all employee preferences and legal constraints
- **No visibility** into schedule quality or constraint violations
- **Difficult to track** changes and maintain audit logs

### Solution

An intelligent system that:
1. ✅ Generates optimal schedules in seconds
2. ✅ Respects 100% of hard constraints (availability, labor laws)
3. ✅ Optimizes soft constraints (fairness, balance, preferences)
4. ✅ Provides detailed warnings and quality metrics
5. ✅ Maintains complete audit trail of all changes

---

## 🌟 Key Features

### 🤖 Intelligent Scheduling

- **Constraint Programming Algorithm** with 50-attempt optimization
- **Hard Constraints**:
  - ✅ One employee per shift
  - ✅ Max 1 shift per day per employee
  - ✅ No morning shift after night shift (respects 8-hour overlap)
  - ✅ No 3 consecutive work days (prevents burnout)
  - ✅ 100% respect for employee availability
  - ✅ Vacation days honored
  - ✅ Holiday restrictions (no-work / morning-only)
  - ✅ Friday = morning shift only
  - ✅ Saturday = no shifts

- **Soft Constraints** (with priority weights):
  - ⭐ Fairness: Minimize shift count gap between employees
  - ⭐ Full coverage: Assign all shifts if possible
  - ⭐ Morning diversity: Every employee gets morning shifts
  - ⭐ Minimum load: At least 3 shifts per employee
  - ⭐ Shift type balance: Varied shift types per employee
  - ⭐ Avoid 8-8 patterns: Prevent evening→morning on consecutive days

### 🔐 Security & Authentication

- **JWT-based authentication** with bcrypt password hashing
- **Role-based access control** (Employee / Manager)
- **Token expiration** and automatic logout
- **Secure password storage** (never stored in plain text)

### 📊 Audit Logging

Every action is logged:
- Who made the change
- What was changed (before/after values)
- When it happened
- IP address and user agent
- Queryable audit trail for compliance

### 🎨 User Interface

- **Manager Dashboard**:
  - Generate/regenerate schedules
  - Lock/unlock specific shifts
  - Toggle employee active status
  - View optimization warnings
  - See availability summary

- **Employee Dashboard**:
  - Submit weekly availability
  - Add vacation/sick days
  - View published schedules
  - Add comments to specific shifts

---

## 🛠️ Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.5.3 | Type safety |
| **Vite** | 5.4.2 | Build tool & dev server |
| **Tailwind CSS** | 3.4.1 | Styling |
| **React Query** | Latest | Server state management |
| **Axios** | Latest | HTTP client |
| **Lucide React** | 0.344.0 | Icons |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | Runtime |
| **Express** | 4.21.2 | Web framework |
| **TypeScript** | 5.9.3 | Type safety |
| **MongoDB** | Atlas | Database |
| **Mongoose** | 8.19.2 | ODM |
| **JWT** | 9.0.2 | Authentication |
| **bcryptjs** | 3.0.2 | Password hashing |
| **Winston** | 3.18.3 | Logging |
| **Zod** | 4.1.12 | Validation |

### DevOps (Planned)

- Docker & Docker Compose
- GitHub Actions for CI/CD
- MongoDB Atlas for production database

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                  │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │   Login    │  │   Manager    │  │     Employee          │   │
│  │   Page     │  │  Dashboard   │  │     Dashboard         │   │
│  └────────────┘  └──────────────┘  └───────────────────────┘   │
│         │                │                       │               │
│         └────────────────┴───────────────────────┘               │
│                          │                                       │
│                    React Query                                   │
│                          │                                       │
│                     Axios HTTP                                   │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                      JWT Bearer Token
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                    Backend API (Express)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Middleware Layer                       │   │
│  │  • Authentication (JWT)                                   │   │
│  │  • Authorization (Role-based)                             │   │
│  │  • Error Handling                                         │   │
│  │  • Audit Logging                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────┴─────────────────────────────┐       │
│  │                    API Routes                        │       │
│  │  /api/auth         /api/employees  /api/schedules    │       │
│  │  /api/availabilities   /api/vacations  /api/holidays │       │
│  │  /api/audit                                          │       │
│  └──────────────────────────────────────────────────────┘       │
│                           │                                      │
│  ┌────────────────────────┴─────────────────────────────┐       │
│  │                   Controllers                        │       │
│  │  Business Logic + Data Validation                    │       │
│  └──────────────────────────────────────────────────────┘       │
│                           │                                      │
│  ┌────────────────────────┴─────────────────────────────┐       │
│  │                    Services                          │       │
│  │  • Optimization Algorithm (Constraint Programming)   │       │
│  │  • Schedule Generation                               │       │
│  │  • Schedule Validation                               │       │
│  └──────────────────────────────────────────────────────┘       │
│                           │                                      │
│  ┌────────────────────────┴─────────────────────────────┐       │
│  │                 Mongoose Models                      │       │
│  │  User | Availability | Schedule | Vacation | Holiday │       │
│  │  AuditLog                                            │       │
│  └──────────────────────────────────────────────────────┘       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                   MongoDB Atlas (Cloud)                          │
│  Collections: users, availabilities, schedules, vacations,       │
│               holidays, auditlogs                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- **MongoDB Atlas** account (free tier is fine)

### 1. MongoDB Atlas Setup

Follow the guide in [`backend/MONGODB_SETUP.md`](backend/MONGODB_SETUP.md) to:
1. Create MongoDB Atlas account
2. Create cluster (M0 free tier)
3. Create database user
4. Whitelist IP (0.0.0.0/0 for development)
5. Get connection string

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your MongoDB connection string

# Start development server
npm run dev
```

Backend will run on **http://localhost:5001**

### 3. Frontend Setup

```bash
cd ..  # Back to root directory

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on **http://localhost:5176**

### 4. Create First User

Use the API or register through the UI:

```bash
# Register manager account
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manager Admin",
    "email": "manager@company.com",
    "password": "password123",
    "role": "manager"
  }'
```

---

## 📚 API Documentation

### Base URL

```
http://localhost:5001/api
```

### Authentication

All protected routes require JWT token in header:

```
Authorization: Bearer <token>
```

### Endpoints

#### Auth

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (returns JWT)
- `GET /auth/me` - Get current user (requires auth)
- `POST /auth/logout` - Logout (audit log only)

#### Employees

- `GET /employees` - Get all employees
- `GET /employees/:id` - Get employee by ID
- `PUT /employees/:id` - Update employee (manager only)
- `PATCH /employees/:id/toggle-active` - Toggle active status (manager only)

#### Availabilities

- `GET /availabilities?weekStart=YYYY-MM-DD` - Get all availabilities for week
- `GET /availabilities/:employeeId?weekStart=YYYY-MM-DD` - Get employee availability
- `POST /availabilities` - Submit availability
- `PUT /availabilities/:id` - Update availability
- `DELETE /availabilities/:id` - Delete availability

#### Schedules

- `GET /schedules?weekStart=YYYY-MM-DD` - Get schedules
- `GET /schedules/week?weekStart=YYYY-MM-DD` - Get schedule for specific week
- `POST /schedules/generate` - Generate optimized schedule (manager only)
- `PUT /schedules/:id` - Update schedule (manager only)
- `PATCH /schedules/:id/publish` - Publish schedule (manager only)
- `PATCH /schedules/:id/lock` - Lock/unlock shift (manager only)

#### Vacations

- `GET /vacations?employeeId=...&startDate=...&endDate=...` - Get vacations
- `POST /vacations` - Create vacation (manager only)
- `DELETE /vacations/:id` - Delete vacation (manager only)

#### Holidays

- `GET /holidays?year=2025` - Get holidays
- `POST /holidays` - Create holiday (manager only)
- `PUT /holidays/:id` - Update holiday (manager only)
- `DELETE /holidays/:id` - Delete holiday (manager only)

#### Audit Logs

- `GET /audit?entityType=...&entityId=...&userId=...&limit=50` - Query audit logs (manager only)
- `GET /audit/:entityType/:entityId` - Get logs for specific entity (manager only)

---

## 🧮 Optimization Algorithm

### Algorithm Overview

The schedule generator uses a **greedy constraint satisfaction algorithm** with multiple attempts to find optimal solutions.

```typescript
for (attempt = 0; attempt < 50; attempt++) {
  1. Shuffle unassigned shifts (for variety)
  2. For each shift:
     a. Find all valid candidates (pass hard constraints)
     b. Score each candidate based on soft constraints
     c. Select best candidate
     d. Assign shift
  3. Calculate overall schedule quality
  4. Keep best schedule across all attempts
}
```

### Hard Constraints (Must Pass)

```typescript
function isValidCandidate(employee, day, shift) {
  return (
    hasAvailability(employee, day, shift) &&          // Employee marked available
    !onVacation(employee, day) &&                      // Not on vacation
    !hasOtherShiftToday(employee, day) &&              // Max 1 shift per day
    !hasNightToMorningConflict(employee, day, shift) && // No morning after night
    !hasThreeConsecutiveDays(employee, day) &&         // No 3 days in a row
    respectsHolidayRules(day, shift)                   // Holiday constraints
  );
}
```

### Soft Constraints (Scored)

```typescript
function scoreCandidate(employee, shift, allEmployees) {
  let score = 0;

  // Fairness: Prefer employees with fewer shifts
  const avgShifts = calculateAverage(allEmployees);
  const shiftGap = avgShifts - employee.totalShifts;
  score += shiftGap * 500; // High weight

  // Morning priority: Prefer employees without morning shifts yet
  if (shift === 'morning' && employee.morningShifts === 0) {
    score += 5000; // Very high weight
  }

  // Balance: Prefer different shift types
  const shiftTypeVariety = calculateVariety(employee.shifts);
  score += shiftTypeVariety * 300;

  // Minimum load: Bonus for employees with < 3 shifts
  if (employee.totalShifts < 3) {
    score += 1000;
  }

  return score;
}
```

### Quality Metrics

After generation, the schedule is analyzed:

- **Coverage**: % of shifts filled
- **Fairness**: Max shift count - Min shift count
- **Morning distribution**: % of employees with morning shifts
- **Warnings**: Which constraints couldn't be met

---

## 📁 Project Structure

```
project/
├── frontend/                    # React + Vite
│   ├── src/
│   │   ├── api/                 # API layer (Axios)
│   │   │   ├── axios.config.ts
│   │   │   └── auth.api.ts
│   │   ├── components/          # React components
│   │   │   ├── manager/         # Manager-specific
│   │   │   ├── employee/        # Employee-specific
│   │   │   ├── LoginForm.tsx
│   │   │   └── ScheduleView.tsx
│   │   ├── hooks/               # Custom hooks
│   │   │   └── useAuth.ts
│   │   ├── types/               # TypeScript types
│   │   ├── utils/               # Utilities
│   │   ├── data/                # Mock data (deprecated)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Node.js + Express
│   ├── src/
│   │   ├── models/              # Mongoose schemas
│   │   │   ├── User.ts
│   │   │   ├── Availability.ts
│   │   │   ├── Schedule.ts
│   │   │   ├── Vacation.ts
│   │   │   ├── Holiday.ts
│   │   │   └── AuditLog.ts
│   │   ├── routes/              # API routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── employee.routes.ts
│   │   │   ├── availability.routes.ts
│   │   │   ├── schedule.routes.ts
│   │   │   ├── vacation.routes.ts
│   │   │   ├── holiday.routes.ts
│   │   │   └── audit.routes.ts
│   │   ├── controllers/         # Business logic
│   │   ├── middleware/          # Auth, errors, audit
│   │   ├── services/            # Optimization algorithms
│   │   │   ├── optimizedScheduler.service.ts
│   │   │   ├── scheduleUtils.service.ts
│   │   │   └── schedule.service.ts
│   │   ├── utils/               # Logger, constants
│   │   ├── config/              # Database config
│   │   ├── types/               # TypeScript types
│   │   └── server.ts            # Entry point
│   ├── .env                     # Environment variables
│   ├── package.json
│   ├── tsconfig.json
│   └── MONGODB_SETUP.md
│
├── README.md                    # This file
└── docker-compose.yml           # (Planned) Full stack deployment
```

---

## 📊 Development Status

### ✅ Completed (Phase 1 & 2)

- [x] **Backend Infrastructure**
  - [x] Express + TypeScript setup
  - [x] MongoDB connection (Atlas)
  - [x] JWT authentication
  - [x] All Mongoose models (6 models)
  - [x] Error handling & logging

- [x] **API Endpoints**
  - [x] Auth routes (register, login, logout, me)
  - [x] Employee CRUD
  - [x] Availability CRUD
  - [x] Schedule CRUD + lock/publish
  - [x] Vacation CRUD
  - [x] Holiday CRUD
  - [x] Audit log queries

- [x] **Audit Logging**
  - [x] Automatic logging middleware
  - [x] All actions logged with before/after
  - [x] IP address and user agent tracking
  - [x] Queryable by entity, user, action, date

- [x] **Frontend Basics**
  - [x] React + TypeScript + Tailwind
  - [x] Manager Dashboard (with localStorage)
  - [x] Employee Dashboard
  - [x] Constraint Programming algorithm
  - [x] React Query & Axios installed

### 🚧 In Progress (Phase 3)

- [ ] **Frontend API Integration**
  - [x] Axios configuration with interceptors
  - [x] Auth API wrapper
  - [ ] Update useAuth to use API (replace localStorage)
  - [ ] Create React Query hooks for all entities
  - [ ] Update ManagerDashboard to fetch from API
  - [ ] Update Employee components to use API
  - [ ] Replace all localStorage calls with API

- [ ] **Schedule Generation**
  - [ ] Integrate optimization algorithm with backend
  - [ ] Test with real MongoDB data
  - [ ] Performance optimization

### 📅 Planned (Phase 4)

- [ ] **Migration Tools**
  - [ ] Script to import localStorage data to MongoDB
  - [ ] Data validation and cleanup

- [ ] **DevOps**
  - [ ] Docker setup for backend
  - [ ] Docker setup for frontend
  - [ ] Docker Compose for full stack
  - [ ] Environment-specific configs

- [ ] **Documentation**
  - [ ] Swagger/OpenAPI spec
  - [ ] Postman collection
  - [ ] Architecture diagrams

- [ ] **Testing**
  - [ ] Jest + Supertest for API
  - [ ] React Testing Library for frontend
  - [ ] Integration tests

- [ ] **Advanced Features**
  - [ ] Real-time updates (Socket.io)
  - [ ] Redis caching
  - [ ] Background job queue (Bull)
  - [ ] Email notifications
  - [ ] PDF export of schedules
  - [ ] Mobile app (React Native)

---

## 🎓 Learning & Showcase Value

This project demonstrates:

### Backend Development
- ✅ **RESTful API** design with proper HTTP methods and status codes
- ✅ **MongoDB & Mongoose** with schemas, indexes, and relationships
- ✅ **Authentication & Authorization** with JWT and role-based access
- ✅ **Security best practices** (bcrypt, token expiration, CORS)
- ✅ **Error handling** with custom error classes
- ✅ **Logging** with Winston (production-ready)
- ✅ **Audit trail** implementation
- ✅ **TypeScript** for type safety

### Frontend Development
- ✅ **React** with modern hooks
- ✅ **TypeScript** for type safety
- ✅ **State management** (Context API + planned React Query)
- ✅ **Responsive design** with Tailwind CSS
- ✅ **Form handling** and validation
- ✅ **Component architecture**

### Algorithms & Data Structures
- ✅ **Constraint satisfaction** problem solving
- ✅ **Greedy algorithms** with heuristics
- ✅ **Optimization** with scoring functions
- ✅ **Multi-criteria decision making**

### Software Engineering
- ✅ **Clean architecture** (separation of concerns)
- ✅ **Design patterns** (middleware, dependency injection)
- ✅ **API versioning** ready
- ✅ **Scalable code structure**
- ✅ **Documentation**

---

## 🤝 Contributing

This is a portfolio project, but suggestions and feedback are welcome!

---

## 📝 License

ISC

---

## 👨‍💻 Author

**[Your Name]**

Built as a full-stack TypeScript showcase project demonstrating modern web development practices, database design, and algorithm implementation.

---

## 🔗 Resources

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Express.js](https://expressjs.com/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [JWT](https://jwt.io/)
- [TanStack Query](https://tanstack.com/query/)

---

**Last Updated**: October 2025
