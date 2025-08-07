"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    static formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaString = meta ? ` | ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
    }
    static error(message, meta) {
        console.error(this.formatMessage(LogLevel.ERROR, message, meta));
    }
    static warn(message, meta) {
        console.warn(this.formatMessage(LogLevel.WARN, message, meta));
    }
    static info(message, meta) {
        console.info(this.formatMessage(LogLevel.INFO, message, meta));
    }
    static debug(message, meta) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(this.formatMessage(LogLevel.DEBUG, message, meta));
        }
    }
    static http(method, url, statusCode, responseTime) {
        const message = `${method} ${url} - ${statusCode}`;
        const meta = responseTime ? { responseTime: `${responseTime}ms` } : undefined;
        this.info(message, meta);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map