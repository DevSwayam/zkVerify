import { PaymentSession, DeviceSession } from '../types';
export declare class PaymentSessionService {
    private supabaseService;
    constructor();
    generatePaymentId(): string;
    generateDeviceId(userAgent?: string, ipAddress?: string): string;
    createPaymentSession(sessionData: Omit<PaymentSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentSession>;
    getPaymentSession(paymentId: string): Promise<PaymentSession | null>;
    updatePaymentSession(paymentId: string, updates: Partial<PaymentSession>): Promise<PaymentSession>;
    createOrUpdateDeviceSession(sessionData: Omit<DeviceSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<DeviceSession>;
    getDeviceSession(deviceId: string, userId: string): Promise<DeviceSession | null>;
    getActivePaymentSessionForDevice(deviceId: string, userId: string): Promise<PaymentSession | null>;
    completePaymentSession(paymentId: string, transactionHash: string, fromAddress: string, actualAmount: string): Promise<PaymentSession>;
    expirePaymentSession(paymentId: string): Promise<PaymentSession>;
    getUserPaymentSessions(userId: string, limit?: number): Promise<PaymentSession[]>;
    cleanupExpiredSessions(): Promise<number>;
    getHealthStatus(): {
        isHealthy: boolean;
        name: string;
    };
}
//# sourceMappingURL=PaymentSessionService.d.ts.map