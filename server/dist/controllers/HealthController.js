"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const services_1 = require("../services");
const utils_1 = require("../utils");
class HealthController {
    constructor() {
        // Basic health check
        this.health = async (req, res, next) => {
            try {
                const healthResult = {
                    status: 'OK',
                    timestamp: new Date().toISOString(),
                    services: {
                        database: 'connected'
                    },
                    uptime: process.uptime()
                };
                utils_1.ResponseUtil.success(res, healthResult, 'Service is healthy');
            }
            catch (error) {
                next(error);
            }
        };
        // Detailed health check with service testing
        this.healthDetailed = async (req, res, next) => {
            try {
                utils_1.Logger.info('Performing detailed health check');
                // Test database service
                const [databaseHealth] = await Promise.allSettled([
                    this.supabaseService.healthCheck()
                ]);
                const healthResult = {
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
                    utils_1.Logger.warn('Health check failed - database service is disconnected', healthResult);
                    utils_1.ResponseUtil.error(res, 'Database service is unavailable', 503);
                }
                else {
                    utils_1.Logger.info('Health check passed - database service is healthy');
                    utils_1.ResponseUtil.success(res, healthResult, 'Database service is healthy');
                }
            }
            catch (error) {
                utils_1.Logger.error('Health check failed with exception', { error });
                next(error);
            }
        };
        // Readiness probe (for Kubernetes)
        this.ready = async (req, res, next) => {
            try {
                // Quick check that essential services are available
                const [databaseReady] = await Promise.allSettled([
                    this.supabaseService.healthCheck()
                ]);
                if (databaseReady.status === 'fulfilled' && databaseReady.value) {
                    utils_1.ResponseUtil.success(res, { ready: true }, 'Service is ready');
                }
                else {
                    utils_1.ResponseUtil.error(res, 'Service is not ready', 503);
                }
            }
            catch (error) {
                next(error);
            }
        };
        // Liveness probe (for Kubernetes)
        this.live = async (req, res, next) => {
            try {
                // Basic liveness check - just verify the process is running
                utils_1.ResponseUtil.success(res, {
                    alive: true,
                    uptime: process.uptime(),
                    pid: process.pid
                }, 'Service is alive');
            }
            catch (error) {
                next(error);
            }
        };
        this.supabaseService = new services_1.SupabaseService();
    }
}
exports.HealthController = HealthController;
//# sourceMappingURL=HealthController.js.map