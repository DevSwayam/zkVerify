import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { Logger } from '../utils';
import { ResponseUtil } from '../utils/response';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  Logger.error('Unhandled error', {
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
  if (error instanceof AppError) {
    ResponseUtil.error(res, error.message, error.statusCode);
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    ResponseUtil.error(res, error.message, 400);
    return;
  }

  // Handle MongoDB cast errors
  if (error.name === 'CastError') {
    ResponseUtil.error(res, 'Invalid ID format', 400);
    return;
  }

  // Handle duplicate key errors (MongoDB)
  if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    ResponseUtil.error(res, 'Duplicate field value', 409);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    ResponseUtil.error(res, 'Invalid token', 401);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    ResponseUtil.error(res, 'Token expired', 401);
    return;
  }

  // Default to 500 server error
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : error.message;
    
  ResponseUtil.error(res, message, 500);
}; 