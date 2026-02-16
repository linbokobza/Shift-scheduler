import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';
import 'express-async-errors';

import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler, csrfTokenMiddleware } from './middleware';

// Routes
import healthRoutes from './routes/health.routes';
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

// Security middleware - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS middleware - support multiple origins (localhost + ngrok)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, _res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      logger.warn(`Non-HTTPS request detected: ${req.method} ${req.url}`);
      // Optionally redirect to HTTPS
      // res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// CSRF Token middleware - attach token to all responses
app.use(csrfTokenMiddleware);

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/availabilities', availabilityRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/vacations', vacationRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/audit', auditRoutes);

// Serve frontend static files in production/ngrok mode
const frontendBuildPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendBuildPath));

// All non-API routes serve the frontend (SPA fallback)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// 404 handler (only for API routes now)
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

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
export default app;
