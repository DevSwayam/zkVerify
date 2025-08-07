import { Router } from 'express';
import healthRoutes from './health';
import userRoutes from './user';

const router: Router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/api/user', userRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Stealth Address Server API',
    version: '2.0.0',
    description: 'A TypeScript server with Express, Viem, and Supabase integration for stealth address generation with multi-chain support. Anyone can generate stealth addresses for any username.',
    endpoints: {
      health: '/health',
      user: {
        register: 'POST /api/user/register',
        login: 'POST /api/user/login',
        profile: 'GET /api/user/{username}/profile (requires authentication)',
        stealth: 'POST /api/user/{username}/stealth - Generates a single stealth address (PUBLIC)',
        nonce: 'GET /api/user/{username}/nonce (PUBLIC)',
        addresses: 'GET /api/user/{username}/stealth-addresses (PUBLIC)',
        addressByNonce: 'GET /api/user/{username}/stealth-addresses/{nonce} (PUBLIC)'
      },
      docs: 'See README.md for detailed API documentation'
    },
    authentication: {
      note: 'Authentication is only required for user profile access. Stealth address generation is public.',
      'X-API-Key': 'Required only for profile access',
      'Authorization': 'Bearer token required only for profile access'
    },
    features: {
      multiChain: 'Support for multiple blockchain networks per user',
      tokenAddresses: 'Configure specific token contract addresses per chain',
      usernameRoutes: 'Custom username-based API endpoints',
      nonceManagement: 'Automatic nonce tracking and incrementation',
      singleAddress: 'Generate one stealth address per request for enhanced security',
      secureResponse: 'Private keys are not returned in responses for security',
      tokenValidation: 'Validates that users only generate addresses for supported tokens',
      testGeneration: 'Generates test stealth address during registration for validation',
      safeAddressPrediction: 'Predicts Safe wallet addresses based on stealth addresses for enhanced security',
      publicGeneration: 'Anyone can generate stealth addresses for any username without authentication'
    },
    stealthGeneration: {
      description: 'Generates exactly one stealth address per request with token validation. No authentication required!',
      parameters: {
        chainId: 'Optional - Chain ID to use (defaults to first configured chain)',
        tokenAddress: 'Required - Token contract address (must be in user\'s supported tokens)',
        tokenAmount: 'Required - Amount of tokens to be sent to the stealth address'
      },
      response: {
        address: 'The generated stealth address',
        chainId: 'The blockchain network ID',
        chainName: 'Human readable chain name',
        tokenAddress: 'The validated token contract address',
        tokenAmount: 'Amount of tokens to be sent',
        safeAddress: 'Optional Safe wallet address prediction (address, isDeployed, error)'
      },
      validation: {
        tokenSupport: 'Ensures the user supports the requested token on the specified chain',
        chainSupport: 'Verifies the user has configured the requested blockchain',
        amountValidation: 'Validates token amount is positive and numeric'
      },
      security: {
        note: 'Ephemeral private keys are not returned for security reasons',
        recommendation: 'Store the ephemeral private key securely on the client side during generation'
      }
    },
    registration: {
      description: 'User registration with automatic setup validation',
      process: {
        1: 'Create user account with chains and token addresses',
        2: 'Generate API key and JWT token for authentication',
        3: 'Generate test stealth address using first chain and token',
        4: 'Increment nonce to track address generation',
        5: 'Return registration details with test address for validation'
      },
      testStealthAddress: {
        purpose: 'Validates that the provided keys can generate stealth addresses',
        details: 'Uses first configured chain and first token address',
        tokenAmount: 'Default test amount of 1.0 tokens',
        nonceHandling: 'Automatically increments nonce after test generation',
        errorHandling: 'Registration succeeds even if test generation fails'
      },
      response: {
        user: 'Basic user information and API key',
        token: 'JWT token for authentication',
        testStealthAddress: 'Test stealth address with chain, token, and Safe address prediction',
        instructions: 'Usage instructions and endpoint information'
      }
    },
    exampleRequest: {
      url: 'POST /api/user/{username}/stealth',
      headers: {
        'Content-Type': 'application/json'
      },
      note: 'No authentication required!',
      body: {
        chainId: 84532,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenAmount: '100.5'
      }
    },
    exampleRegistration: {
      url: 'POST /api/user/register',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        username: 'mystore',
        email: 'store@example.com',
        viewingPrivateKey: '0x...',
        spendingPublicKey: '0x...',
        chains: [
          {
            chainId: 1328,
            name: 'Sei Testnet',
            tokenAddresses: ['0x0000000000000000000000000000000000000000']
          }
        ]
      },
      response: {
        user: {
          id: 'uuid',
          username: 'mystore',
          email: 'store@example.com',
          apiKey: 'sk_...'
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        testStealthAddress: {
          address: '0x742d35Cc6634C0532925a3b8D3aC74e0F0cc5',
          chainId: 84532,
          chainName: 'Base Sepolia',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenAmount: '1.0',
          nonce: 0,
          newNonce: 1,
          safeAddress: {
            address: '0x123...SafeAddress',
            isDeployed: false
          }
        },
        instructions: {
          testAddress: 'Test stealth address generated successfully - your setup is working!'
        }
      }
    },
    supportedChains: {
      84532: 'Base Sepolia',
      1328: 'Sei Testnet',
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet',
      8453: 'Base Mainnet',
      11155111: 'Sepolia'
    },
    safeAddressPrediction: {
      description: 'Automatic Safe wallet address prediction for enhanced security',
      functionality: {
        prediction: 'Predicts Safe wallet addresses based on stealth addresses using Safe Protocol Kit',
        chainSupport: 'Supports Base Sepolia (chainId: 84532) by default with fallback to other chains',
        deploymentCheck: 'Verifies if predicted Safe addresses are already deployed',
        errorHandling: 'Gracefully handles prediction failures without affecting stealth generation'
      },
      safeConfiguration: {
        owners: 'Stealth address becomes the sole owner of the Safe',
        threshold: 'Default threshold of 1 signature required',
        saltNonce: 'Uses default salt nonce of 0 for address generation'
      },
      benefits: {
        security: 'Provides additional security layer through Safe multi-signature wallet',
        predictability: 'Deterministic address generation based on stealth addresses',
        compatibility: 'Compatible with Safe ecosystem and tooling'
      }
    }
  });
});

export default router; 