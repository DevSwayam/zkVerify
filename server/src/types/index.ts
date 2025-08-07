import { Request, Response } from 'express';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Express types
export interface TypedRequest<T = any> extends Request {
  body: T;
}

export interface TypedResponse<T = any> extends Response {
  json: (body: ApiResponse<T>) => this;
}

// Chain Configuration types
export interface ChainConfig {
  chainId: number;
  tokenAddresses: string[]; // Array of token contract addresses for this chain
  name?: string; // Optional chain name for reference
}

// User Registration types
export interface UserRegistrationRequest {
  username: string; // Will be used as the custom route
  email: string;
  viewingPrivateKey: string;
  spendingPublicKey: string;
  chains: ChainConfig[]; // Array of supported chains with their token addresses
  isMerchant?: boolean; // Optional flag to determine if user is a merchant (defaults to false)
  deviceId?: string; // Optional device identifier for session management
  eoaaddress: string; // User's EOA address for onchain login (lowercase)
}

export interface UserRecord {
  id: string;
  username: string; // Serves as the custom route
  email: string;
  chains: ChainConfig[]; // Array of supported chains
  viewingPrivateKey: string;
  spendingPublicKey: string;
  currentNonce: number;
  apiKey?: string; // Optional - only merchants have API keys
  isMerchant: boolean; // Flag to determine if user is a merchant
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  eoaaddress: string; // User's EOA address for onchain login (lowercase)
}

export interface UserRegistrationResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    chains: ChainConfig[];
    isMerchant: boolean;
    apiKey?: string; // Optional - only merchants have API keys
  };
  message: string;
}

// Authentication types
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
  userRecord?: UserRecord;
}

// Stealth Address types
export interface StealthAddressRequest {
  viewingPrivateKey: string;
  spendingPublicKey: string;
  startNonce: string | number;
  accountAmount: string | number;
  chainId?: number;
}

export interface StealthAddressResult {
  address: string;
  nonce: bigint;
}

export interface StealthAddressResponse {
  addresses: StealthAddressResult[];
  totalGenerated: number;
  chainId: number;
  startNonce: string;
  endNonce: string;
  userId: string;
  userUsername: string;
}

// Single stealth address response (for new single address generation)
export interface SingleStealthAddressResponse {
  address: string;
  chainId: number;
  chainName: string;
  tokenAddress: string; // The specific validated token address
  tokenAmount: string; // Amount to be sent to this stealth address
  paymentId: string; // Unique payment tracking ID
  safeAddress?: SafeAddressInfo; // Optional Safe address prediction
  eventListener?: EventListenerInfo; // Information about the active event listener
}

// Stealth Address Database Record
export interface StealthAddressRecord {
  id: string;
  userId: string;
  nonce: number;
  stealthAddress: string;
  safeAddress?: string; // Optional, null if Safe prediction failed
  safeDeployed: boolean;
  safeFunded: boolean;
  chainId: number;
  chainName?: string;
  tokenAddress: string;
  tokenAmount: string;
  paymentId?: string; // Optional payment tracking ID
  deviceId?: string; // Optional device identifier
  generatedAt?: string;
  lastCheckedAt?: string;
  fromAddress?: string; // New: set when payment is completed
  transactionHash?: string; // New: set when payment is completed
}

// Payment tracking types
export interface PaymentSession {
  id?: string;
  paymentId: string;
  userId: string;
  deviceId?: string;
  stealthAddress: string;
  tokenAddress: string;
  chainId: number;
  tokenAmount: string;
  status: 'pending' | 'listening' | 'completed' | 'expired' | 'cancelled';
  isActive: boolean;
  expiresAt: string;
  completedAt?: string;
  transactionHash?: string;
  fromAddress?: string;
  actualAmount?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Device session tracking types
export interface DeviceSession {
  id?: string;
  deviceId: string;
  userId: string;
  lastActivePaymentId?: string; // The most recent payment ID for this device
  lastUsedStealthAddress?: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  lastAccessedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

// Event listener information
export interface EventListenerInfo {
  listenerId: string;
  isActive: boolean;
  startTime: string;
  timeRemaining: number; // Seconds remaining
  timeoutMinutes: number;
}

// Stealth address generation request (enhanced)
export interface StealthGenerationRequest {
  chainId?: number;
  tokenAddress: string;
  tokenAmount: string;
  deviceId?: string; // Optional device identifier for session tracking
  reuseSession?: boolean; // Whether to reuse existing session for this device
}

// Enhanced stealth generation response
export interface EnhancedStealthAddressResponse extends SingleStealthAddressResponse {
  isReusedSession: boolean; // Whether this was retrieved from an existing session
  sessionInfo?: {
    deviceId: string;
    originalCreatedAt: string;
  };
}

// Safe address information
export interface SafeAddressInfo {
  address: string;
  isDeployed: boolean;
  owners?: string[];
  threshold?: number;
  nonce?: number;
  error?: string;
}

// Supabase types
export interface SupabaseResponse<T> {
  data: T | null;
  error: any;
}

// Configuration types
export interface ServerConfig {
  port: number;
  nodeEnv: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
}

export interface DatabaseConfig {
  url: string;
  anonKey: string;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
}

// Error types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Service types
export interface HealthCheckResult {
  status: 'OK' | 'ERROR';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    eventListeners?: {
      active: number;
      supportedChains: number[];
    };
  };
  uptime: number;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Middleware types
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: any
) => Promise<void>;

// Controller types
export interface BaseController {
  [key: string]: AsyncRequestHandler;
} 