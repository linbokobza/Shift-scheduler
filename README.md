# 🚀 Shift Scheduler - Intelligent Workforce Management System

> **Full-Stack TypeScript application with advanced constraint programming for optimal shift scheduling**

[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/cloud/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)


## 🎯 Overview

A sophisticated shift scheduling system that automates workforce planning using **constraint programming** and **optimization algorithms**. The system respects complex constraints (availability, vacation days, labor laws) while maximizing fairness and coverage.
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

---

## 🛠️ Technology Stack

**Frontend:** React 18 • TypeScript • Vite • Tailwind CSS • React Query • Axios • Lucide Icons

**Backend:** Node.js • Express • TypeScript • MongoDB Atlas • Mongoose • JWT • bcrypt • Winston

**Key Features:**
- 🔐 JWT Authentication with bcrypt password hashing
- 🗄️ MongoDB Atlas cloud database with Mongoose ODM
- 🧮 Custom constraint programming optimization algorithm
- 📊 React Query for efficient server state management
- ✅ Zod for runtime type validation and data integrity

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

**Prerequisites:** Node.js 20+ • MongoDB Atlas account ([setup guide](backend/MONGODB_SETUP.md))

```bash
# 1. Backend Setup
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB connection string
npm run dev  # Runs on http://localhost:5001

# 2. Frontend Setup (new terminal)
cd ..
npm install
npm run dev  # Runs on http://localhost:5176
```

**Create First User:**
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Manager","email":"manager@company.com","password":"password123","role":"manager"}'
```

---

## 📚 API Documentation

**Base URL:**
- Development: `http://localhost:5001/api`
- Production: `https://your-domain.com/api` (update after deployment)

**Authentication:** All protected routes require `Authorization: Bearer <token>` header

### Main Endpoints

**Auth**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

**Employees**
- `GET /employees` - List all employees
- `PATCH /employees/:id/toggle-active` - Toggle employee status (manager)

**Availabilities**
- `GET /availabilities?weekStart=YYYY-MM-DD` - Get weekly availability
- `POST /availabilities` - Submit availability

**Schedules**
- `POST /schedules/generate` - Generate optimized schedule (manager)
- `GET /schedules/week?weekStart=YYYY-MM-DD` - Get weekly schedule
- `PATCH /schedules/:id/publish` - Publish schedule (manager)

**Vacations & Holidays**
- `POST /vacations` - Add vacation (manager)
- `POST /holidays` - Add holiday (manager)

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
