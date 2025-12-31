import { User } from '../../models';
import jwt from 'jsonwebtoken';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'employee';
  token: string;
}

export async function createTestUser(
  name: string,
  email: string,
  password: string = 'password123',
  role: 'manager' | 'employee' = 'employee'
): Promise<TestUser> {
  const user = await User.create({
    name,
    email,
    password,
    role,
    isActive: true,
  });

  const jwtSecret = process.env.JWT_SECRET || 'test-secret-key';
  const token = jwt.sign({ userId: user._id }, jwtSecret, {
    expiresIn: '7d',
  } as jwt.SignOptions);

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as 'manager' | 'employee',
    token,
  };
}

export async function createTestManager(): Promise<TestUser> {
  return createTestUser('Test Manager', 'manager@test.com', 'password123', 'manager');
}

export async function createTestEmployee(name?: string, email?: string): Promise<TestUser> {
  return createTestUser(
    name || 'Test Employee',
    email || `employee${Date.now()}@test.com`,
    'password123',
    'employee'
  );
}

export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const weekStart = new Date(now.setDate(diff));
  return formatDate(weekStart);
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
