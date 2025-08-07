import { Request, Response, NextFunction } from 'express';
export declare class HealthController {
    private supabaseService;
    constructor();
    health: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    healthDetailed: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    ready: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    live: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=HealthController.d.ts.map