import { Request, Response } from 'express';
import { User } from '../models';
import { AppError, AuthRequest } from '../middleware';
import { createAuditLog } from '../middleware/auditLogger';

export const createEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  // Validation
  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
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
