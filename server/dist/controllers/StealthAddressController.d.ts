import { Request, Response, NextFunction } from 'express';
export declare class StealthAddressController {
    private stealthAddressService;
    private userService;
    private supabaseService;
    private eventListenerService;
    private paymentSessionService;
    constructor();
    private getRpcUrlForChain;
    private setupEventListeners;
    private handlePaymentDetected;
    private handlePaymentTimeout;
    generateStealthAddress: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCurrentNonce: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStealthAddresses: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStealthAddressByNonce: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPaymentStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getActiveListeners: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=StealthAddressController.d.ts.map