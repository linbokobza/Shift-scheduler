# 🚀 Quick Start Guide

Get the Shift Scheduler up and running in 5 minutes!

## Prerequisites

- Node.js 20+ installed
- MongoDB Atlas account (created and configured)

## Step 1: Backend Setup

```bash
cd backend

# Install dependencies (if not already done)
npm install

# Make sure .env is configured with your MongoDB Atlas connection string
# The file should already exist with your settings

# Seed the database with initial users
npm run seed

# Start backend server
npm run dev
```

✅ Backend should now be running on **http://localhost:5001**

## Step 2: Frontend Setup

```bash
# Open a new terminal
cd ..  # Back to project root

# Install dependencies (if not already done)
npm install

# Start frontend
npm run dev
```

✅ Frontend should now be running on **http://localhost:5176**

## Step 3: Login

Open your browser to **http://localhost:5176**

**Login credentials:**

**Manager Account:**
- Email: `manager@company.com`
- Password: `password`

**Employee Accounts:**
- Email: `daniel@company.com` / Password: `password`
- Email: `sarah@company.com` / Password: `password`
- Email: `michael@company.com` / Password: `password`

## What You Can Do Now

### As Manager:
1. ✅ View all employees
2. ✅ Toggle employee active/inactive status
3. ✅ Generate schedules (optimization algorithm)
4. ✅ Lock/unlock specific shifts
5. ✅ View availability submissions
6. ✅ Add holidays and vacations

### As Employee:
1. ✅ Submit weekly availability (constraints)
2. ✅ Add vacation days
3. ✅ View published schedules
4. ✅ Add comments to shifts

## API Endpoints

Backend API is available at `http://localhost:5001/api`

### Test the API:

```bash
# Health check
curl http://localhost:5001/health

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@company.com","password":"password"}'

# Get employees (requires token)
curl http://localhost:5001/api/employees \
  -H "Authorization: Bearer <your-token-here>"
```

## Architecture

```
Frontend (React + Vite)     Backend (Node.js + Express)     Database
Port 5176                   Port 5001                       MongoDB Atlas
     │                           │                                │
     ├── React Query ───────────→ REST API ─────────────────────→ Collections:
     │   (data fetching)         (JWT Auth)                      - users
     │                           │                                - availabilities
     └── Axios ─────────────────→ Controllers ──────────────────→ - schedules
         (HTTP client)           │                                - vacations
                                 └── Services                     - holidays
                                     (Optimization)               - auditlogs
```

## Features Working

### ✅ Completed:
- Authentication (JWT)
- User management
- All backend API endpoints
- React Query setup
- Axios configuration
- Database seeding

### 🚧 In Progress:
- Frontend components using API (currently using localStorage)
- Schedule generation integration
- Full end-to-end testing

## Troubleshooting

### Backend won't start
- Check MongoDB connection string in `backend/.env`
- Make sure MongoDB Atlas IP whitelist includes `0.0.0.0/0`

### Frontend can't connect to backend
- Make sure backend is running on port 5001
- Check browser console for CORS errors
- Verify `.env` file exists in project root with `VITE_API_URL=http://localhost:5001/api`

### Login doesn't work
- Make sure you ran `npm run seed` in the backend directory
- Check backend console for error messages
- Try opening DevTools (F12) and checking Network tab

## Next Steps

1. **Test Authentication**: Try logging in with different accounts
2. **Explore API**: Use the backend API endpoints
3. **Frontend Integration**: Components will gradually migrate from localStorage to API
4. **Add Data**: Create availabilities, vacations, and generate schedules

## Development Commands

**Backend:**
```bash
npm run dev      # Start dev server with hot reload
npm run build    # Build for production
npm run start    # Run production build
npm run seed     # Reset and seed database
```

**Frontend:**
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## File Structure

```
project/
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── models/    # Mongoose schemas
│   │   ├── routes/    # API routes
│   │   ├── controllers/
│   │   └── server.ts
│   └── package.json
│
├── src/               # React frontend
│   ├── api/           # API wrappers
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks
│   └── App.tsx
│
├── README.md          # Full documentation
└── QUICKSTART.md      # This file
```

## Getting Help

- Check [README.md](README.md) for full documentation
- Check backend logs in terminal for API errors
- Check browser console (F12) for frontend errors
- MongoDB Atlas dashboard for database inspection

---

**Happy Scheduling!** 🎉
