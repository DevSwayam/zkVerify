import Safe from '@safe-global/protocol-kit';
import { Logger } from '../utils';
import { createPublicClient, http, isAddress, formatUnits } from 'viem';
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
  error?: string;
}

export interface SafeConfiguration {
  owners: string[];
  threshold: number;
  saltNonce: string;
}

export class SafeService {
  private readonly chainId: number;
  private readonly rpcUrl: string;

  constructor(chainId: number = 845320009, rpcUrl: string = 'https://horizen-rpc-testnet.appchain.base.org') {
    this.chainId = chainId;
    this.rpcUrl = rpcUrl;
  }
    
  // Create Safe configuration for address prediction
  private createSafeConfig(owners: string[], threshold: number = 1, saltNonce: string = '0'): SafeConfiguration {
    return {
      owners: Array.isArray(owners) ? owners : [owners],
      threshold,
      saltNonce
    };
  }

  // Predict Safe address using Safe Protocol Kit's built-in functionality
  private async predictSafeAddressUsingProtocolKit(stealthAddress: string, saltNonce: string = '0'): Promise<string> {
    try {
      Logger.info('Predicting Safe address using Protocol Kit', {
        stealthAddress,
        chainId: this.chainId,
        saltNonce
      });

      // Create predicted Safe configuration using Protocol Kit standards
      const predictedSafe = {
        safeAccountConfig: {
          owners: [stealthAddress],
          threshold: 1,
        },
        safeDeploymentConfig: {
          saltNonce: saltNonce,
        },
      };

      // Initialize Safe Protocol Kit with prediction - let it handle all contract addresses automatically
      const protocolKit = await Safe.init({
        provider: this.rpcUrl,
        predictedSafe,
      });

      const predictedAddress = await protocolKit.getAddress();

      Logger.info('Safe address predicted successfully using Protocol Kit', {
        stealthAddress,
        predictedAddress,
        chainId: this.chainId
      });

      return predictedAddress;
    } catch (error) {
      Logger.error('Failed to predict Safe address using Protocol Kit', {
        error,
        stealthAddress,
        chainId: this.chainId
      });
      throw error;
    }
  }

