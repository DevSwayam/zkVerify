import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request start
  Logger.info(`${req.method} ${req.url}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const responseTime = Date.now() - startTime;
    
    // Log response
    Logger.http(req.method, req.url, res.statusCode, responseTime);
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}; 