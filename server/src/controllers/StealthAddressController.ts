import { Request, Response, NextFunction } from 'express';
import { StealthAddressService, SafeService, EventListenerService, PaymentSessionService } from '../services';
import { UserService } from '../services/UserService';
import { SupabaseService } from '../services/SupabaseService';
import { ServiceStealthAddressResponse } from '../services/StealthAddressService';
import { PaymentDetected } from '../services/EventListenerService';
import { ResponseUtil, Logger } from '../utils';
import { 
  SingleStealthAddressResponse, 
  SafeAddressInfo, 
  ChainConfig, 
  StealthGenerationRequest,
  EnhancedStealthAddressResponse,
  EventListenerInfo
} from '../types';

export class StealthAddressController {
  private stealthAddressService: StealthAddressService;
  private userService: UserService;
  private supabaseService: SupabaseService;
  private eventListenerService: EventListenerService;
  private paymentSessionService: PaymentSessionService;

  constructor() {
    this.stealthAddressService = new StealthAddressService();
    this.userService = new UserService();
    this.supabaseService = new SupabaseService();
    this.eventListenerService = new EventListenerService();
    this.paymentSessionService = new PaymentSessionService();

    // Setup event listeners for payment detection
    this.setupEventListeners();
  }

  // Get RPC URL for a specific chain ID
  private getRpcUrlForChain(chainId: number): string {
    const chainMap: Record<number, string> = {
      84532: 'https://base-sepolia-rpc.publicnode.com', // Base Sepolia
      1328: 'https://evm-rpc-testnet.sei-apis.com', // Sei Testnet
      1: 'https://eth.llamarpc.com', // Ethereum Mainnet (fallback)
      5: 'https://eth-goerli.public.blastapi.io', // Goerli (fallback)
    };
    
    return chainMap[chainId] || 'https://base-sepolia-rpc.publicnode.com'; // Default to Base Sepolia
  }

  // Setup event listeners for payment detection
  private setupEventListeners(): void {
    // Listen for payment detection events
    this.eventListenerService.on('paymentDetected', async (paymentDetected: PaymentDetected) => {
      await this.handlePaymentDetected(paymentDetected);
    });

    // Listen for listener timeout events
    this.eventListenerService.on('listenerStopped', async (data: any) => {
      if (data.reason === 'timeout') {
        await this.handlePaymentTimeout(data.paymentId);
      }
    });

    Logger.info('Event listeners setup completed for StealthAddressController');
  }

  // Handle detected payments
  private async handlePaymentDetected(paymentDetected: PaymentDetected): Promise<void> {
    try {
      Logger.info('Payment detected, updating payment session and funding status', {
        paymentId: paymentDetected.paymentId,
        stealthAddress: paymentDetected.stealthAddress,
        amount: paymentDetected.amount,
        transactionHash: paymentDetected.transactionHash
      });

      // Complete the payment session
      await this.paymentSessionService.completePaymentSession(
        paymentDetected.paymentId,
        paymentDetected.transactionHash,
        paymentDetected.fromAddress,
        paymentDetected.amount
      );

      // Update stealth address funding status
      try {
        // Find the stealth address record by the payment address
        const stealthAddressRecord = await this.supabaseService.getStealthAddressByPaymentAddress(paymentDetected.stealthAddress);
        
        if (stealthAddressRecord) {
          // Mark as funded
          await this.supabaseService.updateStealthAddressFundingStatus(stealthAddressRecord.id!, true);
          
          Logger.info('Stealth address marked as funded', {
            stealthAddressId: stealthAddressRecord.id,
            stealthAddress: stealthAddressRecord.stealthAddress,
            safeAddress: stealthAddressRecord.safeAddress,
            paymentId: paymentDetected.paymentId,
            transactionHash: paymentDetected.transactionHash,
            amount: paymentDetected.amount
          });
        } else {
          Logger.warn('Could not find stealth address record for payment', {
            paymentAddress: paymentDetected.stealthAddress,
            paymentId: paymentDetected.paymentId,
            transactionHash: paymentDetected.transactionHash
          });
        }
      } catch (fundingError) {
        Logger.error('Failed to update stealth address funding status', {
          error: fundingError,
          paymentAddress: paymentDetected.stealthAddress,
          paymentId: paymentDetected.paymentId,
          transactionHash: paymentDetected.transactionHash
        });
        // Don't fail the entire payment processing if funding status update fails
      }

      // Here you could add webhooks, notifications, or other post-payment processing
      Logger.info('Payment session completed successfully', {
        paymentId: paymentDetected.paymentId,
        transactionHash: paymentDetected.transactionHash
      });

    } catch (error) {
      Logger.error('Error handling payment detection', {
        error,
        paymentId: paymentDetected.paymentId
      });
    }
  }

