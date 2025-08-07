import { createPublicClient, http, defineChain, parseUnits, formatUnits, isAddress } from 'viem';
import { EventEmitter } from 'events';
import { Logger } from '../utils';

// Base Sepolia Chain Configuration
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
  blockExplorers: {
    default: {
      name: 'Base Sepolia Explorer',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
});

// ERC20 Transfer Event ABI
const ERC20_TRANSFER_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  }
] as const;

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

export interface PaymentDetected {
  paymentId: string;
  stealthAddress: string;
  fromAddress: string;
  amount: string;
  tokenAddress: string;
  chainId: number;
  transactionHash: string;
  blockNumber: bigint;
  timestamp: Date;
  isNativeToken: boolean;
}

export interface EventListenerConfig {
  paymentId: string;
  paymentAddress: string; // Address to monitor for payments (Safe address or stealth address)
  tokenAddress: string;
  chainId: number;
  userId: string;
  deviceId?: string;
  expectedAmount?: string;
  timeoutMinutes: number;
  // tokenDecimals removed - will be fetched dynamically from contract
}

interface ActiveListener {
  config: EventListenerConfig;
  unwatch: () => void;
  timeoutId: NodeJS.Timeout;
  startTime: Date;
}

export class EventListenerService extends EventEmitter {
  private activeListeners: Map<string, ActiveListener> = new Map();
  private publicClients: Map<number, any> = new Map();
  private readonly DEFAULT_TIMEOUT_MINUTES = 3;

  constructor() {
    super();
    this.initializeClients();
  }

  // Initialize blockchain clients for supported chains
  private initializeClients(): void {
    // Base Sepolia (primary)
    this.publicClients.set(84532, createPublicClient({
      chain: baseSepolia,
      transport: http('https://base-sepolia-rpc.publicnode.com'),
    }));

    // Add more chains as needed
    Logger.info('EventListenerService initialized with blockchain clients', {
      supportedChains: Array.from(this.publicClients.keys())
    });
  }

