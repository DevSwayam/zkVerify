"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenDecimals = getTokenDecimals;
exports.getTokenSymbol = getTokenSymbol;
exports.getTokenName = getTokenName;
exports.getTokenInfo = getTokenInfo;
exports.isNativeToken = isNativeToken;
exports.getRpcUrlForChain = getRpcUrlForChain;
exports.getNativeCurrencySymbol = getNativeCurrencySymbol;
const viem_1 = require("viem");
const viem_2 = require("viem");
const logger_1 = require("./logger");
// ERC20 Decimals ABI for reading token decimals
const ERC20_DECIMALS_ABI = [
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function'
    }
];
// ERC20 Symbol ABI for reading token symbol
const ERC20_SYMBOL_ABI = [
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
    }
];
// ERC20 Name ABI for reading token name
const ERC20_NAME_ABI = [
    {
        inputs: [],
        name: 'name',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
    }
];
// Chain configurations
const baseSepolia = (0, viem_2.defineChain)({
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
    publicClients.set(84532, (0, viem_1.createPublicClient)({
        chain: baseSepolia,
        transport: (0, viem_1.http)('https://base-sepolia-rpc.publicnode.com'),
    }));
    logger_1.Logger.info('TokenUtils initialized with blockchain clients', {
        supportedChains: Array.from(publicClients.keys())
    });
}
// Initialize clients on module load
initializeClients();
/**
 * Dynamically fetch ERC20 token decimals from contract
 */
async function getTokenDecimals(tokenAddress, chainId) {
    try {
        const publicClient = publicClients.get(chainId);
        if (!publicClient) {
            throw new Error(`Unsupported chain ID: ${chainId}`);
        }
        // For native tokens, use 18 decimals
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            return 18;
        }
        logger_1.Logger.info('Fetching token decimals from contract', {
            tokenAddress,
            chainId
        });
        const decimals = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_DECIMALS_ABI,
            functionName: 'decimals'
        });
        logger_1.Logger.info('Token decimals fetched successfully', {
            tokenAddress,
            chainId,
            decimals
        });
        return Number(decimals);
    }
    catch (error) {
        logger_1.Logger.warn('Failed to fetch token decimals, defaulting to 18', {
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
async function getTokenSymbol(tokenAddress, chainId) {
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
            address: tokenAddress,
            abi: ERC20_SYMBOL_ABI,
            functionName: 'symbol'
        });
        return symbol;
    }
    catch (error) {
        logger_1.Logger.warn('Failed to fetch token symbol, defaulting to TOKEN', {
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
async function getTokenName(tokenAddress, chainId) {
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
            address: tokenAddress,
            abi: ERC20_NAME_ABI,
            functionName: 'name'
        });
        return name;
    }
    catch (error) {
        logger_1.Logger.warn('Failed to fetch token name, defaulting to Token', {
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
async function getTokenInfo(tokenAddress, chainId) {
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
function isNativeToken(tokenAddress) {
    return tokenAddress === '0x0000000000000000000000000000000000000000';
}
/**
 * Get the RPC URL for a given chain ID
 */
function getRpcUrlForChain(chainId) {
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
function getNativeCurrencySymbol(chainId) {
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
exports.default = {
    getTokenDecimals,
    getTokenSymbol,
    getTokenName,
    getTokenInfo,
    isNativeToken,
    getRpcUrlForChain,
    getNativeCurrencySymbol
};
//# sourceMappingURL=tokenUtils.js.map