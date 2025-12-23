# ✅ Critical Fix: Managers Excluded from Shift Scheduling

## 🔴 Problem Identified

**Managers/admins were being included in shift assignments**, which is incorrect.

**Only employees with `role === 'employee'` should be scheduled for shifts.**

---

## Root Cause

In `backend/src/services/schedule.service.ts` line 55, the database query fetched **ALL active users** without filtering by role:

```typescript
// BEFORE (WRONG):
const employees = await User.find({ isActive: true }).select('-password');
```

This query returned:
- ✅ Employees (correct)
- ❌ Managers/admins (WRONG!)

The scheduling algorithm then tried to assign shifts to managers, causing incorrect schedules.

---

## Fix Applied

Added `role: 'employee'` filter to the MongoDB query:

```typescript
// AFTER (CORRECT):
const employees = await User.find({ isActive: true, role: 'employee' }).select('-password');
```

**File Changed:**
- [`backend/src/services/schedule.service.ts`](backend/src/services/schedule.service.ts) line 55

---

## Impact

### Before Fix:
- ❌ Managers could be assigned to shifts
- ❌ Reduced available slots for actual employees
- ❌ Managers might appear in employee shift rotations
- ❌ Availability system confusion (managers shouldn't submit availability)

### After Fix:
- ✅ **Only employees** are considered for shift assignments
- ✅ Managers completely excluded from scheduling algorithm
- ✅ Correct number of employees available for shifts
- ✅ Clean separation: managers manage, employees work shifts

---

## How the Scheduling Flow Works Now

```
User clicks "צור סידור"
    ↓
Backend: schedule.controller.ts calls ScheduleService.getScheduleData()
    ↓
Backend: schedule.service.ts queries database
    ↓
MongoDB Query: { isActive: true, role: 'employee' }  ← ONLY EMPLOYEES!
    ↓
Returns: Only users with role='employee'
    ↓
OR-Tools/Greedy Algorithm: Assigns shifts to employees only
    ↓
Schedule created with employees only
```

---

## Testing the Fix

### Test Case 1: Verify Manager Exclusion

1. **Check your users:**
   - Identify who has `role: 'manager'` in your database
   - Note their names

2. **Generate a schedule:**
   - Click "צור סידור" (Generate Schedule)

3. **Verify:**
   - Check the schedule grid
   - **Managers should NOT appear** in any shift assignment
   - Only employees should be scheduled

### Test Case 2: Check Console Logs

When you generate a schedule, check the backend console:

```bash
[OR-Tools] 👥 Employee Availability Summary:
[OR-Tools]    Employee Name 1: 13/13 shifts available
[OR-Tools]    Employee Name 2: 9/13 shifts available
[OR-Tools]    Employee Name 3: 7/13 shifts available
```

**Verify:** Only employee names appear in this list, NOT manager names.

### Test Case 3: Database Check

You can verify directly in MongoDB:

```javascript
// Should return only employees, NOT managers
db.users.find({ isActive: true, role: 'employee' })
```

---

## Who Should Have Which Role?

### `role: 'employee'`
- Works shifts
- Submits availability
- Gets assigned to shifts
- **Included in scheduling**

### `role: 'manager'` or `role: 'admin'`
- Manages schedules
- Approves/publishes schedules
- Views reports
- **Excluded from scheduling**

---

## Related Files

The role check cascades through the system:

1. **Backend Query** (FIXED):
   - `backend/src/services/schedule.service.ts` line 55
   - Queries only `role: 'employee'`

2. **OR-Tools Solver**:
   - `backend/scripts/optimize_schedule.py`
   - Receives only employees from backend
   - No changes needed here

3. **Frontend Display**:
   - `src/components/ScheduleView.tsx`
   - Receives only employees from backend
   - No changes needed here (already has debug logging)

---

## Why This Bug Happened

The original code assumed filtering would happen elsewhere, but:
- No explicit role filter existed
- `isActive: true` alone isn't enough
- Managers are also "active users"
- Need explicit `role: 'employee'` filter

---

## Additional Validation

If you want extra safety, you can add a validation check in the controller:

```typescript
// In schedule.controller.ts, after getScheduleData():
const nonEmployees = data.employees.filter(emp => emp.role !== 'employee');
if (nonEmployees.length > 0) {
  console.error('⚠️ Warning: Non-employees found in scheduling data:', nonEmployees);
  throw new AppError('Invalid employee data: contains non-employees', 500);
}
```

This would catch the issue early if the query filter fails for any reason.

---

## Summary

**Critical Fix Applied:**
- ✅ Added `role: 'employee'` filter to database query
- ✅ Managers now completely excluded from shift scheduling
- ✅ Only actual employees are considered for shifts

**Files Modified:**
- `backend/src/services/schedule.service.ts` (1 line changed)

**Impact:**
- Fixes incorrect shift assignments
- Ensures only employees work shifts
- Maintains proper role separation

**This was a critical bug that could cause scheduling errors. The fix is simple but essential!**
