import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-scheduler';

    await mongoose.connect(mongoUri);

    logger.info('✅ MongoDB connected successfully');
    logger.info(`📊 Database: ${mongoose.connection.name}`);
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  logger.error('❌ MongoDB error:', error);
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('👋 MongoDB connection closed through app termination');
  process.exit(0);
});
