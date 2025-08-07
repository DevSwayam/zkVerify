"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventListenerService = void 0;
const viem_1 = require("viem");
const events_1 = require("events");
const utils_1 = require("../utils");
// Base Sepolia Chain Configuration
const baseSepolia = (0, viem_1.defineChain)({
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
];
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
class EventListenerService extends events_1.EventEmitter {
    constructor() {
        super();
        this.activeListeners = new Map();
        this.publicClients = new Map();
        this.DEFAULT_TIMEOUT_MINUTES = 3;
        this.initializeClients();
    }
    // Initialize blockchain clients for supported chains
    initializeClients() {
        // Base Sepolia (primary)
        this.publicClients.set(84532, (0, viem_1.createPublicClient)({
            chain: baseSepolia,
            transport: (0, viem_1.http)('https://base-sepolia-rpc.publicnode.com'),
        }));
        // Add more chains as needed
        utils_1.Logger.info('EventListenerService initialized with blockchain clients', {
            supportedChains: Array.from(this.publicClients.keys())
        });
    }
    // Dynamically fetch ERC20 token decimals from contract
    async getTokenDecimals(tokenAddress, chainId) {
        try {
            const publicClient = this.publicClients.get(chainId);
            if (!publicClient) {
                throw new Error(`Unsupported chain ID: ${chainId}`);
            }
            // For native tokens, use 18 decimals
            if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                return 18;
            }
            utils_1.Logger.info('Fetching token decimals from contract', {
                tokenAddress,
                chainId
            });
            const decimals = await publicClient.readContract({
                address: tokenAddress,
                abi: ERC20_DECIMALS_ABI,
                functionName: 'decimals'
            });
            utils_1.Logger.info('Token decimals fetched successfully', {
                tokenAddress,
                chainId,
                decimals
            });
            return Number(decimals);
        }
        catch (error) {
            utils_1.Logger.warn('Failed to fetch token decimals, defaulting to 18', {
                error: error instanceof Error ? error.message : error,
                tokenAddress,
                chainId
            });
            // Default to 18 decimals if fetching fails
            return 18;
        }
    }
    // Start listening for payments on a payment address
    async startListening(config) {
        const listenerId = this.generateListenerId(config.paymentId, config.paymentAddress);
        // Check if already listening for this address
        if (this.activeListeners.has(listenerId)) {
            utils_1.Logger.warn('Already listening for payments on this address', {
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
            if (!(0, viem_1.isAddress)(config.paymentAddress)) {
                throw new Error(`Invalid payment address: ${config.paymentAddress}`);
            }
            if (!(0, viem_1.isAddress)(config.tokenAddress)) {
                throw new Error(`Invalid token address: ${config.tokenAddress}`);
            }
            const isNativeToken = config.tokenAddress === '0x0000000000000000000000000000000000000000';
            const timeoutMinutes = config.timeoutMinutes || this.DEFAULT_TIMEOUT_MINUTES;
            utils_1.Logger.info('Starting payment listener', {
                paymentId: config.paymentId,
                paymentAddress: config.paymentAddress,
                tokenAddress: config.tokenAddress,
                chainId: config.chainId,
                isNativeToken,
                timeoutMinutes,
                userId: config.userId
            });
            let unwatch;
            if (isNativeToken) {
                // Watch for native token transfers (ETH/SEI)
                unwatch = publicClient.watchBlocks({
                    onBlock: async (block) => {
                        await this.checkNativeTransactions(block, config, listenerId);
                    },
                    onError: (error) => {
                        utils_1.Logger.error('Native token watcher error', { error, paymentId: config.paymentId });
                    }
                });
            }
            else {
                // Use polling-based ERC20 event detection for better reliability
                utils_1.Logger.info('Setting up ERC20 polling-based event detection', {
                    paymentId: config.paymentId,
                    tokenAddress: config.tokenAddress,
                    paymentAddress: config.paymentAddress,
                    chainId: config.chainId
                });
                // Start polling for Transfer events
                const pollingInterval = this.startERC20EventPolling(publicClient, config, listenerId);
                unwatch = () => {
                    clearInterval(pollingInterval);
                    utils_1.Logger.info('ERC20 event polling stopped', {
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
            utils_1.Logger.info('Payment listener started successfully', {
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
        }
        catch (error) {
            utils_1.Logger.error('Failed to start payment listener', {
                error,
                paymentId: config.paymentId,
                paymentAddress: config.paymentAddress,
                chainId: config.chainId
            });
            throw error;
        }
    }
    // Check native token transactions in a block
    async checkNativeTransactions(block, config, listenerId) {
        try {
            const publicClient = this.publicClients.get(config.chainId);
            if (!publicClient || !block.transactions)
                return;
            // Get full transaction details for transactions in this block
            for (const txHash of block.transactions) {
                try {
                    const tx = await publicClient.getTransaction({ hash: txHash });
                    // Check if transaction is to our payment address
                    if (tx.to?.toLowerCase() === config.paymentAddress.toLowerCase() && tx.value > 0n) {
                        const paymentDetected = {
                            paymentId: config.paymentId,
                            stealthAddress: config.paymentAddress, // Keep the interface name for now
                            fromAddress: tx.from,
                            amount: (0, viem_1.formatUnits)(tx.value, 18), // Native tokens typically use 18 decimals
                            tokenAddress: config.tokenAddress,
                            chainId: config.chainId,
                            transactionHash: tx.hash,
                            blockNumber: block.number,
                            timestamp: new Date(),
                            isNativeToken: true
                        };
                        utils_1.Logger.info('Native token payment detected', {
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
                }
                catch (txError) {
                    // Continue with next transaction if one fails
                    utils_1.Logger.debug('Error processing transaction', { txHash, error: txError });
                }
            }
        }
        catch (error) {
            utils_1.Logger.error('Error checking native transactions', { error, paymentId: config.paymentId });
        }
    }
    // Handle ERC20 transfer events
    async handleERC20Transfers(logs, config, listenerId) {
        try {
            utils_1.Logger.info('Processing ERC20 transfer logs', {
                paymentId: config.paymentId,
                logsCount: logs.length,
                paymentAddress: config.paymentAddress,
                tokenAddress: config.tokenAddress
            });
            // Fetch token decimals dynamically from contract with error handling
            let decimals;
            try {
                decimals = await this.getTokenDecimals(config.tokenAddress, config.chainId);
                utils_1.Logger.info('Token decimals fetched for event processing', {
                    paymentId: config.paymentId,
                    tokenAddress: config.tokenAddress,
                    decimals
                });
            }
            catch (decimalsError) {
                utils_1.Logger.error('Failed to fetch token decimals, using default 18', {
                    error: decimalsError,
                    paymentId: config.paymentId,
                    tokenAddress: config.tokenAddress
                });
                decimals = 18; // Fallback to 18 decimals
            }
            for (const log of logs) {
                try {
                    const paymentDetected = {
                        paymentId: config.paymentId,
                        stealthAddress: config.paymentAddress,
                        fromAddress: log.args.from,
                        amount: (0, viem_1.formatUnits)(log.args.value, decimals), // Use dynamically fetched decimals
                        tokenAddress: config.tokenAddress,
                        chainId: config.chainId,
                        transactionHash: log.transactionHash,
                        blockNumber: log.blockNumber,
                        timestamp: new Date(),
                        isNativeToken: false
                    };
                    utils_1.Logger.info('ERC20 token payment detected', {
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
                }
                catch (logError) {
                    utils_1.Logger.error('Error processing individual transfer log', {
                        error: logError,
                        paymentId: config.paymentId,
                        txHash: log.transactionHash
                    });
                }
            }
        }
        catch (error) {
            utils_1.Logger.error('Error handling ERC20 transfers', {
                error: error instanceof Error ? error.message : error,
                paymentId: config.paymentId,
                tokenAddress: config.tokenAddress
            });
        }
    }
    // Stop listening for a specific payment
    stopListening(listenerId, reason = 'manual') {
        const listener = this.activeListeners.get(listenerId);
        if (!listener) {
            utils_1.Logger.warn('Attempted to stop non-existent listener', { listenerId });
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
            utils_1.Logger.info('Payment listener stopped', {
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
        }
        catch (error) {
            utils_1.Logger.error('Error stopping payment listener', { error, listenerId });
            return false;
        }
    }
    // Get information about active listeners
    getActiveListeners() {
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
    stopAllListeners() {
        const count = this.activeListeners.size;
        const listenerIds = Array.from(this.activeListeners.keys());
        for (const listenerId of listenerIds) {
            this.stopListening(listenerId, 'manual');
        }
        utils_1.Logger.info('All payment listeners stopped', { count });
        return count;
    }
    // Generate unique listener ID
    generateListenerId(paymentId, stealthAddress) {
        return `${paymentId}_${stealthAddress.toLowerCase()}`;
    }
    // Get listener by payment ID
    getListenerByPaymentId(paymentId) {
        for (const [listenerId, listener] of this.activeListeners.entries()) {
            if (listener.config.paymentId === paymentId) {
                return listener;
            }
        }
        return undefined;
    }
    // Health check
    getHealthStatus() {
        return {
            isHealthy: true,
            activeListeners: this.activeListeners.size,
            supportedChains: Array.from(this.publicClients.keys()),
            uptime: process.uptime()
        };
    }
    // Start polling for ERC20 Transfer events (more reliable than WebSocket-based watching)
    startERC20EventPolling(publicClient, config, listenerId) {
        let lastCheckedBlock = BigInt(0);
        const POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds
        const MAX_BLOCK_RANGE = 100; // Check last 100 blocks max
        utils_1.Logger.info('Starting ERC20 event polling', {
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
                    utils_1.Logger.debug('Polling for ERC20 Transfer events', {
                        paymentId: config.paymentId,
                        fromBlock: fromBlock.toString(),
                        toBlock: toBlock.toString(),
                        tokenAddress: config.tokenAddress,
                        paymentAddress: config.paymentAddress
                    });
                    // Query Transfer events for our payment address
                    const logs = await publicClient.getLogs({
                        address: config.tokenAddress,
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
                            to: config.paymentAddress
                        },
                        fromBlock,
                        toBlock
                    });
                    if (logs.length > 0) {
                        utils_1.Logger.info('ERC20 Transfer events found via polling', {
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
            }
            catch (error) {
                utils_1.Logger.error('Error during ERC20 event polling', {
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
    async fetchTokenDecimals(tokenAddress, chainId) {
        return this.getTokenDecimals(tokenAddress, chainId);
    }
}
exports.EventListenerService = EventListenerService;
//# sourceMappingURL=EventListenerService.js.map