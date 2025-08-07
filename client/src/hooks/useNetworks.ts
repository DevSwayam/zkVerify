import { useQuery } from "@tanstack/react-query";

export interface Network {
  name: string;
  chainId: number;
  network: string;
  explorerUrl: string;
  logo: string;
  rpcUrl: string;
  testnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: {
    name: string;
    url: string;
  };
  tokens: Array<{
    symbol: string;
    name: string;
    address: string;
  }>;
}

interface NetworksResponse {
  success: boolean;
  data: Network[];
}

const fetchNetworks = async (): Promise<NetworksResponse> => {
  const response = await fetch("/api/networks");
  if (!response.ok) {
    throw new Error("Failed to fetch networks");
  }
  return response.json();
};

export const useNetworks = () => {
  return useQuery({
    queryKey: ["networks"],
    queryFn: fetchNetworks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
