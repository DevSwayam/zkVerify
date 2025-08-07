#!/usr/bin/env node

const {
    createPublicClient,
    createWalletClient,
    http,
    encodeFunctionData,
    decodeAbiParameters,
    parseAbiParameters, 
    formatEther,
    isAddress,
  } = require("viem");
  const { privateKeyToAccount } = require("viem/accounts");
  
  require('dotenv').config();
  
  // ================================================================
  // CONFIGURATION - Your Deployed Contracts
  // ================================================================
  
  const SAFE_IMPLEMENTATION_ADDRESS = "0xb56ea8db3418a63326b69ef042c30cdeaa4df136";
  const PROXY_FACTORY_ADDRESS = "0x4af271648a3aabff5e7a0d9e411108131a3ca76b";
  
  const RPC_URL = process.env.RPC_URL;
  const CHAIN_ID = Number(process.env.CHAIN_ID);
  
  const customChain = {
    id: CHAIN_ID,
    name: process.env.CHAIN_NAME || "Custom Chain",
    network: process.env.CHAIN_NETWORK || "custom",
    nativeCurrency: {
      name: process.env.NATIVE_CURRENCY_NAME || "Ether",
      symbol: process.env.NATIVE_CURRENCY_SYMBOL || "ETH",
      decimals: Number(process.env.NATIVE_CURRENCY_DECIMALS || 18),
    },
    rpcUrls: {
      default: { http: [RPC_URL] },
      public: { http: [RPC_URL] },
    },
  };
  
  // ================================================================
  // CLIENTS SETUP
  // ================================================================
  
  const publicClient = createPublicClient({ 
    chain: customChain, 
    transport: http(RPC_URL) 
  });
  
  // Setup deployer account (optional, only needed for deployment)
  let walletClient = null;
  if (process.env.ALICE_PRIVATE_KEY) {
    const deployerPrivateKey = process.env.ALICE_PRIVATE_KEY.startsWith('0x') 
      ? process.env.ALICE_PRIVATE_KEY 
      : `0x${process.env.ALICE_PRIVATE_KEY}`;
    const deployerAccount = privateKeyToAccount(deployerPrivateKey);
    walletClient = createWalletClient({ 
      account: deployerAccount, 
      chain: customChain, 
      transport: http(RPC_URL) 
    });
  }
  
  // ================================================================
  // CONTRACT ABIs
  // ================================================================
  
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
  ];
  
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
  ];
  
  // ================================================================
  // CORE PREDICTION FUNCTION
  // ================================================================
  
  /**
   * Predict Safe address using factory's own logic via static call
   * This is the WORKING method that uses your factory's custom CREATE2 implementation
   * 
   * @param {string} ownerAddress - Address that will own the Safe
   * @param {bigint} saltNonce - Salt nonce for deterministic address generation  
   * @param {number} threshold - Number of required signatures (default: 1)
   * @param {string[]} additionalOwners - Additional owner addresses (optional)
   * @returns {Promise<Object>} Prediction result with address and parameters
   */
  async function predictSafeAddress(
    ownerAddress, 
    saltNonce = BigInt(Date.now()), 
    threshold = 1, 
    additionalOwners = []
  ) {
    console.log(`🔮 Predicting Safe address for ${ownerAddress}`);
    console.log(`🧂 Salt nonce: ${saltNonce}`);
    
    // Validate inputs
    if (!isAddress(ownerAddress)) {
      throw new Error(`Invalid owner address: ${ownerAddress}`);
    }
    
    if (typeof saltNonce !== 'bigint') {
      saltNonce = BigInt(saltNonce);
    }
    
    // Setup owners array
    const owners = [ownerAddress, ...additionalOwners];
    
    try {
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
      
      console.log(`📋 Setup calldata: ${setupCalldata.slice(0, 66)}...`);
      
      // Use factory's own logic via static call
      // This calls createProxyWithNonce as a read-only operation to get the address
      const staticCallResult = await publicClient.request({
        method: 'eth_call',
        params: [{
          to: PROXY_FACTORY_ADDRESS,
          data: encodeFunctionData({
            abi: PROXY_FACTORY_ABI,
            functionName: 'createProxyWithNonce',
            args: [SAFE_IMPLEMENTATION_ADDRESS, setupCalldata, saltNonce]
          })
        }, 'latest']
      });
      
      if (!staticCallResult || staticCallResult === '0x') {
        throw new Error('Factory static call returned empty result');
      }
      
      // Decode the result to get the predicted address
      const decodedResult = decodeAbiParameters(
        parseAbiParameters('address'),
        staticCallResult
      );
      
      const predictedAddress = decodedResult[0];
      console.log(`🎯 Predicted address: ${predictedAddress}`);
      
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
      console.error(`❌ Prediction failed: ${error.message}`);
      
      // Provide helpful error messages
      if (error.message.includes('eth_call')) {
        throw new Error(`Factory call failed. Check that factory exists at ${PROXY_FACTORY_ADDRESS}`);
      } else if (error.message.includes('decode')) {
        throw new Error('Failed to decode factory response. Factory might have changed.');
      } else {
        throw error;
      }
    }
  }
  
  // ================================================================
  // DEPLOYMENT FUNCTIONS
  // ================================================================
  
  /**
   * Deploy a Safe using predicted parameters
   */
  async function deploySafe(prediction, deployerWallet = walletClient) {
    if (!deployerWallet) {
      throw new Error('Wallet client required for deployment. Set ALICE_PRIVATE_KEY in .env');
    }
    
    console.log(`\n🚀 Deploying Safe with predicted parameters`);
    console.log(`🎯 Expected address: ${prediction.predictedAddress}`);
    
    try {
      // Estimate gas
      const gasEstimate = await publicClient.estimateContractGas({
        address: PROXY_FACTORY_ADDRESS,
        abi: PROXY_FACTORY_ABI,
        functionName: 'createProxyWithNonce',
        args: [
          SAFE_IMPLEMENTATION_ADDRESS,
          prediction.setupCalldata,
          prediction.saltNonce
        ],
        account: deployerWallet.account.address,
      });
      
      console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
      
      // Deploy the Safe
      const createProxyTx = await deployerWallet.writeContract({
        address: PROXY_FACTORY_ADDRESS,
        abi: PROXY_FACTORY_ABI,
        functionName: 'createProxyWithNonce',
        args: [
          SAFE_IMPLEMENTATION_ADDRESS,
          prediction.setupCalldata,
          prediction.saltNonce
        ],
        gas: gasEstimate + 100000n, // Add buffer
      });
  
      console.log(`📝 Transaction hash: ${createProxyTx}`);
      console.log(`⏳ Waiting for confirmation...`);
  
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createProxyTx });
      const actualSafeAddress = receipt.logs?.[0]?.address;
      
      if (!actualSafeAddress) {
        throw new Error("Failed to extract Safe address from transaction receipt");
      }
  
      console.log(`✅ Safe deployed at: ${actualSafeAddress}`);
      
      // Verify prediction accuracy
      const predictionCorrect = prediction.predictedAddress.toLowerCase() === actualSafeAddress.toLowerCase();
      console.log(`🎯 Prediction: ${predictionCorrect ? '✅ CORRECT!' : '❌ WRONG'}`);
      
      return {
        predicted: prediction.predictedAddress,
        actual: actualSafeAddress,
        correct: predictionCorrect,
        transactionHash: createProxyTx,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
      };
      
    } catch (error) {
      console.error(`❌ Deployment failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Full workflow: predict then deploy
   */
  async function predictAndDeploy(
    ownerAddress, 
    saltNonce = BigInt(Date.now()), 
    threshold = 1, 
    additionalOwners = []
  ) {
    console.log('\n🎯 PREDICT & DEPLOY WORKFLOW');
    console.log('============================');
    
    // Step 1: Predict the address
    const prediction = await predictSafeAddress(ownerAddress, saltNonce, threshold, additionalOwners);
    
    // Step 2: Check if Safe already exists at predicted address
    const existingCode = await publicClient.getBytecode({ address: prediction.predictedAddress });
    if (existingCode && existingCode !== '0x') {
      console.log(`⚠️  Safe already exists at predicted address: ${prediction.predictedAddress}`);
      return { 
        prediction, 
        deployment: { 
          actual: prediction.predictedAddress, 
          alreadyExists: true 
        } 
      };
    }
    
    // Step 3: Show balance at predicted address (user might have pre-funded it)
    const balance = await publicClient.getBalance({ address: prediction.predictedAddress });
    if (balance > 0n) {
      console.log(`💰 Predicted address has balance: ${formatEther(balance)} ${customChain.nativeCurrency.symbol}`);
    }
    
    // Step 4: Deploy the Safe
    const deployment = await deploySafe(prediction);
    
    return { prediction, deployment };
  }
  
  // ================================================================
  // UTILITY FUNCTIONS
  // ================================================================
  
  /**
   * Batch predict multiple Safe addresses
   */
  async function batchPredict(ownerAddresses, startingSaltNonce = BigInt(Date.now())) {
    console.log(`\n📊 BATCH PREDICTION: ${ownerAddresses.length} addresses`);
    console.log('================================================');
    
    const predictions = [];
    
    for (let i = 0; i < ownerAddresses.length; i++) {
      const owner = ownerAddresses[i];
      const saltNonce = startingSaltNonce + BigInt(i);
      
      console.log(`\n[${i + 1}/${ownerAddresses.length}] Owner: ${owner}`);
      
      try {
        const prediction = await predictSafeAddress(owner, saltNonce);
        predictions.push({ owner, success: true, prediction });
        
        // Small delay to avoid overwhelming the RPC
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed for ${owner}: ${error.message}`);
        predictions.push({ owner, success: false, error: error.message });
      }
    }
    
    // Summary
    console.log(`\n📈 BATCH SUMMARY`);
    console.log('================');
    const successful = predictions.filter(p => p.success).length;
    console.log(`✅ Successful: ${successful}/${predictions.length}`);
    
    predictions.forEach((p, i) => {
      if (p.success) {
        console.log(`  ${i + 1}. ${p.owner} → ${p.prediction.predictedAddress}`);
      } else {
        console.log(`  ${i + 1}. ${p.owner} → ❌ ${p.error}`);
      }
    });
    
    return predictions;
  }
  
  /**
   * Find vanity Safe addresses (addresses with specific patterns)
   */
  async function findVanitySafe(ownerAddress, pattern, maxAttempts = 100) {
    console.log(`\n🎨 VANITY ADDRESS SEARCH`);
    console.log('========================');
    console.log(`👤 Owner: ${ownerAddress}`);
    console.log(`🎯 Pattern: ${pattern}`);
    console.log(`🔍 Max attempts: ${maxAttempts}`);
    
    const patternLower = pattern.toLowerCase();
    
    for (let i = 0; i < maxAttempts; i++) {
      const saltNonce = BigInt(Date.now() + i * 1000); // Spread out salts
      
      try {
        const prediction = await predictSafeAddress(ownerAddress, saltNonce);
        
        if (prediction.predictedAddress.toLowerCase().includes(patternLower)) {
          console.log(`\n🎉 VANITY ADDRESS FOUND!`);
          console.log(`🎯 Address: ${prediction.predictedAddress}`);
          console.log(`🧂 Salt nonce: ${saltNonce}`);
          console.log(`🔢 Found after ${i + 1} attempts`);
          
          return {
            found: true,
            attempts: i + 1,
            prediction
          };
        }
        
        // Progress indicator
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`\r🔍 Searched ${i + 1}/${maxAttempts} combinations...`);
        }
        
      } catch (error) {
        console.error(`\n❌ Error on attempt ${i + 1}: ${error.message}`);
        continue;
      }
    }
    
    console.log(`\n😞 Pattern "${pattern}" not found after ${maxAttempts} attempts`);
    return { found: false, attempts: maxAttempts };
  }
  
  /**
   * Verify a deployed Safe matches prediction
   */
  async function verifySafe(safeAddress, expectedOwners, expectedThreshold) {
    console.log(`\n🔍 VERIFYING SAFE: ${safeAddress}`);
    console.log('=====================================');
    
    try {
      // Check if contract exists
      const code = await publicClient.getBytecode({ address: safeAddress });
      if (!code || code === '0x') {
        console.log(`❌ No contract found at address`);
        return false;
      }
      
      // Get actual owners and threshold
      const actualOwners = await publicClient.readContract({
        address: safeAddress,
        abi: SAFE_ABI,
        functionName: 'getOwners',
      });
      
      const actualThreshold = await publicClient.readContract({
        address: safeAddress,
        abi: SAFE_ABI,
        functionName: 'getThreshold',
      });
      
      console.log(`👥 Expected owners: ${expectedOwners.join(', ')}`);
      console.log(`👥 Actual owners:   ${actualOwners.join(', ')}`);
      console.log(`🔒 Expected threshold: ${expectedThreshold}`);
      console.log(`🔒 Actual threshold:   ${actualThreshold}`);
      
      // Verify owners match
      const ownersMatch = expectedOwners.length === actualOwners.length &&
        expectedOwners.every(owner => actualOwners.includes(owner));
      
      const thresholdMatches = BigInt(expectedThreshold) === actualThreshold;
      
      const verified = ownersMatch && thresholdMatches;
      console.log(`🔍 Verification: ${verified ? '✅ PASSED' : '❌ FAILED'}`);
      
      return verified;
      
    } catch (error) {
      console.error(`❌ Verification error: ${error.message}`);
      return false;
    }
  }
  
  // ================================================================
  // CLI INTERFACE
  // ================================================================
  
  async function cli() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === '--help' || command === '-h' || !command) {
      console.log(`
  🔮 Safe Address Predictor & Deployer
  ====================================
  
  COMMANDS:
    predict <owner> [saltNonce]           Predict Safe address
    deploy <owner> [saltNonce]            Predict and deploy Safe  
    batch <owner1> <owner2> <owner3>...   Batch predict multiple addresses
    vanity <owner> <pattern> [maxAttempts] Find vanity address
    verify <safeAddress> <owner>          Verify deployed Safe
    
  EXAMPLES:
    # Predict address for owner
    node safe-predictor.js predict 0x1234567890123456789012345678901234567890
    
    # Deploy Safe with custom salt
    node safe-predictor.js deploy 0x1234567890123456789012345678901234567890 12345
    
    # Batch predict for multiple owners  
    node safe-predictor.js batch 0x1111... 0x2222... 0x3333...
    
    # Find vanity address containing "cafe"
    node safe-predictor.js vanity 0x1234... cafe 1000
    
    # Verify deployed Safe
    node safe-predictor.js verify 0x80b38a754518887b2ee7e1a81c72e4a10079cc5d 0x1234...
  
  ENVIRONMENT VARIABLES:
    RPC_URL              Blockchain RPC endpoint
    CHAIN_ID             Chain ID number
    ALICE_PRIVATE_KEY    Private key for deployment (optional for prediction)
      `);
      return;
    }
    
    try {
      switch (command) {
        case 'predict': {
          const ownerAddress = args[1];
          const saltNonce = args[2] ? BigInt(args[2]) : BigInt(Date.now());
          
          if (!ownerAddress) {
            throw new Error('Owner address required');
          }
          
          const prediction = await predictSafeAddress(ownerAddress, saltNonce);
          console.log(`\n📋 PREDICTION RESULT:`);
          console.log(`🎯 Safe Address: ${prediction.predictedAddress}`);
          console.log(`👤 Owner: ${prediction.owners[0]}`);
          console.log(`🧂 Salt Nonce: ${prediction.saltNonce}`);
          break;
        }
        
        case 'deploy': {
          const ownerAddress = args[1];
          const saltNonce = args[2] ? BigInt(args[2]) : BigInt(Date.now());
          
          if (!ownerAddress) {
            throw new Error('Owner address required');
          }
          
          const result = await predictAndDeploy(ownerAddress, saltNonce);
          console.log(`\n🎉 DEPLOYMENT COMPLETE!`);
          console.log(`🎯 Predicted: ${result.prediction.predictedAddress}`);
          console.log(`✅ Deployed:  ${result.deployment.actual}`);
          break;
        }
        
        case 'batch': {
          const owners = args.slice(1).filter(arg => isAddress(arg));
          if (owners.length === 0) {
            throw new Error('At least one valid owner address required');
          }
          
          await batchPredict(owners);
          break;
        }
        
        case 'vanity': {
          const ownerAddress = args[1];
          const pattern = args[2];
          const maxAttempts = args[3] ? parseInt(args[3]) : 100;
          
          if (!ownerAddress || !pattern) {
            throw new Error('Owner address and pattern required');
          }
          
          await findVanitySafe(ownerAddress, pattern, maxAttempts);
          break;
        }
        
        case 'verify': {
          const safeAddress = args[1];
          const ownerAddress = args[2];
          
          if (!safeAddress || !ownerAddress) {
            throw new Error('Safe address and owner address required');
          }
          
          await verifySafe(safeAddress, [ownerAddress], 1);
          break;
        }
        
        default:
          console.error(`❌ Unknown command: ${command}`);
          console.log('Use --help to see available commands');
          process.exit(1);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
  
  // ================================================================
  // EXPORTS & MAIN
  // ================================================================
  
  module.exports = {
    predictSafeAddress,
    deploySafe,
    predictAndDeploy,
    batchPredict,
    findVanitySafe,
    verifySafe,
    // Configuration
    SAFE_IMPLEMENTATION_ADDRESS,
    PROXY_FACTORY_ADDRESS,
    customChain,
  };
  
  // Run CLI if this file is executed directly
  if (require.main === module) {
    cli().catch(console.error);
  }