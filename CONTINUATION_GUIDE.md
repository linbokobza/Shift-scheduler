# 🚀 Continuation Guide - How to Complete the Project

## Current Status: 85% Complete ✅

**What's Done:**
- ✅ Backend API (100%)
- ✅ MongoDB Database (100%)
- ✅ Authentication (100%)
- ✅ React Query Hooks (100%)
- ✅ API Wrappers (100%)
- ✅ Docker Setup (100%)

**What's Left:**
- ⏳ Connect Dashboard Components to API (15% remaining)

---

## 🎯 Task: Update 2 Components to Use API

You only need to update **2 main files** to complete the project:

### 1. ManagerDashboard.tsx (Main Priority)
### 2. EmployeeDashboard.tsx (Secondary)

---

## 📝 Step-by-Step Guide

### Step 1: Update ManagerDashboard.tsx

**File**: `src/components/manager/ManagerDashboard.tsx`

**Current Code (uses localStorage)**:
```typescript
const [employees, setEmployees] = useState<User[]>(USERS);
const [availabilities, setAvailabilities] = useState<Availability[]>([]);

useEffect(() => {
  const savedEmployees = localStorage.getItem('employees');
  setEmployees(savedEmployees ? JSON.parse(savedEmployees) : USERS);
}, []);
```

**Change to (uses API)**:
```typescript
import { useEmployees, useToggleEmployeeActive } from '../../hooks/useEmployees';
import { useAvailabilities } from '../../hooks/useAvailabilities';
import { useScheduleByWeek, useGenerateSchedule } from '../../hooks/useSchedules';

// Inside component:
const { data: employees, isLoading: employeesLoading } = useEmployees();
const { data: availabilities, isLoading: availabilitiesLoading } = useAvailabilities(weekStartString);
const { data: currentSchedule, isLoading: scheduleLoading } = useScheduleByWeek(weekStartString);

const toggleMutation = useToggleEmployeeActive();
const generateMutation = useGenerateSchedule();

const handleToggleActive = (employeeId: string) => {
  toggleMutation.mutate(employeeId);
};

const handleGenerateSchedule = () => {
  generateMutation.mutate(weekStartString);
};
```

**Loading State**:
```typescript
if (employeesLoading || availabilitiesLoading) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">טוען נתונים...</p>
      </div>
    </div>
  );
}
```

---

### Step 2: Update EmployeeDashboard.tsx

**File**: `src/components/employee/EmployeeDashboard.tsx`

**Current Code (uses localStorage)**:
```typescript
const [availabilities, setAvailabilities] = useState<Availability[]>([]);

useEffect(() => {
  const saved = localStorage.getItem('availabilities');
  setAvailabilities(saved ? JSON.parse(saved) : []);
}, []);
```

**Change to (uses API)**:
```typescript
import { useEmployeeAvailability, useCreateAvailability } from '../../hooks/useAvailabilities';
import { useAuth } from '../../hooks/useAuth';

// Inside component:
const { user } = useAuth();
const { data: availability } = useEmployeeAvailability(user?.id || '', weekStartString);
const createMutation = useCreateAvailability();

const handleSubmitAvailability = (shifts: Availability['shifts']) => {
  createMutation.mutate({
    employeeId: user!.id,
    weekStart: weekStartString,
    shifts,
  });
};
```

---

## 🔧 Quick Reference - React Query Hooks

### Available Hooks:

```typescript
// Employees
useEmployees()                           // Get all employees
useEmployee(id)                          // Get one employee
useUpdateEmployee()                      // Update employee
useToggleEmployeeActive()                // Toggle active/inactive

// Availabilities
useAvailabilities(weekStart?)            // Get all for week
useEmployeeAvailability(empId, week)     // Get employee's availability
useCreateAvailability()                  // Create new
useUpdateAvailability()                  // Update existing
useDeleteAvailability()                  // Delete

// Schedules
useSchedules(weekStart?)                 // Get all schedules
useScheduleByWeek(weekStart)             // Get schedule for week
useGenerateSchedule()                    // Generate new schedule
useUpdateSchedule()                      // Update schedule
usePublishSchedule()                     // Publish schedule
useLockShift()                           // Lock/unlock shift

// Vacations & Holidays
useVacations(params?)                    // Get vacations
useCreateVacation()                      // Create vacation
useDeleteVacation()                      // Delete vacation
useHolidays(year?)                       // Get holidays
useCreateHoliday()                       // Create holiday
useUpdateHoliday()                       // Update holiday
useDeleteHoliday()                       // Delete holiday
```

---

