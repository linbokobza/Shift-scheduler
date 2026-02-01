import { Request, Response } from 'express';
import { User, Schedule } from '../models';
import { AppError, AuthRequest } from '../middleware';
import { createAuditLog } from '../middleware/auditLogger';
import { formatDate } from '../services/dateUtils.service';

export const createEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  // Validation
  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  // Password validation: min 8 chars, 1 uppercase, 1 lowercase, 1 digit
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new AppError('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 digit', 400);
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already in use', 400);
  }

  // Create new employee
  const employee = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: role || 'employee',
    isActive: true,
  });

  // Audit log
  await createAuditLog(req, {
    action: 'UPDATE_EMPLOYEE',
    entityType: 'employee',
    entityId: employee._id,
    changes: {
      action: 'created',
      employee: {
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    },
  });

  res.status(201).json({
    message: 'Employee created successfully',
    employee: {
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      isActive: employee.isActive,
    },
  });
};

export const getAllEmployees = async (_req: Request, res: Response): Promise<void> => {
  const employees = await User.find().select('-password').sort({ name: 1 });

  res.status(200).json({
    employees: employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      role: emp.role,
      isActive: emp.isActive,
    })),
  });
};

export const getEmployee = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const employee = await User.findById(id).select('-password');

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  res.status(200).json({
    employee: {
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      isActive: employee.isActive,
    },
  });
};

export const updateEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, email, role, isActive } = req.body;

  const employee = await User.findById(id);

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  // Store old values for audit log
  const oldValues = {
    name: employee.name,
    email: employee.email,
    role: employee.role,
    isActive: employee.isActive,
  };

  // Update fields
  if (name !== undefined) employee.name = name;
  if (email !== undefined) employee.email = email;
  if (role !== undefined) employee.role = role;
  if (isActive !== undefined) employee.isActive = isActive;

  await employee.save();

  // Audit log
  await createAuditLog(req, {
    action: 'UPDATE_EMPLOYEE',
    entityType: 'employee',
    entityId: employee._id,
    changes: {
      from: oldValues,
      to: {
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: employee.isActive,
      },
    },
  });

  res.status(200).json({
    message: 'Employee updated successfully',
    employee: {
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      isActive: employee.isActive,
    },
  });
};

export const toggleEmployeeActive = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const employee = await User.findById(id);

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  const oldStatus = employee.isActive;
  employee.isActive = !employee.isActive;
  await employee.save();

  // Audit log
  await createAuditLog(req, {
    action: 'TOGGLE_EMPLOYEE_ACTIVE',
    entityType: 'employee',
    entityId: employee._id,
    changes: {
      isActive: { from: oldStatus, to: employee.isActive },
    },
  });

  res.status(200).json({
    message: `Employee ${employee.isActive ? 'activated' : 'deactivated'} successfully`,
    employee: {
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      isActive: employee.isActive,
    },
  });
};

export const deleteEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const removeFromSchedules = req.query.removeFromSchedules === 'true';
  const confirmDelete = req.query.confirm === 'true';

  // 1. Validate employee exists
  const employee = await User.findById(id);
  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  // Prevent deleting managers
  if (employee.role === 'manager') {
    throw new AppError('Cannot delete manager accounts', 400);
  }

  // 2. Check for future schedule assignments
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureSchedules = await Schedule.find({
    weekStart: { $gte: today }
  });

  // Check if employee is in any future schedules
  const schedulesWithEmployee: Array<{
    scheduleId: string;
    weekStart: string;
    isPublished: boolean;
    assignmentCount: number;
  }> = [];

  futureSchedules.forEach(schedule => {
    let assignmentCount = 0;
    const assignments = schedule.assignments as any;

    assignments.forEach((dayMap: Map<string, any>) => {
      dayMap.forEach((employeeId: any) => {
        if (employeeId && employeeId.toString() === id) {
          assignmentCount++;
        }
      });
    });

    if (assignmentCount > 0) {
      schedulesWithEmployee.push({
        scheduleId: schedule._id.toString(),
        weekStart: formatDate(schedule.weekStart),
        isPublished: schedule.isPublished,
        assignmentCount
      });
    }
  });

  // 3. If not confirmed, just return info without deleting
  if (!confirmDelete) {
    if (schedulesWithEmployee.length > 0) {
      // Has conflicts - return conflict info
      res.status(200).json({
        hasScheduleConflicts: true,
        employee: {
          id: employee._id.toString(),
          name: employee.name,
          email: employee.email,
        },
        futureSchedules: schedulesWithEmployee,
        message: 'Employee is assigned to future schedules'
      });
    } else {
      // No conflicts - return ready to delete
      res.status(200).json({
        hasScheduleConflicts: false,
        employee: {
          id: employee._id.toString(),
          name: employee.name,
          email: employee.email,
        },
        message: 'Employee can be deleted'
      });
    }
    return;
  }

  // 4. Remove from schedules if confirmed
  if (schedulesWithEmployee.length > 0 && removeFromSchedules) {
    try {
      for (const scheduleInfo of schedulesWithEmployee) {
        const schedule = await Schedule.findById(scheduleInfo.scheduleId);
        if (!schedule) continue;

        const assignments = schedule.assignments as any as Map<string, Map<string, any>>;

        assignments.forEach((dayMap) => {
          dayMap.forEach((employeeId, shiftId) => {
            if (employeeId && employeeId.toString() === id) {
              dayMap.set(shiftId, null); // Set to null, keep structure
            }
          });
        });

        await schedule.save();
      }
    } catch (error) {
      throw new AppError('Failed to remove employee from schedules', 500);
    }
  }

  // 5. Store employee info for audit log (before deletion)
  const employeeInfo = {
    id: employee._id.toString(),
    name: employee.name,
    email: employee.email,
    role: employee.role,
    isActive: employee.isActive,
  };

  // 6. Hard delete the user
  await User.findByIdAndDelete(id);

  // 7. Create audit log (preserves historical record)
  await createAuditLog(req, {
    action: 'DELETE_EMPLOYEE',
    entityType: 'employee',
    entityId: employee._id,
    changes: {
      deletedEmployee: employeeInfo,
      removedFromSchedules: schedulesWithEmployee.length > 0,
      scheduleCount: schedulesWithEmployee.length,
    },
  });

  // 8. Success response
  res.status(200).json({
    message: 'Employee deleted successfully',
    hasScheduleConflicts: false,
    employee: employeeInfo,
    removedFromSchedules: schedulesWithEmployee.length > 0,
    scheduleCount: schedulesWithEmployee.length,
  });
};
