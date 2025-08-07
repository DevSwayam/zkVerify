"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../errors");
const utils_1 = require("../utils");
const response_1 = require("../utils/response");
const errorHandler = (error, req, res, next) => {
    // Log the error
    utils_1.Logger.error('Unhandled error', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
    });
    // If response was already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(error);
    }
    // Handle known application errors
    if (error instanceof errors_1.AppError) {
        response_1.ResponseUtil.error(res, error.message, error.statusCode);
        return;
    }
    // Handle validation errors
    if (error.name === 'ValidationError') {
        response_1.ResponseUtil.error(res, error.message, 400);
        return;
    }
    // Handle MongoDB cast errors
    if (error.name === 'CastError') {
        response_1.ResponseUtil.error(res, 'Invalid ID format', 400);
        return;
    }
    // Handle duplicate key errors (MongoDB)
    if (error.name === 'MongoServerError' && error.code === 11000) {
        response_1.ResponseUtil.error(res, 'Duplicate field value', 409);
        return;
    }
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        response_1.ResponseUtil.error(res, 'Invalid token', 401);
        return;
    }
    if (error.name === 'TokenExpiredError') {
        response_1.ResponseUtil.error(res, 'Token expired', 401);
        return;
    }
    // Default to 500 server error
    const message = process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : error.message;
    response_1.ResponseUtil.error(res, message, 500);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map