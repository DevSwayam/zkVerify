
  // Working Safe Address Predictor for your factory
  // This uses the factory's own logic instead of trying to replicate CREATE2
  
  const {
    createPublicClient,
    http,
    encodeFunctionData,
    decodeAbiParameters,
    parseAbiParameters,
  } = require("viem");
  
  const SAFE_IMPLEMENTATION_ADDRESS = "0xb56ea8db3418a63326b69ef042c30cdeaa4df136";
  const PROXY_FACTORY_ADDRESS = "0x4af271648a3aabff5e7a0d9e411108131a3ca76b";
  
  const customChain = {
  "id": 845320009,
  "name": "Custom Chain",
  "network": "custom",
  "nativeCurrency": {
    "name": "Ether",
    "symbol": "ETH",
    "decimals": 18
  },
  "rpcUrls": {
    "default": {
      "http": [
        "https://horizen-rpc-testnet.appchain.base.org/"
      ]
    },
    "public": {
      "http": [
        "https://horizen-rpc-testnet.appchain.base.org/"
      ]
    }
  }
};
  const publicClient = createPublicClient({ chain: customChain, transport: http("https://horizen-rpc-testnet.appchain.base.org/") });
  
  async function predictSafeAddress(ownerAddress, saltNonce = BigInt(Date.now())) {
    console.log(`🔮 Predicting Safe address for ${ownerAddress}`);
    
    // Create setup calldata
    const setupCalldata = encodeFunctionData({
      abi: [{
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
      }],
      functionName: 'setup',
      args: [
        [ownerAddress], 
        1n, 
        "0x0000000000000000000000000000000000000000",
        "0x", 
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        0n, 
        "0x0000000000000000000000000000000000000000"
      ],
    });
    
    // Use factory's own logic via static call
    const staticCallResult = await publicClient.request({
      method: 'eth_call',
      params: [{
        to: PROXY_FACTORY_ADDRESS,
        data: encodeFunctionData({
          abi: [{
            "inputs": [
              {"internalType": "address", "name": "_mastercopy", "type": "address"},
              {"internalType": "bytes", "name": "initializer", "type": "bytes"},
              {"internalType": "uint256", "name": "saltNonce", "type": "uint256"}
            ],
            "name": "createProxyWithNonce",
            "outputs": [{"internalType": "address", "name": "proxy", "type": "address"}],
            "stateMutability": "nonpayable",
            "type": "function"
          }],
          functionName: 'createProxyWithNonce',
          args: [SAFE_IMPLEMENTATION_ADDRESS, setupCalldata, saltNonce]
        })
      }, 'latest']
    });
    
    if (staticCallResult && staticCallResult !== '0x') {
      const decodedResult = decodeAbiParameters(
        parseAbiParameters('address'),
        staticCallResult
      );
      
      const predictedAddress = decodedResult[0];
      console.log(`🎯 Predicted address: ${predictedAddress}`);
      
      return {
        predictedAddress,
        ownerAddress,
        saltNonce,
        setupCalldata
      };
    } else {
      throw new Error('Factory static call failed');
    }
  }
  
  // Usage example:
  // const prediction = await predictSafeAddress("0x1234...", 12345n);
  
  module.exports = { predictSafeAddress };
    