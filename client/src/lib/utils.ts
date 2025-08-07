import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const registrationResponse = {
  success: true,
  timestamp: "2025-07-06T16:18:15.246Z",
  data: {
    success: true,
    merchant: {
      id: "c0d322fe-0622-489c-a020-bfc4526c63ca",
      username: "sdac",
      email: "viveksahu1762@gmail.com",
      chains: [
        {
          name: "Sei Testnet",
          chainId: 1328,
          tokenAddresses: ["0x0000000000000000000000000000000000000000"],
        },
      ],
      apiKey:
        "sk_9bc91eb2aecb6ec3b06c81ce9752a4f50f2a3a11ca65269c7c2006ee8a893579",
    },
    message: "Merchant registered successfully",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXJjaGFudElkIjoiYzBkMzIyZmUtMDYyMi00ODljLWEwMjAtYmZjNDUyNmM2M2NhIiwiZW1haWwiOiJ2aXZla3NhaHUxNzYyQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoic2RhYyIsImlhdCI6MTc1MTgxODY5MywiZXhwIjoxNzUxOTA1MDkzfQ.HUlPmNi4krm6KeJTJSfEv83So5jA-MzWtm9cBDq64dY",
    testStealthAddress: {
      address: "0x084f1a97c0fd3813c6e52c8e929fe9ccc9f9029a",
      chainId: 1328,
      chainName: "Sei Testnet",
      tokenAddress: "0x0000000000000000000000000000000000000000",
      tokenAmount: "1.0",
      nonce: 0,
      newNonce: 1,
      safeAddress: {
        address: "0xece3a8165c3e1844beb70b83bad2cddb456d826d",
        isDeployed: false,
      },
    },
    instructions: {
      apiKey: "Use this API key in the X-API-Key header for all requests",
      token: "Use this JWT token in the Authorization: Bearer <token> header",
      endpoint: "Your custom endpoint: /api/merchant/sdac/stealth",
      supportedChains: [
        {
          chainId: 1328,
          tokenCount: 1,
          name: "Sei Testnet",
        },
      ],
      testAddress:
        "Test stealth address generated successfully - your setup is working!",
    },
  },
  message: "Merchant registered successfully",
};
