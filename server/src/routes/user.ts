import { Router } from 'express';
import { StealthAddressController } from '../controllers';
import { UserController } from '../controllers/UserController';
import { authenticateAndAuthorize, authLimiter, strictLimiter } from '../middleware';

const router: Router = Router();
const userController = new UserController();
const stealthController = new StealthAddressController();

// Public routes (no authentication required)
router.post('/register', authLimiter, userController.registerUser);
router.post('/login', authLimiter, userController.loginUser);

// Public stealth address routes (no authentication required - anyone can generate for any username)
router.get('/:username/nonce', stealthController.getCurrentNonce);
router.post('/:username/stealth', strictLimiter, stealthController.generateStealthAddress);
router.get('/:username/stealth-addresses', stealthController.getStealthAddresses);
router.get('/:username/stealth-addresses/:nonce', stealthController.getStealthAddressByNonce);

// Public funding status and resolver routes (no authentication required)
router.post('/:username/resolve-funding', strictLimiter, stealthController.resolveStealthAddressFunding);
router.get('/:username/funding-stats', stealthController.getFundingStats);
router.get('/:username/funded-addresses', stealthController.getStealthAddressesByFundingStatus);

// Gas sponsorship route (public)
// 🌟 NEW: Gas sponsorship routes
router.post('/:username/gas-sponsorship', userController.gasSponsorshipRequest);
router.get('/sponsor/status', userController.getSponsorStatus);
router.get('/sponsor/operations', userController.getSupportedOperations);



// Public payment tracking routes (no authentication required)
router.get('/payment/:paymentId/status', stealthController.getPaymentStatus);
router.get('/listeners/active', stealthController.getActiveListeners);

// Public endpoint to resolve username by EOA address
router.post('/resolve-username-by-eoa', userController.getUsernameByEOA);

// Authenticated user routes (require API key + Bearer token)
router.get('/:username/profile', authenticateAndAuthorize, userController.getProfile);

export default router; 