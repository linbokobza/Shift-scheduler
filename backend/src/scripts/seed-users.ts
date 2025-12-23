import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models';
import { logger } from '../utils/logger';

dotenv.config();

const users = [
  {
    name: 'אלון מנהל',
    email: 'manager@company.com',
    password: 'password',
    role: 'manager',
    isActive: true,
  },
  {
    name: 'דניאל כהן',
    email: 'daniel@company.com',
    password: 'password',
    role: 'employee',
    isActive: true,
  },
  {
    name: 'שרה לוי',
    email: 'sarah@company.com',
    password: 'password',
    role: 'employee',
    isActive: true,
  },
  {
    name: 'מיכאל דוד',
    email: 'michael@company.com',
    password: 'password',
    role: 'employee',
    isActive: true,
  },
  {
    name: 'רחל אברהם',
    email: 'rachel@company.com',
    password: 'password',
    role: 'employee',
    isActive: false,
  },
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-scheduler';
    await mongoose.connect(mongoUri);
    logger.info('✅ Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    logger.info('🗑️  Cleared existing users');

    // Create users
    for (const userData of users) {
      await User.create(userData);
      logger.info(`👤 Created user: ${userData.email}`);
    }

    logger.info('✅ Seed completed successfully!');
    logger.info('\nYou can now login with:');
    logger.info('  Manager: manager@company.com / password');
    logger.info('  Employee: daniel@company.com / password');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedUsers();
