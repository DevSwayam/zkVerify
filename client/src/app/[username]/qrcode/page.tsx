"use client";
import { useParams } from "next/navigation";

import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  Copy,
  ChevronDown,
  ChevronsUpDown,
  // ExternalLink,
} from "lucide-react";
// import { useRouter } from "next/navigation";

import { useNetworks } from "@/hooks/useNetworks";
import { BACKEND_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const Page = () => {
  const { username } = useParams();
  const { data: networks } = useNetworks();
  // const router = useRouter();
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStealthAddressCopied, setIsStealthAddressCopied] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrData, setQrData] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentNetwork = networks?.data.find(
    (network) => network.name === "Base Sepolia"
  );

  const getStealthAddress = async (tokenAddress: string) => {
    const stealthAddresses: string[] = [];
    const safeAddresses: string[] = [];
    const stealthResponsesData: Record<string, unknown>[] = [];

    // Use the username parameter from URL
    const usernameStr = username as string;

    // Debug: Log the credentials
    console.log("🔐 API Request Info:", { username: usernameStr });

    // No authentication headers needed for stealth generation (public endpoint)
    const headers = {
      "Content-Type": "application/json",
    };

    const count = 1;
    for (let i = 0; i < count; i++) {
      console.log(
        `  📍 Generating stealth address ${i + 1}/${count} via server...`
      );

      const stealthRequest = {
        chainId: currentNetwork?.chainId,
        tokenAddress: tokenAddress,
        tokenAmount: (50 + i * 5).toString(),
      };

      // Debug: Log the request details - Use new API structure
      console.log(
        "📤 Request URL:",
        `${BACKEND_URL}/api/user/${usernameStr}/stealth`
      );
      console.log("📤 Request Headers:", headers);
      console.log("📤 Request Body:", stealthRequest);

      try {
        const stealthResponse = await fetch(
          `${BACKEND_URL}/api/user/${usernameStr}/stealth`, // Updated endpoint
          {
            method: "POST",
            headers,
            body: JSON.stringify(stealthRequest),
          }
        );

        // Debug: Log response status
        console.log("📥 Response Status:", stealthResponse.status);
        console.log("📥 Response OK:", stealthResponse.ok);

        if (!stealthResponse.ok) {
          const errorText = await stealthResponse.text();
          console.error("❌ HTTP Error Response:", errorText);
          throw new Error(`HTTP ${stealthResponse.status}: ${errorText}`);
        }

        const stealthResponseData = await stealthResponse.json();
        console.log("📥 Response Data:", stealthResponseData);

        const stealthData = stealthResponseData.data;
        stealthAddresses.push(stealthData.address);
        safeAddresses.push(stealthData.safeAddress.address);

        // Store payment ID for polling
        setPaymentId(stealthData.paymentId);

        // Get the current nonce from server - Use new API structure
        const nonceResponse = await fetch(
          `${BACKEND_URL}/api/user/${usernameStr}/nonce`, // Updated endpoint
          { headers: { "Content-Type": "application/json" } } // Simplified headers
        );

        if (!nonceResponse.ok) {
          const errorText = await nonceResponse.text();
          console.error("❌ Nonce HTTP Error Response:", errorText);
          throw new Error(`Nonce HTTP ${nonceResponse.status}: ${errorText}`);
        }

        const nonceResponseData = await nonceResponse.json();
        const currentNonce = nonceResponseData.data.currentNonce;
        const usedNonce = currentNonce - 1;

        stealthResponsesData.push({
          ...stealthData,
          usedNonce: usedNonce,
          currentNonce: currentNonce,
        });
      } catch (error) {
        console.error(
          `    ❌ Failed to generate stealth address ${i + 1}:`,
          error instanceof Error ? error.message : String(error)
        );

        // Additional debugging for network errors
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          console.error("🌐 Network Error Details:");
          console.error("- Check if the server is running");
          console.error("- Check CORS settings");
          console.error("- Check network connectivity");
          console.error(
            "- Server URL:",
            `${BACKEND_URL}/api/user/${usernameStr}/stealth`
          );
        }

        throw error;
      }
    }

    console.log(`✅ Generated all ${count} stealth addresses via SERVER API`);
    console.log("📊 Server-generated data:");
    console.log(`  - Stealth Addresses: ${stealthAddresses.length}`);
    console.log(`  - Safe Addresses: ${safeAddresses.length}`);
    console.log("📋 First 3 stealth addresses:");
    for (let i = 0; i < Math.min(3, stealthAddresses.length); i++) {
      console.log(`  ${i + 1}. ${stealthAddresses[i]}`);
    }
    console.log("📋 First 3 Safe addresses:");
    for (let i = 0; i < Math.min(3, safeAddresses.length); i++) {
      console.log(`  ${i + 1}. ${safeAddresses[i]}`);
    }
    console.log("safeAddresses", safeAddresses);
    return safeAddresses[0];
  };

  const generateQRCode = (text: string) => {
    // Using QR Server API for simplicity
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      text
    )}`;
    return qrUrl;
  };

  const copyStealthAddressToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsStealthAddressCopied(true);

      // Reset to copy icon after 3 seconds
      setTimeout(() => {
        setIsStealthAddressCopied(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/user/payment/${paymentId}/status`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      console.log("📊 Payment Status:", data);

      if (data.success && data.data) {
        const status = data.data.status || "pending";
        setPaymentStatus(status);
        console.log("🔄 Payment status updated to:", status);

        // Stop polling if payment is completed or failed
        if (status === "completed" || status === "failed") {
          console.log("🛑 Stopping polling - payment status:", status);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            console.log("✅ Polling stopped successfully");
          }
        }
      }
    } catch (error) {
      console.error("❌ Error checking payment status:", error);
    }
  };

  const startPaymentPolling = (paymentId: string) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log("🚀 Starting payment polling for payment ID:", paymentId);

    // Start polling every 1 second
    const interval = setInterval(() => {
      checkPaymentStatus(paymentId);
    }, 1000);

    pollingIntervalRef.current = interval;
  };

  const stopPaymentPolling = () => {
    if (pollingIntervalRef.current) {
      console.log("🛑 Manually stopping payment polling");
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleGenerateQRCode = async () => {
    if (!currentNetwork || !selectedToken) return;

    try {
      setIsLoading(true);
      setError(null);

      // Generate stealth address with selected token
      const address = await getStealthAddress(selectedToken);

      // Find selected token details
      const tokenDetails = currentNetwork.tokens.find(
        (token) => token.address === selectedToken
      );

      // Create JSON payload for QR code
      const paymentData = {
        network: {
          name: currentNetwork.name,
          chainId: currentNetwork.chainId,
          rpcUrl: currentNetwork.rpcUrl,
        },
        token: {
          symbol: tokenDetails?.symbol,
          name: tokenDetails?.name,
          address: selectedToken,
        },
        stealthAddress: address,
        recipient: username,
        amount: "50.00", // You can make this dynamic later
      };

      const qrDataString = JSON.stringify(paymentData);
      setQrData(qrDataString);

      const qrUrl = generateQRCode(qrDataString);
      setQrCodeUrl(qrUrl);
      setShowQRCode(true);
    } catch (err) {
      setError("Failed to generate payment address");
      console.error("Error generating stealth address:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Set default token when network loads
  useEffect(() => {
    if (currentNetwork && currentNetwork.tokens.length > 0 && !selectedToken) {
      setSelectedToken(currentNetwork.tokens[0].address);
    }
  }, [currentNetwork, selectedToken]);

  // Start polling when QR code is shown and payment ID is available
  useEffect(() => {
    if (showQRCode && paymentId) {
      startPaymentPolling(paymentId);

      // Cleanup polling on unmount or when QR code is hidden
      return () => {
        stopPaymentPolling();
      };
    } else if (!showQRCode) {
      // Stop polling when QR code is hidden
      stopPaymentPolling();
    }
  }, [showQRCode, paymentId]);

  // Cleanup polling when component unmounts
  useEffect(() => {
    return () => {
      stopPaymentPolling();
    };
  }, []);

  if (!networks) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading networks...</p>
        </div>
      </div>
    );
  }

  if (!showQRCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-foreground mb-2">
              Payment Setup
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure payment for @{username}
            </p>
          </div>

          {/* Network Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Network
            </label>
            <div className="relative">
              <select
                disabled
                value={currentNetwork?.name || ""}
                className="w-full p-3 bg-muted border border-border rounded-lg text-foreground appearance-none cursor-not-allowed opacity-60"
              >
                <option value={currentNetwork?.name}>
                  {currentNetwork?.name}
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Network selection is currently locked to Base Sepolia
            </p>
          </div>

          {/* Token Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-2">
              Token
            </label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-12 px-3 bg-background border border-border text-foreground"
                >
                  {selectedToken
                    ? currentNetwork?.tokens.find(
                        (token) => token.address === selectedToken
                      )?.symbol +
                      " - " +
                      currentNetwork?.tokens.find(
                        (token) => token.address === selectedToken
                      )?.name
                    : "Select a token..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[384px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search tokens..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                  <CommandList>
                    <CommandGroup>
                      {currentNetwork?.tokens
                        ?.filter((token) => {
                          if (!searchValue) return true;
                          return (
                            token.name
                              .toLowerCase()
                              .includes(searchValue.toLowerCase()) ||
                            token.symbol
                              .toLowerCase()
                              .includes(searchValue.toLowerCase())
                          );
                        })
                        .map((token) => (
                          <CommandItem
                            key={token.address}
                            onClick={() => {
                              setSelectedToken(
                                token.address === selectedToken
                                  ? ""
                                  : token.address
                              );
                              setOpen(false);
                              setSearchValue("");
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {token.symbol}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {token.name}
                                </span>
                              </div>
                              <Check
                                className={`ml-auto h-4 w-4 ${
                                  selectedToken === token.address
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                            </div>
                          </CommandItem>
                        ))}
                      {currentNetwork?.tokens?.filter((token) => {
                        if (!searchValue) return false;
                        return !(
                          token.name
                            .toLowerCase()
                            .includes(searchValue.toLowerCase()) ||
                          token.symbol
                            .toLowerCase()
                            .includes(searchValue.toLowerCase())
                        );
                      }).length === (currentNetwork?.tokens?.length || 0) &&
                        searchValue && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No token found.
                          </div>
                        )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateQRCode}
            disabled={!selectedToken || isLoading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                Generating...
              </div>
            ) : (
              "Generate Payment QR Code"
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-foreground mb-2">
            Scan to Pay
          </h1>
          <p className="text-sm text-muted-foreground">
            Send payment to @{username}
          </p>
        </div>

        {/* QR Code Section */}
        <div className="bg-muted border p-10 border-border mb-6 text-center">
          {qrCodeUrl && (
            <img
              src={qrCodeUrl}
              alt="Payment QR Code"
              className="mx-auto mb-4"
              style={{
                //    filter: 'contrast(100) brightness(0) invert(1)',
                mixBlendMode: "multiply",
              }}
            />
          )}

          {/* Payment Details */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Token</p>
            <p className="text-lg font-semibold text-foreground">
              {currentNetwork?.tokens.find(
                (token) => token.address === selectedToken
              )?.symbol || "Token"}
            </p>
          </div>
        </div>

        <div className="bg-muted p-4 border border-border mb-6">
          <p className="text-xs text-muted-foreground mb-1">Stealth Address</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-mono text-foreground truncate">
              {JSON.parse(qrData).stealthAddress}
            </p>
            <button
              onClick={() =>
                copyStealthAddressToClipboard(JSON.parse(qrData).stealthAddress)
              }
              className="p-2 bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors"
              title={
                isStealthAddressCopied ? "Copied!" : "Copy stealth address"
              }
            >
              {isStealthAddressCopied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="text-center">
          {paymentStatus === "completed" ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Payment completed
              </div>
              {/* <div className="mt-4">
                <button
                  onClick={() => router.push(`/${username}/safes`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Safes
                </button>
              </div> */}
            </div>
          ) : paymentStatus === "failed" ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Payment failed
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              Waiting for payment
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => setShowQRCode(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to setup
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          Secure • Fast • Reliable
        </div>
      </div>
    </div>
  );
};

export default Page;
