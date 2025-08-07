import { Request, Response, NextFunction } from 'express';
import { SupabaseService } from '../services';
import { ResponseUtil, Logger } from '../utils';
import { HealthCheckResult } from '../types';

export class HealthController {
  private supabaseService: SupabaseService;

  constructor() {
    this.supabaseService = new SupabaseService();
  }

  // Basic health check
  health = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const healthResult: HealthCheckResult = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected'
        },
        uptime: process.uptime()
      };

      ResponseUtil.success(res, healthResult, 'Service is healthy');
    } catch (error) {
      next(error);
    }
  };

  // Detailed health check with service testing
  healthDetailed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      Logger.info('Performing detailed health check');

      // Test database service
      const [databaseHealth] = await Promise.allSettled([
        this.supabaseService.healthCheck()
      ]);

      const healthResult: HealthCheckResult = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
          database: databaseHealth.status === 'fulfilled' && databaseHealth.value 
            ? 'connected' 
            : 'disconnected'
        },
        uptime: process.uptime()
      };

      // Determine overall status based on database only
      if (healthResult.services.database === 'disconnected') {
        healthResult.status = 'ERROR';
        Logger.warn('Health check failed - database service is disconnected', healthResult);
        ResponseUtil.error(res, 'Database service is unavailable', 503);
      } else {
        Logger.info('Health check passed - database service is healthy');
        ResponseUtil.success(res, healthResult, 'Database service is healthy');
      }
    } catch (error) {
      Logger.error('Health check failed with exception', { error });
      next(error);
    }
  };

  // Readiness probe (for Kubernetes)
  ready = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Quick check that essential services are available
      const [databaseReady] = await Promise.allSettled([
        this.supabaseService.healthCheck()
      ]);

      if (databaseReady.status === 'fulfilled' && databaseReady.value) {
        ResponseUtil.success(res, { ready: true }, 'Service is ready');
      } else {
        ResponseUtil.error(res, 'Service is not ready', 503);
      }
    } catch (error) {
      next(error);
    }
  };

  // Liveness probe (for Kubernetes)
  live = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Basic liveness check - just verify the process is running
      ResponseUtil.success(res, { 
        alive: true, 
        uptime: process.uptime(),
        pid: process.pid 
      }, 'Service is alive');
    } catch (error) {
      next(error);
    }
  };
} 