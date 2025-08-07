"use client";
import React, { useState, useEffect } from "react";
import {
  Check,
  ArrowRight,
  ExternalLink,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextGif, gifUrls } from "@/components/ui/text-gif";
import { BACKEND_URL, SITE } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  parseUnits,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  generateEphemeralPrivateKey,
  extractViewingPrivateKeyNode,
  generateKeysFromSignature,
  generateStealthPrivateKey,
} from "@fluidkey/stealth-account-kit";
import { useSignMessage, useWalletClient } from "wagmi";
import { privateKeyToAccount } from "viem/accounts";
import Safe from "@safe-global/protocol-kit";
import {
  buildSafeTransaction,
  predictSafeAddress,
  safeSignTypedData,
} from "@/lib/safe-utils";

const MULTICALL3_ADDRESS = "0xc8543454Fe30a94b160FD0D0185387EeB4b7ed0e";

const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
];

const SAFE_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    name: "execTransaction",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const USDC_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Fixed balance data type interface
interface BalanceData {
  address: string;
  balance: number;
  symbol: string;
  rawBalance: string;
  decimals: number;
  transactionHash?: string;
  stealthAddress?: string;
  nonce: number;
  safeAddress?: string;
  tokenAddress: string;
  isFunded: boolean;
}

const PaymentRedemptionUI = () => {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemingPayments, setRedeemingPayments] = useState(new Set<number>());
  const [redeemedPayments, setRedeemedPayments] = useState(new Set<number>());
  const [selectedPayments, setSelectedPayments] = useState(new Set<number>());
  const [balanceData, setBalanceData] = useState<BalanceData[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  const { username } = useParams();
  const { signMessageAsync } = useSignMessage();
  const { data: walletClient } = useWalletClient();
  const { logout } = usePrivy();

  useEffect(() => {
    if (username) {
      handleGetPayments();
    }
  }, [username]);

  // Address dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [pendingRedemption, setPendingRedemption] = useState<{
    type: "single" | "batch";
    index?: number;
  } | null>(null);

  const totalAmount = balanceData.reduce(
    (sum, payment) => sum + payment.balance,
    0
  );
  const availablePayments = balanceData.filter(
    (_, index) => !redeemedPayments.has(index)
  );
  const selectedAmount = balanceData
    .filter(
      (_, index) => selectedPayments.has(index) && !redeemedPayments.has(index)
    )
    .reduce((sum, payment) => sum + payment.balance, 0);

  // Address validation
  const validateAddress = (address: string) => {
    if (!address.trim()) {
      return "Address is required";
    }
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return "Invalid Ethereum address format";
    }
    return "";
  };

  const handlePaymentToggle = (index: number) => {
    if (redeemedPayments.has(index)) return;

    const newSelected = new Set(selectedPayments);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPayments(newSelected);
  };

  const handleSelectAll = () => {
    const availableIndices = balanceData
      .map((_, index) => index)
      .filter((index) => !redeemedPayments.has(index));

    if (selectedPayments.size === availableIndices.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(availableIndices));
    }
  };

  const handleRedeemSelected = async () => {
    if (selectedPayments.size === 0) return;

    // Open address dialog
    setPendingRedemption({ type: "batch" });
    setShowAddressDialog(true);
  };

  const handleRedeemSingle = async (index: number) => {
    // Open address dialog
    setPendingRedemption({ type: "single", index });
    setShowAddressDialog(true);
  };

  const confirmRedemption = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const error = validateAddress(recipientAddress);
    if (error) {
      setAddressError(error);
      return;
    }

    setShowAddressDialog(false);
    setAddressError("");

    if (pendingRedemption?.type === "batch") {
      await processBatchRedemption();
    } else if (
      pendingRedemption?.type === "single" &&
      pendingRedemption.index !== undefined
    ) {
      await processSingleRedemptionWithSponsorship(
        pendingRedemption.index,
        balanceData[pendingRedemption.index].nonce
      );
    }

    setPendingRedemption(null);
    setRecipientAddress("");
  };

  const processBatchRedemption = async () => {
    setIsRedeeming(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mark selected payments as redeemed
    const newRedeemed = new Set(redeemedPayments);
    selectedPayments.forEach((index) => newRedeemed.add(index));
    setRedeemedPayments(newRedeemed);
    setSelectedPayments(new Set());
    setIsRedeeming(false);
  };

  const generateInitialKeysOnClient = async (uniqueNonces: number[]) => {
    // STEP 1: Create a deterministic message for signing
    const message = "STEALTH_ADDRESS_GENERATION_BASE_SEPOLIAA";

    const signature = await signMessageAsync({ message });

    const keys = generateKeysFromSignature(signature);

    // STEP 5: Extract the viewing key node (used for address generation)
    const viewKeyNodeNumber = 0; // Use the first node
    const viewingPrivateKeyNode = extractViewingPrivateKeyNode(
      keys.viewingPrivateKey,
      viewKeyNodeNumber
    );

    const processedKeys = uniqueNonces.map((nonce) => {
      const ephemeralPrivateKey = generateEphemeralPrivateKey({
        viewingPrivateKeyNode: viewingPrivateKeyNode,
        nonce: BigInt(nonce.toString()), // convert to bigint
        chainId: 84532,
      });

      const ephemeralPrivateKeyRaw =
        ephemeralPrivateKey.ephemeralPrivateKey || ephemeralPrivateKey;

      let ephemeralPrivateKeyHex;
      if (
        (typeof ephemeralPrivateKeyRaw === "object" &&
          "byteLength" in ephemeralPrivateKeyRaw) ||
        (typeof Buffer !== "undefined" &&
          Buffer.isBuffer(ephemeralPrivateKeyRaw))
      ) {
        ephemeralPrivateKeyHex = Array.from(
          ephemeralPrivateKeyRaw as Uint8Array
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } else if (typeof ephemeralPrivateKeyRaw === "string") {
        ephemeralPrivateKeyHex = ephemeralPrivateKeyRaw.replace("0x", ""); // Remove 0x if present
      } else {
        // Handle other possible formats
        ephemeralPrivateKeyHex = String(ephemeralPrivateKeyRaw);
      }

      // Ensure it's in the correct format (0x prefixed hex string)
      const formattedEphemeralPrivateKey =
        `0x${ephemeralPrivateKeyHex}` as `0x${string}`;
      // Generate the ephemeral public key
      const ephemeralPublicKey = privateKeyToAccount(
        formattedEphemeralPrivateKey
      ).publicKey;

      // Generate spending private key for this nonce
      const spendingPrivateKey = generateStealthPrivateKey({
        spendingPrivateKey: keys.spendingPrivateKey,
        ephemeralPublicKey: ephemeralPublicKey,
      });

      // Handle the case where spendingPrivateKey might be an object, Uint8Array, or string
      const spendingPrivateKeyRaw =
        (spendingPrivateKey as { stealthPrivateKey?: string })
          .stealthPrivateKey ||
        (spendingPrivateKey as { privateKey?: string }).privateKey ||
        (spendingPrivateKey as { spendingPrivateKey?: string })
          .spendingPrivateKey ||
        (spendingPrivateKey as { key?: string }).key ||
        (spendingPrivateKey as { value?: string }).value ||
        spendingPrivateKey;

      let formattedSpendingPrivateKey;
      if (
        (typeof spendingPrivateKeyRaw === "object" &&
          "byteLength" in spendingPrivateKeyRaw) ||
        (typeof Buffer !== "undefined" &&
          Buffer.isBuffer(spendingPrivateKeyRaw))
      ) {
        const spendingPrivateKeyHex = Array.from(
          spendingPrivateKeyRaw as Uint8Array
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        formattedSpendingPrivateKey =
          `0x${spendingPrivateKeyHex}` as `0x${string}`;
      } else if (typeof spendingPrivateKeyRaw === "string") {
        const cleanHex = spendingPrivateKeyRaw.replace("0x", "");
        formattedSpendingPrivateKey = `0x${cleanHex}` as `0x${string}`;
      } else {
        // If we still have an object, try to find the actual key
        console.error(
          "Unable to extract private key from:",
          spendingPrivateKeyRaw
        );
        throw new Error(
          "Cannot extract private key from spendingPrivateKey object"
        );
      }

      return formattedSpendingPrivateKey;
    });

    return processedKeys;
  };

  // Add success notification component for better UX
  const SponsorshipSuccessNotification = ({ result }: { result: any }) => {
    return (
      <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-green-800 mb-1">
              🌟 Transaction Sponsored Successfully!
            </h4>
            <p className="text-sm text-green-700 mb-2">
              Your transaction was executed with sponsored gas fees.
            </p>
            <div className="text-xs text-green-600 space-y-1">
              <div>Gas Used: {result.gasUsed}</div>
              <div>
                Sponsor: {result.sponsorDetails.sponsorAddress.slice(0, 8)}...
              </div>
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 underline inline-flex items-center gap-1"
              >
                View Transaction <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add error handling component
  const SponsorshipErrorNotification = ({ error }: { error: string }) => {
    return (
      <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-red-800 mb-1">
              Gas Sponsorship Failed
            </h4>
            <p className="text-sm text-red-700 mb-2">{error}</p>
            <div className="text-xs text-red-600">
              Please try again or contact support if the issue persists.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const executeTransactionWithGasSponsorship = async (
    multicallData: any[],
    metadata: any = {}
  ) => {
    try {
      console.log("🌟 Requesting gas sponsorship for transaction...");
      console.log("📋 Multicall data:", {
        numberOfCalls: multicallData.length,
        calls: multicallData.map((call, index) => ({
          index: index + 1,
          target: call.target,
          allowFailure: call.allowFailure,
          dataLength: call.callData.length,
        })),
      });

      // Make request to gas sponsorship endpoint
      const response = await fetch(
        `${BACKEND_URL}/api/user/${username}/gas-sponsorship`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            multicallData,
            metadata: {
              ...metadata,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              requestId: `${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            },
          }),
        }
      );

      const result = await response.json();
      console.log("📄 Backend response:", result);

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Gas sponsorship request failed"
        );
      }

      if (!result.success) {
        throw new Error(
          result.message || "Gas sponsorship service returned failure"
        );
      }

      console.log("✅ Gas sponsored transaction completed successfully!");
      console.log("📊 Transaction details:", result);

      // Handle the backend response structure
      const txHash = result.data?.transactionHash || "pending";
      const explorerUrl =
        result.data?.executionDetails?.explorerUrl ||
        `https://sepolia.basescan.org/tx/${txHash}`;

      return {
        success: true,
        txHash: txHash,
        blockNumber: result.data?.blockNumber || 0,
        gasUsed: result.data?.gasUsed || "N/A",
        gasCost: result.data?.gasCost || "N/A",
        explorerUrl: explorerUrl,
        receipt: {
          status: "success",
          transactionHash: txHash,
          blockNumber: BigInt(result.data?.blockNumber || 0),
          gasUsed: BigInt(result.data?.gasUsed || 0),
        },
        sponsorDetails: {
          sponsorAddress: result.data?.sponsorAddress || "Unknown",
          chainId: result.data?.executionDetails?.chainId || 84532,
          chainName: result.data?.executionDetails?.chainName || "Base Sepolia",
        },
      };
    } catch (error) {
      console.error("❌ Gas sponsorship request failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Gas sponsorship failed: ${errorMessage}`);
    }
  };

  // API utility functions for other sponsorship endpoints
  const gasSponsorshipAPI = {
    // Get sponsor status
    getSponsorStatus: async () => {
      const response = await fetch(`${BACKEND_URL}/api/user/sponsor/status`);
      const result = await response.json();
      return result.data;
    },

    // Get supported operations
    getSupportedOperations: async () => {
      const response = await fetch(
        `${BACKEND_URL}/api/user/sponsor/operations`
      );
      const result = await response.json();
      return result.data;
    },

    // Execute sponsored transaction
    executeSponsored: executeTransactionWithGasSponsorship,
  };

  // Updated processSingleRedemption function with gas sponsorship
  const processSingleRedemptionWithSponsorship = async (
    index: number,
    nonce: number
  ) => {
    // Set this specific payment as redeeming
    setRedeemingPayments((prev) => new Set([...prev, index]));
    const payment = balanceData[index];

    try {
      console.log("🚀 Starting sponsored redemption process...");
      console.log("📋 Payment details:", payment);
      console.log("🔢 Nonce:", nonce);

      // Generate stealth private key (same as before)
      const keys = await generateInitialKeysOnClient([nonce]);
      const spendingPrivateKey = keys[0];
      const stealthAddress = privateKeyToAccount(spendingPrivateKey).address;

      console.log("🔐 Stealth address derived:", stealthAddress);

      // Predict Safe address (same as before)
      const predictedSafeAddress = await predictSafeAddress(stealthAddress);
      console.log("🏦 Predicted Safe address:", predictedSafeAddress);

      const predictedSafe = {
        safeAccountConfig: {
          owners: [stealthAddress],
          threshold: 1,
        },
        safeDeploymentConfig: {
          saltNonce: "0",
        },
      };
  
      const RPC_URL = "https://base-sepolia-rpc.publicnode.com";
  
      const protocolKit = await Safe.init({
        provider: RPC_URL,
        signer: stealthAddress,
        predictedSafe,
      });
  
      const deploymentTransaction =
        await protocolKit.createSafeDeploymentTransaction();
  
      console.log(
        "✅ Safe deployment transaction created",
        deploymentTransaction
      );

      // Create USDC transfer transaction (same as before)
      console.log("💸 Creating USDC transfer transaction from Safe...");

    // Create wallet client with spending private key
    const spendingWalletClient = createWalletClient({
      account: privateKeyToAccount(spendingPrivateKey as `0x${string}`),
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

      // Encode USDC transfer function data
      const transferData = encodeFunctionData({
        abi: [
          {
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            name: "transfer",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "transfer",
        args: [
          recipientAddress as `0x${string}`,
          parseUnits(payment.balance.toString(), payment.decimals),
        ],
      });

      // Build Safe transaction (same as before)
      const safeTransaction = buildSafeTransaction({
        to: payment.tokenAddress,
        value: "0",
        data: transferData,
        operation: 0,
        safeTxGas: "0",
        nonce: 0,
      });

      // Sign the Safe transaction with proper account type
      const account = privateKeyToAccount(spendingPrivateKey);
      const signature = await safeSignTypedData(
        spendingWalletClient as any,
        account,
        predictedSafeAddress as `0x${string}`,
        safeTransaction
      );

      console.log("✅ Safe transaction signed successfully");

      // Encode execTransaction call (same as before)
      const execTransactionData = encodeFunctionData({
        abi: SAFE_ABI,
        functionName: "execTransaction",
        args: [
          safeTransaction.to as `0x${string}`,
          BigInt(safeTransaction.value || "0"),
          safeTransaction.data as `0x${string}`,
          safeTransaction.operation,
          BigInt(safeTransaction.safeTxGas || "0"),
          BigInt(safeTransaction.baseGas || "0"),
          BigInt(safeTransaction.gasPrice || "0"),
          (safeTransaction.gasToken ||
            "0x0000000000000000000000000000000000000000") as `0x${string}`,
          (safeTransaction.refundReceiver ||
            "0x0000000000000000000000000000000000000000") as `0x${string}`,
          signature as `0x${string}`,
        ],
      });

      console.log("✅ execTransaction data encoded");

      // Prepare multicall data (same as before)
      const multicallData = [
        // Deploy Safe
        {
          target: deploymentTransaction.to,
          allowFailure: false,
          callData: deploymentTransaction.data,
        },
        // Execute USDC transfer from Safe
        {
          target: predictedSafeAddress,
          allowFailure: false,
          callData: execTransactionData,
        },
      ];

      // 🌟 NEW: Execute with gas sponsorship instead of direct wallet transaction
      console.log("🌟 Executing transaction with gas sponsorship...");

      const sponsorshipResult = await executeTransactionWithGasSponsorship(
        multicallData,
        {
          operationType: "payment_redemption",
          paymentIndex: index,
          nonce: nonce,
          stealthAddress: stealthAddress,
          safeAddress: predictedSafeAddress,
          recipientAddress: recipientAddress,
          tokenAddress: payment.tokenAddress,
          amount: payment.balance.toString(),
          symbol: payment.symbol,
        }
      );

      console.log("✅ Gas sponsored transaction completed successfully!");

      // Verify the transfer worked (enhanced with sponsorship details)
      console.log("🔍 Verifying USDC transfer results...");

      // Check recipient balance
      const recipientBalanceData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [recipientAddress as `0x${string}`],
      });

      const recipientBalanceResult = await publicClient.call({
        to: payment.tokenAddress as `0x${string}`,
        data: recipientBalanceData,
      });

      const recipientBalance = BigInt(recipientBalanceResult.data || "0x0");
      const recipientBalanceFormatted = (
        Number(recipientBalance) / Math.pow(10, payment.decimals)
      ).toFixed(2);

      console.log("✅ Gas sponsored transfer verification:", {
        recipient: recipientAddress,
        receivedAmount: `${recipientBalanceFormatted} ${payment.symbol}`,
        transactionHash: sponsorshipResult.txHash,
        explorerUrl: sponsorshipResult.explorerUrl,
        sponsorAddress: sponsorshipResult.sponsorDetails.sponsorAddress,
        gasUsed: sponsorshipResult.gasUsed,
        gasCost: sponsorshipResult.gasCost,
      });

      // Update UI state
      const newRedeemed = new Set(redeemedPayments);
      newRedeemed.add(index);
      setRedeemedPayments(newRedeemed);

      const newSelected = new Set(selectedPayments);
      newSelected.delete(index);
      setSelectedPayments(newSelected);

      // Remove from redeeming state
      setRedeemingPayments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });

      // 🎉 Enhanced success response with sponsorship details
      return {
        success: true,
        multicallData,
        deploymentTransaction,
        safeTransaction,
        signature,
        txHash: sponsorshipResult.txHash,
        gasUsed: sponsorshipResult.gasUsed,
        gasCost: sponsorshipResult.gasCost,
        explorerUrl: sponsorshipResult.explorerUrl,
        sponsorDetails: sponsorshipResult.sponsorDetails,
        summary: {
          stealthAddress,
          safeAddress: predictedSafeAddress,
          recipient: recipientAddress,
          multicallCalls: multicallData.length,
          executed: true,
          txHash: sponsorshipResult.txHash,
          recipientBalance: `${recipientBalanceFormatted} ${payment.symbol}`,
          sponsoredBy: sponsorshipResult.sponsorDetails.sponsorAddress,
          gasUsed: sponsorshipResult.gasUsed,
          explorerUrl: sponsorshipResult.explorerUrl,
        },
      };
    } catch (error) {
      console.error("❌ Sponsored redemption failed:", error);

      // Remove from redeeming state on error
      setRedeemingPayments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });

      throw error;
    }
  };

  const handleDialogClose = () => {
    setShowAddressDialog(false);
    setPendingRedemption(null);
    setRecipientAddress("");
    setAddressError("");
  };

  // Create viem client for Base Sepolia
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  // ERC20 ABI for balanceOf function
  const erc20Abi = parseAbi([
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ]);

  const checkTokenBalance = async (address: string, tokenAddress: string) => {
    try {
      // Get balance using publicClient
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });

      const decimals = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "decimals",
      });

      const symbol = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
      });

      // Convert balance to human readable format
      const balanceInDecimals = Number(balance) / Math.pow(10, decimals);

      console.log(`💰 Balance for ${address}:`, {
        token: symbol,
        balance: balanceInDecimals,
        rawBalance: balance.toString(),
        decimals,
      });

      return {
        symbol,
        balance: balanceInDecimals,
        rawBalance: balance.toString(),
        decimals,
      };
    } catch (error) {
      console.error(`❌ Error checking balance for ${address}:`, error);
      return null;
    }
  };

  const handleGetPayments = async () => {
    setIsLoadingBalances(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/user/${username}/funding-stats`
      );
      const data = await response.json();
      console.log(data);

      // Use fundedAddresses from API response
      if (data.error === "User not found") {
        logout();
        return;
      }
      const fundedAddresses = data.data.fundedAddresses || [];
      if (fundedAddresses.length === 0) {
        console.log("No funded addresses found.");
        setBalanceData([]);
        return;
      }

      // Check balances for all addresses (both funded and unfunded)
      const balanceResults: BalanceData[] = [];
      for (let i = 0; i < fundedAddresses.length; i++) {
        const funded = fundedAddresses[i];
        const fromAddress = funded.fromAddress;
        const safeAddress = funded.safeAddress;
        const tokenAddress = funded.tokenAddress;

        // Check fromAddress if it exists (funded addresses)
        if (fromAddress) {
          try {
            console.log(
              `Checking balance for from address ${i + 1}:`,
              fromAddress
            );
            const balance = await checkTokenBalance(safeAddress, tokenAddress);
            if (balance && Number(balance.balance) > 0) {
              balanceResults.push({
                address: fromAddress,
                balance: balance.balance,
                symbol: balance.symbol,
                rawBalance: balance.rawBalance,
                nonce: funded.nonce,
                decimals: balance.decimals,
                tokenAddress: tokenAddress,
                transactionHash: funded.transactionHash,
                stealthAddress: funded.stealthAddress,
                safeAddress: funded.safeAddress,
                isFunded: true,
              });
              console.log(`💰 Found funds in from address ${i + 1}:`, {
                address: fromAddress,
                balance: balance.balance,
                symbol: balance.symbol,
                transactionHash: funded.transactionHash,
              });
            }
          } catch (error) {
            console.error(`Error checking from address ${i + 1}:`, error);
          }
        }

        // Also check safeAddress for unfunded addresses
        if (!fromAddress && safeAddress) {
          try {
            console.log(
              `Checking balance for safe address ${i + 1} (unfunded):`,
              safeAddress
            );
            const balance = await checkTokenBalance(safeAddress, tokenAddress);
            if (balance && Number(balance.balance) > 0) {
              balanceResults.push({
                address: safeAddress,
                balance: balance.balance,
                symbol: balance.symbol,
                rawBalance: balance.rawBalance,
                decimals: balance.decimals,
                nonce: funded.nonce || 0, // Add default nonce
                tokenAddress: tokenAddress,
                transactionHash: funded.transactionHash,
                stealthAddress: funded.stealthAddress,
                safeAddress: funded.safeAddress,
                nonce: funded.nonce ,
                tokenAddress: tokenAddress,
                isFunded: false,
              });
              console.log(
                `💰 Found funds in safe address ${i + 1} (unfunded):`,
                {
                  address: safeAddress,
                  balance: balance.balance,
                  symbol: balance.symbol,
                }
              );
            }
          } catch (error) {
            console.error(`Error checking safe address ${i + 1}:`, error);
          }
        }
      }

      // Update the balance data state
      setBalanceData(balanceResults);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setBalanceData([]);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  return (
    <div className="bg-background flex justify-center p-6 pt-40">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TextGif
              gifUrl={gifUrls[0]}
              text={SITE.name}
              size="lg"
              weight="bold"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Withdraw your payments directly to your EOA on Base Sepolia
          </p>
        </div>

        {/* User Info */}
        <div className="bg-card  p-4 mb-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Connected as</p>
              <p className="font-medium text-foreground">{username}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Available</p>
              <p className="text-2xl font-bold text-primary">
                ${totalAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Batch Actions */}
        {availablePayments.length > 0 && (
          <div className="bg-card  p-4 mb-6 border">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isRedeeming}
                >
                  {selectedPayments.size === availablePayments.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedPayments.size} of {availablePayments.length} selected
                </span>
              </div>
              <div className="flex items-center gap-3">
                {selectedPayments.size > 0 && (
                  <span className="text-sm font-medium text-foreground">
                    ${selectedAmount.toLocaleString()} selected
                  </span>
                )}
                <Button
                  onClick={handleRedeemSelected}
                  disabled={selectedPayments.size === 0 || isRedeeming}
                  className="flex items-center gap-2"
                >
                  {isRedeeming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Withdrawing...
                    </>
                  ) : (
                    <>
                      <DollarSign size={16} />
                      Withdraw Selected
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoadingBalances && (
          <div className="space-y-4">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="p-4 border border-border bg-card animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full border-2 border-border bg-muted"></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-16 bg-muted rounded"></div>
                        <div className="h-5 w-12 bg-muted rounded"></div>
                      </div>
                      <div className="h-4 w-32 bg-muted rounded mt-1"></div>
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payments List */}
        <div className="space-y-4">
          {!isLoadingBalances &&
            balanceData.map((payment, index) => {
              const isRedeemed = redeemedPayments.has(index);
              const isSelected = selectedPayments.has(index);

              return (
                <div
                  key={index}
                  className={`p-4  border transition-all ${
                    isRedeemed
                      ? "border-green-200 bg-green-50/50"
                      : isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {!isRedeemed && (
                        <div
                          onClick={() => handlePaymentToggle(index)}
                          className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer grid place-items-center ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-border"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">
                            ${payment.balance.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground px-2 py-1 bg-muted">
                            {payment.symbol}
                          </span>
                          {isRedeemed && (
                            <span className="text-xs text-green-600 px-2 py-1 bg-green-100 font-medium">
                              Withdrawn
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {payment.isFunded && (
                            <>
                              From: {payment.address.slice(0, 6)}...
                              {payment.address.slice(-4)}
                              <a
                                href={`https://sepolia.basescan.org/address/${payment.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-primary hover:text-primary/80 inline-flex items-center gap-1"
                              >
                                <ExternalLink size={12} />
                              </a>
                              {payment.transactionHash && (
                                <>
                                  <span className="mx-2">•</span>
                                  TX: {payment.transactionHash.slice(0, 8)}...
                                  {payment.transactionHash.slice(-6)}
                                  <a
                                    href={`https://sepolia.basescan.org/tx/${payment.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-primary hover:text-primary/80 inline-flex items-center gap-1"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isRedeemed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRedeemSingle(index)}
                        disabled={redeemingPayments.has(index)}
                        className="flex items-center gap-2"
                      >
                        {redeemingPayments.has(index) ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        ) : (
                          <>
                            Withdraw
                            <ArrowRight size={14} />
                          </>
                        )}
                      </Button>
                    )}

                    {isRedeemed && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check size={16} />
                        <span className="text-sm font-medium">Complete</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Empty State */}
        {availablePayments.length === 0 && redeemedPayments.size > 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              All Payments Withdrawn!
            </h3>
            <p className="text-muted-foreground">
              You have successfully withdrawn all your payments.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          Secure • Fast • Reliable
        </div>
      </div>

      {/* Address Confirmation Dialog */}
      <AlertDialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Redemption Address
            </AlertDialogTitle>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="text-sm text-amber-800 font-medium mb-1">
                  ⚠️ Important Warning
                </div>
                <div className="text-sm text-amber-700">
                  Funds will be transferred to the address you specify below.
                  This action cannot be undone. Please double-check the address
                  before confirming.
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Recipient Address (EOA on Base Sepolia)
                </label>
                <Input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => {
                    setRecipientAddress(e.target.value);
                    setAddressError("");
                  }}
                  placeholder="0x..."
                />
                {addressError && (
                  <div className="text-sm text-red-600 mt-1">
                    {addressError}
                  </div>
                )}
              </div>

              {pendingRedemption && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-800 font-medium">
                    {pendingRedemption.type === "batch"
                      ? `Withdrawing ${
                          selectedPayments.size
                        } payments totaling $${selectedAmount.toLocaleString()}`
                      : `Withdrawing payment of $${balanceData[
                          pendingRedemption.index!
                        ]?.balance.toLocaleString()}`}
                  </div>
                </div>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDialogClose}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                confirmRedemption(e)
              }
              className="bg-primary hover:bg-primary/90"
            >
              Confirm Redemption
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentRedemptionUI;
