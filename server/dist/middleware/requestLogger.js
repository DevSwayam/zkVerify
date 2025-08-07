"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const utils_1 = require("../utils");
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    // Log request start
    utils_1.Logger.info(`${req.method} ${req.url}`, {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        body: req.method !== 'GET' ? req.body : undefined
    });
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const responseTime = Date.now() - startTime;
        // Log response
        utils_1.Logger.http(req.method, req.url, res.statusCode, responseTime);
        // Call original end method
        return originalEnd.call(this, chunk, encoding);
    };
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=requestLogger.js.map