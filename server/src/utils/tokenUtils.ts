import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import { Logger } from './logger';

// ERC20 Decimals ABI for reading token decimals
const ERC20_DECIMALS_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ERC20 Symbol ABI for reading token symbol
const ERC20_SYMBOL_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ERC20 Name ABI for reading token name
const ERC20_NAME_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Chain configurations
const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://base-sepolia-rpc.publicnode.com'],
    },
    public: {
      http: ['https://base-sepolia-rpc.publicnode.com'],
    },
  },
  testnet: true,
});

// Initialize public clients for different chains
const publicClients = new Map();

// Initialize clients
function initializeClients() {
  // Base Sepolia (primary)
  publicClients.set(84532, createPublicClient({
    chain: baseSepolia,
    transport: http('https://base-sepolia-rpc.publicnode.com'),
  }));

  Logger.info('TokenUtils initialized with blockchain clients', {
    supportedChains: Array.from(publicClients.keys())
  });
}

// Initialize clients on module load
initializeClients();

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
}

/**
 * Dynamically fetch ERC20 token decimals from contract
 */
export async function getTokenDecimals(tokenAddress: string, chainId: number): Promise<number> {
  try {
    const publicClient = publicClients.get(chainId);
    if (!publicClient) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // For native tokens, use 18 decimals
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 18;
    }

    Logger.info('Fetching token decimals from contract', {
      tokenAddress,
      chainId
    });

    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_DECIMALS_ABI,
      functionName: 'decimals'
    });

    Logger.info('Token decimals fetched successfully', {
      tokenAddress,
      chainId,
      decimals
    });

    return Number(decimals);
  } catch (error) {
    Logger.warn('Failed to fetch token decimals, defaulting to 18', {
      error: error instanceof Error ? error.message : error,
      tokenAddress,
      chainId
    });
    // Default to 18 decimals if fetching fails
    return 18;
  }
}

/**
 * Dynamically fetch ERC20 token symbol from contract
 */
export async function getTokenSymbol(tokenAddress: string, chainId: number): Promise<string> {
  try {
    const publicClient = publicClients.get(chainId);
    if (!publicClient) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // For native tokens, return chain-specific symbol
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      switch (chainId) {
        case 84532: return 'ETH';
        case 1: return 'ETH';
        case 1328: return 'SEI';
        default: return 'ETH';
      }
    }

    const symbol = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_SYMBOL_ABI,
      functionName: 'symbol'
    });

    return symbol;
  } catch (error) {
    Logger.warn('Failed to fetch token symbol, defaulting to TOKEN', {
      error: error instanceof Error ? error.message : error,
      tokenAddress,
      chainId
    });
    return 'TOKEN';
  }
}

/**
 * Dynamically fetch ERC20 token name from contract
 */
export async function getTokenName(tokenAddress: string, chainId: number): Promise<string> {
  try {
    const publicClient = publicClients.get(chainId);
    if (!publicClient) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // For native tokens, return chain-specific name
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      switch (chainId) {
        case 84532: return 'Ethereum';
        case 1: return 'Ethereum';
        case 1328: return 'Sei';
        default: return 'Ethereum';
      }
    }

    const name = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_NAME_ABI,
      functionName: 'name'
    });

    return name;
  } catch (error) {
    Logger.warn('Failed to fetch token name, defaulting to Token', {
      error: error instanceof Error ? error.message : error,
      tokenAddress,
      chainId
    });
    return 'Token';
  }
}

/**
 * Fetch complete token information including name, symbol, and decimals
 */
export async function getTokenInfo(tokenAddress: string, chainId: number): Promise<TokenInfo> {
  const [name, symbol, decimals] = await Promise.all([
    getTokenName(tokenAddress, chainId),
    getTokenSymbol(tokenAddress, chainId),
    getTokenDecimals(tokenAddress, chainId)
  ]);

  return {
    address: tokenAddress,
    name,
    symbol,
    decimals,
    chainId
  };
}

/**
 * Check if an address is a native token (zero address)
 */
export function isNativeToken(tokenAddress: string): boolean {
  return tokenAddress === '0x0000000000000000000000000000000000000000';
}

/**
 * Get the RPC URL for a given chain ID
 */
export function getRpcUrlForChain(chainId: number): string {
  switch (chainId) {
    case 84532:
      return 'https://base-sepolia-rpc.publicnode.com';
    case 1:
      return 'https://eth.llamarpc.com';
    case 1328:
      return 'https://evm-rpc-testnet.sei-apis.com';
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

/**
 * Get the native currency symbol for a chain
 */
export function getNativeCurrencySymbol(chainId: number): string {
  switch (chainId) {
    case 84532:
    case 1:
      return 'ETH';
    case 1328:
      return 'SEI';
    default:
      return 'ETH';
  }
}

export default {
  getTokenDecimals,
  getTokenSymbol,
  getTokenName,
  getTokenInfo,
  isNativeToken,
  getRpcUrlForChain,
  getNativeCurrencySymbol
}; 