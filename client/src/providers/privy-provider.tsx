"use client";

import React, { useEffect } from "react";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { PrivyProvider as PrivyProviderComponent } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { getViemTransports } from "@/lib/constants";
import { useNetworks } from "@/hooks/useNetworks";
import { baseSepolia } from "viem/chains";

const PrivyWrapper = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof PrivyProviderComponent> & {
    isActive?: boolean;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
>(({ isActive, ...props }, ref) => {

  // Filter out isActive and any other problematic props
  const cleanProps = { ...props };
  // @ts-expect-error - isActive is not a valid prop
  delete cleanProps.isActive;

  // @ts-expect-error - ref is not a valid prop
  return <PrivyProviderComponent ref={ref} {...cleanProps} />;
});
PrivyWrapper.displayName = "PrivyWrapper";

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: networks } = useNetworks();

  // Enhanced warning suppression
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filterMessage = (...args: any[]) => {
      const message = args.join(" ");
      return (
        message.includes("isActive") ||
        message.includes("React does not recognize") ||
        message.includes("DOM element") ||
        message.includes("custom attribute")
      );
    };

    console.error = (...args) => {
      if (filterMessage(...args)) {
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      if (filterMessage(...args)) {
        return;
      }
      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  if (!networks?.data) {
    return null;
  }

  const viemTransports = getViemTransports(networks?.data || []);

  const wagmiConfig = createConfig({
    chains: [baseSepolia],
    transports: viemTransports,
  });

  const privyConfig: PrivyClientConfig = {
    embeddedWallets: {
      createOnLogin: "users-without-wallets",
    },
    loginMethods: ["google"],
    supportedChains: [baseSepolia],
    defaultChain: baseSepolia,
    appearance: {
      showWalletLoginFirst: true,
    },
  };

  return (
    <PrivyWrapper
      // @ts-expect-error - isActive is not a valid prop
      apiUrl={process.env.NEXT_PUBLIC_PRIVY_AUTH_URL as string}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID as string}
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      config={privyConfig}
    >
      <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
        {children}
      </WagmiProvider>
    </PrivyWrapper>
  );
}
