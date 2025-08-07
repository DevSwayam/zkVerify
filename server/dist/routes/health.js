"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const router = (0, express_1.Router)();
const healthController = new controllers_1.HealthController();
// Basic health check
router.get('/', healthController.health);
// Detailed health check with service testing
router.get('/detailed', healthController.healthDetailed);
// Readiness probe (for Kubernetes)
router.get('/ready', healthController.ready);
// Liveness probe (for Kubernetes)
router.get('/live', healthController.live);
exports.default = router;
//# sourceMappingURL=health.js.map