"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
const errors_1 = require("../errors");
const utils_1 = require("../utils");
class SupabaseService {
    constructor() {
        this.client = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.anonKey);
    }
    // Get the Supabase client for direct use
    getClient() {
        return this.client;
    }
    // Test database connection
    async healthCheck() {
        try {
            const { error } = await this.client
                .from('test_table')
                .select('count', { count: 'exact', head: true });
            return !error;
        }
        catch (error) {
            utils_1.Logger.error('Supabase health check failed', { error });
            return false;
        }
    }
    // User operations
    async createUser(userData) {
        try {
            const { data, error } = await this.client
                .from('users')
                .insert([userData])
                .select()
                .single();
            if (error) {
                utils_1.Logger.error('Failed to create user', { error, userData: { ...userData, viewingPrivateKey: '[REDACTED]' } });
                throw new errors_1.InternalServerError(`Failed to create user: ${error.message}`);
            }
            utils_1.Logger.info('User created successfully', { userId: data.id, email: userData.email, username: userData.username });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error creating user', { error });
            throw new errors_1.InternalServerError('Failed to create user');
        }
    }
    async getUserByUsername(username) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('isActive', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                utils_1.Logger.error('Failed to get user by username', { error, username });
                throw new errors_1.InternalServerError(`Failed to get user: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error getting user by username', { error, username });
            throw new errors_1.InternalServerError('Failed to get user');
        }
    }
    async getUserByEmail(email) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('isActive', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                utils_1.Logger.error('Failed to get user by email', { error, email });
                throw new errors_1.InternalServerError(`Failed to get user: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error getting user by email', { error, email });
            throw new errors_1.InternalServerError('Failed to get user');
        }
    }
    async getUserByApiKey(apiKey) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('apiKey', apiKey)
                .eq('isActive', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                utils_1.Logger.error('Failed to get user by API key', { error });
                throw new errors_1.InternalServerError(`Failed to get user: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error getting user by API key', { error });
            throw new errors_1.InternalServerError('Failed to get user');
        }
    }
    async checkEmailExists(email) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('id')
                .eq('email', email)
                .single();
            if (error && error.code !== 'PGRST116') {
                utils_1.Logger.error('Failed to check email existence', { error, email });
                throw new errors_1.InternalServerError(`Failed to check email: ${error.message}`);
            }
            return !!data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error checking email existence', { error, email });
            throw new errors_1.InternalServerError('Failed to check email');
        }
    }
    async checkUsernameExists(username) {
        try {
            const { data, error } = await this.client
                .from('users')
                .select('id')
                .eq('username', username)
                .single();
            if (error && error.code !== 'PGRST116') {
                utils_1.Logger.error('Failed to check username existence', { error, username });
                throw new errors_1.InternalServerError(`Failed to check username: ${error.message}`);
            }
            return !!data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error checking username existence', { error, username });
            throw new errors_1.InternalServerError('Failed to check username');
        }
    }
    async incrementUserNonce(userId) {
        try {
            // First get the current nonce
            const { data: currentUser, error: fetchError } = await this.client
                .from('users')
                .select('currentNonce')
                .eq('id', userId)
                .single();
            if (fetchError) {
                utils_1.Logger.error('Failed to fetch current nonce', { error: fetchError, userId });
                throw new errors_1.InternalServerError(`Failed to fetch current nonce: ${fetchError.message}`);
            }
            const newNonce = currentUser.currentNonce + 1;
            // Update with the new nonce
            const { data, error } = await this.client
                .from('users')
                .update({
                currentNonce: newNonce,
                updatedAt: new Date().toISOString()
            })
                .eq('id', userId)
                .select('currentNonce')
                .single();
            if (error) {
                utils_1.Logger.error('Failed to increment user nonce', { error, userId });
                throw new errors_1.InternalServerError(`Failed to increment nonce: ${error.message}`);
            }
            utils_1.Logger.info('User nonce incremented', { userId, newNonce: data.currentNonce });
            return data.currentNonce;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error incrementing nonce', { error, userId });
            throw new errors_1.InternalServerError('Failed to increment nonce');
        }
    }
    // Generic CRUD operations
    async insert(table, data) {
        try {
            const { data: result, error } = await this.client
                .from(table)
                .insert([data])
                .select()
                .single();
            if (error) {
                utils_1.Logger.error(`Failed to insert into ${table}`, { error, data });
                throw new errors_1.InternalServerError(`Failed to insert data: ${error.message}`);
            }
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error(`Unexpected error inserting into ${table}`, { error, data });
            throw new errors_1.InternalServerError('Failed to insert data');
        }
    }
    async findById(table, id) {
        try {
            const { data, error } = await this.client
                .from(table)
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    throw new errors_1.NotFoundError('Record');
                }
                utils_1.Logger.error(`Failed to find record in ${table}`, { error, id });
                throw new errors_1.InternalServerError(`Failed to find record: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError || error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error(`Unexpected error finding record in ${table}`, { error, id });
            throw new errors_1.InternalServerError('Failed to find record');
        }
    }
    // Stealth Address operations
    async createStealthAddress(stealthAddressData) {
        try {
            const { data, error } = await this.client
                .from('stealth_addresses')
                .insert([stealthAddressData])
                .select()
                .single();
            if (error) {
                utils_1.Logger.error('Failed to create stealth address record', { error, stealthAddressData });
                throw new errors_1.InternalServerError(`Failed to create stealth address: ${error.message}`);
            }
            utils_1.Logger.info('Stealth address record created successfully', {
                id: data.id,
                userId: data.userId,
                stealthAddress: data.stealthAddress,
                safeAddress: data.safeAddress
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error creating stealth address record', { error });
            throw new errors_1.InternalServerError('Failed to create stealth address');
        }
    }
    async getStealthAddressesByUser(userId) {
        try {
            const { data, error } = await this.client
                .from('stealth_addresses')
                .select('*')
                .eq('userId', userId)
                .order('generatedAt', { ascending: false });
            if (error) {
                utils_1.Logger.error('Failed to get stealth addresses by user', { error, userId });
                throw new errors_1.InternalServerError(`Failed to get stealth addresses: ${error.message}`);
            }
            return data || [];
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error getting stealth addresses by user', { error, userId });
            throw new errors_1.InternalServerError('Failed to get stealth addresses');
        }
    }
    async getStealthAddressByNonce(userId, nonce) {
        try {
            const { data, error } = await this.client
                .from('stealth_addresses')
                .select('*')
                .eq('userId', userId)
                .eq('nonce', nonce)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                utils_1.Logger.error('Failed to get stealth address by nonce', { error, userId, nonce });
                throw new errors_1.InternalServerError(`Failed to get stealth address: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error getting stealth address by nonce', { error, userId, nonce });
            throw new errors_1.InternalServerError('Failed to get stealth address');
        }
    }
    async updateStealthAddressSafeStatus(id, safeDeployed, safeFunded) {
        try {
            const { data, error } = await this.client
                .from('stealth_addresses')
                .update({
                safeDeployed,
                safeFunded,
                lastCheckedAt: new Date().toISOString()
            })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                utils_1.Logger.error('Failed to update stealth address safe status', { error, id, safeDeployed, safeFunded });
                throw new errors_1.InternalServerError(`Failed to update stealth address: ${error.message}`);
            }
            utils_1.Logger.info('Stealth address safe status updated', {
                id,
                safeDeployed,
                safeFunded,
                stealthAddress: data.stealthAddress
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error updating stealth address safe status', { error, id });
            throw new errors_1.InternalServerError('Failed to update stealth address');
        }
    }
    async getStealthAddressesNeedingStatusCheck(olderThanMinutes = 30) {
        try {
            const checkTime = new Date();
            checkTime.setMinutes(checkTime.getMinutes() - olderThanMinutes);
            const { data, error } = await this.client
                .from('stealth_addresses')
                .select('*')
                .or('safeDeployed.eq.false,safeFunded.eq.false')
                .lt('lastCheckedAt', checkTime.toISOString())
                .order('lastCheckedAt', { ascending: true })
                .limit(100); // Limit to avoid overwhelming the system
            if (error) {
                utils_1.Logger.error('Failed to get stealth addresses needing status check', { error });
                throw new errors_1.InternalServerError(`Failed to get stealth addresses: ${error.message}`);
            }
            return data || [];
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error getting stealth addresses needing status check', { error });
            throw new errors_1.InternalServerError('Failed to get stealth addresses');
        }
    }
}
exports.SupabaseService = SupabaseService;
//# sourceMappingURL=SupabaseService.js.map