  // Handle payment timeouts
  private async handlePaymentTimeout(paymentId: string): Promise<void> {
    try {
      Logger.info('Payment session timed out', { paymentId });

      // Expire the payment session
      await this.paymentSessionService.expirePaymentSession(paymentId);

      Logger.info('Payment session expired due to timeout', { paymentId });

    } catch (error) {
      Logger.error('Error handling payment timeout', {
        error,
        paymentId
      });
    }
  }

  // Generate a single stealth address for any user (no authentication required)
  generateStealthAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { chainId, tokenAmount, tokenAddress, deviceId, reuseSession } = req.body;
      const { username } = req.params;

      // Get user by username from the URL parameter
      if (!username) {
        ResponseUtil.error(res, 'Username parameter is required', 400);
        return;
      }

      const user = await this.userService.getUserByUsername(username);
      if (!user) {
        ResponseUtil.error(res, 'User not found', 404);
        return;
      }

      // Validate required parameters
      if (!tokenAddress || typeof tokenAddress !== 'string') {
        ResponseUtil.error(res, 'tokenAddress is required and must be a valid address string', 400);
        return;
      }

      if (!tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
        ResponseUtil.error(res, 'Valid tokenAmount is required and must be greater than 0', 400);
        return;
      }

      // Validate chainId if provided, otherwise use the first supported chain
      let selectedChainId = chainId;
      if (!selectedChainId) {
        selectedChainId = user.chains[0]?.chainId;
      }

      if (!selectedChainId) {
        ResponseUtil.error(res, 'No supported chains configured for this user', 400);
        return;
      }

      // Check if user supports the requested chain
      if (!this.userService.isChainSupported(user, selectedChainId)) {
        const supportedChains = this.userService.getUserChainIds(user);
        ResponseUtil.error(res, `Chain ${selectedChainId} not supported. Supported chains: ${supportedChains.join(', ')}`, 400);
        return;
      }

      // Get chain configuration
      const chainConfig = this.userService.getChainConfig(user, selectedChainId);
      const chainName = chainConfig?.name || `Chain ${selectedChainId}`;

      // Validate that the user supports the requested token address on this chain
      if (!this.userService.isTokenSupported(user, selectedChainId, tokenAddress)) {
        const supportedTokenAddresses = this.userService.getTokenAddresses(user, selectedChainId);
        ResponseUtil.error(res, 
          `Token address ${tokenAddress} is not supported on chain ${selectedChainId}. Supported tokens: ${supportedTokenAddresses.join(', ')}`, 
          400
        );
        return;
      }

      // Handle device session and check for reuse
      let finalDeviceId = deviceId;
      let existingPaymentSession = null;
      let isReusedSession = false;

