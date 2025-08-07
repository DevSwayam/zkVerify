import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export class ResponseUtil {
  static success<T>(res: Response, data?: T, message?: string, statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      timestamp: new Date().toISOString(),
      ...(data !== undefined && { data }),
      ...(message && { message })
    };
    
    return res.status(statusCode).json(response);
  }

  static error(res: Response, error: string, statusCode: number = 500): Response {
    const response: ApiResponse = {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };
    
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): Response {
    const totalPages = Math.ceil(total / limit);
    
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      ...(message && { message })
    };
    
    return res.status(200).json(response);
  }

  static created<T>(res: Response, data?: T, message?: string): Response {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
} 