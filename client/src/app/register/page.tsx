"use client";
import React from "react";
import { Check, ArrowRight, LogOutIcon } from "lucide-react";
import { gifUrls, TextGif } from "@/components/ui/text-gif";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRegisterForm } from "@/hooks/useRegisterForm";
import Image from "next/image";
import { SITE } from "@/lib/constants";
// import { AuthGuard } from "@/components/auth-guard";
// import axios from "axios";
// import { registrationResponse } from "@/lib/utils";

const RegisterPage = () => {
  const {
    formData,
    selectedTokens,
    tokens,
    currentNetwork,
    validateUsername,
    validateWebsiteUri,
    handleInputChange,
    handleTokenToggle,
    handleWalletTypeChange,
    isFormValid,
    handleSubmit,
    registrationResult,
    setRegistrationResult,
    // Authentication states
    authenticated,
    ready,
    isLoggingIn,
  } = useRegisterForm();

  // Show success message if registration completed
  if (registrationResult) {
    const isMerchant = registrationResult.data.user.apiKey;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Registration Successful!
            </h1>
            <p className="text-sm text-muted-foreground">
              Your {isMerchant ? "merchant" : "personal"} wallet has been
              created
            </p>
          </div>

          {/* Registration Details */}
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="text-sm font-mono text-foreground">
                    {registrationResult.data.user.username}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground">
                    {registrationResult.data.user.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Test Stealth Address
                  </p>
                  <p className="text-xs font-mono text-foreground break-all">
                    {registrationResult.data.testStealthAddress?.address}
                  </p>
                </div>

                {isMerchant && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">API Key</p>
                      <p className="text-xs font-mono text-foreground break-all">
                        {registrationResult.data.user.apiKey}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        API Endpoint
                      </p>
                      <p className="text-xs font-mono text-foreground">
                        /api/user/{registrationResult.data.user.username}
                        /stealth
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isMerchant && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  🎉 Merchant Access Granted
                </h3>
                <p className="text-xs text-blue-700">
                  You now have API access! Use your API key for profile
                  management. Anyone can generate stealth addresses for your
                  username without authentication.
                </p>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-900 mb-2">
                ✅ Setup Complete
              </h3>
              <p className="text-xs text-green-700">
                Your stealth address generation is working! Test stealth address
                generated successfully.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {isMerchant ? (
                <Link href="/merchant/dashboard">
                  <Button className="w-full">
                    Access Merchant Dashboard
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link href={`/${registrationResult.data.user.username}/qrcode`}>
                  <Button className="w-full">
                    Generate Payment QR Code
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setRegistrationResult(null)}
              >
                Register Another Wallet
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (

      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <TextGif
              gifUrl={gifUrls[0]}
              text={SITE.name}
              size="lg"
              weight="bold"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Create your wallet account
            </p>
            <Link href="/" className="text-sm text-primary mt-2 block">
              ← Back to home
            </Link>
          </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Wallet Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Wallet Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => handleWalletTypeChange("personal")}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  formData.walletType === "personal"
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Personal</div>
                    <div className="text-sm text-muted-foreground">
                      For personal use
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all grid place-items-center ${
                      formData.walletType === "personal"
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}
                  >
                    {formData.walletType === "personal" && (
                      <Check className="w-2 h-2 text-primary-foreground m-auto" />
                    )}
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleWalletTypeChange("merchant")}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  formData.walletType === "merchant"
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Merchant</div>
                    <div className="text-sm text-muted-foreground">
                      Get API access
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all grid place-items-center ${
                      formData.walletType === "merchant"
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}
                  >
                    {formData.walletType === "merchant" && (
                      <Check className="w-2 h-2 text-primary-foreground m-auto" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Username
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Enter username (3-10 chars, alphanumeric)"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className="text-lg h-12"
                maxLength={10}
              />
              {formData.username && validateUsername(formData.username) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check size={12} className="text-primary-foreground" />
                </div>
              )}
            </div>
            {formData.username && !validateUsername(formData.username) && (
              <p className="text-xs text-red-500">
                Username must be 3-10 characters, alphanumeric only
              </p>
            )}
          </div>

          {/* Website URI - Only show for merchant */}
          {formData.walletType === "merchant" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Website URI <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="https://...."
                  value={formData.websiteUri}
                  onChange={(e) =>
                    handleInputChange("websiteUri", e.target.value)
                  }
                  className="text-lg h-12"
                />
                {formData.websiteUri &&
                  validateWebsiteUri(formData.websiteUri) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
              </div>
              {formData.websiteUri &&
                !validateWebsiteUri(formData.websiteUri) && (
                  <p className="text-xs text-red-500">
                    Please enter a valid HTTPS URL
                  </p>
                )}
              <p className="text-xs text-muted-foreground">
                Required for merchants to receive API credentials
              </p>
            </div>
          )}

          {/* Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Select Tokens
              </label>
              <div className="flex items-center gap-1">
                {/* {currentNetwork?.logo && (
                  <Image
                    src={currentNetwork.logo}
                    alt={currentNetwork.name}
                    width={16}
                    height={16}
                  />
                )} */}
                <Link
                  href={currentNetwork?.explorerUrl || "#"}
                  target="_blank"
                  className="text-xs text-muted-foreground flex items-center gap-2 hover:text-primary"
                >
                  {currentNetwork?.name}{" "}
                  <ArrowRight size={16} className="-rotate-45" />
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.symbol}
                  onClick={() => handleTokenToggle(token.symbol)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedTokens.includes(token.symbol)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {token.symbol}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {token.name}
                      </div>

                      <Link
                        href={`${currentNetwork?.explorerUrl}/address/${token.address}`}
                        target="_blank"
                        className="text-sm text-primary mt-1 flex items-center gap-2"
                      >
                        {token.address.slice(0, 5)}...{token.address.slice(-3)}{" "}
                        <ArrowRight
                          size={16}
                          className="cursor-pointer -rotate-45"
                        />
                      </Link>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 transition-all grid place-items-center ${
                        selectedTokens.includes(token.symbol)
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {selectedTokens.includes(token.symbol) && (
                        <Check className="w-3 h-3 text-primary-foreground m-auto" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            disabled={!isFormValid || isLoggingIn || !ready}
            onClick={handleSubmit}
            variant={authenticated ? "destructive" : "default"}
            className={`w-full h-11 rounded-lg font-medium transition-all flex items-center justify-center gap-2`}
          >
            {isLoggingIn ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : authenticated ? (
              <>
                <LogOutIcon size={16} />
                Logout
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          Secure • Fast • Reliable
        </div>
      </div>
    </div>

  );
};

export default RegisterPage;
