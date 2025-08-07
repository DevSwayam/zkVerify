"use client";
import React from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import axios from "axios";
import { BACKEND_URL } from "@/lib/constants";

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean; // If true, redirects unauthenticated users to login
  requireUnauth?: boolean; // If true, redirects authenticated users away
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  // redirectTo,
  requireAuth = false,
  requireUnauth = false,
}) => {
  const { ready, authenticated, logout } = usePrivy();
  const router = useRouter();
  const { address } = useAccount();

  // Show loading while Privy is initializing
  if (!ready || (!address && authenticated)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getUsername = async () => {
    if (!address) return;
    console.log("eoa", address);
    const { data } = await axios.post(
      `${BACKEND_URL}/api/user/resolve-username-by-eoa`,
      {
        eoaaddress: address,
      }
    );

    if (data.data.username) {
      router.replace(`/${data.data.username}/safes`);
    } else {
      logout();
    }
  };

  // If requireUnauth is true (like on login/register pages), redirect authenticated users
  if (requireUnauth && authenticated) {
    getUsername();
    return null;
  }

  // If requireAuth is true, redirect unauthenticated users to login
  if (requireAuth && !authenticated) {
    router.replace("/login");
    return null;
  }

  // Render children if all conditions are met
  return <>{children}</>;
};