  // Predict Safe addresses for multiple stealth addresses
  async predictSafeAddressOnTheBasisOfStealthAddress(stealthAddresses: string[]): Promise<SafeAddressResult[]> {
    Logger.info('Predicting Safe addresses using Safe Protocol Kit', { 
      count: stealthAddresses.length,
      chainId: this.chainId,
      chainName: this.getChainName()
    });

    const safeAddresses = await Promise.all(stealthAddresses.map(async (stealthAddress) => {
      try {
        Logger.info('Processing stealth address for Safe prediction', { 
          stealthAddress,
          chainId: this.chainId
        });
        
        // Use Safe Protocol Kit's built-in address prediction
        const safeAddress = await this.predictSafeAddressUsingProtocolKit(stealthAddress, '0');

        // Check if Safe is already deployed using Protocol Kit
        const isDeployed = await this.checkSafeDeploymentStatus(safeAddress);

        Logger.info('Safe address predicted successfully', { 
          stealthAddress, 
          safeAddress,
          isDeployed,
          chainId: this.chainId
        });

        return {
          stealthAddress,
          safeAddress,
          isDeployed
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

  // Check deployment status using Safe Protocol Kit
  private async checkSafeDeploymentStatus(safeAddress: string): Promise<boolean> {
    try {
      Logger.info('Checking Safe deployment status using Protocol Kit', {
        safeAddress,
        chainId: this.chainId
      });

      // Initialize Safe Protocol Kit with the address - it handles all contract interactions
        const protocolKit = await Safe.init({
          provider: this.rpcUrl,
          safeAddress
        });
        
      // Use Protocol Kit's built-in deployment check
      const isDeployed = await protocolKit.isSafeDeployed();
      
      Logger.info('Safe deployment status checked', {
          safeAddress,
        isDeployed,
        chainId: this.chainId
        });
      
      return isDeployed;
    } catch (error) {
      Logger.warn('Safe deployment check failed via Protocol Kit, assuming not deployed', {
        safeAddress,
        chainId: this.chainId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
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
      Logger.info('Getting comprehensive Safe info using Protocol Kit', { 
        safeAddress, 
        chainId: this.chainId 
      });
      
      // Initialize Safe Protocol Kit - handles all contract addresses automatically
      const protocolKit = await Safe.init({
        provider: this.rpcUrl,
        safeAddress
      });
      
      // Check if Safe is deployed
      const isDeployed = await protocolKit.isSafeDeployed();
      
      if (!isDeployed) {
        return {
          safeAddress,
          isDeployed: false,
          error: 'Safe is not deployed at this address'
        };
      }
      
      try {
        // Use Protocol Kit to get comprehensive Safe information
        const [owners, threshold, nonce, version] = await Promise.all([
          protocolKit.getOwners(),
          protocolKit.getThreshold(),
          protocolKit.getNonce(),
          protocolKit.getContractVersion()
        ]);

        // Get additional Safe contract information
        let masterCopy: string | undefined;
        let fallbackHandler: string | undefined;
        
        try {
          const safeContract = await protocolKit.getGuard();
          masterCopy = await protocolKit.getContractVersion();
          // Note: Protocol Kit doesn't expose fallback handler directly
          // fallbackHandler = await protocolKit.getFallbackHandler();
        } catch (contractError) {
          Logger.warn('Could not retrieve additional Safe contract info', {
            safeAddress,
            error: contractError
          });
        }
        
        Logger.info('Complete Safe info retrieved successfully', { 
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
          owners,
          threshold,
          nonce,
          version,
          ...(masterCopy && { masterCopy }),
          ...(fallbackHandler && { fallbackHandler })
        };
      } catch (safeInfoError) {
        Logger.error('Failed to retrieve Safe information via Protocol Kit', {
          safeAddress,
          chainId: this.chainId,
          error: safeInfoError
        });
        
        return {
          safeAddress,
          isDeployed: true,
          error: `Failed to retrieve Safe info: ${safeInfoError instanceof Error ? safeInfoError.message : 'Unknown error'}`
        };
      }
      
    } catch (error) {
      Logger.error('Error initializing Safe Protocol Kit for info retrieval', { 
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

  // Get Safe deployment configuration using Protocol Kit
  async getSafeDeploymentConfig(stealthAddress: string, saltNonce: string = '0'): Promise<{
    safeAccountConfig: any;
    safeDeploymentConfig: any;
    predictedAddress: string;
  }> {
    try {
      Logger.info('Getting Safe deployment configuration using Protocol Kit', {
        stealthAddress,
        saltNonce,
        chainId: this.chainId
      });

      const safeAccountConfig = {
        owners: [stealthAddress],
        threshold: 1,
      };

      const safeDeploymentConfig = {
        saltNonce: saltNonce,
      };

      // Use Protocol Kit to predict the address
      const predictedSafe = {
        safeAccountConfig,
        safeDeploymentConfig,
      };

      const protocolKit = await Safe.init({
        provider: this.rpcUrl,
        predictedSafe,
      });

      const predictedAddress = await protocolKit.getAddress();

      Logger.info('Safe deployment configuration prepared successfully', {
        stealthAddress,
        predictedAddress,
        saltNonce,
        chainId: this.chainId
      });

      return {
        safeAccountConfig,
        safeDeploymentConfig,
        predictedAddress
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

      // Create public client for blockchain interactions
      const publicClient = createPublicClient({
        chain: horizenTestnet, // Currently only supporting Base Sepolia
        transport: http(this.rpcUrl)
      });

      const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000';

      if (isNativeToken) {
        // Check native token (ETH) balance
        const balance = await publicClient.getBalance({
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
        const balance = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [safeAddress as `0x${string}`]
        });

        const hasBalance = balance > 0n;

        // Get decimals for logging
        let decimals = 18;
        try {
          decimals = await publicClient.readContract({
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

      // Create public client for blockchain interactions
      const publicClient = createPublicClient({
        chain: horizenTestnet, // Currently only supporting Base Sepolia
        transport: http(this.rpcUrl)
      });

      const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000';

      if (isNativeToken) {
        // Get native token (ETH) balance
        const balance = await publicClient.getBalance({
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
          publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_BALANCE_ABI,
            functionName: 'balanceOf',
            args: [safeAddress as `0x${string}`]
          }),
          publicClient.readContract({
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
} 