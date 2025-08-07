import { Request, Response } from 'express';
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
export interface TypedRequest<T = any> extends Request {
    body: T;
}
export interface TypedResponse<T = any> extends Response {
    json: (body: ApiResponse<T>) => this;
}
export interface ChainConfig {
    chainId: number;
    tokenAddresses: string[];
    name?: string;
}
export interface UserRegistrationRequest {
    username: string;
    email: string;
    viewingPrivateKey: string;
    spendingPublicKey: string;
    chains: ChainConfig[];
    isMerchant?: boolean;
    deviceId?: string;
}
export interface UserRecord {
    id?: string;
    username: string;
    email: string;
    chains: ChainConfig[];
    viewingPrivateKey: string;
    spendingPublicKey: string;
    currentNonce: number;
    apiKey?: string;
    isMerchant: boolean;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
export interface UserRegistrationResponse {
    success: boolean;
    user: {
        id: string;
        username: string;
        email: string;
        chains: ChainConfig[];
        isMerchant: boolean;
        apiKey?: string;
    };
    message: string;
}
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        email: string;
        username: string;
    };
    userRecord?: UserRecord;
}
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
export interface SingleStealthAddressResponse {
    address: string;
    chainId: number;
    chainName: string;
    tokenAddress: string;
    tokenAmount: string;
    paymentId: string;
    safeAddress?: SafeAddressInfo;
    eventListener?: EventListenerInfo;
}
export interface StealthAddressRecord {
    id?: string;
    userId: string;
    nonce: number;
    stealthAddress: string;
    safeAddress?: string;
    safeDeployed: boolean;
    safeFunded: boolean;
    chainId: number;
    chainName: string;
    tokenAddress: string;
    tokenAmount: string;
    paymentId?: string;
    deviceId?: string;
    generatedAt?: string;
    lastCheckedAt?: string;
}
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
export interface DeviceSession {
    id?: string;
    deviceId: string;
    userId: string;
    lastActivePaymentId?: string;
    lastUsedStealthAddress?: string;
    userAgent?: string;
    ipAddress?: string;
    isActive: boolean;
    lastAccessedAt: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface EventListenerInfo {
    listenerId: string;
    isActive: boolean;
    startTime: string;
    timeRemaining: number;
    timeoutMinutes: number;
}
export interface StealthGenerationRequest {
    chainId?: number;
    tokenAddress: string;
    tokenAmount: string;
    deviceId?: string;
    reuseSession?: boolean;
}
export interface EnhancedStealthAddressResponse extends SingleStealthAddressResponse {
    isReusedSession: boolean;
    sessionInfo?: {
        deviceId: string;
        originalCreatedAt: string;
    };
}
export interface SafeAddressInfo {
    address: string;
    isDeployed: boolean;
    owners?: string[];
    threshold?: number;
    nonce?: number;
    error?: string;
}
export interface SupabaseResponse<T> {
    data: T | null;
    error: any;
}
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
export interface AppError extends Error {
    statusCode: number;
    isOperational: boolean;
}
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
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
export type AsyncRequestHandler = (req: Request, res: Response, next: any) => Promise<void>;
export interface BaseController {
    [key: string]: AsyncRequestHandler;
}
//# sourceMappingURL=index.d.ts.map