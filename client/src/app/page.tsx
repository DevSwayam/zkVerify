"use client";
import React from "react";
import { ArrowRight, UserPlus, LogIn } from "lucide-react";
import { gifUrls, TextGif } from "@/components/ui/text-gif";
import Link from "next/link";
import { SITE } from "@/lib/constants";
import { AuthGuard } from "@/components/auth-guard";

const HomePage = () => {
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
              {SITE.description}
            </p>
          </div>

          {/* Action Cards */}
          <div className="space-y-4">
            {/* Register Card */}
            <Link href="/register">
              <div className="p-6 rounded-lg border border-border hover:border-primary bg-card hover:bg-primary/5 transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <UserPlus className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Create New Wallet
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Set up a new personal or merchant wallet with stealth
                      address capabilities
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs bg-muted px-2 py-1 rounded-md">
                        Personal Wallet
                      </span>
                      <span className="text-xs bg-muted px-2 py-1 rounded-md">
                        Merchant API
                      </span>
                      <span className="text-xs bg-muted px-2 py-1 rounded-md">
                        Stealth Addresses
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>

            {/* Login Card */}
            <Link href="/login">
              <div className="p-6 rounded-lg border border-border hover:border-primary bg-card hover:bg-primary/5 transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <LogIn className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Sign In
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Access your existing wallet and manage your stealth
                      addresses
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs bg-muted px-2 py-1 rounded-md">
                        Quick Access
                      </span>
                      <span className="text-xs bg-muted px-2 py-1 rounded-md">
                        QR Codes
                      </span>
                      <span className="text-xs bg-muted px-2 py-1 rounded-md">
                        Dashboard
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
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

export default HomePage;
