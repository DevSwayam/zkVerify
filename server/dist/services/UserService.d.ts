import { UserRegistrationRequest, UserRecord, UserRegistrationResponse, ChainConfig } from '../types';
export declare class UserService {
    private supabaseService;
    constructor();
    private generateApiKey;
    generateToken(user: UserRecord): string;
    verifyToken(token: string): any;
    registerUser(registrationData: UserRegistrationRequest): Promise<UserRegistrationResponse>;
    getUserByUsername(username: string): Promise<UserRecord | null>;
    getUserByEmail(email: string): Promise<UserRecord | null>;
    getUserByApiKey(apiKey: string): Promise<UserRecord | null>;
    incrementNonce(userId: string): Promise<number>;
    getUserChainIds(user: UserRecord): number[];
    isChainSupported(user: UserRecord, chainId: number): boolean;
    getTokenAddresses(user: UserRecord, chainId: number): string[];
    isTokenSupported(user: UserRecord, chainId: number, tokenAddress: string): boolean;
    getChainConfig(user: UserRecord, chainId: number): ChainConfig | null;
    private validateRegistrationData;
    private isValidChainConfig;
    private isValidEmail;
    private isValidHex;
    private isValidUsername;
    private isValidChainId;
    private isValidTokenAddress;
}
//# sourceMappingURL=UserService.d.ts.map