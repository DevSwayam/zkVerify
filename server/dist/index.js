"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const middleware_1 = require("./middleware");
const routes_1 = __importDefault(require("./routes"));
const utils_1 = require("./utils");
// Validate configuration before starting
(0, config_1.validateConfig)();
// Initialize Express app
const app = (0, express_1.default)();
// Trust proxy for production deployment
app.set('trust proxy', 1);
// Global middleware - Allow all origins (no CORS restrictions)
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware
app.use(middleware_1.requestLogger);
// Rate limiting
app.use(middleware_1.generalLimiter);
// Mount all routes
app.use('/', routes_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        timestamp: new Date().toISOString()
    });
});
// Global error handler (must be last)
app.use(middleware_1.errorHandler);
// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    utils_1.Logger.info(`Received ${signal}, starting graceful shutdown...`);
    // Close server
    server.close(() => {
        utils_1.Logger.info('HTTP server closed');
        // Exit process
        process.exit(0);
    });
    // Force close after 30 seconds
    setTimeout(() => {
        utils_1.Logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};
// Start server
const server = app.listen(config_1.config.port, () => {
    utils_1.Logger.info(`🚀 Server running on port ${config_1.config.port}`);
    utils_1.Logger.info(`📡 Health check: http://localhost:${config_1.config.port}/health`);
    utils_1.Logger.info(`📚 API docs: http://localhost:${config_1.config.port}/`);
    utils_1.Logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    utils_1.Logger.error('Unhandled Rejection at:', { promise, reason });
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    utils_1.Logger.error('Uncaught Exception:', { error });
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map