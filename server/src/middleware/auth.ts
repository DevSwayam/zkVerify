import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../errors';
import { ResponseUtil, Logger } from '../utils';

const userService = new UserService();

export const authenticateAndAuthorize = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Check if username parameter exists
    const username = req.params.username;
    if (!username) {
      ResponseUtil.error(res, 'Username parameter missing', 400);
      return;
    }

    const user = await userService.getUserByUsername(username);
    if (!user) {
      ResponseUtil.error(res, 'User not found', 404);
      return;
    }

    // 2. Verify API key
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      ResponseUtil.error(res, 'API key required', 401);
      return;
    }

    const apiUser = await userService.getUserByApiKey(apiKey);
    if (!apiUser) {
      ResponseUtil.error(res, 'Invalid API key', 401);
      return;
    }

    // 3. Verify bearer token
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseUtil.error(res, 'Bearer token required', 401);
      return;
    }

    const bearerToken = authHeader.replace('Bearer ', '');
    let decoded;
    try {
      decoded = userService.verifyToken(bearerToken);
    } catch (error) {
      ResponseUtil.error(res, 'Invalid or expired token', 401);
      return;
    }

    // 4. Check if token belongs to the username owner
    if (decoded.username !== username) {
      ResponseUtil.error(res, 'Access forbidden - token does not match username', 403);
      return;
    }

    // 5. Verify API key belongs to the same user
    if (apiUser.id !== user.id) {
      ResponseUtil.error(res, 'API key does not match user', 403);
      return;
    }

    // 6. All checks passed - attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
    req.userRecord = user;

    Logger.info('Authentication successful', {
      userId: user.id,
      username: user.username,
      endpoint: req.path
    });

    next();

  } catch (error) {
    Logger.error('Authentication failed', { error, username: req.params.username });
    ResponseUtil.error(res, 'Authentication failed', 401);
  }
}; 