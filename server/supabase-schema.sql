-- Final Supabase Schema for Stealth Address & Safe Management
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS device_sessions CASCADE;
DROP TABLE IF EXISTS payment_sessions CASCADE;
DROP TABLE IF EXISTS stealth_addresses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS test_table CASCADE;

-- Create users table with quoted column names to preserve camelCase
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    eoaaddress VARCHAR(42) UNIQUE NOT NULL, -- EOA address for onchain login (lowercase)
    chains JSONB NOT NULL DEFAULT '[]',
    "viewingPrivateKey" VARCHAR(66) NOT NULL,
    "spendingPublicKey" VARCHAR(132) NOT NULL,
    "currentNonce" INTEGER NOT NULL DEFAULT 0,
    "isMerchant" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" VARCHAR(255) UNIQUE, -- Nullable: only merchants have API keys
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create stealth_addresses table to store each generated address with Safe info
CREATE TABLE stealth_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nonce INTEGER NOT NULL,
    "stealthAddress" VARCHAR(42) NOT NULL, -- Ethereum address format
    "safeAddress" VARCHAR(42), -- Safe address (nullable in case prediction fails)
    "safeDeployed" BOOLEAN NOT NULL DEFAULT false,
    "safeFunded" BOOLEAN NOT NULL DEFAULT false,
    "chainId" INTEGER NOT NULL,
    "chainName" VARCHAR(255) NOT NULL,
    "tokenAddress" VARCHAR(42) NOT NULL,
    "tokenAmount" VARCHAR(50) NOT NULL, -- Store as string to handle large numbers
    "paymentId" VARCHAR(100), -- Optional payment tracking ID
    "deviceId" VARCHAR(100), -- Optional device identifier
    "generatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "fromAddress" VARCHAR(42), -- Set when payment is completed
    "transactionHash" VARCHAR(66), -- Set when payment is completed
    
    -- Ensure each user + nonce combination is unique
    UNIQUE("userId", nonce)
);

-- Migration: Add fromAddress and transactionHash if not present
-- ALTER TABLE stealth_addresses ADD COLUMN IF NOT EXISTS fromAddress VARCHAR(42);
-- ALTER TABLE stealth_addresses ADD COLUMN IF NOT EXISTS transactionHash VARCHAR(66);

-- Create payment_sessions table for tracking payment states
CREATE TABLE payment_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "paymentId" VARCHAR(100) UNIQUE NOT NULL,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "deviceId" VARCHAR(100), -- Optional device identifier
    "stealthAddress" VARCHAR(42) NOT NULL,
    "tokenAddress" VARCHAR(42) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "tokenAmount" VARCHAR(50) NOT NULL, -- Expected amount as string
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'listening', 'completed', 'expired', 'cancelled'
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "transactionHash" VARCHAR(66), -- Ethereum transaction hash when payment detected
    "fromAddress" VARCHAR(42), -- Address that sent the payment
    "actualAmount" VARCHAR(50), -- Actual amount received as string
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create device_sessions table for tracking device-based sessions
CREATE TABLE device_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "deviceId" VARCHAR(100) NOT NULL,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "lastActivePaymentId" VARCHAR(100), -- Reference to last active payment
    "lastUsedStealthAddress" VARCHAR(42), -- Last stealth address for this device
    "userAgent" TEXT, -- Browser user agent for device fingerprinting
    "ipAddress" INET, -- IP address for additional tracking
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAccessedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique device per user
    UNIQUE("deviceId", "userId")
);

-- Create test table for health checks
CREATE TABLE test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT 'test'
);

-- Insert a test record
INSERT INTO test_table (name) VALUES ('health_check');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users("apiKey");
CREATE INDEX IF NOT EXISTS idx_users_is_merchant ON users("isMerchant");
CREATE INDEX IF NOT EXISTS idx_users_active ON users("isActive");

CREATE INDEX IF NOT EXISTS idx_stealth_addresses_user_id ON stealth_addresses("userId");
CREATE INDEX IF NOT EXISTS idx_stealth_addresses_nonce ON stealth_addresses(nonce);
CREATE INDEX IF NOT EXISTS idx_stealth_addresses_stealth_address ON stealth_addresses("stealthAddress");
CREATE INDEX IF NOT EXISTS idx_stealth_addresses_safe_address ON stealth_addresses("safeAddress");
CREATE INDEX IF NOT EXISTS idx_stealth_addresses_chain_id ON stealth_addresses("chainId");
CREATE INDEX IF NOT EXISTS idx_stealth_addresses_safe_deployed ON stealth_addresses("safeDeployed");
CREATE INDEX IF NOT EXISTS idx_stealth_addresses_safe_funded ON stealth_addresses("safeFunded");
CREATE INDEX IF NOT EXISTS idx_stealth_addresses_payment_id ON stealth_addresses("paymentId");
CREATE INDEX IF NOT EXISTS idx_stealth_addresses_device_id ON stealth_addresses("deviceId");

-- Indexes for payment_sessions table
CREATE INDEX IF NOT EXISTS idx_payment_sessions_payment_id ON payment_sessions("paymentId");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON payment_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_device_id ON payment_sessions("deviceId");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_stealth_address ON payment_sessions("stealthAddress");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_is_active ON payment_sessions("isActive");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_expires_at ON payment_sessions("expiresAt");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_chain_id ON payment_sessions("chainId");

-- Indexes for device_sessions table
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions("deviceId");
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_user ON device_sessions("deviceId", "userId");
CREATE INDEX IF NOT EXISTS idx_device_sessions_last_payment_id ON device_sessions("lastActivePaymentId");
CREATE INDEX IF NOT EXISTS idx_device_sessions_is_active ON device_sessions("isActive");
CREATE INDEX IF NOT EXISTS idx_device_sessions_last_accessed ON device_sessions("lastAccessedAt");

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_sessions_updated_at 
    BEFORE UPDATE ON payment_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_sessions_updated_at 
    BEFORE UPDATE ON device_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Disable Row Level Security for easier development
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE stealth_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_table DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON stealth_addresses TO anon, authenticated;
GRANT ALL ON payment_sessions TO anon, authenticated;
GRANT ALL ON device_sessions TO anon, authenticated;
GRANT ALL ON test_table TO anon, authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres; 