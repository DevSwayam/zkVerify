"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const UserController_1 = require("../controllers/UserController");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const userController = new UserController_1.UserController();
const stealthController = new controllers_1.StealthAddressController();
// Public routes (no authentication required)
router.post('/register', middleware_1.authLimiter, userController.registerUser);
router.post('/login', middleware_1.authLimiter, userController.loginUser);
// Public stealth address routes (no authentication required - anyone can generate for any username)
router.get('/:username/nonce', stealthController.getCurrentNonce);
router.post('/:username/stealth', middleware_1.strictLimiter, stealthController.generateStealthAddress);
router.get('/:username/stealth-addresses', stealthController.getStealthAddresses);
router.get('/:username/stealth-addresses/:nonce', stealthController.getStealthAddressByNonce);
// Public payment tracking routes (no authentication required)
router.get('/payment/:paymentId/status', stealthController.getPaymentStatus);
router.get('/listeners/active', stealthController.getActiveListeners);
// Authenticated user routes (require API key + Bearer token)
router.get('/:username/profile', middleware_1.authenticateAndAuthorize, userController.getProfile);
exports.default = router;
//# sourceMappingURL=user.js.map