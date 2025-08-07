export declare const config: {
    port: number;
    nodeEnv: string;
    supabase: {
        url: string;
        anonKey: string;
    };
    jwt: {
        secret: string;
    };
    blockchain: {
        defaultChainId: number;
        defaultRpcUrl: string;
    };
    cors: {
        origin: string;
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        skipSuccessfulRequests: boolean;
    };
    logging: {
        level: string;
        enableConsole: boolean;
        enableFile: boolean;
        filePath: string;
    };
};
export declare const validateConfig: () => void;
export default config;
//# sourceMappingURL=index.d.ts.map