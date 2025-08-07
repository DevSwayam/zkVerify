"use client";
import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Code,
  Globe,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MerchantDashboard = () => {
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [merchantData, setMerchantData] = useState({
    username: "your-store-name",
    email: "merchant@example.com",
    apiKey: "sk_test_1234567890abcdef",
    isLive: false,
  });

  // In a real app, you'd fetch this from your authentication system
  useEffect(() => {
    // Simulate fetching merchant data
    const storedMerchant = localStorage.getItem("merchantData");
    if (storedMerchant) {
      setMerchantData(JSON.parse(storedMerchant));
    }
  }, []);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(type);
      setTimeout(() => setIsCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const basicIntegrationCode = `<!-- Add this div where you want the payment widget -->
<div id="crypto-payment" 
     data-noname-payment 
     data-merchant="${merchantData.username}"
     data-amount="99.99"
     data-product="Your Product Name"
     data-description="Product description"></div>

<!-- Include the NoName payment widget script -->
<script src="https://cdn.noname.com/widget/v1/merchant-widget.js"></script>

<!-- Listen for successful payments -->
<script>
document.addEventListener('noname-payment-success', (event) => {
    const { amount, token, stealthData } = event.detail;
    console.log('Payment received:', amount, token.symbol);
    
    // Your success logic here
    alert('Payment successful! Order confirmed.');
    window.location.href = '/order-success';
});
</script>`;

  const customIntegrationCode = `<div id="custom-payment-widget"></div>

<script src="https://cdn.noname.com/widget/v1/merchant-widget.js"></script>
<script>
// Custom widget with your branding
const widget = new NoNamePaymentWidget({
    merchantUsername: '${merchantData.username}',
    defaultAmount: '149.99',
    productName: 'Your Product',
    
    // Customize to match your brand
    theme: {
        primaryColor: '#your-brand-color',
        borderRadius: '8px',
        fontFamily: 'your-font'
    }
});

widget.renderIn('custom-payment-widget');

// Handle payment success
document.addEventListener('noname-payment-success', (event) => {
    // Send to your backend
    fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount: event.detail.amount,
            currency: event.detail.token.symbol,
            paymentAddress: event.detail.stealthData.address
        })
    });
});
</script>`;

  const testPaymentUrl = `${window.location.origin}/${merchantData.username}/qrcode`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome to NoName Payments
              </h1>
              <p className="text-gray-600 mt-1">
                Start accepting crypto payments in minutes
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div
                  className={`w-2 h-2 rounded-full ${
                    merchantData.isLive ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
                {merchantData.isLive ? "Live Mode" : "Test Mode"}
              </div>
              <p className="font-mono text-sm text-gray-700">
                @{merchantData.username}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Stats */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Payment URL */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Your Payment URL
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <code className="text-sm text-gray-700 break-all">
                    {testPaymentUrl}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(testPaymentUrl, "url")}
                    className="flex items-center gap-1"
                  >
                    {isCopied === "url" ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {isCopied === "url" ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.open(testPaymentUrl, "_blank")}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Test
                  </Button>
                </div>
              </div>

              {/* API Key */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-3">API Key</h3>
                <div className="bg-gray-50 rounded-lg p-3 mb-3 truncate text-sm font-mono text-muted-foreground">
                  {merchantData.apiKey}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(merchantData.apiKey, "apikey")}
                  className="flex items-center gap-1"
                >
                  {isCopied === "apikey" ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {isCopied === "apikey" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>

          {/* Integration Code */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Integration */}
            <div
              id="basic-integration"
              className="bg-white rounded-lg shadow-sm border"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      Quick Start Integration
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Copy and paste this code into your website
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      copyToClipboard(basicIntegrationCode, "basic")
                    }
                    className="flex items-center gap-2"
                  >
                    {isCopied === "basic" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {isCopied === "basic" ? "Copied!" : "Copy Code"}
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm">
                    <code>{basicIntegrationCode}</code>
                  </pre>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    ✨ What this does:
                  </h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>
                      • Creates a &quot;Pay with Crypto&quot; button on your website
                    </li>
                    <li>• Automatically generates unique payment addresses</li>
                    <li>• Shows QR codes for easy mobile payments</li>
                    <li>• Handles payment confirmations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Custom Integration */}
            <div
              id="custom-integration"
              className="bg-white rounded-lg shadow-sm border"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Custom Integration
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Advanced customization with your branding
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(customIntegrationCode, "custom")
                    }
                    className="flex items-center gap-2"
                  >
                    {isCopied === "custom" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {isCopied === "custom" ? "Copied!" : "Copy Code"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Test Instructions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🧪 Test Your Integration
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Add the code to your website
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Copy the integration code above and paste it into your
                      HTML
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Test with the direct URL
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Visit{" "}
                      <code className="bg-gray-100 px-1 rounded">
                        /{merchantData.username}/qrcode
                      </code>{" "}
                      to test payment generation
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Make a test payment
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Use testnet tokens to verify the payment flow works
                      correctly
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Go live!</h4>
                    <p className="text-gray-600 text-sm">
                      Once testing is complete, you&apos;re ready to accept real
                      payments
                    </p>
                  </div>
                </div>
              </div>
            </div>

        
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;
