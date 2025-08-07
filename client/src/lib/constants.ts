import { Chain, http } from "viem";
import { Network } from "@/hooks/useNetworks";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
// export const BACKEND_URL = "https://stealth-lemon.vercel.app";

export const WHITELISTED_NETWORKS = [
  // {
  //   name: "Sei Testnet",
  //   chainId: 1328,
  //   network: 'sei-testnet',
  //   explorerUrl: "https://seistream.app",
  //   logo: "/sei-logo.svg",
  //   rpcUrl: "https://evm-rpc-testnet.sei-apis.com",
  //   nativeCurrency: {
  //     name: "SEI",
  //     symbol: "SEI",
  //     decimals: 18,
  //   },
  //   blockExplorer: {
  //     name: "SeiTrace",
  //     url: "https://seitrace.com",
  //   },
  //   tokens: [
  //     {
  //       symbol: "USDC",
  //       name: "USD Coin",
  //       address: "0xc413C0fAf688D26dA8a55584b0032ca2A93c74D0",
  //     },
  //     // {
  //     //   symbol: "USDT",
  //     //   name: "Tether USD",
  //     //   address: "sei1abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
  //     // },
  //   ],
  //   testnet: true,
  // },
  {
    name: "Horizen Testnet",
    chainId: 845320009,
    network: "horizen-testnet",
    explorerUrl: "https://horizen-explorer-testnet.appchain.base.org/",
    logo: "/base-logo.svg",
    rpcUrl: "https://horizen-rpc-testnet.appchain.base.org",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    blockExplorer: {
      name: "Horizen Explorer",
      url: "https://horizen-explorer-testnet.appchain.base.org/"
    },
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x40E81E7748323C92382C97f050E5C7975DBdea18",
      },
    ],
    testnet: true,
  },
  // {
  //   name: "SEI Network",
  //   chainId: 1329,
  //   explorerUrl: "https://seistream.app",
  //   logo: "/sei-logo.svg",
  //   rpcUrl: "https://sei-evm-rpc.publicnode.com",
  //   nativeCurrency: {
  //     name: "SEI",
  //     symbol: "SEI",
  //     decimals: 18,
  //   },
  //   tokens: [
  //     {
  //       symbol: "USDC",
  //       name: "USD Coin",
  //       address: "sei1abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
  //     },
  //     {
  //       symbol: "USDT",
  //       name: "Tether USD",
  //       address: "sei1abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
  //     },
  //   ],
  // },
];

// Transform function to convert WHITELISTED_NETWORKS to Privy Chain format
export const getPrivyChains = (networks: Network[]) => {
  return networks.map((network) => ({
    name: network.name,
    id: network.chainId,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: {
      default: {
        http: [network.rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: "Seistream",
        url: network.explorerUrl,
      },
    },
  }));
};

// Transform function to convert WHITELISTED_NETWORKS to Viem Chain format
export const getViemChains = (networks: Network[]): Chain[] => {
  return networks.map((network) => ({
    id: network.chainId,
    name: network.name,
    network: network.network,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: {
      default: {
        http: [network.rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: "Block Explorer",
        url: network.blockExplorer.url,
      },
    },
    testnet: network.testnet,
  }));
};

// Create dynamic RPC transports for all whitelisted networks
export const getViemTransports = (networks: Network[]) => {
  const transports: Record<number, ReturnType<typeof http>> = {};

  networks.forEach((network) => {
    transports[network.chainId] = http(network.rpcUrl);
  });

  return transports;
};

export const SITE = {
  name: "Unwallet",
  description: "Make money fluid",
  logo: "/logo.svg",
};

export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

export const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
];

export const SAFE_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    name: "execTransaction",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const USDC_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];