      if (deviceId && reuseSession) {
        try {
          existingPaymentSession = await this.paymentSessionService.getActivePaymentSessionForDevice(deviceId, user.id!);
          if (existingPaymentSession) {
            isReusedSession = true;
            Logger.info('Reusing existing payment session for device', {
              deviceId,
              userId: user.id,
              paymentId: existingPaymentSession.paymentId,
              stealthAddress: existingPaymentSession.stealthAddress
            });

            // Return existing session info
            const eventListenerInfo: EventListenerInfo = {
              listenerId: `${existingPaymentSession.paymentId}_${existingPaymentSession.stealthAddress.toLowerCase()}`,
              isActive: true,
              startTime: existingPaymentSession.createdAt!,
              timeRemaining: Math.max(0, Math.floor((new Date(existingPaymentSession.expiresAt).getTime() - Date.now()) / 1000)),
              timeoutMinutes: 3
            };

            const response: SingleStealthAddressResponse = {
              address: existingPaymentSession.stealthAddress,
              chainId: existingPaymentSession.chainId,
              chainName,
              tokenAddress: existingPaymentSession.tokenAddress,
              tokenAmount: existingPaymentSession.tokenAmount,
              paymentId: existingPaymentSession.paymentId,
              eventListener: eventListenerInfo
            };

            ResponseUtil.success(res, response, 'Reused existing stealth address session');
            return;
          }
        } catch (error) {
          Logger.warn('Failed to get existing payment session, creating new one', { error, deviceId });
        }
      }

      // Generate device ID if not provided
      if (!finalDeviceId) {
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.socket.remoteAddress;
        finalDeviceId = this.paymentSessionService.generateDeviceId(userAgent, ipAddress);
      }

      Logger.info('Generating single stealth address for user', {
        userId: user.id,
        username: user.username,
        chainId: selectedChainId,
        chainName,
        tokenAddress,
        tokenAmount,
        currentNonce: user.currentNonce,
        deviceId: finalDeviceId,
        isReusedSession
      });

      // Generate exactly 1 stealth address
      const serviceResponse: ServiceStealthAddressResponse = await this.stealthAddressService.computeStealthAddresses({
        viewingPrivateKey: user.viewingPrivateKey,
        spendingPublicKey: user.spendingPublicKey,
        startNonce: user.currentNonce.toString(),
        accountAmount: "1", // Always generate exactly 1 address
        chainId: selectedChainId
      });

      // Extract the single address from the response
      const singleAddress = serviceResponse.addresses[0];

      if (!singleAddress) {
        ResponseUtil.error(res, 'Failed to generate stealth address', 500);
        return;
      }

      // Generate payment ID
      const paymentId = this.paymentSessionService.generatePaymentId();

      // Predict Safe address based on the generated stealth address
      let safeAddressInfo: SafeAddressInfo | undefined = undefined;
      try {
        Logger.info('Predicting Safe address for stealth address', {
          stealthAddress: singleAddress.address,
          chainId: selectedChainId,
          paymentId
        });

        const chainConfig = this.userService.getChainConfig(user, selectedChainId);
        const rpcUrl = this.getRpcUrlForChain(selectedChainId);
        const safeService = new SafeService(selectedChainId, rpcUrl);

        const safeResults = await safeService.predictSafeAddressOnTheBasisOfStealthAddress([singleAddress.address]);
        
        if (safeResults && safeResults.length > 0) {
          const safeResult = safeResults[0];
          if (safeResult) {
            safeAddressInfo = {
              address: safeResult.safeAddress,
              isDeployed: safeResult.isDeployed,
              ...(safeResult.error && { error: safeResult.error })
            };

            Logger.info('Safe address predicted successfully', {
              stealthAddress: singleAddress.address,
              safeAddress: safeResult.safeAddress,
              isDeployed: safeResult.isDeployed,
              paymentId
            });
          }
        }
      } catch (safeError) {
        Logger.error('Failed to predict Safe address', {
          error: safeError,
          stealthAddress: singleAddress.address,
          userId: user.id,
          paymentId
        });
        // Don't fail the stealth address generation if Safe prediction fails
      }

      // Increment user's nonce by 1
      const newNonce = await this.userService.incrementNonce(user.id!);

      // Create payment session
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
      
      try {
        const paymentSession = await this.paymentSessionService.createPaymentSession({
          paymentId,
          userId: user.id!,
          deviceId: finalDeviceId,
          stealthAddress: singleAddress.address,
          tokenAddress,
          chainId: selectedChainId,
          tokenAmount: tokenAmount.toString(),
          status: 'pending',
          isActive: true,
          expiresAt: expiresAt.toISOString()
        });

        Logger.info('Payment session created', {
          paymentId,
          userId: user.id,
          stealthAddress: singleAddress.address,
          expiresAt: expiresAt.toISOString()
        });
      } catch (error) {
        Logger.error('Failed to create payment session', {
          error,
          paymentId,
          userId: user.id
        });
        // Continue even if payment session creation fails
      }

