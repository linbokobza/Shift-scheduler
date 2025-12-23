import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';

import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler, csrfTokenMiddleware } from './middleware';

// Routes
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import availabilityRoutes from './routes/availability.routes';
import scheduleRoutes from './routes/schedule.routes';
import vacationRoutes from './routes/vacation.routes';
import holidayRoutes from './routes/holiday.routes';
import auditRoutes from './routes/audit.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      logger.warn(`Non-HTTPS request detected: ${req.method} ${req.url}`);
      // Optionally redirect to HTTPS
      // res.redirect(`https://${req.header('host')}${req.url}`);
    }
    // Add security headers
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// CSRF Token middleware - attach token to all responses
app.use(csrfTokenMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/availabilities', availabilityRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/vacations', vacationRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
