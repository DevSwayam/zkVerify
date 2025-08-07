import { Router } from 'express';
import { HealthController } from '../controllers';

const router: Router = Router();
const healthController = new HealthController();

// Basic health check
router.get('/', healthController.health);

// Detailed health check with service testing
router.get('/detailed', healthController.healthDetailed);

// Readiness probe (for Kubernetes)
router.get('/ready', healthController.ready);

// Liveness probe (for Kubernetes)
router.get('/live', healthController.live);

export default router; 