      // Update device session
      try {
        await this.paymentSessionService.createOrUpdateDeviceSession({
          deviceId: finalDeviceId,
          userId: user.id!,
          lastActivePaymentId: paymentId,
          lastUsedStealthAddress: singleAddress.address,
          userAgent: req.headers['user-agent'] || 'Unknown',
          ipAddress: req.ip || req.socket.remoteAddress || '',
          isActive: true,
          lastAccessedAt: new Date().toISOString()
        });

        Logger.info('Device session updated', {
          deviceId: finalDeviceId,
          userId: user.id,
          paymentId
        });
      } catch (error) {
        Logger.error('Failed to update device session', {
          error,
          deviceId: finalDeviceId,
          userId: user.id
        });
        // Continue even if device session update fails
      }

      // Start event listener for payment detection
      let eventListenerInfo: EventListenerInfo | undefined = undefined;
      try {
        // Use Safe address for payment monitoring if available, otherwise fall back to stealth address
        const monitoringAddress = safeAddressInfo?.address || singleAddress.address;
        
        const listenerId = await this.eventListenerService.startListening({
          paymentId,
          paymentAddress: monitoringAddress, // Monitor the Safe address where payments are actually sent
          tokenAddress,
          chainId: selectedChainId,
          userId: user.id!,
          deviceId: finalDeviceId,
          expectedAmount: tokenAmount.toString(),
          timeoutMinutes: 3
          // tokenDecimals will be fetched dynamically from the contract
        });

        // Update payment session status to listening
        await this.paymentSessionService.updatePaymentSession(paymentId, {
          status: 'listening'
        });

        eventListenerInfo = {
          listenerId,
          isActive: true,
          startTime: new Date().toISOString(),
          timeRemaining: 3 * 60, // 3 minutes in seconds
          timeoutMinutes: 3
        };

        Logger.info('Event listener started for payment detection', {
          paymentId,
          listenerId,
          monitoringAddress,
          stealthAddress: singleAddress.address,
          safeAddress: safeAddressInfo?.address,
          tokenAddress,
          chainId: selectedChainId
        });
      } catch (error) {
        Logger.error('Failed to start event listener', {
          error,
          paymentId,
          stealthAddress: singleAddress.address,
          safeAddress: safeAddressInfo?.address
        });
        // Continue even if event listener fails to start
      }

      // Store the stealth address in the database
      try {
        const stealthAddressData = {
          userId: user.id!,
          nonce: user.currentNonce, // Use the nonce that was used for generation
          stealthAddress: singleAddress.address,
          safeDeployed: safeAddressInfo?.isDeployed || false,
          safeFunded: false, // Default to false for new addresses
          chainId: selectedChainId,
          chainName,
          tokenAddress,
          tokenAmount: tokenAmount.toString(),
          paymentId,
          deviceId: finalDeviceId,
          ...(safeAddressInfo?.address && { safeAddress: safeAddressInfo.address })
        };
        
        const stealthAddressRecord = await this.supabaseService.createStealthAddress(stealthAddressData);

        Logger.info('Stealth address stored in database', {
          recordId: stealthAddressRecord.id,
          userId: user.id,
          stealthAddress: singleAddress.address,
          safeAddress: safeAddressInfo?.address,
          chainId: selectedChainId,
          nonce: user.currentNonce,
          paymentId,
          deviceId: finalDeviceId
        });
      } catch (dbError) {
        Logger.error('Failed to store stealth address in database', {
          error: dbError,
          userId: user.id,
          stealthAddress: singleAddress.address,
          paymentId
        });
        // Don't fail the stealth address generation if database storage fails
      }

      const response: SingleStealthAddressResponse = {
        address: singleAddress.address,
        chainId: selectedChainId,
        chainName,
        tokenAddress, // Return the validated token address
        tokenAmount: tokenAmount.toString(),
        paymentId,
        ...(safeAddressInfo && { safeAddress: safeAddressInfo }),
        ...(eventListenerInfo && { eventListener: eventListenerInfo })
      };

