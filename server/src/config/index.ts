import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || ''
  },

  // Blockchain configuration - Default to Base Sepolia
  blockchain: {
    defaultChainId: parseInt(process.env.DEFAULT_CHAIN_ID || '84532', 10), // Base Sepolia
    defaultRpcUrl: process.env.DEFAULT_RPC_URL || 'https://base-sepolia-rpc.publicnode.com'
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log'
  }
};

// Validate required environment variables
export const validateConfig = () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  if (!config.supabase.url) {
    errors.push('SUPABASE_URL is required');
  }

  if (!config.supabase.anonKey) {
    errors.push('SUPABASE_ANON_KEY is required');
  }

  if (!config.jwt.secret) {
    errors.push('JWT_SECRET is required');
  }

  // Validation warnings
  if (config.nodeEnv === 'production') {
    if (!process.env.CORS_ORIGIN || config.cors.origin === '*') {
      warnings.push('CORS_ORIGIN should be set to specific domains in production');
    }

    if (config.jwt.secret.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long in production');
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('Configuration warnings:');
    warnings.forEach(warning => console.warn(`⚠️  ${warning}`));
  }

  // Handle errors
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`   ${error}`));
    console.error('\n📝 Please create a .env file with the required environment variables.');
    console.error('   See README.md for more details.\n');
    process.exit(1);
  }

  // Log successful validation
  console.log('✅ Configuration validated successfully');
};

export default config; 