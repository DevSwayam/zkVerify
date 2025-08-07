import Safe from '@safe-global/protocol-kit';
import { Logger } from '../utils';
import { 
  createPublicClient, 
  http, 
  isAddress, 
  formatUnits,
  encodeFunctionData,
  decodeAbiParameters,
  parseAbiParameters
} from 'viem';
import { defineChain } from 'viem';

// Horizen Testnet Chain Configuration
const horizenTestnet = defineChain({
  id: 845320009,
  name: 'Horizen Testnet',
  network: 'horizen-testnet',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://horizen-rpc-testnet.appchain.base.org'] } },
  blockExplorers: { default: { name: 'Horizen Explorer', url: 'https://horizen-explorer-testnet.appchain.base.org/' } },
});

// YOUR DEPLOYED SAFE CONTRACTS (from previous analysis)
const SAFE_IMPLEMENTATION_ADDRESS = "0xb56ea8db3418a63326b69ef042c30cdeaa4df136";
const PROXY_FACTORY_ADDRESS = "0x4af271648a3aabff5e7a0d9e411108131a3ca76b";

// Safe ABI for setup function
const SAFE_ABI = [
  {
    "inputs": [
      {"internalType": "address[]", "name": "_owners", "type": "address[]"},
      {"internalType": "uint256", "name": "_threshold", "type": "uint256"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "bytes", "name": "data", "type": "bytes"},
      {"internalType": "address", "name": "fallbackHandler", "type": "address"},
      {"internalType": "address", "name": "paymentToken", "type": "address"},
      {"internalType": "uint256", "name": "payment", "type": "uint256"},
      {"internalType": "address payable", "name": "paymentReceiver", "type": "address"}
    ],
    "name": "setup",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getOwners",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getThreshold", 
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Proxy Factory ABI
const PROXY_FACTORY_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_mastercopy", "type": "address"},
      {"internalType": "bytes", "name": "initializer", "type": "bytes"},
      {"internalType": "uint256", "name": "saltNonce", "type": "uint256"}
    ],
    "name": "createProxyWithNonce",
    "outputs": [{"internalType": "address", "name": "proxy", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ERC20 Balance ABI
const ERC20_BALANCE_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export interface SafeAddressResult {
  stealthAddress: string;
  safeAddress: string;
  isDeployed: boolean;
  saltNonce?: string;
  error?: string;
}

export interface SafeConfiguration {
  owners: string[];
  threshold: number;
  saltNonce: string;
}

export interface SafePredictionResult {
  predictedAddress: string;
  owners: string[];
  threshold: number;
  saltNonce: bigint;
  setupCalldata: string;
  factoryAddress: string;
  implementationAddress: string;
  timestamp: string;
}

export class SafeService {
  private readonly chainId: number;
  private readonly rpcUrl: string;
  private publicClient: ReturnType<typeof createPublicClient>;

  constructor(chainId: number = 845320009, rpcUrl: string = 'https://horizen-rpc-testnet.appchain.base.org') {
    this.chainId = chainId;
    this.rpcUrl = rpcUrl;
    
    // Initialize public client for blockchain interactions
    this.publicClient = createPublicClient({
      chain: horizenTestnet,
      transport: http(rpcUrl)
    });
  }

  /**
   * Manual Safe address prediction using your deployed factory
   * This uses the working method we discovered - static calls to your factory
   */
  private async predictSafeAddressManually(
    ownerAddress: string, 
    saltNonce: bigint = BigInt(Date.now()), 
    threshold: number = 1, 
    additionalOwners: string[] = []
  ): Promise<SafePredictionResult> {
    try {
      Logger.info('Predicting Safe address using manual method', {
        ownerAddress,
        saltNonce: saltNonce.toString(),
        threshold,
        additionalOwners,
        chainId: this.chainId
      });

      // Validate inputs
      if (!isAddress(ownerAddress)) {
        throw new Error(`Invalid owner address: ${ownerAddress}`);
      }

      // Setup owners array
      const owners = [ownerAddress, ...additionalOwners];

      // Create setup calldata for Safe initialization
      const setupCalldata = encodeFunctionData({
        abi: SAFE_ABI,
        functionName: 'setup',
        args: [
          owners,
          BigInt(threshold),
          "0x0000000000000000000000000000000000000000", // to
          "0x", // data  
          "0x0000000000000000000000000000000000000000", // fallbackHandler
          "0x0000000000000000000000000000000000000000", // paymentToken
          0n, // payment
          "0x0000000000000000000000000000000000000000"  // paymentReceiver
        ],
      });

      Logger.info('Setup calldata created', {
        setupCalldata: setupCalldata.slice(0, 66) + '...',
        ownersCount: owners.length
      });

      // Use factory's own logic via static call
      // This calls createProxyWithNonce as a read-only operation to get the address
      const staticCallResult = await this.publicClient.request({
        method: 'eth_call',
        params: [{
          to: PROXY_FACTORY_ADDRESS,
          data: encodeFunctionData({
            abi: PROXY_FACTORY_ABI,
            functionName: 'createProxyWithNonce',
            args: [SAFE_IMPLEMENTATION_ADDRESS as `0x${string}`, setupCalldata as `0x${string}`, saltNonce]
          })
        }, 'latest']
      });

      if (!staticCallResult || staticCallResult === '0x') {
        throw new Error('Factory static call returned empty result');
      }

      // Decode the result to get the predicted address
      const decodedResult = decodeAbiParameters(
        parseAbiParameters('address'),
        staticCallResult as `0x${string}`
      );

      const predictedAddress = decodedResult[0];

      Logger.info('Safe address predicted successfully using manual method', {
        predictedAddress,
        ownerAddress,
        saltNonce: saltNonce.toString(),
        chainId: this.chainId
      });

      return {
        predictedAddress,
        owners,
        threshold,
        saltNonce,
        setupCalldata,
        factoryAddress: PROXY_FACTORY_ADDRESS,
        implementationAddress: SAFE_IMPLEMENTATION_ADDRESS,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      Logger.error('Manual Safe address prediction failed', {
        error,
        ownerAddress,
        saltNonce: saltNonce.toString(),
        chainId: this.chainId
      });

      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('eth_call')) {
          throw new Error(`Factory call failed. Check that factory exists at ${PROXY_FACTORY_ADDRESS}`);
        } else if (error.message.includes('decode')) {
          throw new Error('Failed to decode factory response. Factory might have changed.');
        }
      }
      
      throw error;
    }
  }

  // Create Safe configuration for address prediction
  private createSafeConfig(owners: string[], threshold: number = 1, saltNonce: string = '0'): SafeConfiguration {
    return {
      owners: Array.isArray(owners) ? owners : [owners],
      threshold,
      saltNonce
    };
  }

  /**
   * Predict Safe address using manual method (replacing Protocol Kit)
   */
  private async predictSafeAddressUsingManualMethod(stealthAddress: string, saltNonce: string = '0'): Promise<string> {
    try {
      Logger.info('Predicting Safe address using manual factory method', {
        stealthAddress,
        chainId: this.chainId,
        saltNonce
      });

      // Convert saltNonce to bigint
      const saltNonceBigInt = BigInt(saltNonce);

      // Use our manual prediction method
      const prediction = await this.predictSafeAddressManually(
        stealthAddress,
        saltNonceBigInt,
        1, // threshold
        [] // no additional owners
      );

      Logger.info('Safe address predicted successfully using manual method', {
        stealthAddress,
        predictedAddress: prediction.predictedAddress,
        chainId: this.chainId
      });

      return prediction.predictedAddress;
    } catch (error) {
      Logger.error('Failed to predict Safe address using manual method', {
        error,
        stealthAddress,
        chainId: this.chainId
      });
      throw error;
    }
  }

  // Predict Safe addresses for multiple stealth addresses
  async predictSafeAddressOnTheBasisOfStealthAddress(stealthAddresses: string[]): Promise<SafeAddressResult[]> {
    Logger.info('Predicting Safe addresses using manual factory method', { 
      count: stealthAddresses.length,
      chainId: this.chainId,
      chainName: this.getChainName()
    });

    const safeAddresses = await Promise.all(stealthAddresses.map(async (stealthAddress, index) => {
      try {
        Logger.info('Processing stealth address for Safe prediction', { 
          stealthAddress,
          index: index + 1,
          total: stealthAddresses.length,
          chainId: this.chainId
        });
        
        // Generate unique salt nonce for each address to avoid conflicts
        const saltNonce = (BigInt(Date.now()) + BigInt(index)).toString();
        
        // Use manual prediction method instead of Protocol Kit
        const safeAddress = await this.predictSafeAddressUsingManualMethod(stealthAddress, saltNonce);

        // Check if Safe is already deployed
        const isDeployed = await this.checkSafeDeploymentStatusManually(safeAddress);

        Logger.info('Safe address predicted successfully', { 
          stealthAddress, 
          safeAddress,
          isDeployed,
          saltNonce,
          chainId: this.chainId
        });

        return {
          stealthAddress,
          safeAddress,
          isDeployed,
          saltNonce
        };
      } catch (error) {
        Logger.error('Failed to predict Safe address', { 
          error, 
          stealthAddress,
          chainId: this.chainId
        });
        return {
          stealthAddress,
          safeAddress: '',
          isDeployed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }));

    Logger.info('Safe address prediction completed', { 
      totalProcessed: stealthAddresses.length,
      successful: safeAddresses.filter(r => !r.error).length,
      failed: safeAddresses.filter(r => r.error).length,
      chainId: this.chainId
    });

    return safeAddresses;
  }

  /**
   * Check deployment status manually by checking bytecode
   */
  private async checkSafeDeploymentStatusManually(safeAddress: string): Promise<boolean> {
    try {
      Logger.info('Checking Safe deployment status manually', {
        safeAddress,
        chainId: this.chainId
      });

      // Check if there's bytecode at the address
      const bytecode = await this.publicClient.getBytecode({
        address: safeAddress as `0x${string}`
      });
      
      const isDeployed = bytecode && bytecode !== '0x';
      
      Logger.info('Safe deployment status checked manually', {
        safeAddress,
        isDeployed,
        bytecodeLength: bytecode?.length || 0,
        chainId: this.chainId
      });
      
      return !!isDeployed;
    } catch (error) {
      Logger.warn('Safe deployment check failed manually, assuming not deployed', {
        safeAddress,
        chainId: this.chainId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Check deployment status using Safe Protocol Kit (fallback method)
  private async checkSafeDeploymentStatus(safeAddress: string): Promise<boolean> {
    try {
      // Try manual method first (more reliable for your custom factory)
      return await this.checkSafeDeploymentStatusManually(safeAddress);
    } catch (manualError) {
      Logger.warn('Manual deployment check failed, trying Protocol Kit', {
        safeAddress,
        manualError: manualError instanceof Error ? manualError.message : 'Unknown error'
      });

      try {
        // Fallback to Protocol Kit method
        const protocolKit = await Safe.init({
          provider: this.rpcUrl,
          safeAddress
        });
        
        const isDeployed = await protocolKit.isSafeDeployed();
        
        Logger.info('Safe deployment status checked via Protocol Kit fallback', {
          safeAddress,
          isDeployed,
          chainId: this.chainId
        });
        
        return isDeployed;
      } catch (protocolError) {
        Logger.warn('Both manual and Protocol Kit deployment checks failed, assuming not deployed', {
          safeAddress,
          chainId: this.chainId,
          protocolError: protocolError instanceof Error ? protocolError.message : 'Unknown error'
        });
        return false;
      }
    }
  }

  // Get comprehensive Safe info using Safe Protocol Kit
  async getSafeInfo(safeAddress: string): Promise<{
    safeAddress: string;
    isDeployed: boolean;
    owners?: string[];
    threshold?: number;
    nonce?: number;
    version?: string;
    masterCopy?: string;
    fallbackHandler?: string;
    error?: string;
  }> {
    try {
      Logger.info('Getting comprehensive Safe info', { 
        safeAddress, 
        chainId: this.chainId 
      });
      
      // First check if deployed using our manual method
      const isDeployed = await this.checkSafeDeploymentStatusManually(safeAddress);
      
      if (!isDeployed) {
        return {
          safeAddress,
          isDeployed: false,
          error: 'Safe is not deployed at this address'
        };
      }

      try {
        // Try to get Safe info directly via contract calls first
        const [owners, threshold] = await Promise.all([
          this.publicClient.readContract({
            address: safeAddress as `0x${string}`,
            abi: SAFE_ABI,
            functionName: 'getOwners'
          }),
          this.publicClient.readContract({
            address: safeAddress as `0x${string}`,
            abi: SAFE_ABI,
            functionName: 'getThreshold'
          })
        ]);

        Logger.info('Safe info retrieved via direct contract calls', {
          safeAddress,
          ownersCount: owners.length,
          threshold: Number(threshold),
          chainId: this.chainId
        });

        return {
          safeAddress,
          isDeployed: true,
          owners: [...owners], // Convert readonly array to mutable array
          threshold: Number(threshold)
        };

      } catch (contractError) {
        Logger.warn('Direct contract calls failed, trying Protocol Kit', {
          safeAddress,
          contractError: contractError instanceof Error ? contractError.message : 'Unknown error'
        });

        // Fallback to Protocol Kit for more comprehensive info
        try {
          const protocolKit = await Safe.init({
            provider: this.rpcUrl,
            safeAddress
          });
          
          const [owners, threshold, nonce, version] = await Promise.all([
            protocolKit.getOwners(),
            protocolKit.getThreshold(),
            protocolKit.getNonce(),
            protocolKit.getContractVersion()
          ]);

          Logger.info('Complete Safe info retrieved via Protocol Kit fallback', { 
            safeAddress, 
            owners: owners.length, 
            threshold, 
            nonce,
            version,
            chainId: this.chainId
          });
          
          return {
            safeAddress,
            isDeployed: true,
            owners: [...owners], // Convert readonly array to mutable array
            threshold,
            nonce,
            version
          };
        } catch (protocolError) {
          Logger.error('Failed to retrieve Safe information via Protocol Kit', {
            safeAddress,
            chainId: this.chainId,
            error: protocolError
          });
          
          return {
            safeAddress,
            isDeployed: true,
            error: `Failed to retrieve Safe info: ${protocolError instanceof Error ? protocolError.message : 'Unknown error'}`
          };
        }
      }
      
    } catch (error) {
      Logger.error('Error getting Safe info', { 
        error, 
        safeAddress, 
        chainId: this.chainId 
      });
      return {
        safeAddress,
        isDeployed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create a Safe instance using Protocol Kit (for advanced operations)
  async createSafeInstance(safeAddress: string): Promise<Safe> {
    try {
      Logger.info('Creating Safe Protocol Kit instance', {
        safeAddress,
        chainId: this.chainId
      });

      // Safe Protocol Kit handles all the complexity of contract interactions
      const protocolKit = await Safe.init({
        provider: this.rpcUrl,
        safeAddress
      });

      Logger.info('Safe Protocol Kit instance created successfully', {
        safeAddress,
        chainId: this.chainId
      });

      return protocolKit;
    } catch (error) {
      Logger.error('Failed to create Safe Protocol Kit instance', {
        error,
        safeAddress,
        chainId: this.chainId
      });
      throw error;
    }
  }

  // Get Safe deployment configuration using manual method
  async getSafeDeploymentConfig(stealthAddress: string, saltNonce: string = '0'): Promise<{
    safeAccountConfig: any;
    safeDeploymentConfig: any;
    predictedAddress: string;
    manualPrediction?: SafePredictionResult;
  }> {
    try {
      Logger.info('Getting Safe deployment configuration using manual method', {
        stealthAddress,
        saltNonce,
        chainId: this.chainId
      });

      // Traditional Safe config (for compatibility)
      const safeAccountConfig = {
        owners: [stealthAddress],
        threshold: 1,
      };

      const safeDeploymentConfig = {
        saltNonce: saltNonce,
      };

      // Get prediction using our manual method
      const manualPrediction = await this.predictSafeAddressManually(
        stealthAddress,
        BigInt(saltNonce),
        1,
        []
      );

      Logger.info('Safe deployment configuration prepared successfully', {
        stealthAddress,
        predictedAddress: manualPrediction.predictedAddress,
        saltNonce,
        chainId: this.chainId
      });

      return {
        safeAccountConfig,
        safeDeploymentConfig,
        predictedAddress: manualPrediction.predictedAddress,
        manualPrediction
      };
    } catch (error) {
      Logger.error('Failed to get Safe deployment configuration', {
        error,
        stealthAddress,
        chainId: this.chainId
      });
      throw error;
    }
  }

  // Helper method to get human-readable chain name
  private getChainName(): string {
    const chainNames: Record<number, string> = {
      845320009: 'Horizen Testnet',
      8453: 'Base Mainnet',
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia',
      1328: 'Sei Testnet'
    };
    
    return chainNames[this.chainId] || `Chain ${this.chainId}`;
  }

  // Get supported networks (informational)
  static getSupportedNetworks(): Array<{ chainId: number; name: string; rpcUrl: string }> {
    return [
      { chainId: 845320009, name: 'Horizen Testnet', rpcUrl: 'https://horizen-rpc-testnet.appchain.base.org' },
      { chainId: 8453, name: 'Base Mainnet', rpcUrl: 'https://mainnet.base.org' },
      { chainId: 1, name: 'Ethereum Mainnet', rpcUrl: 'https://eth.llamarpc.com' },
      { chainId: 11155111, name: 'Sepolia', rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com' },
      { chainId: 1328, name: 'Sei Testnet', rpcUrl: 'https://evm-rpc-testnet.sei-apis.com' }
    ];
  }

  // Check if Safe address has any token balance (native or ERC20)
  async checkSafeHasTokenBalance(safeAddress: string, tokenAddress: string): Promise<boolean> {
    try {
      Logger.info('Checking Safe token balance', {
        safeAddress,
        tokenAddress,
        chainId: this.chainId
      });

      // Validate addresses
      if (!isAddress(safeAddress)) {
        throw new Error(`Invalid Safe address: ${safeAddress}`);
      }

      if (!isAddress(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000';

      if (isNativeToken) {
        // Check native token (ETH) balance
        const balance = await this.publicClient.getBalance({
          address: safeAddress as `0x${string}`
        });

        const hasBalance = balance > 0n;

        Logger.info('Native token balance checked', {
          safeAddress,
          balance: formatUnits(balance, 18),
          hasBalance,
          chainId: this.chainId
        });

        return hasBalance;
      } else {
        // Check ERC20 token balance
        const balance = await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [safeAddress as `0x${string}`]
        });

        const hasBalance = balance > 0n;

        // Get decimals for logging
        let decimals = 18;
        try {
          decimals = await this.publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_BALANCE_ABI,
            functionName: 'decimals'
          });
        } catch (decimalsError) {
          Logger.warn('Could not fetch token decimals, using default 18', {
            tokenAddress,
            error: decimalsError
          });
        }

        Logger.info('ERC20 token balance checked', {
          safeAddress,
          tokenAddress,
          balance: formatUnits(balance, decimals),
          hasBalance,
          chainId: this.chainId
        });

        return hasBalance;
      }
    } catch (error) {
      Logger.error('Failed to check Safe token balance', {
        error,
        safeAddress,
        tokenAddress,
        chainId: this.chainId
      });
      
      // Return false if we can't check the balance (assume not funded)
      return false;
    }
  }

  // Get detailed token balance information for Safe address
  async getSafeTokenBalance(safeAddress: string, tokenAddress: string): Promise<{
    address: string;
    tokenAddress: string;
    balance: string;
    hasBalance: boolean;
    decimals: number;
    isNativeToken: boolean;
  }> {
    try {
      Logger.info('Getting detailed Safe token balance', {
        safeAddress,
        tokenAddress,
        chainId: this.chainId
      });

      // Validate addresses
      if (!isAddress(safeAddress)) {
        throw new Error(`Invalid Safe address: ${safeAddress}`);
      }

      if (!isAddress(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000';

      if (isNativeToken) {
        // Get native token (ETH) balance
        const balance = await this.publicClient.getBalance({
          address: safeAddress as `0x${string}`
        });

        const formattedBalance = formatUnits(balance, 18);
        const hasBalance = balance > 0n;

        return {
          address: safeAddress,
          tokenAddress,
          balance: formattedBalance,
          hasBalance,
          decimals: 18,
          isNativeToken: true
        };
      } else {
        // Get ERC20 token balance and decimals
        const [balance, decimals] = await Promise.all([
          this.publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_BALANCE_ABI,
            functionName: 'balanceOf',
            args: [safeAddress as `0x${string}`]
          }),
          this.publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_BALANCE_ABI,
            functionName: 'decimals'
          }).catch(() => 18) // Default to 18 if decimals call fails
        ]);

        const formattedBalance = formatUnits(balance, decimals);
        const hasBalance = balance > 0n;

        return {
          address: safeAddress,
          tokenAddress,
          balance: formattedBalance,
          hasBalance,
          decimals,
          isNativeToken: false
        };
      }
    } catch (error) {
      Logger.error('Failed to get Safe token balance details', {
        error,
        safeAddress,
        tokenAddress,
        chainId: this.chainId
      });
      
      throw error;
    }
  }

  /**
   * Batch predict Safe addresses with custom configuration
   */
  async batchPredictSafeAddresses(
    stealthAddresses: string[], 
    startingSaltNonce: bigint = BigInt(Date.now())
  ): Promise<SafeAddressResult[]> {
    Logger.info('Batch predicting Safe addresses using manual method', {
      count: stealthAddresses.length,
      startingSaltNonce: startingSaltNonce.toString(),
      chainId: this.chainId
    });

    const results: SafeAddressResult[] = [];

    for (let i = 0; i < stealthAddresses.length; i++) {
      const stealthAddress = stealthAddresses[i];
      if (!stealthAddress) {
        Logger.error(`Invalid stealth address at index ${i}`);
        continue;
      }
      
      const saltNonce = startingSaltNonce + BigInt(i);

      try {
        Logger.info(`Processing address ${i + 1}/${stealthAddresses.length}`, {
          stealthAddress,
          saltNonce: saltNonce.toString()
        });

        const prediction = await this.predictSafeAddressManually(
          stealthAddress,
          saltNonce,
          1,
          []
        );

        const isDeployed = await this.checkSafeDeploymentStatusManually(prediction.predictedAddress);

        results.push({
          stealthAddress,
          safeAddress: prediction.predictedAddress,
          isDeployed,
          saltNonce: saltNonce.toString()
        });

        // Small delay to avoid overwhelming the RPC
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        Logger.error(`Failed to predict Safe address for ${stealthAddress}`, { error });
        results.push({
          stealthAddress,
          safeAddress: '',
          isDeployed: false,
          saltNonce: saltNonce.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    Logger.info('Batch prediction completed', {
      total: results.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length
    });

    return results;
  }

  /**
   * Get the exact deployment parameters used for prediction
   */
  async getDeploymentParameters(stealthAddress: string, saltNonce: string = '0'): Promise<{
    factoryAddress: string;
    implementationAddress: string;
    setupCalldata: string;
    saltNonce: string;
    predictedAddress: string;
  }> {
    const prediction = await this.predictSafeAddressManually(
      stealthAddress,
      BigInt(saltNonce),
      1,
      []
    );

    return {
      factoryAddress: prediction.factoryAddress,
      implementationAddress: prediction.implementationAddress,
      setupCalldata: prediction.setupCalldata,
      saltNonce: prediction.saltNonce.toString(),
      predictedAddress: prediction.predictedAddress
    };
  }
} 