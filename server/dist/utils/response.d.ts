import { Response } from 'express';
export declare class ResponseUtil {
    static success<T>(res: Response, data?: T, message?: string, statusCode?: number): Response;
    static error(res: Response, error: string, statusCode?: number): Response;
    static paginated<T>(res: Response, data: T[], page: number, limit: number, total: number, message?: string): Response;
    static created<T>(res: Response, data?: T, message?: string): Response;
    static noContent(res: Response): Response;
}
//# sourceMappingURL=response.d.ts.map