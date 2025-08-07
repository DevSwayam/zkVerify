import { createPublicClient, http } from "viem";
// REMOVE: import { baseSepolia } from "viem/chains";
// Instead, define the Horizen Testnet chain inline or import if available
import Safe from "@safe-global/protocol-kit";

// Create public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: {
    id: 845320009,
    name: "Horizen Testnet",
    network: "horizen-testnet",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://horizen-rpc-testnet.appchain.base.org"] } },
    blockExplorers: { default: { name: "Horizen Explorer", url: "https://horizen-explorer-testnet.appchain.base.org/" } },
  },
  transport: http("https://horizen-rpc-testnet.appchain.base.org"),
});

// Helper function to build Safe transaction
export const buildSafeTransaction = (txData: {
  to: string;
  value?: string;
  data?: string;
  operation?: number;
  safeTxGas?: string;
  baseGas?: string;
  gasPrice?: string;
  gasToken?: string;
  refundReceiver?: string;
  nonce?: number;
}) => {
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
  walletClient: {
    signTypedData: (params: {
      account: { address: string };
      domain: { chainId: number; verifyingContract: string };
      types: Record<string, Array<{ type: string; name: string }>>;
      primaryType: string;
      message: Record<string, string | number>;
    }) => Promise<string>;
  },
  account: { address: string },
  safeAddress: string,
  safeTx: {
    to: string;
    value: string;
    data: string;
    operation: number;
    safeTxGas: string;
    baseGas: string;
    gasPrice: string;
    gasToken: string;
    refundReceiver: string;
    nonce: number;
  }
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

// Predict safe address based on stealth address
export async function predictSafeAddress(stealthAddress: string) {
  try {
    console.log("🔍 Predicting Safe address using Protocol Kit for:", stealthAddress);

    // Use Safe Protocol Kit's built-in prediction - no manual contract addresses needed
    const predictedSafe = {
      safeAccountConfig: {
        owners: [stealthAddress],
        threshold: 1,
      },
      safeDeploymentConfig: {
        saltNonce: "0",
      },
    };

    // Safe Protocol Kit automatically handles all contract addresses for Horizen Testnet
    const protocolKit = await Safe.init({
      provider: "https://horizen-rpc-testnet.appchain.base.org",
      predictedSafe,
    });

    const predictedAddress = await protocolKit.getAddress();
    console.log("✅ Safe address predicted successfully:", predictedAddress);
    
    return predictedAddress;
  } catch (error) {
    console.error("❌ Error predicting safe address:", error);
    throw error;
  }
}