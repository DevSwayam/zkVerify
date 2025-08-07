export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug"
}
export declare class Logger {
    private static formatMessage;
    static error(message: string, meta?: any): void;
    static warn(message: string, meta?: any): void;
    static info(message: string, meta?: any): void;
    static debug(message: string, meta?: any): void;
    static http(method: string, url: string, statusCode: number, responseTime?: number): void;
}
//# sourceMappingURL=logger.d.ts.map