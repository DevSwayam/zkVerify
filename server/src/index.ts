import express, { Application } from 'express';
import cors from 'cors';
import { config, validateConfig } from './config';
import { errorHandler, requestLogger, generalLimiter } from './middleware';
import routes from './routes';
import { Logger } from './utils';

// Validate configuration before starting
validateConfig();

// Initialize Express app
const app: Application = express();

// Trust proxy for production deployment
app.set('trust proxy', 1);

// Global middleware - Allow all origins (no CORS restrictions)
app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// Rate limiting
app.use(generalLimiter);

// Mount all routes
app.use('/', routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  Logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    Logger.info('HTTP server closed');
    
    // Exit process
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    Logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Start server
const server = app.listen(config.port, () => {
  Logger.info(`🚀 Server running on port ${config.port}`);
  Logger.info(`📡 Health check: http://localhost:${config.port}/health`);
  Logger.info(`📚 API docs: http://localhost:${config.port}/`);
  Logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', { error });
  process.exit(1);
});

export default app; 