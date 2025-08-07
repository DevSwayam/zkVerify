"use client";

import { useNetworks } from "@/hooks/useNetworks";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface NetworkWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const NetworkWrapper = ({ children, fallback }: NetworkWrapperProps) => {
  const { data, isLoading, isError, error } = useNetworks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {fallback || (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
            Failed to load networks
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {error?.message || "An error occurred while loading networks"}
          </p>
        </div>
      </div>
    );
  }

  if (!data?.success || !data?.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
            No networks available
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            No networks were found
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
