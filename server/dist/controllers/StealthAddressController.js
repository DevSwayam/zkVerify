"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StealthAddressController = void 0;
const services_1 = require("../services");
const UserService_1 = require("../services/UserService");
const SupabaseService_1 = require("../services/SupabaseService");
const utils_1 = require("../utils");
class StealthAddressController {
    constructor() {
        // Generate a single stealth address for any user (no authentication required)
        this.generateStealthAddress = async (req, res, next) => {
            try {
                const { chainId, tokenAmount, tokenAddress, deviceId, reuseSession } = req.body;
                const { username } = req.params;
                // Get user by username from the URL parameter
                if (!username) {
                    utils_1.ResponseUtil.error(res, 'Username parameter is required', 400);
                    return;
                }
                const user = await this.userService.getUserByUsername(username);
                if (!user) {
                    utils_1.ResponseUtil.error(res, 'User not found', 404);
                    return;
                }
                // Validate required parameters
                if (!tokenAddress || typeof tokenAddress !== 'string') {
                    utils_1.ResponseUtil.error(res, 'tokenAddress is required and must be a valid address string', 400);
                    return;
                }
                if (!tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
                    utils_1.ResponseUtil.error(res, 'Valid tokenAmount is required and must be greater than 0', 400);
                    return;
                }
                // Validate chainId if provided, otherwise use the first supported chain
                let selectedChainId = chainId;
                if (!selectedChainId) {
                    selectedChainId = user.chains[0]?.chainId;
                }
                if (!selectedChainId) {
                    utils_1.ResponseUtil.error(res, 'No supported chains configured for this user', 400);
                    return;
                }
                // Check if user supports the requested chain
                if (!this.userService.isChainSupported(user, selectedChainId)) {
                    const supportedChains = this.userService.getUserChainIds(user);
                    utils_1.ResponseUtil.error(res, `Chain ${selectedChainId} not supported. Supported chains: ${supportedChains.join(', ')}`, 400);
                    return;
                }
                // Get chain configuration
                const chainConfig = this.userService.getChainConfig(user, selectedChainId);
                const chainName = chainConfig?.name || `Chain ${selectedChainId}`;
                // Validate that the user supports the requested token address on this chain
                if (!this.userService.isTokenSupported(user, selectedChainId, tokenAddress)) {
                    const supportedTokenAddresses = this.userService.getTokenAddresses(user, selectedChainId);
                    utils_1.ResponseUtil.error(res, `Token address ${tokenAddress} is not supported on chain ${selectedChainId}. Supported tokens: ${supportedTokenAddresses.join(', ')}`, 400);
                    return;
                }
                // Handle device session and check for reuse
                let finalDeviceId = deviceId;
                let existingPaymentSession = null;
                let isReusedSession = false;
                if (deviceId && reuseSession) {
                    try {
                        existingPaymentSession = await this.paymentSessionService.getActivePaymentSessionForDevice(deviceId, user.id);
                        if (existingPaymentSession) {
                            isReusedSession = true;
                            utils_1.Logger.info('Reusing existing payment session for device', {
                                deviceId,
                                userId: user.id,
                                paymentId: existingPaymentSession.paymentId,
                                stealthAddress: existingPaymentSession.stealthAddress
                            });
                            // Return existing session info
                            const eventListenerInfo = {
                                listenerId: `${existingPaymentSession.paymentId}_${existingPaymentSession.stealthAddress.toLowerCase()}`,
                                isActive: true,
                                startTime: existingPaymentSession.createdAt,
                                timeRemaining: Math.max(0, Math.floor((new Date(existingPaymentSession.expiresAt).getTime() - Date.now()) / 1000)),
                                timeoutMinutes: 3
                            };
                            const response = {
                                address: existingPaymentSession.stealthAddress,
                                chainId: existingPaymentSession.chainId,
                                chainName,
                                tokenAddress: existingPaymentSession.tokenAddress,
                                tokenAmount: existingPaymentSession.tokenAmount,
                                paymentId: existingPaymentSession.paymentId,
                                eventListener: eventListenerInfo
                            };
                            utils_1.ResponseUtil.success(res, response, 'Reused existing stealth address session');
                            return;
                        }
                    }
                    catch (error) {
                        utils_1.Logger.warn('Failed to get existing payment session, creating new one', { error, deviceId });
                    }
                }
                // Generate device ID if not provided
                if (!finalDeviceId) {
                    const userAgent = req.headers['user-agent'];
                    const ipAddress = req.ip || req.socket.remoteAddress;
                    finalDeviceId = this.paymentSessionService.generateDeviceId(userAgent, ipAddress);
                }
                utils_1.Logger.info('Generating single stealth address for user', {
                    userId: user.id,
                    username: user.username,
                    chainId: selectedChainId,
                    chainName,
                    tokenAddress,
                    tokenAmount,
                    currentNonce: user.currentNonce,
                    deviceId: finalDeviceId,
                    isReusedSession
                });
                // Generate exactly 1 stealth address
                const serviceResponse = await this.stealthAddressService.computeStealthAddresses({
                    viewingPrivateKey: user.viewingPrivateKey,
                    spendingPublicKey: user.spendingPublicKey,
                    startNonce: user.currentNonce.toString(),
                    accountAmount: "1", // Always generate exactly 1 address
                    chainId: selectedChainId
                });
                // Extract the single address from the response
                const singleAddress = serviceResponse.addresses[0];
                if (!singleAddress) {
                    utils_1.ResponseUtil.error(res, 'Failed to generate stealth address', 500);
                    return;
                }
                // Generate payment ID
                const paymentId = this.paymentSessionService.generatePaymentId();
                // Predict Safe address based on the generated stealth address
                let safeAddressInfo = undefined;
                try {
                    utils_1.Logger.info('Predicting Safe address for stealth address', {
                        stealthAddress: singleAddress.address,
                        chainId: selectedChainId,
                        paymentId
                    });
                    const chainConfig = this.userService.getChainConfig(user, selectedChainId);
                    const rpcUrl = this.getRpcUrlForChain(selectedChainId);
                    const safeService = new services_1.SafeService(selectedChainId, rpcUrl);
                    const safeResults = await safeService.predictSafeAddressOnTheBasisOfStealthAddress([singleAddress.address]);
                    if (safeResults && safeResults.length > 0) {
                        const safeResult = safeResults[0];
                        if (safeResult) {
                            safeAddressInfo = {
                                address: safeResult.safeAddress,
                                isDeployed: safeResult.isDeployed,
                                ...(safeResult.error && { error: safeResult.error })
                            };
                            utils_1.Logger.info('Safe address predicted successfully', {
                                stealthAddress: singleAddress.address,
                                safeAddress: safeResult.safeAddress,
                                isDeployed: safeResult.isDeployed,
                                paymentId
                            });
                        }
                    }
                }
                catch (safeError) {
                    utils_1.Logger.error('Failed to predict Safe address', {
                        error: safeError,
                        stealthAddress: singleAddress.address,
                        userId: user.id,
                        paymentId
                    });
                    // Don't fail the stealth address generation if Safe prediction fails
                }
                // Increment user's nonce by 1
                const newNonce = await this.userService.incrementNonce(user.id);
                // Create payment session
                const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
                try {
                    const paymentSession = await this.paymentSessionService.createPaymentSession({
                        paymentId,
                        userId: user.id,
                        deviceId: finalDeviceId,
                        stealthAddress: singleAddress.address,
                        tokenAddress,
                        chainId: selectedChainId,
                        tokenAmount: tokenAmount.toString(),
                        status: 'pending',
                        isActive: true,
                        expiresAt: expiresAt.toISOString()
                    });
                    utils_1.Logger.info('Payment session created', {
                        paymentId,
                        userId: user.id,
                        stealthAddress: singleAddress.address,
                        expiresAt: expiresAt.toISOString()
                    });
                }
                catch (error) {
                    utils_1.Logger.error('Failed to create payment session', {
                        error,
                        paymentId,
                        userId: user.id
                    });
                    // Continue even if payment session creation fails
                }
                // Update device session
                try {
                    await this.paymentSessionService.createOrUpdateDeviceSession({
                        deviceId: finalDeviceId,
                        userId: user.id,
                        lastActivePaymentId: paymentId,
                        lastUsedStealthAddress: singleAddress.address,
                        userAgent: req.headers['user-agent'] || 'Unknown',
                        ipAddress: req.ip || req.socket.remoteAddress || '',
                        isActive: true,
                        lastAccessedAt: new Date().toISOString()
                    });
                    utils_1.Logger.info('Device session updated', {
                        deviceId: finalDeviceId,
                        userId: user.id,
                        paymentId
                    });
                }
                catch (error) {
                    utils_1.Logger.error('Failed to update device session', {
                        error,
                        deviceId: finalDeviceId,
                        userId: user.id
                    });
                    // Continue even if device session update fails
                }
                // Start event listener for payment detection
                let eventListenerInfo = undefined;
                try {
                    // Use Safe address for payment monitoring if available, otherwise fall back to stealth address
                    const monitoringAddress = safeAddressInfo?.address || singleAddress.address;
                    const listenerId = await this.eventListenerService.startListening({
                        paymentId,
                        paymentAddress: monitoringAddress, // Monitor the Safe address where payments are actually sent
                        tokenAddress,
                        chainId: selectedChainId,
                        userId: user.id,
                        deviceId: finalDeviceId,
                        expectedAmount: tokenAmount.toString(),
                        timeoutMinutes: 3
                        // tokenDecimals will be fetched dynamically from the contract
                    });
                    // Update payment session status to listening
                    await this.paymentSessionService.updatePaymentSession(paymentId, {
                        status: 'listening'
                    });
                    eventListenerInfo = {
                        listenerId,
                        isActive: true,
                        startTime: new Date().toISOString(),
                        timeRemaining: 3 * 60, // 3 minutes in seconds
                        timeoutMinutes: 3
                    };
                    utils_1.Logger.info('Event listener started for payment detection', {
                        paymentId,
                        listenerId,
                        monitoringAddress,
                        stealthAddress: singleAddress.address,
                        safeAddress: safeAddressInfo?.address,
                        tokenAddress,
                        chainId: selectedChainId
                    });
                }
                catch (error) {
                    utils_1.Logger.error('Failed to start event listener', {
                        error,
                        paymentId,
                        stealthAddress: singleAddress.address,
                        safeAddress: safeAddressInfo?.address
                    });
                    // Continue even if event listener fails to start
                }
                // Store the stealth address in the database
                try {
                    const stealthAddressData = {
                        userId: user.id,
                        nonce: user.currentNonce, // Use the nonce that was used for generation
                        stealthAddress: singleAddress.address,
                        safeDeployed: safeAddressInfo?.isDeployed || false,
                        safeFunded: false, // Default to false for new addresses
                        chainId: selectedChainId,
                        chainName,
                        tokenAddress,
                        tokenAmount: tokenAmount.toString(),
                        paymentId,
                        deviceId: finalDeviceId,
                        ...(safeAddressInfo?.address && { safeAddress: safeAddressInfo.address })
                    };
                    const stealthAddressRecord = await this.supabaseService.createStealthAddress(stealthAddressData);
                    utils_1.Logger.info('Stealth address stored in database', {
                        recordId: stealthAddressRecord.id,
                        userId: user.id,
                        stealthAddress: singleAddress.address,
                        safeAddress: safeAddressInfo?.address,
                        chainId: selectedChainId,
                        nonce: user.currentNonce,
                        paymentId,
                        deviceId: finalDeviceId
                    });
                }
                catch (dbError) {
                    utils_1.Logger.error('Failed to store stealth address in database', {
                        error: dbError,
                        userId: user.id,
                        stealthAddress: singleAddress.address,
                        paymentId
                    });
                    // Don't fail the stealth address generation if database storage fails
                }
                const response = {
                    address: singleAddress.address,
                    chainId: selectedChainId,
                    chainName,
                    tokenAddress, // Return the validated token address
                    tokenAmount: tokenAmount.toString(),
                    paymentId,
                    ...(safeAddressInfo && { safeAddress: safeAddressInfo }),
                    ...(eventListenerInfo && { eventListener: eventListenerInfo })
                };
                utils_1.Logger.info('Single stealth address generated successfully', {
                    userId: user.id,
                    username: user.username,
                    chainId: selectedChainId,
                    chainName,
                    tokenAddress,
                    newNonce,
                    address: singleAddress.address,
                    tokenAmount,
                    paymentId,
                    deviceId: finalDeviceId,
                    hasEventListener: !!eventListenerInfo
                });
                utils_1.ResponseUtil.success(res, response, 'Stealth address generated successfully with payment tracking');
            }
            catch (error) {
                utils_1.Logger.error('Failed to generate stealth address', {
                    error,
                    username: req.params.username
                });
                next(error);
            }
        };
        // Get user's current nonce (public endpoint)
        this.getCurrentNonce = async (req, res, next) => {
            try {
                const { username } = req.params;
                if (!username) {
                    utils_1.ResponseUtil.error(res, 'Username parameter is required', 400);
                    return;
                }
                const user = await this.userService.getUserByUsername(username);
                if (!user) {
                    utils_1.ResponseUtil.error(res, 'User not found', 404);
                    return;
                }
                utils_1.ResponseUtil.success(res, {
                    currentNonce: user.currentNonce,
                    userId: user.id,
                    username: user.username,
                    supportedChains: user.chains.map((chain) => ({
                        chainId: chain.chainId,
                        tokenCount: chain.tokenAddresses.length,
                        name: chain.name,
                        tokenAddresses: chain.tokenAddresses // Include token addresses for reference
                    }))
                }, 'Current nonce retrieved successfully');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get current nonce', {
                    error,
                    username: req.params.username
                });
                next(error);
            }
        };
        // Get all stealth addresses for a user (public endpoint)
        this.getStealthAddresses = async (req, res, next) => {
            try {
                const { username } = req.params;
                if (!username) {
                    utils_1.ResponseUtil.error(res, 'Username parameter is required', 400);
                    return;
                }
                const user = await this.userService.getUserByUsername(username);
                if (!user) {
                    utils_1.ResponseUtil.error(res, 'User not found', 404);
                    return;
                }
                utils_1.Logger.info('Retrieving stealth addresses for user', {
                    userId: user.id,
                    username: user.username
                });
                // Get all stealth addresses from the database
                const stealthAddresses = await this.supabaseService.getStealthAddressesByUser(user.id);
                const response = {
                    userId: user.id,
                    username: user.username,
                    totalAddresses: stealthAddresses.length,
                    addresses: stealthAddresses.map(address => ({
                        id: address.id,
                        nonce: address.nonce,
                        stealthAddress: address.stealthAddress,
                        safeAddress: address.safeAddress,
                        safeDeployed: address.safeDeployed,
                        safeFunded: address.safeFunded,
                        chainId: address.chainId,
                        chainName: address.chainName,
                        tokenAddress: address.tokenAddress,
                        tokenAmount: address.tokenAmount,
                        generatedAt: address.generatedAt,
                        lastCheckedAt: address.lastCheckedAt
                    }))
                };
                utils_1.Logger.info('Stealth addresses retrieved successfully', {
                    userId: user.id,
                    username: user.username,
                    totalAddresses: stealthAddresses.length
                });
                utils_1.ResponseUtil.success(res, response, 'Stealth addresses retrieved successfully');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get stealth addresses', {
                    error,
                    username: req.params.username
                });
                next(error);
            }
        };
        // Get a specific stealth address by nonce (public endpoint)
        this.getStealthAddressByNonce = async (req, res, next) => {
            try {
                const { username, nonce } = req.params;
                if (!username) {
                    utils_1.ResponseUtil.error(res, 'Username parameter is required', 400);
                    return;
                }
                if (!nonce || isNaN(parseInt(nonce))) {
                    utils_1.ResponseUtil.error(res, 'Valid nonce parameter is required', 400);
                    return;
                }
                const user = await this.userService.getUserByUsername(username);
                if (!user) {
                    utils_1.ResponseUtil.error(res, 'User not found', 404);
                    return;
                }
                const nonceNumber = parseInt(nonce);
                utils_1.Logger.info('Retrieving stealth address by nonce', {
                    userId: user.id,
                    username: user.username,
                    nonce: nonceNumber
                });
                // Get the specific stealth address from the database
                const stealthAddress = await this.supabaseService.getStealthAddressByNonce(user.id, nonceNumber);
                if (!stealthAddress) {
                    utils_1.ResponseUtil.error(res, `No stealth address found for nonce ${nonceNumber}`, 404);
                    return;
                }
                const response = {
                    id: stealthAddress.id,
                    nonce: stealthAddress.nonce,
                    stealthAddress: stealthAddress.stealthAddress,
                    safeAddress: stealthAddress.safeAddress,
                    safeDeployed: stealthAddress.safeDeployed,
                    safeFunded: stealthAddress.safeFunded,
                    chainId: stealthAddress.chainId,
                    chainName: stealthAddress.chainName,
                    tokenAddress: stealthAddress.tokenAddress,
                    tokenAmount: stealthAddress.tokenAmount,
                    generatedAt: stealthAddress.generatedAt,
                    lastCheckedAt: stealthAddress.lastCheckedAt
                };
                utils_1.Logger.info('Stealth address retrieved successfully', {
                    userId: user.id,
                    username: user.username,
                    nonce: nonceNumber,
                    stealthAddress: stealthAddress.stealthAddress
                });
                utils_1.ResponseUtil.success(res, response, 'Stealth address retrieved successfully');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get stealth address by nonce', {
                    error,
                    username: req.params.username,
                    nonce: req.params.nonce
                });
                next(error);
            }
        };
        // Get payment session status by payment ID (public endpoint)
        this.getPaymentStatus = async (req, res, next) => {
            try {
                const { paymentId } = req.params;
                if (!paymentId) {
                    utils_1.ResponseUtil.error(res, 'Payment ID parameter is required', 400);
                    return;
                }
                utils_1.Logger.info('Retrieving payment session status', { paymentId });
                // Get payment session
                const paymentSession = await this.paymentSessionService.getPaymentSession(paymentId);
                if (!paymentSession) {
                    utils_1.ResponseUtil.error(res, 'Payment session not found', 404);
                    return;
                }
                // Get event listener status if applicable
                let eventListenerInfo = undefined;
                if (paymentSession.status === 'listening') {
                    const activeListeners = this.eventListenerService.getActiveListeners();
                    const listener = activeListeners.find(l => l.config.paymentId === paymentId);
                    if (listener) {
                        eventListenerInfo = {
                            listenerId: listener.listenerId,
                            isActive: true,
                            startTime: listener.startTime.toISOString(),
                            timeRemaining: listener.timeRemaining,
                            timeoutMinutes: listener.config.timeoutMinutes
                        };
                    }
                }
                const response = {
                    paymentId: paymentSession.paymentId,
                    stealthAddress: paymentSession.stealthAddress,
                    status: paymentSession.status,
                    chainId: paymentSession.chainId,
                    tokenAddress: paymentSession.tokenAddress,
                    tokenAmount: paymentSession.tokenAmount,
                    isActive: paymentSession.isActive,
                    expiresAt: paymentSession.expiresAt,
                    completedAt: paymentSession.completedAt,
                    transactionHash: paymentSession.transactionHash,
                    fromAddress: paymentSession.fromAddress,
                    actualAmount: paymentSession.actualAmount,
                    createdAt: paymentSession.createdAt,
                    ...(eventListenerInfo && { eventListener: eventListenerInfo })
                };
                utils_1.Logger.info('Payment session status retrieved', {
                    paymentId,
                    status: paymentSession.status,
                    isActive: paymentSession.isActive
                });
                utils_1.ResponseUtil.success(res, response, 'Payment status retrieved successfully');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get payment status', {
                    error,
                    paymentId: req.params.paymentId
                });
                next(error);
            }
        };
        // Get active event listeners status (for debugging/monitoring)
        this.getActiveListeners = async (req, res, next) => {
            try {
                const activeListeners = this.eventListenerService.getActiveListeners();
                const healthStatus = this.eventListenerService.getHealthStatus();
                const response = {
                    totalActive: activeListeners.length,
                    listeners: activeListeners.map(listener => ({
                        paymentId: listener.config.paymentId,
                        paymentAddress: listener.config.paymentAddress,
                        chainId: listener.config.chainId,
                        tokenAddress: listener.config.tokenAddress,
                        userId: listener.config.userId,
                        startTime: listener.startTime.toISOString(),
                        timeRemaining: listener.timeRemaining,
                        timeoutMinutes: listener.config.timeoutMinutes
                    })),
                    serviceHealth: healthStatus
                };
                utils_1.Logger.info('Active listeners status retrieved', {
                    totalActive: activeListeners.length
                });
                utils_1.ResponseUtil.success(res, response, 'Active listeners retrieved successfully');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get active listeners', { error });
                next(error);
            }
        };
        this.stealthAddressService = new services_1.StealthAddressService();
        this.userService = new UserService_1.UserService();
        this.supabaseService = new SupabaseService_1.SupabaseService();
        this.eventListenerService = new services_1.EventListenerService();
        this.paymentSessionService = new services_1.PaymentSessionService();
        // Setup event listeners for payment detection
        this.setupEventListeners();
    }
    // Get RPC URL for a specific chain ID
    getRpcUrlForChain(chainId) {
        const chainMap = {
            84532: 'https://base-sepolia-rpc.publicnode.com', // Base Sepolia
            1328: 'https://evm-rpc-testnet.sei-apis.com', // Sei Testnet
            1: 'https://eth.llamarpc.com', // Ethereum Mainnet (fallback)
            5: 'https://eth-goerli.public.blastapi.io', // Goerli (fallback)
        };
        return chainMap[chainId] || 'https://base-sepolia-rpc.publicnode.com'; // Default to Base Sepolia
    }
    // Setup event listeners for payment detection
    setupEventListeners() {
        // Listen for payment detection events
        this.eventListenerService.on('paymentDetected', async (paymentDetected) => {
            await this.handlePaymentDetected(paymentDetected);
        });
        // Listen for listener timeout events
        this.eventListenerService.on('listenerStopped', async (data) => {
            if (data.reason === 'timeout') {
                await this.handlePaymentTimeout(data.paymentId);
            }
        });
        utils_1.Logger.info('Event listeners setup completed for StealthAddressController');
    }
    // Handle detected payments
    async handlePaymentDetected(paymentDetected) {
        try {
            utils_1.Logger.info('Payment detected, updating payment session', {
                paymentId: paymentDetected.paymentId,
                stealthAddress: paymentDetected.stealthAddress,
                amount: paymentDetected.amount,
                transactionHash: paymentDetected.transactionHash
            });
            // Complete the payment session
            await this.paymentSessionService.completePaymentSession(paymentDetected.paymentId, paymentDetected.transactionHash, paymentDetected.fromAddress, paymentDetected.amount);
            // Here you could add webhooks, notifications, or other post-payment processing
            utils_1.Logger.info('Payment session completed successfully', {
                paymentId: paymentDetected.paymentId,
                transactionHash: paymentDetected.transactionHash
            });
        }
        catch (error) {
            utils_1.Logger.error('Error handling payment detection', {
                error,
                paymentId: paymentDetected.paymentId
            });
        }
    }
    // Handle payment timeouts
    async handlePaymentTimeout(paymentId) {
        try {
            utils_1.Logger.info('Payment session timed out', { paymentId });
            // Expire the payment session
            await this.paymentSessionService.expirePaymentSession(paymentId);
            utils_1.Logger.info('Payment session expired due to timeout', { paymentId });
        }
        catch (error) {
            utils_1.Logger.error('Error handling payment timeout', {
                error,
                paymentId
            });
        }
    }
}
exports.StealthAddressController = StealthAddressController;
//# sourceMappingURL=StealthAddressController.js.map