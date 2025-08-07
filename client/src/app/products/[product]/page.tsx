"use client";
import React, { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useParams } from "next/navigation";
import axios from "axios";
import { useNetworks } from "@/hooks/useNetworks";
import { BACKEND_URL } from "@/lib/constants";

const ProductBuyPage = () => {
  const [selectedPayment, setSelectedPayment] = useState("USDC");
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: networks } = useNetworks();
  const seiNetwork = networks?.data.find(
    (network) => network.name === "Sei Testnet"
  );
  const { product } = useParams();

  const paymentOptions = [
    {
      token: "USDC",
      name: "USD Coin",
      amount: 150.0,
      logo: "/tokens/usdc.png",
    },
    {
      token: "USDT",
      name: "Tether USD",
      amount: 150.0,
      logo: "/tokens/usdt.png",
    },
  ];

  const handlePaymentToggle = (token: string) => {
    setSelectedPayment(token);
  };

  const handleBuyNow = async () => {
    setIsProcessing(true);

    const stealthAddresses: string[] = [];
    const safeAddresses: string[] = [];
    const stealthResponsesData: Record<string, unknown>[] = [];

    // Use the product parameter from URL as username
    const username = product as string;

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
        chainId: seiNetwork?.chainId,
        tokenAddress: seiNetwork?.tokens[0].address,
        tokenAmount: (50 + i * 5).toString(),
      };

      try {
        const stealthResponse = await axios.post(
          `${BACKEND_URL}/api/user/${username}/stealth`, // Updated endpoint
          stealthRequest,
          { headers }
        );

        const stealthData = stealthResponse.data.data;
        stealthAddresses.push(stealthData.address);
        safeAddresses.push(stealthData.safeAddress.address);

        // Get the current nonce from server
        const nonceResponse = await axios.get(
          `${BACKEND_URL}/api/user/${username}/nonce`, // Updated endpoint
          { headers: { "Content-Type": "application/json" } }
        );
        const currentNonce = nonceResponse.data.data.currentNonce;
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

    console.log({ stealthAddresses, safeAddresses, stealthResponsesData });

    // const tx = await writeContractAsync({
    //   address: seiNetwork?.tokens[0].address,
    //   abi: seiNetwork?.tokens[0].abi,
    //   functionName: "transfer",
    //   args: [safeAddresses[0], 1000000000000000000],
    // });
    // console.log(tx);

    // const receipt = await publicClient?.waitForTransactionReceipt({
    //   hash: tx,
    // });
    // console.log(receipt);

    // if (receipt?.status === "success") {
    //   console.log("Payment successful!");
    //   setIsProcessing(false);
    // } else {
    //   alert("Payment failed!");
    // }

    setIsProcessing(false);
  };

  const selectedOption = paymentOptions.find(
    (p) => p.token === selectedPayment
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mb-4">
            <Image
              src="/nike-air-max.png"
              alt="Nike Air Max 270 React"
              width={250}
              height={50}
              className="mx-auto rounded-lg"
            />
          </div>
          <h1 className="text-lg font-bold text-foreground mb-1">
            Nike Air Max 270 React
          </h1>
          <p className="text-sm text-muted-foreground">
            Premium comfort with innovative cushioning technology
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Payment Methods */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Select Payment Method
            </label>
            <div className="space-y-2">
              {paymentOptions.map((option) => (
                <div
                  key={option.token}
                  onClick={() => handlePaymentToggle(option.token)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPayment === option.token
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <Image
                          src={option.logo}
                          alt={option.token}
                          width={16}
                          height={16}
                        />
                        {option.token}
                      </div>
                      <div className="text-md text-primary mt-1">
                        Pay{" "}
                        <span className="font-semibold">
                          {option.amount.toFixed(2)} {option.token}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 transition-all grid place-items-center ${
                        selectedPayment === option.token
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {selectedPayment === option.token && (
                        <Check className="w-2 h-2 text-primary-foreground m-auto" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buy Button */}
          <Button
            disabled={isProcessing}
            onClick={handleBuyNow}
            className="w-full h-11 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                Buy Now - {selectedOption?.amount.toFixed(2)} {selectedPayment}
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          Secure • Fast • Reliable
        </div>
      </div>
    </div>
  );
};

export default ProductBuyPage;
