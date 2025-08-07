import { Request, Response, NextFunction } from 'express';
export declare class UserController {
    private userService;
    private supabaseService;
    private stealthAddressService;
    constructor();
    private getRpcUrlForChain;
    registerUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    loginUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=UserController.d.ts.map