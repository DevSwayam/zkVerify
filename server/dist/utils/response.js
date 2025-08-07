"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseUtil = void 0;
class ResponseUtil {
    static success(res, data, message, statusCode = 200) {
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            ...(data !== undefined && { data }),
            ...(message && { message })
        };
        return res.status(statusCode).json(response);
    }
    static error(res, error, statusCode = 500) {
        const response = {
            success: false,
            error,
            timestamp: new Date().toISOString()
        };
        return res.status(statusCode).json(response);
    }
    static paginated(res, data, page, limit, total, message) {
        const totalPages = Math.ceil(total / limit);
        const response = {
            success: true,
            data,
            timestamp: new Date().toISOString(),
            pagination: {
                page,
                limit,
                total,
                totalPages
            },
            ...(message && { message })
        };
        return res.status(200).json(response);
    }
    static created(res, data, message) {
        return this.success(res, data, message, 201);
    }
    static noContent(res) {
        return res.status(204).send();
    }
}
exports.ResponseUtil = ResponseUtil;
//# sourceMappingURL=response.js.map