  // Dynamically fetch ERC20 token decimals from contract
  private async getTokenDecimals(tokenAddress: string, chainId: number): Promise<number> {
    try {
      const publicClient = this.publicClients.get(chainId);
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

  // Start listening for payments on a payment address
  async startListening(config: EventListenerConfig): Promise<string> {
    const listenerId = this.generateListenerId(config.paymentId, config.paymentAddress);
    
    // Check if already listening for this address
    if (this.activeListeners.has(listenerId)) {
      Logger.warn('Already listening for payments on this address', {
        paymentId: config.paymentId,
        paymentAddress: config.paymentAddress,
        chainId: config.chainId
      });
      return listenerId;
    }

    try {
      const publicClient = this.publicClients.get(config.chainId);
      if (!publicClient) {
        throw new Error(`Unsupported chain ID: ${config.chainId}`);
      }

      // Validate addresses
      if (!isAddress(config.paymentAddress)) {
        throw new Error(`Invalid payment address: ${config.paymentAddress}`);
      }

      if (!isAddress(config.tokenAddress)) {
        throw new Error(`Invalid token address: ${config.tokenAddress}`);
      }

      const isNativeToken = config.tokenAddress === '0x0000000000000000000000000000000000000000';
      const timeoutMinutes = config.timeoutMinutes || this.DEFAULT_TIMEOUT_MINUTES;

      Logger.info('Starting payment listener', {
        paymentId: config.paymentId,
        paymentAddress: config.paymentAddress,
        tokenAddress: config.tokenAddress,
        chainId: config.chainId,
        isNativeToken,
        timeoutMinutes,
        userId: config.userId
      });

      let unwatch: () => void;

      if (isNativeToken) {
        // Watch for native token transfers (ETH/SEI)
        unwatch = publicClient.watchBlocks({
          onBlock: async (block: any) => {
            await this.checkNativeTransactions(block, config, listenerId);
          },
          onError: (error: any) => {
            Logger.error('Native token watcher error', { error, paymentId: config.paymentId });
          }
        });
      } else {
        // Use polling-based ERC20 event detection for better reliability
        Logger.info('Setting up ERC20 polling-based event detection', {
          paymentId: config.paymentId,
          tokenAddress: config.tokenAddress,
          paymentAddress: config.paymentAddress,
          chainId: config.chainId
        });

        // Start polling for Transfer events
        const pollingInterval = this.startERC20EventPolling(publicClient, config, listenerId);
        
        unwatch = () => {
          clearInterval(pollingInterval);
          Logger.info('ERC20 event polling stopped', {
            paymentId: config.paymentId,
            listenerId
          });
        };
      }

      // Set up automatic cleanup after timeout
      const timeoutId = setTimeout(() => {
        this.stopListening(listenerId, 'timeout');
      }, timeoutMinutes * 60 * 1000); // Convert minutes to milliseconds

      // Store the active listener
      this.activeListeners.set(listenerId, {
        config,
        unwatch,
        timeoutId,
        startTime: new Date()
      });

      Logger.info('Payment listener started successfully', {
        paymentId: config.paymentId,
        listenerId,
        timeoutMinutes,
        activeListeners: this.activeListeners.size
      });

      // Emit listener started event
      this.emit('listenerStarted', {
        paymentId: config.paymentId,
        paymentAddress: config.paymentAddress,
        chainId: config.chainId,
        timeoutMinutes
      });

      return listenerId;

    } catch (error) {
      Logger.error('Failed to start payment listener', {
        error,
        paymentId: config.paymentId,
        paymentAddress: config.paymentAddress,
        chainId: config.chainId
      });
      throw error;
    }
  }

  // Check native token transactions in a block
  private async checkNativeTransactions(block: any, config: EventListenerConfig, listenerId: string): Promise<void> {
    try {
      const publicClient = this.publicClients.get(config.chainId);
      if (!publicClient || !block.transactions) return;

      // Get full transaction details for transactions in this block
      for (const txHash of block.transactions) {
        try {
          const tx = await publicClient.getTransaction({ hash: txHash });
          
          // Check if transaction is to our payment address
          if (tx.to?.toLowerCase() === config.paymentAddress.toLowerCase() && tx.value > 0n) {
            const paymentDetected: PaymentDetected = {
              paymentId: config.paymentId,
              stealthAddress: config.paymentAddress, // Keep the interface name for now
              fromAddress: tx.from,
              amount: formatUnits(tx.value, 18), // Native tokens typically use 18 decimals
              tokenAddress: config.tokenAddress,
              chainId: config.chainId,
              transactionHash: tx.hash,
              blockNumber: block.number,
              timestamp: new Date(),
              isNativeToken: true
            };

            Logger.info('Native token payment detected', {
              paymentId: config.paymentId,
              from: tx.from,
              to: tx.to,
              amount: paymentDetected.amount,
              txHash: tx.hash
            });

            // Emit payment detected event
            this.emit('paymentDetected', paymentDetected);

            // Stop listening after successful payment detection
            this.stopListening(listenerId, 'payment_received');
          }
        } catch (txError) {
          // Continue with next transaction if one fails
          Logger.debug('Error processing transaction', { txHash, error: txError });
        }
      }
    } catch (error) {
      Logger.error('Error checking native transactions', { error, paymentId: config.paymentId });
    }
  }

  // Handle ERC20 transfer events
  private async handleERC20Transfers(logs: any[], config: EventListenerConfig, listenerId: string): Promise<void> {
    try {
      Logger.info('Processing ERC20 transfer logs', {
        paymentId: config.paymentId,
        logsCount: logs.length,
        paymentAddress: config.paymentAddress,
        tokenAddress: config.tokenAddress
      });

      // Fetch token decimals dynamically from contract with error handling
      let decimals: number;
      try {
        decimals = await this.getTokenDecimals(config.tokenAddress, config.chainId);
        Logger.info('Token decimals fetched for event processing', {
          paymentId: config.paymentId,
          tokenAddress: config.tokenAddress,
          decimals
        });
      } catch (decimalsError) {
        Logger.error('Failed to fetch token decimals, using default 18', {
          error: decimalsError,
          paymentId: config.paymentId,
          tokenAddress: config.tokenAddress
        });
        decimals = 18; // Fallback to 18 decimals
      }

              for (const log of logs) {
        try {
          const paymentDetected: PaymentDetected = {
            paymentId: config.paymentId,
            stealthAddress: config.paymentAddress,
            fromAddress: log.args.from,
            amount: formatUnits(log.args.value, decimals), // Use dynamically fetched decimals
            tokenAddress: config.tokenAddress,
            chainId: config.chainId,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: new Date(),
            isNativeToken: false
          };

          Logger.info('ERC20 token payment detected', {
            paymentId: config.paymentId,
            from: log.args.from,
            to: log.args.to,
            amount: paymentDetected.amount,
            rawValue: log.args.value.toString(),
            decimals,
            tokenAddress: config.tokenAddress,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber.toString()
          });

          // Emit payment detected event
          this.emit('paymentDetected', paymentDetected);

          // Stop listening after successful payment detection
          this.stopListening(listenerId, 'payment_received');
        } catch (logError) {
          Logger.error('Error processing individual transfer log', {
            error: logError,
            paymentId: config.paymentId,
            txHash: log.transactionHash
          });
        }
      }
          } catch (error) {
        Logger.error('Error handling ERC20 transfers', { 
          error: error instanceof Error ? error.message : error, 
          paymentId: config.paymentId,
          tokenAddress: config.tokenAddress
        });
      }
  }

  // Stop listening for a specific payment
  stopListening(listenerId: string, reason: 'timeout' | 'payment_received' | 'manual' = 'manual'): boolean {
    const listener = this.activeListeners.get(listenerId);
    if (!listener) {
      Logger.warn('Attempted to stop non-existent listener', { listenerId });
      return false;
    }

    try {
      // Stop the blockchain watcher
      listener.unwatch();

      // Clear the timeout
      clearTimeout(listener.timeoutId);

      // Remove from active listeners
      this.activeListeners.delete(listenerId);

      const duration = Date.now() - listener.startTime.getTime();

      Logger.info('Payment listener stopped', {
        paymentId: listener.config.paymentId,
        paymentAddress: listener.config.paymentAddress,
        reason,
        duration: `${Math.round(duration / 1000)}s`,
        activeListeners: this.activeListeners.size
      });

      // Emit listener stopped event
      this.emit('listenerStopped', {
        paymentId: listener.config.paymentId,
        paymentAddress: listener.config.paymentAddress,
        reason,
        duration
      });

      return true;
    } catch (error) {
      Logger.error('Error stopping payment listener', { error, listenerId });
      return false;
    }
  }

  // Get information about active listeners
  getActiveListeners(): { listenerId: string; config: EventListenerConfig; startTime: Date; timeRemaining: number }[] {
    const now = Date.now();
    return Array.from(this.activeListeners.entries()).map(([listenerId, listener]) => {
      const elapsed = now - listener.startTime.getTime();
      const timeout = (listener.config.timeoutMinutes || this.DEFAULT_TIMEOUT_MINUTES) * 60 * 1000;
      const timeRemaining = Math.max(0, timeout - elapsed);

      return {
        listenerId,
        config: listener.config,
        startTime: listener.startTime,
        timeRemaining: Math.round(timeRemaining / 1000) // Return in seconds
      };
    });
  }

  // Stop all listeners (useful for shutdown)
  stopAllListeners(): number {
    const count = this.activeListeners.size;
    const listenerIds = Array.from(this.activeListeners.keys());
    
    for (const listenerId of listenerIds) {
      this.stopListening(listenerId, 'manual');
    }

    Logger.info('All payment listeners stopped', { count });
    return count;
  }

  // Generate unique listener ID
  private generateListenerId(paymentId: string, stealthAddress: string): string {
    return `${paymentId}_${stealthAddress.toLowerCase()}`;
  }

  // Get listener by payment ID
  getListenerByPaymentId(paymentId: string): ActiveListener | undefined {
    for (const [listenerId, listener] of this.activeListeners.entries()) {
      if (listener.config.paymentId === paymentId) {
        return listener;
      }
    }
    return undefined;
  }

  // Health check
  getHealthStatus(): {
    isHealthy: boolean;
    activeListeners: number;
    supportedChains: number[];
    uptime: number;
  } {
    return {
      isHealthy: true,
      activeListeners: this.activeListeners.size,
      supportedChains: Array.from(this.publicClients.keys()),
      uptime: process.uptime()
    };
  }

  // Start polling for ERC20 Transfer events (more reliable than WebSocket-based watching)
  private startERC20EventPolling(publicClient: any, config: EventListenerConfig, listenerId: string): NodeJS.Timeout {
    let lastCheckedBlock = BigInt(0);
    const POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds
    const MAX_BLOCK_RANGE = 100; // Check last 100 blocks max

    Logger.info('Starting ERC20 event polling', {
      paymentId: config.paymentId,
      tokenAddress: config.tokenAddress,
      paymentAddress: config.paymentAddress,
      pollingInterval: POLLING_INTERVAL_MS
    });

    const polling = setInterval(async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        
        // On first run, start checking from recent blocks
        if (lastCheckedBlock === BigInt(0)) {
          lastCheckedBlock = currentBlock - BigInt(MAX_BLOCK_RANGE);
        }

        // Only check if there are new blocks
        if (currentBlock > lastCheckedBlock) {
          const fromBlock = lastCheckedBlock + BigInt(1);
          const toBlock = currentBlock;

          Logger.debug('Polling for ERC20 Transfer events', {
            paymentId: config.paymentId,
            fromBlock: fromBlock.toString(),
            toBlock: toBlock.toString(),
            tokenAddress: config.tokenAddress,
            paymentAddress: config.paymentAddress
          });

          // Query Transfer events for our payment address
          const logs = await publicClient.getLogs({
            address: config.tokenAddress as `0x${string}`,
            event: {
              type: 'event',
              name: 'Transfer',
              inputs: [
                { indexed: true, name: 'from', type: 'address' },
                { indexed: true, name: 'to', type: 'address' },
                { indexed: false, name: 'value', type: 'uint256' }
              ]
            },
            args: {
              to: config.paymentAddress as `0x${string}`
            },
            fromBlock,
            toBlock
          });

          if (logs.length > 0) {
            Logger.info('ERC20 Transfer events found via polling', {
              paymentId: config.paymentId,
              logsCount: logs.length,
              tokenAddress: config.tokenAddress,
              paymentAddress: config.paymentAddress,
              fromBlock: fromBlock.toString(),
              toBlock: toBlock.toString()
            });

            // Process the found events
            await this.handleERC20Transfers(logs, config, listenerId);
          }

          // Update last checked block
          lastCheckedBlock = currentBlock;
        }
      } catch (error) {
        Logger.error('Error during ERC20 event polling', {
          error: error instanceof Error ? error.message : error,
          paymentId: config.paymentId,
          tokenAddress: config.tokenAddress,
          paymentAddress: config.paymentAddress
        });
      }
    }, POLLING_INTERVAL_MS);

    return polling;
  }

  // Public method to fetch token decimals for external use
  async fetchTokenDecimals(tokenAddress: string, chainId: number): Promise<number> {
    return this.getTokenDecimals(tokenAddress, chainId);
  }
} 