      Logger.info('Single stealth address generated successfully', {
        userId: user.id,
        username: user.username,
        chainId: selectedChainId,
        chainName,
        tokenAddress,
        newNonce,
        address: singleAddress.address,
        tokenAmount,
        paymentId,
        deviceId: finalDeviceId,
        hasEventListener: !!eventListenerInfo
      });

      ResponseUtil.success(res, response, 'Stealth address generated successfully with payment tracking');

    } catch (error) {
      Logger.error('Failed to generate stealth address', { 
        error,
        username: req.params.username
      });
      next(error);
    }
  };

  // Get user's current nonce (public endpoint)
  getCurrentNonce = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.params;

      if (!username) {
        ResponseUtil.error(res, 'Username parameter is required', 400);
        return;
      }

      const user = await this.userService.getUserByUsername(username);
      if (!user) {
        ResponseUtil.error(res, 'User not found', 404);
        return;
      }

      ResponseUtil.success(res, {
        currentNonce: user.currentNonce,
        userId: user.id,
        username: user.username,
        supportedChains: user.chains.map((chain: ChainConfig) => ({
          chainId: chain.chainId,
          tokenCount: chain.tokenAddresses.length,
          name: chain.name,
          tokenAddresses: chain.tokenAddresses // Include token addresses for reference
        }))
      }, 'Current nonce retrieved successfully');

    } catch (error) {
      Logger.error('Failed to get current nonce', { 
        error,
        username: req.params.username
      });
      next(error);
    }
  };

  // Get all stealth addresses for a user (public endpoint)
  getStealthAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.params;

      if (!username) {
        ResponseUtil.error(res, 'Username parameter is required', 400);
        return;
      }

      const user = await this.userService.getUserByUsername(username);
      if (!user) {
        ResponseUtil.error(res, 'User not found', 404);
        return;
      }

      Logger.info('Retrieving stealth addresses for user', {
        userId: user.id,
        username: user.username
      });

      // Get all stealth addresses from the database
      const stealthAddresses = await this.supabaseService.getStealthAddressesByUser(user.id!);

      const response = {
        userId: user.id,
        username: user.username,
        totalAddresses: stealthAddresses.length,
        addresses: stealthAddresses.map(address => ({
          id: address.id,
          nonce: address.nonce,
          stealthAddress: address.stealthAddress,
          safeAddress: address.safeAddress,
          safeDeployed: address.safeDeployed,
          safeFunded: address.safeFunded,
          chainId: address.chainId,
          chainName: address.chainName,
          tokenAddress: address.tokenAddress,
          tokenAmount: address.tokenAmount,
          generatedAt: address.generatedAt,
          lastCheckedAt: address.lastCheckedAt
        }))
      };

      Logger.info('Stealth addresses retrieved successfully', {
        userId: user.id,
        username: user.username,
        totalAddresses: stealthAddresses.length
      });

      ResponseUtil.success(res, response, 'Stealth addresses retrieved successfully');

    } catch (error) {
      Logger.error('Failed to get stealth addresses', { 
        error,
        username: req.params.username
      });
      next(error);
    }
  };

  // Get a specific stealth address by nonce (public endpoint)
  getStealthAddressByNonce = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, nonce } = req.params;

      if (!username) {
        ResponseUtil.error(res, 'Username parameter is required', 400);
        return;
      }

      if (!nonce || isNaN(parseInt(nonce))) {
        ResponseUtil.error(res, 'Valid nonce parameter is required', 400);
        return;
      }

      const user = await this.userService.getUserByUsername(username);
      if (!user) {
        ResponseUtil.error(res, 'User not found', 404);
        return;
      }

      const nonceNumber = parseInt(nonce);

      Logger.info('Retrieving stealth address by nonce', {
        userId: user.id,
        username: user.username,
        nonce: nonceNumber
      });

      // Get the specific stealth address from the database
      const stealthAddress = await this.supabaseService.getStealthAddressByNonce(user.id!, nonceNumber);

      if (!stealthAddress) {
        ResponseUtil.error(res, `No stealth address found for nonce ${nonceNumber}`, 404);
        return;
      }

      const response = {
        id: stealthAddress.id,
        nonce: stealthAddress.nonce,
        stealthAddress: stealthAddress.stealthAddress,
        safeAddress: stealthAddress.safeAddress,
        safeDeployed: stealthAddress.safeDeployed,
        safeFunded: stealthAddress.safeFunded,
        chainId: stealthAddress.chainId,
        chainName: stealthAddress.chainName,
        tokenAddress: stealthAddress.tokenAddress,
        tokenAmount: stealthAddress.tokenAmount,
        generatedAt: stealthAddress.generatedAt,
        lastCheckedAt: stealthAddress.lastCheckedAt
      };

      Logger.info('Stealth address retrieved successfully', {
        userId: user.id,
        username: user.username,
        nonce: nonceNumber,
        stealthAddress: stealthAddress.stealthAddress
      });

      ResponseUtil.success(res, response, 'Stealth address retrieved successfully');

    } catch (error) {
      Logger.error('Failed to get stealth address by nonce', { 
        error,
        username: req.params.username,
        nonce: req.params.nonce
      });
      next(error);
    }
  };

  // Get payment session status by payment ID (public endpoint)
  getPaymentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        ResponseUtil.error(res, 'Payment ID parameter is required', 400);
        return;
      }

      Logger.info('Retrieving payment session status', { paymentId });

      // Get payment session
      const paymentSession = await this.paymentSessionService.getPaymentSession(paymentId);

      if (!paymentSession) {
        ResponseUtil.error(res, 'Payment session not found', 404);
        return;
      }

      // Get event listener status if applicable
      let eventListenerInfo: EventListenerInfo | undefined = undefined;
      if (paymentSession.status === 'listening') {
        const activeListeners = this.eventListenerService.getActiveListeners();
        const listener = activeListeners.find(l => l.config.paymentId === paymentId);
        
        if (listener) {
          eventListenerInfo = {
            listenerId: listener.listenerId,
            isActive: true,
            startTime: listener.startTime.toISOString(),
            timeRemaining: listener.timeRemaining,
            timeoutMinutes: listener.config.timeoutMinutes
          };
        }
      }

      const response = {
        paymentId: paymentSession.paymentId,
        stealthAddress: paymentSession.stealthAddress,
        status: paymentSession.status,
        chainId: paymentSession.chainId,
        tokenAddress: paymentSession.tokenAddress,
        tokenAmount: paymentSession.tokenAmount,
        isActive: paymentSession.isActive,
        expiresAt: paymentSession.expiresAt,
        completedAt: paymentSession.completedAt,
        transactionHash: paymentSession.transactionHash,
        fromAddress: paymentSession.fromAddress,
        actualAmount: paymentSession.actualAmount,
        createdAt: paymentSession.createdAt,
        ...(eventListenerInfo && { eventListener: eventListenerInfo })
      };

      Logger.info('Payment session status retrieved', {
        paymentId,
        status: paymentSession.status,
        isActive: paymentSession.isActive
      });

      ResponseUtil.success(res, response, 'Payment status retrieved successfully');

    } catch (error) {
      Logger.error('Failed to get payment status', { 
        error,
        paymentId: req.params.paymentId
      });
      next(error);
    }
  };

  // Get active event listeners status (for debugging/monitoring)
  getActiveListeners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activeListeners = this.eventListenerService.getActiveListeners();
      const healthStatus = this.eventListenerService.getHealthStatus();

      const response = {
        totalActive: activeListeners.length,
        listeners: activeListeners.map(listener => ({
          paymentId: listener.config.paymentId,
          paymentAddress: listener.config.paymentAddress,
          chainId: listener.config.chainId,
          tokenAddress: listener.config.tokenAddress,
          userId: listener.config.userId,
          startTime: listener.startTime.toISOString(),
          timeRemaining: listener.timeRemaining,
          timeoutMinutes: listener.config.timeoutMinutes
        })),
        serviceHealth: healthStatus
      };

      Logger.info('Active listeners status retrieved', {
        totalActive: activeListeners.length
      });

      ResponseUtil.success(res, response, 'Active listeners retrieved successfully');

    } catch (error) {
      Logger.error('Failed to get active listeners', { error });
      next(error);
    }
  };

  // Resolver API - Check and update funding status for stealth addresses (public endpoint)
  resolveStealthAddressFunding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.params;
      const { addressId, forceCheck } = req.body;

      if (!username) {
        ResponseUtil.error(res, 'Username parameter is required', 400);
        return;
      }

      const user = await this.userService.getUserByUsername(username);
      if (!user) {
        ResponseUtil.error(res, 'User not found', 404);
        return;
      }

      Logger.info('Resolving stealth address funding status', {
        userId: user.id,
        username: user.username,
        addressId,
        forceCheck
      });

      let addressesToCheck: any[] = [];

      if (addressId) {
        // Check specific address
        const address = await this.supabaseService.findById<any>('stealth_addresses', addressId);
        if (address && address.userId === user.id) {
          addressesToCheck.push(address);
        } else {
          ResponseUtil.error(res, 'Stealth address not found or access denied', 404);
          return;
        }
      } else {
        // Check all unfunded addresses for the user or all if force check
        if (forceCheck) {
          addressesToCheck = await this.supabaseService.getStealthAddressesByUser(user.id!);
        } else {
          addressesToCheck = await this.supabaseService.getStealthAddressesByFundingStatus(user.id!, false);
        }
      }

      const checkedAddresses = [];
      let updatedCount = 0;

      for (const address of addressesToCheck) {
        try {
          // Check funding status using Safe service if Safe address exists
          if (address.safeAddress) {
            const rpcUrl = this.getRpcUrlForChain(address.chainId);
            const safeService = new SafeService(address.chainId, rpcUrl);
            
            // Check if Safe has any token balance
            const hasBalance = await safeService.checkSafeHasTokenBalance(address.safeAddress, address.tokenAddress);
            
            if (hasBalance && !address.safeFunded) {
              await this.supabaseService.updateStealthAddressFundingStatus(address.id, true);
              updatedCount++;
              
              Logger.info('Stealth address funding status updated via resolver', {
                addressId: address.id,
                stealthAddress: address.stealthAddress,
                safeAddress: address.safeAddress,
                wasFunded: address.safeFunded,
                nowFunded: true
              });
            }

            checkedAddresses.push({
              id: address.id,
              stealthAddress: address.stealthAddress,
              safeAddress: address.safeAddress,
              previousFundingStatus: address.safeFunded,
              currentFundingStatus: hasBalance,
              updated: hasBalance && !address.safeFunded
            });
          } else {
            // No Safe address to check
            checkedAddresses.push({
              id: address.id,
              stealthAddress: address.stealthAddress,
              safeAddress: null,
              previousFundingStatus: address.safeFunded,
              currentFundingStatus: address.safeFunded,
              updated: false,
              note: 'No Safe address available for checking'
            });
          }
        } catch (checkError) {
          Logger.error('Error checking individual address funding', {
            error: checkError,
            addressId: address.id,
            stealthAddress: address.stealthAddress
          });
          
          checkedAddresses.push({
            id: address.id,
            stealthAddress: address.stealthAddress,
            safeAddress: address.safeAddress,
            previousFundingStatus: address.safeFunded,
            currentFundingStatus: address.safeFunded,
            updated: false,
            error: 'Failed to check funding status'
          });
        }
      }

      const response = {
        userId: user.id,
        username: user.username,
        totalChecked: checkedAddresses.length,
        totalUpdated: updatedCount,
        addresses: checkedAddresses
      };

      Logger.info('Stealth address funding resolution completed', {
        userId: user.id,
        username: user.username,
        totalChecked: checkedAddresses.length,
        totalUpdated: updatedCount
      });

      ResponseUtil.success(res, response, 'Stealth address funding status resolved successfully');

    } catch (error) {
      Logger.error('Failed to resolve stealth address funding', { 
        error,
        username: req.params.username
      });
      next(error);
    }
  };

  // Get funding statistics for a user (public endpoint)
  getFundingStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.params;

      if (!username) {
        ResponseUtil.error(res, 'Username parameter is required', 400);
        return;
      }

      const user = await this.userService.getUserByUsername(username);
      if (!user) {
        ResponseUtil.error(res, 'User not found', 404);
        return;
      }

      Logger.info('Retrieving funding statistics', {
        userId: user.id,
        username: user.username
      });

      // Get funding statistics
      const fundingStats = await this.supabaseService.getUserFundingStats(user.id!);

      const response = {
        userId: user.id,
        username: user.username,
        statistics: {
          totalGenerated: fundingStats.totalGenerated,
          totalFunded: fundingStats.totalFunded,
          totalUnfunded: fundingStats.totalGenerated - fundingStats.totalFunded,
          fundedPercentage: fundingStats.fundedPercentage
        },
        fundedAddresses: fundingStats.fundedAddresses.map(address => ({
          id: address.id,
          nonce: address.nonce,
          stealthAddress: address.stealthAddress,
          safeAddress: address.safeAddress, // Include safeAddress in the response
          chainId: address.chainId,
          chainName: address.chainName,
          tokenAddress: address.tokenAddress,
          tokenAmount: address.tokenAmount,
          generatedAt: address.generatedAt,
          lastCheckedAt: address.lastCheckedAt,
          fromAddress: address.fromAddress,
          transactionHash: address.transactionHash
        }))
      };

      Logger.info('Funding statistics retrieved successfully', {
        userId: user.id,
        username: user.username,
        totalGenerated: fundingStats.totalGenerated,
        totalFunded: fundingStats.totalFunded,
        fundedPercentage: fundingStats.fundedPercentage
      });

      ResponseUtil.success(res, response, 'Funding statistics retrieved successfully');

    } catch (error) {
      Logger.error('Failed to get funding statistics', { 
        error,
        username: req.params.username
      });
      next(error);
    }
  };

  // Get funded or unfunded stealth addresses for a user (public endpoint)
  getStealthAddressesByFundingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.params;
      const { funded } = req.query;

      if (!username) {
        ResponseUtil.error(res, 'Username parameter is required', 400);
        return;
      }

      const user = await this.userService.getUserByUsername(username);
      if (!user) {
        ResponseUtil.error(res, 'User not found', 404);
        return;
      }

      // Parse funded parameter (default to true for funded addresses)
      const isFunded = funded === 'false' ? false : true;

      Logger.info('Retrieving stealth addresses by funding status', {
        userId: user.id,
        username: user.username,
        funded: isFunded
      });

      // Get addresses by funding status
      const addresses = await this.supabaseService.getStealthAddressesByFundingStatus(user.id!, isFunded);

      const response = {
        userId: user.id,
        username: user.username,
        fundingStatus: isFunded ? 'funded' : 'unfunded',
        totalAddresses: addresses.length,
        addresses: addresses.map(address => ({
          id: address.id,
          nonce: address.nonce,
          stealthAddress: address.stealthAddress,
          safeAddress: address.safeAddress,
          safeDeployed: address.safeDeployed,
          safeFunded: address.safeFunded,
          chainId: address.chainId,
          chainName: address.chainName,
          tokenAddress: address.tokenAddress,
          tokenAmount: address.tokenAmount,
          generatedAt: address.generatedAt,
          lastCheckedAt: address.lastCheckedAt
        }))
      };

      Logger.info('Stealth addresses by funding status retrieved successfully', {
        userId: user.id,
        username: user.username,
        fundingStatus: isFunded ? 'funded' : 'unfunded',
        totalAddresses: addresses.length
      });

      ResponseUtil.success(res, response, `${isFunded ? 'Funded' : 'Unfunded'} stealth addresses retrieved successfully`);

    } catch (error) {
      Logger.error('Failed to get stealth addresses by funding status', { 
        error,
        username: req.params.username,
        funded: req.query.funded
      });
      next(error);
    }
  };
}
