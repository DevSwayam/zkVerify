import { EventEmitter } from 'events';
export interface PaymentDetected {
    paymentId: string;
    stealthAddress: string;
    fromAddress: string;
    amount: string;
    tokenAddress: string;
    chainId: number;
    transactionHash: string;
    blockNumber: bigint;
    timestamp: Date;
    isNativeToken: boolean;
}
export interface EventListenerConfig {
    paymentId: string;
    paymentAddress: string;
    tokenAddress: string;
    chainId: number;
    userId: string;
    deviceId?: string;
    expectedAmount?: string;
    timeoutMinutes: number;
}
interface ActiveListener {
    config: EventListenerConfig;
    unwatch: () => void;
    timeoutId: NodeJS.Timeout;
    startTime: Date;
}
export declare class EventListenerService extends EventEmitter {
    private activeListeners;
    private publicClients;
    private readonly DEFAULT_TIMEOUT_MINUTES;
    constructor();
    private initializeClients;
    private getTokenDecimals;
    startListening(config: EventListenerConfig): Promise<string>;
    private checkNativeTransactions;
    private handleERC20Transfers;
    stopListening(listenerId: string, reason?: 'timeout' | 'payment_received' | 'manual'): boolean;
    getActiveListeners(): {
        listenerId: string;
        config: EventListenerConfig;
        startTime: Date;
        timeRemaining: number;
    }[];
    stopAllListeners(): number;
    private generateListenerId;
    getListenerByPaymentId(paymentId: string): ActiveListener | undefined;
    getHealthStatus(): {
        isHealthy: boolean;
        activeListeners: number;
        supportedChains: number[];
        uptime: number;
    };
    private startERC20EventPolling;
    fetchTokenDecimals(tokenAddress: string, chainId: number): Promise<number>;
}
export {};
//# sourceMappingURL=EventListenerService.d.ts.map