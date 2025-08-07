import { useState } from "react";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useWalletClient } from "wagmi";
// import { BACKEND_URL } from "@/lib/constants";
// import axios from "axios";

export const useLoginForm = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginResult, setLoginResult] = useState<{
    success: boolean;
    message: string;
    signedMessage?: string;
    userAddress?: string;
    userEmail?: string;
  } | null>(null);

  const { authenticated, ready, user, logout } = usePrivy();
  const { data: walletClient } = useWalletClient();
//   const { address } = useAccount();

  const { login } = useLogin({
    onComplete: async (user) => {
      console.log("User authenticated:", user);

      try {
        // Wait for wallet client to be ready
        console.log("Waiting for wallet client to be ready...");
        const client = walletClient

        if (!client) {
            return;
        //   throw new Error("Wallet client not available after authentication");
        }

        console.log("Wallet client ready, signing message...");

        // Automatically sign a message after successful login
        const message = 'I_WANT_TO_LOGIN';

        const signature = await client.signMessage({
          message: message,
        });

        if (!signature) {
          throw new Error("Failed to sign message - signature is empty");
        }

        console.log("Message signed successfully:", signature);

        //TODO: Send signature to backend
        // const {data} = await axios.post(`${BACKEND_URL}/api/login`, {
        //     signature,
        //     address,
        // })

        // Set successful login result
        setLoginResult({
          success: true,
          message: "Login successful! Message signed automatically.",
          signedMessage: signature,
          userAddress: user.user.wallet?.address,
          userEmail: user.user.google?.email,
        });

        // Store login data for potential use
        const loginData = {
          userAddress: user.user.wallet?.address,
          email: user.user.google?.email,
          signedMessage: signature,
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem("loginData", JSON.stringify(loginData));

        setIsLoggingIn(false);

        // Redirect to the user's page after a short delay
        // Use the wallet address or email as identifier since no username
        setTimeout(() => {
          window.location.href = `/${user.user.wallet?.address}`;
        }, 2000);
      } catch (error) {
        console.error("Error during login process:", error);
        setLoginResult({
          success: false,
          message: `Login failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
        setIsLoggingIn(false);
      }
    },
    onError: (error) => {
      if (error !== "exited_auth_flow") {
        console.error("Login error:", error);
        setLoginResult({
          success: false,
          message: `Login failed: ${error}`,
        });
      }
      setIsLoggingIn(false);
    },
  });

  const handleLogin = async () => {
    // Clear any previous results
    setLoginResult(null);

    // If already authenticated, logout first
    if (authenticated) {
      console.log("Already authenticated, logging out first...");
      logout();
    }

    if (!ready) {
      console.log("Privy not ready yet");
      return;
    }

    console.log("Starting login process...");
    setIsLoggingIn(true);

    try {
      login();
    } catch (error) {
      console.error("Login failed:", error);
      setLoginResult({
        success: false,
        message: "Login failed: Please try again",
      });
      setIsLoggingIn(false);
    }
  };

  return {
    isLoggingIn,
    loginResult,
    setLoginResult,
    handleLogin,
    authenticated,
    ready,
    user,
  };
};
