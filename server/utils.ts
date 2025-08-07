import {
    createPublicClient,
    createWalletClient,
    http,
    encodeFunctionData,
  } from "viem";
  import { defineChain } from "viem";
  import Safe from "@safe-global/protocol-kit";
  
// Define Horizen Testnet chain
export const horizenTestnet = defineChain({
  id: 845320009,
  name: 'Horizen Testnet',
  network: 'horizen-testnet',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://horizen-rpc-testnet.appchain.base.org'] } },
  blockExplorers: { default: { name: 'Horizen Explorer', url: 'https://horizen-explorer-testnet.appchain.base.org/' } },
});
  
  // Create public client for reading blockchain data
  export const publicClient = createPublicClient({
  chain: horizenTestnet,
  transport: http("https://horizen-rpc-testnet.appchain.base.org"),
  });
  
  // Helper function to build Safe transaction
  export const buildSafeTransaction = (txData) => {
    return {
      to: txData.to,
      value: txData.value || "0",
      data: txData.data || "0x",
      operation: txData.operation || 0,
      safeTxGas: txData.safeTxGas || "0",
      baseGas: txData.baseGas || "0",
      gasPrice: txData.gasPrice || "0",
      gasToken: txData.gasToken || "0x0000000000000000000000000000000000000000",
      refundReceiver:
        txData.refundReceiver || "0x0000000000000000000000000000000000000000",
      nonce: txData.nonce || 0,
    };
  };
  
  // Helper function to sign typed data
  export const safeSignTypedData = async (
    walletClient,
    account,
    safeAddress,
    safeTx
  ) => {
      const domain = {
    chainId: 845320009,
    verifyingContract: safeAddress,
  };
  
    const types = {
      SafeTx: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "data" },
        { type: "uint8", name: "operation" },
        { type: "uint256", name: "safeTxGas" },
        { type: "uint256", name: "baseGas" },
        { type: "uint256", name: "gasPrice" },
        { type: "address", name: "gasToken" },
        { type: "address", name: "refundReceiver" },
        { type: "uint256", name: "nonce" },
      ],
    };
  
    const message = {
      to: safeTx.to,
      value: safeTx.value.toString(),
      data: safeTx.data,
      operation: safeTx.operation,
      safeTxGas: safeTx.safeTxGas.toString(),
      baseGas: safeTx.baseGas.toString(),
      gasPrice: safeTx.gasPrice.toString(),
      gasToken: safeTx.gasToken,
      refundReceiver: safeTx.refundReceiver,
      nonce: Number(safeTx.nonce),
    };
  
    return await walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: "SafeTx",
      message,
    });
  };
  
// Predict safe address using Safe Protocol Kit
  export const predictSafeAddress = async (stealthAddress) => {
    try {
    // Use Safe Protocol Kit's built-in prediction functionality
      const predictedSafe = {
        safeAccountConfig: {
          owners: [stealthAddress],
          threshold: 1,
        },
        safeDeploymentConfig: {
          saltNonce: "0",
        },
      };
  
    // Safe Protocol Kit handles all contract addresses automatically
      const protocolKit = await Safe.init({
      provider: "https://horizen-rpc-testnet.appchain.base.org",
        predictedSafe,
      });
  
      return await protocolKit.getAddress();
    } catch (error) {
      console.error("Error predicting safe address:", error);
      throw error;
    }
  };