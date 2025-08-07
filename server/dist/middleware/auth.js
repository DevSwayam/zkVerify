"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAndAuthorize = void 0;
const UserService_1 = require("../services/UserService");
const utils_1 = require("../utils");
const userService = new UserService_1.UserService();
const authenticateAndAuthorize = async (req, res, next) => {
    try {
        // 1. Check if username parameter exists
        const username = req.params.username;
        if (!username) {
            utils_1.ResponseUtil.error(res, 'Username parameter missing', 400);
            return;
        }
        const user = await userService.getUserByUsername(username);
        if (!user) {
            utils_1.ResponseUtil.error(res, 'User not found', 404);
            return;
        }
        // 2. Verify API key
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            utils_1.ResponseUtil.error(res, 'API key required', 401);
            return;
        }
        const apiUser = await userService.getUserByApiKey(apiKey);
        if (!apiUser) {
            utils_1.ResponseUtil.error(res, 'Invalid API key', 401);
            return;
        }
        // 3. Verify bearer token
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            utils_1.ResponseUtil.error(res, 'Bearer token required', 401);
            return;
        }
        const bearerToken = authHeader.replace('Bearer ', '');
        let decoded;
        try {
            decoded = userService.verifyToken(bearerToken);
        }
        catch (error) {
            utils_1.ResponseUtil.error(res, 'Invalid or expired token', 401);
            return;
        }
        // 4. Check if token belongs to the username owner
        if (decoded.username !== username) {
            utils_1.ResponseUtil.error(res, 'Access forbidden - token does not match username', 403);
            return;
        }
        // 5. Verify API key belongs to the same user
        if (apiUser.id !== user.id) {
            utils_1.ResponseUtil.error(res, 'API key does not match user', 403);
            return;
        }
        // 6. All checks passed - attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            username: decoded.username
        };
        req.userRecord = user;
        utils_1.Logger.info('Authentication successful', {
            userId: user.id,
            username: user.username,
            endpoint: req.path
        });
        next();
    }
    catch (error) {
        utils_1.Logger.error('Authentication failed', { error, username: req.params.username });
        utils_1.ResponseUtil.error(res, 'Authentication failed', 401);
    }
};
exports.authenticateAndAuthorize = authenticateAndAuthorize;
//# sourceMappingURL=auth.js.map