"use client";
import React from "react";
import { ArrowRight, LogIn, Check, AlertCircle } from "lucide-react";
import { gifUrls, TextGif } from "@/components/ui/text-gif";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";
import { useLoginForm } from "@/hooks/useLoginForm";
import { AuthGuard } from "@/components/auth-guard";

const LoginPage = () => {
  const {
    isLoggingIn,
    loginResult,
    setLoginResult,
    handleLogin,
    authenticated,
    ready,
  } = useLoginForm();

  // Show success message if login completed
  if (loginResult && loginResult.success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Login Successful!
            </h1>
            <p className="text-sm text-muted-foreground">
              {loginResult.message}
            </p>
          </div>

          {/* Login Details */}
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground">
                    {loginResult.userEmail}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Wallet Address
                  </p>
                  <p className="text-xs font-mono text-foreground break-all">
                    {loginResult.userAddress}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Signed Message
                  </p>
                  <p className="text-xs font-mono text-foreground break-all">
                    {loginResult.signedMessage?.slice(0, 50)}...
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-900 mb-2">
                ✅ Authentication Complete
              </h3>
              <p className="text-xs text-green-700">
                Message signed successfully! Redirecting to your wallet...
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLoginResult(null)}
              >
                Login Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error message if login failed
  if (loginResult && !loginResult.success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Error Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Login Failed
            </h1>
            <p className="text-sm text-muted-foreground">
              {loginResult.message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button className="w-full" onClick={() => setLoginResult(null)}>
              Try Again
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requireUnauth={true}>
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
              Sign in to your wallet
            </p>
            <Link href="/" className="text-sm text-primary mt-2 block">
              ← Back to home
            </Link>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            {/* Login Info */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                🔐 One-Click Secure Login
              </h3>
              <p className="text-xs text-blue-700">
                Click login to authenticate with Google via Privy. After
                authentication, a message will be automatically signed with your
                wallet to verify ownership.
              </p>
            </div>

            {/* Login Button */}
            <Button
              disabled={isLoggingIn || !ready}
              onClick={handleLogin}
              className="w-full h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-lg"
            >
              {isLoggingIn ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {authenticated ? "Signing Message..." : "Connecting..."}
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Login with Privy
                  <ArrowRight size={20} />
                </>
              )}
            </Button>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatic Message Signing
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <LogIn className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Google Authentication
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary hover:underline">
                  Create one here
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-xs text-muted-foreground">
            Secure • Fast • Reliable
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default LoginPage;
