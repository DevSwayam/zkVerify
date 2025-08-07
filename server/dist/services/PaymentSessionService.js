"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSessionService = void 0;
const crypto_1 = require("crypto");
const SupabaseService_1 = require("./SupabaseService");
const utils_1 = require("../utils");
const errors_1 = require("../errors");
class PaymentSessionService {
    constructor() {
        this.supabaseService = new SupabaseService_1.SupabaseService();
    }
    // Generate a unique payment ID
    generatePaymentId() {
        const timestamp = Date.now().toString(36);
        const random = (0, crypto_1.randomUUID)().split('-')[0];
        return `pay_${timestamp}_${random}`;
    }
    // Generate a device fingerprint-based ID (can be enhanced with actual device fingerprinting)
    generateDeviceId(userAgent, ipAddress) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 8);
        return `dev_${timestamp}_${random}`;
    }
    // Create a new payment session
    async createPaymentSession(sessionData) {
        try {
            utils_1.Logger.info('Creating payment session', {
                paymentId: sessionData.paymentId,
                userId: sessionData.userId,
                deviceId: sessionData.deviceId,
                stealthAddress: sessionData.stealthAddress
            });
            const { data, error } = await this.supabaseService.getClient()
                .from('payment_sessions')
                .insert([{
                    ...sessionData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }])
                .select()
                .single();
            if (error) {
                utils_1.Logger.error('Failed to create payment session', { error, sessionData });
                throw new errors_1.InternalServerError(`Failed to create payment session: ${error.message}`);
            }
            utils_1.Logger.info('Payment session created successfully', {
                id: data.id,
                paymentId: sessionData.paymentId,
                userId: sessionData.userId
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error creating payment session', { error, sessionData });
            throw new errors_1.InternalServerError('Failed to create payment session');
        }
    }
    // Get payment session by payment ID
    async getPaymentSession(paymentId) {
        try {
            const { data, error } = await this.supabaseService.getClient()
                .from('payment_sessions')
                .select('*')
                .eq('paymentId', paymentId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                utils_1.Logger.error('Failed to get payment session', { error, paymentId });
                throw new errors_1.InternalServerError(`Failed to get payment session: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error getting payment session', { error, paymentId });
            throw new errors_1.InternalServerError('Failed to get payment session');
        }
    }
    // Update payment session status
    async updatePaymentSession(paymentId, updates) {
        try {
            const { data, error } = await this.supabaseService.getClient()
                .from('payment_sessions')
                .update({
                ...updates,
                updatedAt: new Date().toISOString()
            })
                .eq('paymentId', paymentId)
                .select()
                .single();
            if (error) {
                utils_1.Logger.error('Failed to update payment session', { error, paymentId, updates });
                throw new errors_1.InternalServerError(`Failed to update payment session: ${error.message}`);
            }
            utils_1.Logger.info('Payment session updated', {
                paymentId,
                updates: Object.keys(updates),
                status: updates.status
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error updating payment session', { error, paymentId });
            throw new errors_1.InternalServerError('Failed to update payment session');
        }
    }
    // Create or update device session
    async createOrUpdateDeviceSession(sessionData) {
        try {
            // First, try to find existing device session
            const { data: existingSession } = await this.supabaseService.getClient()
                .from('device_sessions')
                .select('*')
                .eq('deviceId', sessionData.deviceId)
                .eq('userId', sessionData.userId)
                .single();
            if (existingSession) {
                // Update existing session
                const { data, error } = await this.supabaseService.getClient()
                    .from('device_sessions')
                    .update({
                    ...sessionData,
                    lastAccessedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })
                    .eq('id', existingSession.id)
                    .select()
                    .single();
                if (error) {
                    utils_1.Logger.error('Failed to update device session', { error, sessionData });
                    throw new errors_1.InternalServerError(`Failed to update device session: ${error.message}`);
                }
                utils_1.Logger.info('Device session updated', {
                    deviceId: sessionData.deviceId,
                    userId: sessionData.userId,
                    lastActivePaymentId: sessionData.lastActivePaymentId
                });
                return data;
            }
            else {
                // Create new session
                const { data, error } = await this.supabaseService.getClient()
                    .from('device_sessions')
                    .insert([{
                        ...sessionData,
                        lastAccessedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }])
                    .select()
                    .single();
                if (error) {
                    utils_1.Logger.error('Failed to create device session', { error, sessionData });
                    throw new errors_1.InternalServerError(`Failed to create device session: ${error.message}`);
                }
                utils_1.Logger.info('Device session created', {
                    deviceId: sessionData.deviceId,
                    userId: sessionData.userId
                });
                return data;
            }
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error creating/updating device session', { error, sessionData });
            throw new errors_1.InternalServerError('Failed to manage device session');
        }
    }
    // Get device session for reuse check
    async getDeviceSession(deviceId, userId) {
        try {
            const { data, error } = await this.supabaseService.getClient()
                .from('device_sessions')
                .select('*')
                .eq('deviceId', deviceId)
                .eq('userId', userId)
                .eq('isActive', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                utils_1.Logger.error('Failed to get device session', { error, deviceId, userId });
                throw new errors_1.InternalServerError(`Failed to get device session: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error getting device session', { error, deviceId, userId });
            throw new errors_1.InternalServerError('Failed to get device session');
        }
    }
    // Get active payment session for device (for reuse)
    async getActivePaymentSessionForDevice(deviceId, userId) {
        try {
            const deviceSession = await this.getDeviceSession(deviceId, userId);
            if (!deviceSession || !deviceSession.lastActivePaymentId) {
                return null;
            }
            // Get the last active payment session
            const paymentSession = await this.getPaymentSession(deviceSession.lastActivePaymentId);
            // Check if it's still active and not expired
            if (paymentSession &&
                paymentSession.isActive &&
                paymentSession.status === 'listening' &&
                new Date(paymentSession.expiresAt) > new Date()) {
                utils_1.Logger.info('Found active payment session for device reuse', {
                    deviceId,
                    userId,
                    paymentId: paymentSession.paymentId,
                    stealthAddress: paymentSession.stealthAddress
                });
                return paymentSession;
            }
            return null;
        }
        catch (error) {
            utils_1.Logger.error('Error getting active payment session for device', { error, deviceId, userId });
            return null; // Don't throw, just return null to create new session
        }
    }
    // Complete payment session (when payment is detected)
    async completePaymentSession(paymentId, transactionHash, fromAddress, actualAmount) {
        try {
            const completedAt = new Date().toISOString();
            const updatedSession = await this.updatePaymentSession(paymentId, {
                status: 'completed',
                completedAt,
                transactionHash,
                fromAddress,
                actualAmount,
                isActive: false
            });
            utils_1.Logger.info('Payment session completed', {
                paymentId,
                transactionHash,
                fromAddress,
                actualAmount
            });
            return updatedSession;
        }
        catch (error) {
            utils_1.Logger.error('Error completing payment session', { error, paymentId });
            throw error;
        }
    }
    // Expire payment session (when timeout occurs)
    async expirePaymentSession(paymentId) {
        try {
            const updatedSession = await this.updatePaymentSession(paymentId, {
                status: 'expired',
                isActive: false
            });
            utils_1.Logger.info('Payment session expired', { paymentId });
            return updatedSession;
        }
        catch (error) {
            utils_1.Logger.error('Error expiring payment session', { error, paymentId });
            throw error;
        }
    }
    // Get all payment sessions for a user
    async getUserPaymentSessions(userId, limit = 50) {
        try {
            const { data, error } = await this.supabaseService.getClient()
                .from('payment_sessions')
                .select('*')
                .eq('userId', userId)
                .order('createdAt', { ascending: false })
                .limit(limit);
            if (error) {
                utils_1.Logger.error('Failed to get user payment sessions', { error, userId });
                throw new errors_1.InternalServerError(`Failed to get payment sessions: ${error.message}`);
            }
            return data || [];
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error getting user payment sessions', { error, userId });
            throw new errors_1.InternalServerError('Failed to get payment sessions');
        }
    }
    // Clean up expired payment sessions (maintenance task)
    async cleanupExpiredSessions() {
        try {
            const now = new Date().toISOString();
            const { data, error } = await this.supabaseService.getClient()
                .from('payment_sessions')
                .update({
                status: 'expired',
                isActive: false,
                updatedAt: now
            })
                .lt('expiresAt', now)
                .eq('isActive', true)
                .select('id');
            if (error) {
                utils_1.Logger.error('Failed to cleanup expired sessions', { error });
                throw new errors_1.InternalServerError(`Failed to cleanup sessions: ${error.message}`);
            }
            const cleanedCount = data?.length || 0;
            if (cleanedCount > 0) {
                utils_1.Logger.info('Cleaned up expired payment sessions', { count: cleanedCount });
            }
            return cleanedCount;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error cleaning up expired sessions', { error });
            return 0;
        }
    }
    // Health check for payment session service
    getHealthStatus() {
        return {
            isHealthy: true,
            name: 'PaymentSessionService'
        };
    }
}
exports.PaymentSessionService = PaymentSessionService;
//# sourceMappingURL=PaymentSessionService.js.map