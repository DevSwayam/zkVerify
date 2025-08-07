import {
  extractViewingPrivateKeyNode,
  generateEphemeralPrivateKey,
  generateStealthAddresses,
} from "@fluidkey/stealth-account-kit";

import { StealthAddressRequest, StealthAddressResult } from '../types';
import { ValidationError, InternalServerError } from '../errors';
import { Logger } from '../utils';

// Service-level response interface (without merchantId)
export interface ServiceStealthAddressResponse {
  addresses: StealthAddressResult[];
  totalGenerated: number;
  chainId: number;
  startNonce: string;
  endNonce: string;
}

export class StealthAddressService {
  private readonly DEFAULT_CHAIN_ID = 84532; // Base Sepolia
  private readonly MAX_ACCOUNT_AMOUNT = 100; // Limit to prevent excessive computation

  // Function to compute and return stealth addresses
  async computeStealthAddresses(params: StealthAddressRequest): Promise<ServiceStealthAddressResponse> {
    try {
      this.validateInput(params);

      const {
        viewingPrivateKey,
        spendingPublicKey,
        startNonce,
        accountAmount,
        chainId = this.DEFAULT_CHAIN_ID
      } = params;

      Logger.info('Generating stealth addresses', {
        startNonce: startNonce.toString(),
        accountAmount: accountAmount.toString(),
        chainId
      });

      const addresses: StealthAddressResult[] = [];

      // Convert startNonce and accountAmount to BigInt
      const startNonceBigInt = BigInt(startNonce);
      const accountAmountBigInt = BigInt(accountAmount);
      const endNonce = startNonceBigInt + accountAmountBigInt;

      for (let nonce = startNonceBigInt; nonce < endNonce; nonce++) {
        try {
          // Extract the node required to generate the pseudo-random input for stealth address generation
          const privateViewingKeyNode = extractViewingPrivateKeyNode(viewingPrivateKey as `0x${string}`, 0);
          
          const { ephemeralPrivateKey } = generateEphemeralPrivateKey({
            viewingPrivateKeyNode: privateViewingKeyNode,
            nonce,
            chainId,
          });

          const result = generateStealthAddresses({
            spendingPublicKeys: [spendingPublicKey as `0x${string}`],
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
        } catch (error) {
          Logger.error('Error generating stealth address for nonce', {
            nonce: nonce.toString(),
            error
          });
          
          // Continue with next nonce instead of failing completely
          continue;
        }
      }

      const response: ServiceStealthAddressResponse = {
        addresses,
        totalGenerated: addresses.length,
        chainId,
        startNonce: startNonceBigInt.toString(),
        endNonce: (endNonce - 1n).toString()
      };

      Logger.info('Stealth addresses generated successfully', {
        totalGenerated: addresses.length,
        requested: accountAmountBigInt.toString(),
        chainId
      });

      return response;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      Logger.error('Unexpected error generating stealth addresses', { error, params });
      throw new InternalServerError('Failed to generate stealth addresses');
    }
  }

  // Validate input parameters
  private validateInput(params: StealthAddressRequest): void {
    const { viewingPrivateKey, spendingPublicKey, startNonce, accountAmount, chainId } = params;

    // Validate viewing private key
    if (!viewingPrivateKey || typeof viewingPrivateKey !== 'string') {
      throw new ValidationError('viewingPrivateKey is required and must be a string');
    }

    if (!viewingPrivateKey.startsWith('0x') || viewingPrivateKey.length !== 66) {
      throw new ValidationError('viewingPrivateKey must be a valid 32-byte hex string starting with 0x');
    }

    // Validate spending public key - accept both compressed (68 chars) and uncompressed (132 chars)
    if (!spendingPublicKey || typeof spendingPublicKey !== 'string') {
      throw new ValidationError('spendingPublicKey is required and must be a string');
    }

    if (!spendingPublicKey.startsWith('0x') || (spendingPublicKey.length !== 68 && spendingPublicKey.length !== 132)) {
      throw new ValidationError('spendingPublicKey must be a valid compressed (33-byte) or uncompressed (65-byte) hex string starting with 0x');
    }

    // Validate startNonce
    try {
      const nonceBigInt = BigInt(startNonce);
      if (nonceBigInt < 0n) {
        throw new ValidationError('startNonce must be a non-negative number');
      }
    } catch (error) {
      throw new ValidationError('startNonce must be a valid number');
    }

    // Validate accountAmount
    try {
      const amountBigInt = BigInt(accountAmount);
      if (amountBigInt <= 0n) {
        throw new ValidationError('accountAmount must be a positive number');
      }
      if (amountBigInt > BigInt(this.MAX_ACCOUNT_AMOUNT)) {
        throw new ValidationError(`accountAmount cannot exceed ${this.MAX_ACCOUNT_AMOUNT}`);
      }
    } catch (error) {
      throw new ValidationError('accountAmount must be a valid positive number');
    }

    // Validate chainId if provided
    if (chainId !== undefined && !this.isChainIdSupported(chainId)) {
      throw new ValidationError(`Unsupported chain ID: ${chainId}`);
    }
  }

  // Get supported chain IDs
  getSupportedChainIds(): number[] {
    return [
      84532,  // Base Sepolia (primary)
      1,      // Ethereum Mainnet
      1328,   // Sei Testnet
      8453,   // Base Mainnet
      11155111, // Sepolia
    ];
  }

  // Validate chain ID
  isChainIdSupported(chainId: number): boolean {
    return this.getSupportedChainIds().includes(chainId);
  }
} 