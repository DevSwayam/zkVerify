import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { InternalServerError, NotFoundError } from '../errors';
import { Logger } from '../utils';
import { UserRecord, StealthAddressRecord } from '../types';

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      config.supabase.url,
      config.supabase.anonKey
    );
  }

  // Get the Supabase client for direct use
  getClient(): SupabaseClient {
    return this.client;
  }

  // Test database connection
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('test_table')
        .select('count', { count: 'exact', head: true });
      
      return !error;
    } catch (error) {
      Logger.error('Supabase health check failed', { error });
      return false;
    }
  }

  // User operations
  async createUser(userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord> {
    try {
      const { data, error } = await this.client
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        Logger.error('Failed to create user', { error, userData: { ...userData, viewingPrivateKey: '[REDACTED]' } });
        throw new InternalServerError(`Failed to create user: ${error.message}`);
      }

      Logger.info('User created successfully', { userId: data.id, email: userData.email, username: userData.username });
      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error creating user', { error });
      throw new InternalServerError('Failed to create user');
    }
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
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
        Logger.error('Failed to get user by username', { error, username });
        throw new InternalServerError(`Failed to get user: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting user by username', { error, username });
      throw new InternalServerError('Failed to get user');
    }
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
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
        Logger.error('Failed to get user by email', { error, email });
        throw new InternalServerError(`Failed to get user: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting user by email', { error, email });
      throw new InternalServerError('Failed to get user');
    }
  }

  async getUserByApiKey(apiKey: string): Promise<UserRecord | null> {
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
        Logger.error('Failed to get user by API key', { error });
        throw new InternalServerError(`Failed to get user: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting user by API key', { error });
      throw new InternalServerError('Failed to get user');
    }
  }

  async getUserByEOA(eoaaddress: string): Promise<UserRecord | null> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('eoaaddress', eoaaddress)
        .eq('isActive', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        Logger.error('Failed to get user by EOA address', { error, eoaaddress });
        throw new InternalServerError(`Failed to get user: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting user by EOA address', { error, eoaaddress });
      throw new InternalServerError('Failed to get user');
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        Logger.error('Failed to check email existence', { error, email });
        throw new InternalServerError(`Failed to check email: ${error.message}`);
      }

      return !!data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error checking email existence', { error, email });
      throw new InternalServerError('Failed to check email');
    }
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (error && error.code !== 'PGRST116') {
        Logger.error('Failed to check username existence', { error, username });
        throw new InternalServerError(`Failed to check username: ${error.message}`);
      }

      return !!data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error checking username existence', { error, username });
      throw new InternalServerError('Failed to check username');
    }
  }

  async incrementUserNonce(userId: string): Promise<number> {
    try {
      // First get the current nonce
      const { data: currentUser, error: fetchError } = await this.client
        .from('users')
        .select('currentNonce')
        .eq('id', userId)
        .single();

      if (fetchError) {
        Logger.error('Failed to fetch current nonce', { error: fetchError, userId });
        throw new InternalServerError(`Failed to fetch current nonce: ${fetchError.message}`);
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
        Logger.error('Failed to increment user nonce', { error, userId });
        throw new InternalServerError(`Failed to increment nonce: ${error.message}`);
      }

      Logger.info('User nonce incremented', { userId, newNonce: data.currentNonce });
      return data.currentNonce;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error incrementing nonce', { error, userId });
      throw new InternalServerError('Failed to increment nonce');
    }
  }

  // Generic CRUD operations
  async insert<T>(table: string, data: Partial<T>): Promise<T> {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert([data])
        .select()
        .single();

      if (error) {
        Logger.error(`Failed to insert into ${table}`, { error, data });
        throw new InternalServerError(`Failed to insert data: ${error.message}`);
      }

      return result;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error(`Unexpected error inserting into ${table}`, { error, data });
      throw new InternalServerError('Failed to insert data');
    }
  }

  async findById<T>(table: string, id: string | number): Promise<T> {
    try {
      const { data, error } = await this.client
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Record');
        }
        Logger.error(`Failed to find record in ${table}`, { error, id });
        throw new InternalServerError(`Failed to find record: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalServerError) {
        throw error;
      }
      Logger.error(`Unexpected error finding record in ${table}`, { error, id });
      throw new InternalServerError('Failed to find record');
    }
  }

  // Stealth Address operations
  async createStealthAddress(stealthAddressData: Omit<StealthAddressRecord, 'id' | 'generatedAt' | 'lastCheckedAt'>): Promise<StealthAddressRecord> {
    try {
      const { data, error } = await this.client
        .from('stealth_addresses')
        .insert([stealthAddressData])
        .select()
        .single();

      if (error) {
        Logger.error('Failed to create stealth address record', { error, stealthAddressData });
        throw new InternalServerError(`Failed to create stealth address: ${error.message}`);
      }

      Logger.info('Stealth address record created successfully', { 
        id: data.id, 
        userId: data.userId,
        stealthAddress: data.stealthAddress,
        safeAddress: data.safeAddress
      });
      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error creating stealth address record', { error });
      throw new InternalServerError('Failed to create stealth address');
    }
  }

  async getStealthAddressesByUser(userId: string): Promise<StealthAddressRecord[]> {
    try {
      const { data, error } = await this.client
        .from('stealth_addresses')
        .select('*')
        .eq('userId', userId)
        .order('generatedAt', { ascending: false });

      if (error) {
        Logger.error('Failed to get stealth addresses by user', { error, userId });
        throw new InternalServerError(`Failed to get stealth addresses: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting stealth addresses by user', { error, userId });
      throw new InternalServerError('Failed to get stealth addresses');
    }
  }

  async getStealthAddressByNonce(userId: string, nonce: number): Promise<StealthAddressRecord | null> {
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
        Logger.error('Failed to get stealth address by nonce', { error, userId, nonce });
        throw new InternalServerError(`Failed to get stealth address: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting stealth address by nonce', { error, userId, nonce });
      throw new InternalServerError('Failed to get stealth address');
    }
  }

  async updateStealthAddressSafeStatus(id: string, safeDeployed: boolean, safeFunded: boolean): Promise<StealthAddressRecord> {
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
        Logger.error('Failed to update stealth address safe status', { error, id, safeDeployed, safeFunded });
        throw new InternalServerError(`Failed to update stealth address: ${error.message}`);
      }

      Logger.info('Stealth address safe status updated', { 
        id, 
        safeDeployed, 
        safeFunded,
        stealthAddress: data.stealthAddress
      });
      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error updating stealth address safe status', { error, id });
      throw new InternalServerError('Failed to update stealth address');
    }
  }

  async getStealthAddressesNeedingStatusCheck(olderThanMinutes: number = 30): Promise<StealthAddressRecord[]> {
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
        Logger.error('Failed to get stealth addresses needing status check', { error });
        throw new InternalServerError(`Failed to get stealth addresses: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting stealth addresses needing status check', { error });
      throw new InternalServerError('Failed to get stealth addresses');
    }
  }

  // Find stealth address record by either stealth address or safe address
  async getStealthAddressByPaymentAddress(paymentAddress: string): Promise<StealthAddressRecord | null> {
    try {
      const { data, error } = await this.client
        .from('stealth_addresses')
        .select('*')
        .or(`stealthAddress.eq.${paymentAddress.toLowerCase()},safeAddress.eq.${paymentAddress.toLowerCase()}`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        Logger.error('Failed to get stealth address by payment address', { error, paymentAddress });
        throw new InternalServerError(`Failed to get stealth address: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting stealth address by payment address', { error, paymentAddress });
      throw new InternalServerError('Failed to get stealth address');
    }
  }

  // Update only the funding status of a stealth address
  async updateStealthAddressFundingStatus(id: string, safeFunded: boolean): Promise<StealthAddressRecord> {
    try {
      const { data, error } = await this.client
        .from('stealth_addresses')
        .update({ 
          safeFunded,
          lastCheckedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        Logger.error('Failed to update stealth address funding status', { error, id, safeFunded });
        throw new InternalServerError(`Failed to update stealth address funding: ${error.message}`);
      }

      Logger.info('Stealth address funding status updated', { 
        id, 
        safeFunded,
        stealthAddress: data.stealthAddress,
        safeAddress: data.safeAddress
      });
      return data;
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error updating stealth address funding status', { error, id });
      throw new InternalServerError('Failed to update stealth address funding');
    }
  }

  // Update stealth address funding status and set fromAddress and transactionHash
  async updateStealthAddressFundingAndTx(id: string, funded: boolean, fromAddress: string, transactionHash: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('stealth_addresses')
        .update({
          safeFunded: funded,
          fromAddress,
          transactionHash
        })
        .eq('id', id);
      if (error) {
        throw error;
      }
    } catch (err) {
      Logger.error('Failed to update stealth address funding and tx', { error: err, id, funded, fromAddress, transactionHash });
      throw err;
    }
  }

  // Get funding statistics for a user
  async getUserFundingStats(userId: string): Promise<{
    totalGenerated: number;
    totalFunded: number;
    fundedPercentage: number;
    fundedAddresses: StealthAddressRecord[];
  }> {
    try {
      // Get all stealth addresses for the user
      const { data: allAddresses, error: allError } = await this.client
        .from('stealth_addresses')
        .select('*')
        .eq('userId', userId);

      if (allError) {
        Logger.error('Failed to get all stealth addresses for funding stats', { error: allError, userId });
        throw new InternalServerError(`Failed to get stealth addresses: ${allError.message}`);
      }

      // Get funded addresses
      const { data: fundedAddresses, error: fundedError } = await this.client
        .from('stealth_addresses')
        .select('*')
        .eq('userId', userId)
        .eq('safeFunded', true)
        .order('lastCheckedAt', { ascending: false });

      if (fundedError) {
        Logger.error('Failed to get funded stealth addresses', { error: fundedError, userId });
        throw new InternalServerError(`Failed to get funded addresses: ${fundedError.message}`);
      }

      const totalGenerated = allAddresses?.length || 0;
      const totalFunded = fundedAddresses?.length || 0;
      const fundedPercentage = totalGenerated > 0 ? (totalFunded / totalGenerated) * 100 : 0;

      return {
        totalGenerated,
        totalFunded,
        fundedPercentage: Math.round(fundedPercentage * 100) / 100, // Round to 2 decimal places
        fundedAddresses: fundedAddresses || []
      };
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting user funding stats', { error, userId });
      throw new InternalServerError('Failed to get funding stats');
    }
  }

  // Get stealth addresses by funding status
  async getStealthAddressesByFundingStatus(userId: string, safeFunded: boolean): Promise<StealthAddressRecord[]> {
    try {
      const { data, error } = await this.client
        .from('stealth_addresses')
        .select('*')
        .eq('userId', userId)
        .eq('safeFunded', safeFunded)
        .order('generatedAt', { ascending: false });

      if (error) {
        Logger.error('Failed to get stealth addresses by funding status', { error, userId, safeFunded });
        throw new InternalServerError(`Failed to get stealth addresses: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      Logger.error('Unexpected error getting stealth addresses by funding status', { error, userId, safeFunded });
      throw new InternalServerError('Failed to get stealth addresses');
    }
  }
} 