## 💡 Example: Complete Migration Pattern

**Before (localStorage)**:
```typescript
const ManagerDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('employees');
    setEmployees(saved ? JSON.parse(saved) : []);
  }, []);

  const handleToggleActive = (id: string) => {
    setEmployees(prev => {
      const updated = prev.map(emp =>
        emp.id === id ? { ...emp, isActive: !emp.isActive } : emp
      );
      localStorage.setItem('employees', JSON.stringify(updated));
      return updated;
    });
  };

  return <EmployeeList employees={employees} onToggleActive={handleToggleActive} />;
};
```

**After (API with React Query)**:
```typescript
import { useEmployees, useToggleEmployeeActive } from '../../hooks/useEmployees';

const ManagerDashboard = () => {
  const { data: employees, isLoading } = useEmployees();
  const toggleMutation = useToggleEmployeeActive();

  const handleToggleActive = (id: string) => {
    toggleMutation.mutate(id);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <EmployeeList employees={employees || []} onToggleActive={handleToggleActive} />;
};
```

---

## 🧪 Testing After Changes

### 1. Test Authentication
```bash
# Open browser to http://localhost:5176
# Login with: manager@company.com / password
# Check DevTools → Network tab
# Should see API calls to localhost:5001
```

### 2. Test Employee Management
```bash
# Toggle employee active/inactive
# Check Network tab → PATCH /api/employees/:id/toggle-active
# Verify MongoDB Atlas → Browse Collections → users
```

### 3. Test Availability Submission
```bash
# Login as employee: daniel@company.com / password
# Submit availability
# Check Network tab → POST /api/availabilities
# Verify MongoDB → availabilities collection
```

### 4. Test Schedule Generation
```bash
# Login as manager
# Click "צור מחדש" (Generate)
# Check Network tab → POST /api/schedules/generate
# Verify MongoDB → schedules collection
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "No token provided"
**Solution**: Make sure user is logged in. Token is in localStorage as 'authToken'

### Issue 2: Data doesn't update after mutation
**Solution**: React Query should auto-invalidate. Check the hook's `onSuccess` callback.

### Issue 3: CORS errors
**Solution**: Check backend/.env has `CORS_ORIGIN=http://localhost:5176`

### Issue 4: Empty data on first load
**Solution**: Run `npm run seed` in backend to create initial data

---

## 📊 Progress Checklist

### Core Functionality
- [ ] ManagerDashboard uses `useEmployees()`
- [ ] Toggle employee works with API
- [ ] EmployeeDashboard uses `useAvailabilities()`
- [ ] Submit availability works with API
- [ ] Schedule generation works
- [ ] Data persists in MongoDB
- [ ] Audit logs created

### Nice to Have
- [ ] Loading states for all queries
- [ ] Error handling with toasts
- [ ] Optimistic updates
- [ ] Skeleton screens

---

## 🚀 Deployment Checklist

### Before Production:

1. **Environment Variables**
   ```bash
   # backend/.env.production
   MONGODB_URI=<production-mongodb-url>
   JWT_SECRET=<strong-secret-key>
   CORS_ORIGIN=https://yourdomain.com
   NODE_ENV=production
   ```

2. **Build Frontend**
   ```bash
   npm run build
   # Output: dist/ folder
   ```

3. **Build Backend**
   ```bash
   cd backend
   npm run build
   # Output: dist/ folder
   ```

4. **Docker Deployment**
   ```bash
   docker-compose up -d
   ```

---

## 📚 Resources

### Files to Reference
- `src/hooks/useEmployees.ts` - Example React Query hook
- `src/api/employee.api.ts` - Example API wrapper
- `STATUS.md` - Current project status
- `README.md` - Complete documentation

### Documentation
- [React Query Docs](https://tanstack.com/query/latest)
- [Axios Docs](https://axios-http.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

## 💪 You've Got This!

The hardest part is done! You just need to:
1. Replace `useState` with React Query hooks
2. Replace `localStorage` with API calls
3. Add loading states
4. Test everything

**Estimated Time**: 2-3 hours of focused work

**Result**: A professional Full Stack application ready for your portfolio!

---

## 🎯 Final Goal

```typescript
// From this (localStorage):
const [data, setData] = useState([]);
useEffect(() => {
  const saved = localStorage.getItem('key');
  setData(JSON.parse(saved));
}, []);

// To this (API):
const { data, isLoading } = useQueryHook();
```

**Simple as that!** 🎉

---

Good luck! If you get stuck, check the console for errors and the Network tab to see API calls.

**You're almost there!** 🚀
