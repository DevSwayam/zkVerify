"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const UserService_1 = require("../services/UserService");
const SupabaseService_1 = require("../services/SupabaseService");
const StealthAddressService_1 = require("../services/StealthAddressService");
const SafeService_1 = require("../services/SafeService");
const utils_1 = require("../utils");
class UserController {
    constructor() {
        // Register new user
        this.registerUser = async (req, res, next) => {
            try {
                const registrationData = req.body;
                utils_1.Logger.info('User registration request received', {
                    email: registrationData.email,
                    username: registrationData.username,
                    chainsCount: registrationData.chains?.length || 0
                });
                const result = await this.userService.registerUser(registrationData);
                // Generate JWT token for the new user
                const user = await this.userService.getUserByUsername(result.user.username);
                if (!user) {
                    throw new Error('Failed to retrieve created user');
                }
                const token = this.userService.generateToken(user);
                // Generate a test stealth address to validate the setup
                let testStealthAddress = null;
                try {
                    // Validate that user has chains and tokens configured
                    if (!user.chains || user.chains.length === 0) {
                        throw new Error('No chains configured for user');
                    }
                    const firstChain = user.chains[0];
                    if (!firstChain.tokenAddresses || firstChain.tokenAddresses.length === 0) {
                        throw new Error('No token addresses configured for the first chain');
                    }
                    const firstTokenAddress = firstChain.tokenAddresses[0];
                    utils_1.Logger.info('Generating test stealth address for new user', {
                        userId: user.id,
                        username: user.username,
                        chainId: firstChain.chainId,
                        tokenAddress: firstTokenAddress,
                        currentNonce: user.currentNonce
                    });
                    // Generate exactly 1 test stealth address
                    const serviceResponse = await this.stealthAddressService.computeStealthAddresses({
                        viewingPrivateKey: user.viewingPrivateKey,
                        spendingPublicKey: user.spendingPublicKey,
                        startNonce: user.currentNonce.toString(),
                        accountAmount: "1", // Always generate exactly 1 address
                        chainId: firstChain.chainId
                    });
                    // Increment user's nonce since we generated an address
                    const newNonce = await this.userService.incrementNonce(user.id);
                    const generatedAddress = serviceResponse.addresses[0];
                    if (generatedAddress) {
                        // Predict Safe address for the test stealth address
                        let safeAddressInfo = undefined;
                        try {
                            utils_1.Logger.info('Predicting Safe address for test stealth address', {
                                stealthAddress: generatedAddress.address,
                                chainId: firstChain.chainId
                            });
                            // Create SafeService instance with the correct chain configuration
                            const rpcUrl = this.getRpcUrlForChain(firstChain.chainId);
                            const safeService = new SafeService_1.SafeService(firstChain.chainId, rpcUrl);
                            const safeResults = await safeService.predictSafeAddressOnTheBasisOfStealthAddress([generatedAddress.address]);
                            if (safeResults && safeResults.length > 0) {
                                const safeResult = safeResults[0];
                                if (safeResult) {
                                    safeAddressInfo = {
                                        address: safeResult.safeAddress,
                                        isDeployed: safeResult.isDeployed,
                                        ...(safeResult.error && { error: safeResult.error })
                                    };
                                    utils_1.Logger.info('Safe address predicted for test stealth address', {
                                        stealthAddress: generatedAddress.address,
                                        safeAddress: safeResult.safeAddress,
                                        isDeployed: safeResult.isDeployed
                                    });
                                }
                            }
                        }
                        catch (safeError) {
                            utils_1.Logger.error('Failed to predict Safe address for test stealth address', {
                                error: safeError,
                                stealthAddress: generatedAddress.address,
                                userId: user.id
                            });
                            // Don't fail registration if Safe prediction fails
                        }
                        // Store the test stealth address in the database
                        try {
                            const stealthAddressData = {
                                userId: user.id,
                                nonce: user.currentNonce,
                                stealthAddress: generatedAddress.address,
                                safeDeployed: safeAddressInfo?.isDeployed || false,
                                safeFunded: false, // Default to false for new addresses
                                chainId: firstChain.chainId,
                                chainName: firstChain.name || `Chain ${firstChain.chainId}`,
                                tokenAddress: firstTokenAddress,
                                tokenAmount: "1.0",
                                ...(safeAddressInfo?.address && { safeAddress: safeAddressInfo.address })
                            };
                            const stealthAddressRecord = await this.supabaseService.createStealthAddress(stealthAddressData);
                            utils_1.Logger.info('Test stealth address stored in database', {
                                recordId: stealthAddressRecord.id,
                                userId: user.id,
                                stealthAddress: generatedAddress.address,
                                safeAddress: safeAddressInfo?.address
                            });
                        }
                        catch (dbError) {
                            utils_1.Logger.error('Failed to store test stealth address in database', {
                                error: dbError,
                                userId: user.id,
                                stealthAddress: generatedAddress.address
                            });
                            // Don't fail registration if database storage fails
                        }
                        testStealthAddress = {
                            address: generatedAddress.address,
                            chainId: firstChain.chainId,
                            chainName: firstChain.name || `Chain ${firstChain.chainId}`,
                            tokenAddress: firstTokenAddress,
                            tokenAmount: "1.0", // Default test amount
                            nonce: newNonce - 1, // The nonce used for this address
                            newNonce: newNonce, // Updated nonce for next generation
                            ...(safeAddressInfo && { safeAddress: safeAddressInfo })
                        };
                        utils_1.Logger.info('Test stealth address generated successfully', {
                            userId: user.id,
                            username: user.username,
                            address: generatedAddress.address,
                            chainId: firstChain.chainId,
                            newNonce,
                            safeAddress: safeAddressInfo?.address
                        });
                    }
                }
                catch (stealthError) {
                    utils_1.Logger.error('Failed to generate test stealth address', {
                        error: stealthError,
                        userId: user.id,
                        username: user.username
                    });
                    // Don't fail the registration if stealth address generation fails
                    // Just log the error and continue
                }
                // Create conditional instructions based on user type
                const instructions = {
                    token: 'Use this JWT token in the Authorization: Bearer <token> header for profile access',
                    endpoint: `Your custom endpoint: /api/user/${result.user.username}/stealth`,
                    note: result.user.isMerchant
                        ? 'As a merchant, you have API key access for profile management'
                        : 'As a regular user, you can generate stealth addresses without authentication',
                    supportedChains: result.user.chains.map(chain => ({
                        chainId: chain.chainId,
                        tokenCount: chain.tokenAddresses.length,
                        name: chain.name
                    })),
                    testAddress: testStealthAddress ? 'Test stealth address generated successfully - your setup is working!' : 'Test stealth address generation failed - please check your keys and chain configuration'
                };
                // Add API key instructions only for merchants
                if (result.user.isMerchant && result.user.apiKey) {
                    instructions.apiKey = 'Use this API key in the X-API-Key header for profile access';
                }
                utils_1.ResponseUtil.success(res, {
                    ...result,
                    token,
                    testStealthAddress,
                    instructions
                }, 'User registered successfully', 201);
            }
            catch (error) {
                utils_1.Logger.error('User registration failed', { error });
                next(error);
            }
        };
        // Login user (generate new token)
        this.loginUser = async (req, res, next) => {
            try {
                const { email, apiKey } = req.body;
                if (!email) {
                    utils_1.ResponseUtil.error(res, 'Email is required', 400);
                    return;
                }
                let user = null;
                // If API key is provided, verify it (for merchants)
                if (apiKey) {
                    user = await this.userService.getUserByApiKey(apiKey);
                    if (!user || user.email !== email) {
                        utils_1.ResponseUtil.error(res, 'Invalid credentials', 401);
                        return;
                    }
                    // Ensure this is actually a merchant
                    if (!user.isMerchant) {
                        utils_1.ResponseUtil.error(res, 'API key provided but user is not a merchant', 400);
                        return;
                    }
                }
                else {
                    // For non-merchants, get user by email
                    user = await this.userService.getUserByEmail(email);
                    if (!user) {
                        utils_1.ResponseUtil.error(res, 'User not found', 404);
                        return;
                    }
                    // Non-merchants don't need API keys
                    if (user.isMerchant) {
                        utils_1.ResponseUtil.error(res, 'API key is required for merchant accounts', 400);
                        return;
                    }
                }
                // Generate new token
                const token = this.userService.generateToken(user);
                utils_1.Logger.info('User login successful', {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    isMerchant: user.isMerchant
                });
                utils_1.ResponseUtil.success(res, {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        isMerchant: user.isMerchant,
                        chains: user.chains.map((chain) => ({
                            chainId: chain.chainId,
                            tokenCount: chain.tokenAddresses.length,
                            name: chain.name
                        }))
                    },
                    endpoint: `/api/user/${user.username}/stealth`,
                    note: user.isMerchant
                        ? 'Merchant login successful - you have API key access'
                        : 'User login successful - stealth address generation is public'
                }, 'Login successful');
            }
            catch (error) {
                utils_1.Logger.error('User login failed', { error });
                next(error);
            }
        };
        // Get user profile (requires authentication)
        this.getProfile = async (req, res, next) => {
            try {
                // This endpoint requires authentication, so user info is available in req.userRecord
                const user = req.userRecord;
                utils_1.ResponseUtil.success(res, {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    chains: user.chains,
                    currentNonce: user.currentNonce,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    supportedChainIds: this.userService.getUserChainIds(user),
                    totalTokenAddresses: user.chains.reduce((total, chain) => total + chain.tokenAddresses.length, 0)
                }, 'Profile retrieved successfully');
            }
            catch (error) {
                utils_1.Logger.error('Failed to get user profile', { error });
                next(error);
            }
        };
        this.userService = new UserService_1.UserService();
        this.supabaseService = new SupabaseService_1.SupabaseService();
        this.stealthAddressService = new StealthAddressService_1.StealthAddressService();
    }
    // Get RPC URL for a specific chain ID
    getRpcUrlForChain(chainId) {
        const chainMap = {
            1328: 'https://evm-rpc-testnet.sei-apis.com', // Sei Testnet
            84532: 'https://base-sepolia-rpc.publicnode.com', // Base Sepolia (fallback)
            1: 'https://eth.llamarpc.com', // Ethereum Mainnet (fallback)
            5: 'https://eth-goerli.public.blastapi.io', // Goerli (fallback)
        };
        return chainMap[chainId] || 'https://evm-rpc-testnet.sei-apis.com'; // Default to Sei Testnet
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map