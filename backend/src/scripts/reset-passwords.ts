import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

dotenv.config();

async function resetPasswords() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-scheduler';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Direct update bypassing mongoose validation and hooks
    const db = mongoose.connection.db;
    const usersCollection = db!.collection('users');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password1', salt);

    const result = await usersCollection.updateMany(
      {},
      { $set: { password: hashedPassword } }
    );

    logger.info(`Updated ${result.modifiedCount} users' passwords to Password1`);

    // Verify by listing users
    const users = await usersCollection.find({}, { projection: { email: 1, password: 1 } }).toArray();
    for (const user of users) {
      const match = await bcrypt.compare('Password1', user.password);
      logger.info(`${user.email} - password verify: ${match}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Failed:', error);
    process.exit(1);
  }
}

resetPasswords();
