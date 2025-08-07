"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StealthAddressService = void 0;
const stealth_account_kit_1 = require("@fluidkey/stealth-account-kit");
const errors_1 = require("../errors");
const utils_1 = require("../utils");
class StealthAddressService {
    constructor() {
        this.DEFAULT_CHAIN_ID = 84532; // Base Sepolia
        this.MAX_ACCOUNT_AMOUNT = 100; // Limit to prevent excessive computation
    }
    // Function to compute and return stealth addresses
    async computeStealthAddresses(params) {
        try {
            this.validateInput(params);
            const { viewingPrivateKey, spendingPublicKey, startNonce, accountAmount, chainId = this.DEFAULT_CHAIN_ID } = params;
            utils_1.Logger.info('Generating stealth addresses', {
                startNonce: startNonce.toString(),
                accountAmount: accountAmount.toString(),
                chainId
            });
            const addresses = [];
            // Convert startNonce and accountAmount to BigInt
            const startNonceBigInt = BigInt(startNonce);
            const accountAmountBigInt = BigInt(accountAmount);
            const endNonce = startNonceBigInt + accountAmountBigInt;
            for (let nonce = startNonceBigInt; nonce < endNonce; nonce++) {
                try {
                    // Extract the node required to generate the pseudo-random input for stealth address generation
                    const privateViewingKeyNode = (0, stealth_account_kit_1.extractViewingPrivateKeyNode)(viewingPrivateKey, 0);
                    const { ephemeralPrivateKey } = (0, stealth_account_kit_1.generateEphemeralPrivateKey)({
                        viewingPrivateKeyNode: privateViewingKeyNode,
                        nonce,
                        chainId,
                    });
                    const result = (0, stealth_account_kit_1.generateStealthAddresses)({
                        spendingPublicKeys: [spendingPublicKey],
                        ephemeralPrivateKey,
                    });
                    // Extract the actual address string from the result
                    if (result.stealthAddresses && result.stealthAddresses.length > 0) {
                        const stealthAddress = result.stealthAddresses[0];
                        if (stealthAddress) {
                            addresses.push({
                                address: stealthAddress,
                                nonce
                                // Note: ephemeralPrivateKey removed for security - not returned to client
                            });
                        }
                    }
                }
                catch (error) {
                    utils_1.Logger.error('Error generating stealth address for nonce', {
                        nonce: nonce.toString(),
                        error
                    });
                    // Continue with next nonce instead of failing completely
                    continue;
                }
            }
            const response = {
                addresses,
                totalGenerated: addresses.length,
                chainId,
                startNonce: startNonceBigInt.toString(),
                endNonce: (endNonce - 1n).toString()
            };
            utils_1.Logger.info('Stealth addresses generated successfully', {
                totalGenerated: addresses.length,
                requested: accountAmountBigInt.toString(),
                chainId
            });
            return response;
        }
        catch (error) {
            if (error instanceof errors_1.ValidationError) {
                throw error;
            }
            utils_1.Logger.error('Unexpected error generating stealth addresses', { error, params });
            throw new errors_1.InternalServerError('Failed to generate stealth addresses');
        }
    }
    // Validate input parameters
    validateInput(params) {
        const { viewingPrivateKey, spendingPublicKey, startNonce, accountAmount, chainId } = params;
        // Validate viewing private key
        if (!viewingPrivateKey || typeof viewingPrivateKey !== 'string') {
            throw new errors_1.ValidationError('viewingPrivateKey is required and must be a string');
        }
        if (!viewingPrivateKey.startsWith('0x') || viewingPrivateKey.length !== 66) {
            throw new errors_1.ValidationError('viewingPrivateKey must be a valid 32-byte hex string starting with 0x');
        }
        // Validate spending public key - accept both compressed (68 chars) and uncompressed (132 chars)
        if (!spendingPublicKey || typeof spendingPublicKey !== 'string') {
            throw new errors_1.ValidationError('spendingPublicKey is required and must be a string');
        }
        if (!spendingPublicKey.startsWith('0x') || (spendingPublicKey.length !== 68 && spendingPublicKey.length !== 132)) {
            throw new errors_1.ValidationError('spendingPublicKey must be a valid compressed (33-byte) or uncompressed (65-byte) hex string starting with 0x');
        }
        // Validate startNonce
        try {
            const nonceBigInt = BigInt(startNonce);
            if (nonceBigInt < 0n) {
                throw new errors_1.ValidationError('startNonce must be a non-negative number');
            }
        }
        catch (error) {
            throw new errors_1.ValidationError('startNonce must be a valid number');
        }
        // Validate accountAmount
        try {
            const amountBigInt = BigInt(accountAmount);
            if (amountBigInt <= 0n) {
                throw new errors_1.ValidationError('accountAmount must be a positive number');
            }
            if (amountBigInt > BigInt(this.MAX_ACCOUNT_AMOUNT)) {
                throw new errors_1.ValidationError(`accountAmount cannot exceed ${this.MAX_ACCOUNT_AMOUNT}`);
            }
        }
        catch (error) {
            throw new errors_1.ValidationError('accountAmount must be a valid positive number');
        }
        // Validate chainId if provided
        if (chainId !== undefined && !this.isChainIdSupported(chainId)) {
            throw new errors_1.ValidationError(`Unsupported chain ID: ${chainId}`);
        }
    }
    // Get supported chain IDs
    getSupportedChainIds() {
        return [
            84532, // Base Sepolia (primary)
            1, // Ethereum Mainnet
            1328, // Sei Testnet
            8453, // Base Mainnet
            11155111, // Sepolia
        ];
    }
    // Validate chain ID
    isChainIdSupported(chainId) {
        return this.getSupportedChainIds().includes(chainId);
    }
}
exports.StealthAddressService = StealthAddressService;
//# sourceMappingURL=StealthAddressService.js.map