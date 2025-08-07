"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeService = void 0;
const protocol_kit_1 = __importDefault(require("@safe-global/protocol-kit"));
const utils_1 = require("../utils");
class SafeService {
    constructor(chainId = 84532, rpcUrl = 'https://base-sepolia-rpc.publicnode.com') {
        this.chainId = chainId;
        this.rpcUrl = rpcUrl;
    }
    // Create Safe configuration for address prediction
    createSafeConfig(owners, threshold = 1, saltNonce = '0') {
        return {
            owners: Array.isArray(owners) ? owners : [owners],
            threshold,
            saltNonce
        };
    }
    // Predict Safe address using Safe Protocol Kit's built-in functionality
    async predictSafeAddressUsingProtocolKit(stealthAddress, saltNonce = '0') {
        try {
            utils_1.Logger.info('Predicting Safe address using Protocol Kit', {
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
            const protocolKit = await protocol_kit_1.default.init({
                provider: this.rpcUrl,
                predictedSafe,
            });
            const predictedAddress = await protocolKit.getAddress();
            utils_1.Logger.info('Safe address predicted successfully using Protocol Kit', {
                stealthAddress,
                predictedAddress,
                chainId: this.chainId
            });
            return predictedAddress;
        }
        catch (error) {
            utils_1.Logger.error('Failed to predict Safe address using Protocol Kit', {
                error,
                stealthAddress,
                chainId: this.chainId
            });
            throw error;
        }
    }
    // Predict Safe addresses for multiple stealth addresses
    async predictSafeAddressOnTheBasisOfStealthAddress(stealthAddresses) {
        utils_1.Logger.info('Predicting Safe addresses using Safe Protocol Kit', {
            count: stealthAddresses.length,
            chainId: this.chainId,
            chainName: this.getChainName()
        });
        const safeAddresses = await Promise.all(stealthAddresses.map(async (stealthAddress) => {
            try {
                utils_1.Logger.info('Processing stealth address for Safe prediction', {
                    stealthAddress,
                    chainId: this.chainId
                });
                // Use Safe Protocol Kit's built-in address prediction
                const safeAddress = await this.predictSafeAddressUsingProtocolKit(stealthAddress, '0');
                // Check if Safe is already deployed using Protocol Kit
                const isDeployed = await this.checkSafeDeploymentStatus(safeAddress);
                utils_1.Logger.info('Safe address predicted successfully', {
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
            }
            catch (error) {
                utils_1.Logger.error('Failed to predict Safe address', {
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
        utils_1.Logger.info('Safe address prediction completed', {
            totalProcessed: stealthAddresses.length,
            successful: safeAddresses.filter(r => !r.error).length,
            failed: safeAddresses.filter(r => r.error).length,
            chainId: this.chainId
        });
        return safeAddresses;
    }
    // Check deployment status using Safe Protocol Kit
    async checkSafeDeploymentStatus(safeAddress) {
        try {
            utils_1.Logger.info('Checking Safe deployment status using Protocol Kit', {
                safeAddress,
                chainId: this.chainId
            });
            // Initialize Safe Protocol Kit with the address - it handles all contract interactions
            const protocolKit = await protocol_kit_1.default.init({
                provider: this.rpcUrl,
                safeAddress
            });
            // Use Protocol Kit's built-in deployment check
            const isDeployed = await protocolKit.isSafeDeployed();
            utils_1.Logger.info('Safe deployment status checked', {
                safeAddress,
                isDeployed,
                chainId: this.chainId
            });
            return isDeployed;
        }
        catch (error) {
            utils_1.Logger.warn('Safe deployment check failed via Protocol Kit, assuming not deployed', {
                safeAddress,
                chainId: this.chainId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    // Get comprehensive Safe info using Safe Protocol Kit
    async getSafeInfo(safeAddress) {
        try {
            utils_1.Logger.info('Getting comprehensive Safe info using Protocol Kit', {
                safeAddress,
                chainId: this.chainId
            });
            // Initialize Safe Protocol Kit - handles all contract addresses automatically
            const protocolKit = await protocol_kit_1.default.init({
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
                let masterCopy;
                let fallbackHandler;
                try {
                    const safeContract = await protocolKit.getGuard();
                    masterCopy = await protocolKit.getContractVersion();
                    // Note: Protocol Kit doesn't expose fallback handler directly
                    // fallbackHandler = await protocolKit.getFallbackHandler();
                }
                catch (contractError) {
                    utils_1.Logger.warn('Could not retrieve additional Safe contract info', {
                        safeAddress,
                        error: contractError
                    });
                }
                utils_1.Logger.info('Complete Safe info retrieved successfully', {
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
            }
            catch (safeInfoError) {
                utils_1.Logger.error('Failed to retrieve Safe information via Protocol Kit', {
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
        }
        catch (error) {
            utils_1.Logger.error('Error initializing Safe Protocol Kit for info retrieval', {
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
    async createSafeInstance(safeAddress) {
        try {
            utils_1.Logger.info('Creating Safe Protocol Kit instance', {
                safeAddress,
                chainId: this.chainId
            });
            // Safe Protocol Kit handles all the complexity of contract interactions
            const protocolKit = await protocol_kit_1.default.init({
                provider: this.rpcUrl,
                safeAddress
            });
            utils_1.Logger.info('Safe Protocol Kit instance created successfully', {
                safeAddress,
                chainId: this.chainId
            });
            return protocolKit;
        }
        catch (error) {
            utils_1.Logger.error('Failed to create Safe Protocol Kit instance', {
                error,
                safeAddress,
                chainId: this.chainId
            });
            throw error;
        }
    }
    // Get Safe deployment configuration using Protocol Kit
    async getSafeDeploymentConfig(stealthAddress, saltNonce = '0') {
        try {
            utils_1.Logger.info('Getting Safe deployment configuration using Protocol Kit', {
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
            const protocolKit = await protocol_kit_1.default.init({
                provider: this.rpcUrl,
                predictedSafe,
            });
            const predictedAddress = await protocolKit.getAddress();
            utils_1.Logger.info('Safe deployment configuration prepared successfully', {
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
        }
        catch (error) {
            utils_1.Logger.error('Failed to get Safe deployment configuration', {
                error,
                stealthAddress,
                chainId: this.chainId
            });
            throw error;
        }
    }
    // Helper method to get human-readable chain name
    getChainName() {
        const chainNames = {
            84532: 'Base Sepolia',
            8453: 'Base Mainnet',
            1: 'Ethereum Mainnet',
            11155111: 'Sepolia',
            1328: 'Sei Testnet'
        };
        return chainNames[this.chainId] || `Chain ${this.chainId}`;
    }
    // Get supported networks (informational)
    static getSupportedNetworks() {
        return [
            { chainId: 84532, name: 'Base Sepolia', rpcUrl: 'https://base-sepolia-rpc.publicnode.com' },
            { chainId: 8453, name: 'Base Mainnet', rpcUrl: 'https://mainnet.base.org' },
            { chainId: 1, name: 'Ethereum Mainnet', rpcUrl: 'https://eth.llamarpc.com' },
            { chainId: 11155111, name: 'Sepolia', rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com' },
            { chainId: 1328, name: 'Sei Testnet', rpcUrl: 'https://evm-rpc-testnet.sei-apis.com' }
        ];
    }
}
exports.SafeService = SafeService;
//# sourceMappingURL=SafeService.js.map