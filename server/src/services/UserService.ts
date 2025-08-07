import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SupabaseService } from './SupabaseService';
import { UserRegistrationRequest, UserRecord, UserRegistrationResponse, ChainConfig } from '../types';
import { ValidationError, ConflictError, InternalServerError } from '../errors';
import { Logger } from '../utils';

export class UserService {
  private supabaseService: SupabaseService;

  constructor() {
    this.supabaseService = new SupabaseService();
  }

  // Generate unique API key
  private generateApiKey(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  // Generate JWT token
  generateToken(user: UserRecord): string {
    if (!process.env.JWT_SECRET) {
      throw new InternalServerError('JWT_SECRET not configured');
    }

    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Verify JWT token
  verifyToken(token: string): any {
    if (!process.env.JWT_SECRET) {
      throw new InternalServerError('JWT_SECRET not configured');
    }

    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new ValidationError('Invalid or expired token');
    }
  }

  // Register new user
  async registerUser(registrationData: UserRegistrationRequest): Promise<UserRegistrationResponse> {
    try {
      Logger.info('Starting user registration', { email: registrationData.email, username: registrationData.username });

      // Validate input
      this.validateRegistrationData(registrationData);

      // Check if email already exists
      const emailExists = await this.supabaseService.checkEmailExists(registrationData.email);
      if (emailExists) {
        throw new ConflictError('Email already registered');
      }

      // Check if username already exists
      const usernameExists = await this.supabaseService.checkUsernameExists(registrationData.username);
      if (usernameExists) {
        throw new ConflictError('Username already taken');
      }

      // Determine if user is a merchant (defaults to false if not specified)
      const isMerchant = registrationData.isMerchant || false;

      // Generate API key only for merchants
      const apiKey = isMerchant ? this.generateApiKey() : undefined;

      // Create user record
      const userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        username: registrationData.username,
        email: registrationData.email,
        eoaaddress: registrationData.eoaaddress,
        chains: registrationData.chains,
        viewingPrivateKey: registrationData.viewingPrivateKey,
        spendingPublicKey: registrationData.spendingPublicKey,
        currentNonce: 0,
        isMerchant,
        ...(apiKey && { apiKey }), // Only include apiKey if it exists
        isActive: true
      };

      const createdUser = await this.supabaseService.createUser(userData);

      Logger.info('User registered successfully', { 
        userId: createdUser.id, 
        email: createdUser.email,
        username: createdUser.username
      });

      return {
        success: true,
        user: createdUser,
        message: 'User registered successfully'
      };
    } catch (error) {
      Logger.error('User registration failed', { error, email: registrationData.email, username: registrationData.username });
      throw error;
    }
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<UserRecord | null> {
    return await this.supabaseService.getUserByUsername(username);
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    return await this.supabaseService.getUserByEmail(email);
  }

  // Get user by API key
  async getUserByApiKey(apiKey: string): Promise<UserRecord | null> {
    return await this.supabaseService.getUserByApiKey(apiKey);
  }

  // Get user by EOA address
  async getUserByEOA(eoaaddress: string): Promise<UserRecord | null> {
    return await this.supabaseService.getUserByEOA(eoaaddress);
  }

  // Increment user nonce and return new value
  async incrementNonce(userId: string): Promise<number> {
    return await this.supabaseService.incrementUserNonce(userId);
  }

  // Get supported chain ID for user
  getUserChainIds(user: UserRecord): number[] {
    return user.chains.map(chain => chain.chainId);
  }

  // Check if user supports a specific chain
  isChainSupported(user: UserRecord, chainId: number): boolean {
    return user.chains.some(chain => chain.chainId === chainId);
  }

  // Get token addresses for a specific chain
  getTokenAddresses(user: UserRecord, chainId: number): string[] {
    const chain = user.chains.find(chain => chain.chainId === chainId);
    return chain ? chain.tokenAddresses : [];
  }

  // Check if user supports a specific token address on a given chain
  isTokenSupported(user: UserRecord, chainId: number, tokenAddress: string): boolean {
    const tokenAddresses = this.getTokenAddresses(user, chainId);
    return tokenAddresses.includes(tokenAddress);
  }

  // Get chain configuration for a specific chain ID
  getChainConfig(user: UserRecord, chainId: number): ChainConfig | null {
    return user.chains.find(chain => chain.chainId === chainId) || null;
  }

  // Validate registration data
  private validateRegistrationData(data: UserRegistrationRequest): void {
    const errors: string[] = [];

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
    } else {
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
      throw new ValidationError(errors.join(', '));
    }
  }

  // Validate chain configuration
  private isValidChainConfig(chain: ChainConfig): boolean {
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
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidHex(hex: string): boolean {
    return /^0x[a-fA-F0-9]+$/.test(hex) && hex.length >= 10;
  }

  private isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(username) && username.length >= 3 && username.length <= 50;
  }

  private isValidChainId(chainId: number): boolean {
    // Prioritize Base Sepolia and other supported chains
    const supportedChains = [845320009, 1, 1328, 8453, 11155111]; // Horizen Testnet first
    return supportedChains.includes(chainId);
  }

  private isValidTokenAddress(address: string): boolean {
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
} 