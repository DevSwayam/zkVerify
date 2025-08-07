"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SupabaseService_1 = require("./SupabaseService");
const errors_1 = require("../errors");
const utils_1 = require("../utils");
class UserService {
    constructor() {
        this.supabaseService = new SupabaseService_1.SupabaseService();
    }
    // Generate unique API key
    generateApiKey() {
        return `sk_${crypto_1.default.randomBytes(32).toString('hex')}`;
    }
    // Generate JWT token
    generateToken(user) {
        if (!process.env.JWT_SECRET) {
            throw new errors_1.InternalServerError('JWT_SECRET not configured');
        }
        return jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            username: user.username
        }, process.env.JWT_SECRET, { expiresIn: '24h' });
    }
    // Verify JWT token
    verifyToken(token) {
        if (!process.env.JWT_SECRET) {
            throw new errors_1.InternalServerError('JWT_SECRET not configured');
        }
        try {
            return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        }
        catch (error) {
            throw new errors_1.ValidationError('Invalid or expired token');
        }
    }
    // Register new user
    async registerUser(registrationData) {
        try {
            utils_1.Logger.info('Starting user registration', { email: registrationData.email, username: registrationData.username });
            // Validate input
            this.validateRegistrationData(registrationData);
            // Check if email already exists
            const emailExists = await this.supabaseService.checkEmailExists(registrationData.email);
            if (emailExists) {
                throw new errors_1.ConflictError('Email already registered');
            }
            // Check if username already exists
            const usernameExists = await this.supabaseService.checkUsernameExists(registrationData.username);
            if (usernameExists) {
                throw new errors_1.ConflictError('Username already taken');
            }
            // Determine if user is a merchant (defaults to false if not specified)
            const isMerchant = registrationData.isMerchant || false;
            // Generate API key only for merchants
            const apiKey = isMerchant ? this.generateApiKey() : undefined;
            // Create user record
            const userData = {
                username: registrationData.username,
                email: registrationData.email,
                chains: registrationData.chains,
                viewingPrivateKey: registrationData.viewingPrivateKey,
                spendingPublicKey: registrationData.spendingPublicKey,
                currentNonce: 0,
                isMerchant,
                ...(apiKey && { apiKey }), // Only include apiKey if it exists
                isActive: true
            };
            const createdUser = await this.supabaseService.createUser(userData);
            utils_1.Logger.info('User registered successfully', {
                userId: createdUser.id,
                email: createdUser.email,
                username: createdUser.username
            });
            return {
                success: true,
                user: {
                    id: createdUser.id,
                    username: createdUser.username,
                    email: createdUser.email,
                    chains: createdUser.chains,
                    isMerchant: createdUser.isMerchant,
                    ...(createdUser.apiKey && { apiKey: createdUser.apiKey }) // Only include apiKey if it exists
                },
                message: 'User registered successfully'
            };
        }
        catch (error) {
            utils_1.Logger.error('User registration failed', { error, email: registrationData.email, username: registrationData.username });
            throw error;
        }
    }
    // Get user by username
    async getUserByUsername(username) {
        return await this.supabaseService.getUserByUsername(username);
    }
    // Get user by email
    async getUserByEmail(email) {
        return await this.supabaseService.getUserByEmail(email);
    }
    // Get user by API key
    async getUserByApiKey(apiKey) {
        return await this.supabaseService.getUserByApiKey(apiKey);
    }
    // Increment user nonce and return new value
    async incrementNonce(userId) {
        return await this.supabaseService.incrementUserNonce(userId);
    }
    // Get supported chain ID for user
    getUserChainIds(user) {
        return user.chains.map(chain => chain.chainId);
    }
    // Check if user supports a specific chain
    isChainSupported(user, chainId) {
        return user.chains.some(chain => chain.chainId === chainId);
    }
    // Get token addresses for a specific chain
    getTokenAddresses(user, chainId) {
        const chain = user.chains.find(chain => chain.chainId === chainId);
        return chain ? chain.tokenAddresses : [];
    }
    // Check if user supports a specific token address on a given chain
    isTokenSupported(user, chainId, tokenAddress) {
        const tokenAddresses = this.getTokenAddresses(user, chainId);
        return tokenAddresses.includes(tokenAddress);
    }
    // Get chain configuration for a specific chain ID
    getChainConfig(user, chainId) {
        return user.chains.find(chain => chain.chainId === chainId) || null;
    }
    // Validate registration data
    validateRegistrationData(data) {
        const errors = [];
        if (!data.username || data.username.trim().length < 3) {
            errors.push('Username must be at least 3 characters long');
        }
        if (!this.isValidUsername(data.username)) {
            errors.push('Username can only contain letters, numbers, underscores, and hyphens');
        }
        if (!data.email || !this.isValidEmail(data.email)) {
            errors.push('Valid email is required');
        }
        if (!data.viewingPrivateKey || !this.isValidHex(data.viewingPrivateKey)) {
            errors.push('Valid viewing private key is required');
        }
        if (!data.spendingPublicKey || !this.isValidHex(data.spendingPublicKey)) {
            errors.push('Valid spending public key is required');
        }
        if (!data.chains || !Array.isArray(data.chains) || data.chains.length === 0) {
            errors.push('At least one chain configuration is required');
        }
        else {
            // Validate each chain configuration
            data.chains.forEach((chain, index) => {
                if (!this.isValidChainConfig(chain)) {
                    errors.push(`Invalid chain configuration at index ${index}`);
                }
            });
            // Check for duplicate chain IDs
            const chainIds = data.chains.map(chain => chain.chainId);
            const uniqueChainIds = new Set(chainIds);
            if (chainIds.length !== uniqueChainIds.size) {
                errors.push('Duplicate chain IDs are not allowed');
            }
        }
        if (errors.length > 0) {
            throw new errors_1.ValidationError(errors.join(', '));
        }
    }
    // Validate chain configuration
    isValidChainConfig(chain) {
        if (!chain.chainId || !this.isValidChainId(chain.chainId)) {
            return false;
        }
        if (!Array.isArray(chain.tokenAddresses)) {
            return false;
        }
        // Validate each token address
        for (const address of chain.tokenAddresses) {
            if (!this.isValidTokenAddress(address)) {
                return false;
            }
        }
        return true;
    }
    // Validation helpers
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    isValidHex(hex) {
        return /^0x[a-fA-F0-9]+$/.test(hex) && hex.length >= 10;
    }
    isValidUsername(username) {
        return /^[a-zA-Z0-9_-]+$/.test(username) && username.length >= 3 && username.length <= 50;
    }
    isValidChainId(chainId) {
        // Prioritize Base Sepolia and other supported chains
        const supportedChains = [84532, 1, 1328, 8453, 11155111]; // Base Sepolia first
        return supportedChains.includes(chainId);
    }
    isValidTokenAddress(address) {
        // Basic Ethereum address validation
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map