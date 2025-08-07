import { useState, useEffect } from "react";
import { useNetworks } from "./useNetworks";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import {
  generateKeysFromSignature,
  extractViewingPrivateKeyNode,
} from "@fluidkey/stealth-account-kit";
import { useAccount, useWalletClient } from "wagmi";
import { secp256k1 } from "ethereum-cryptography/secp256k1";
import axios from "axios";
import { BACKEND_URL } from "@/lib/constants";

interface FormData {
  username: string;
  websiteUri: string;
  walletType: "personal" | "merchant";
}

const FORM_DATA_KEY = "register_form_data";
const SELECTED_TOKENS_KEY = "register_selected_tokens";

export const useRegisterForm = () => {
  const { data: networks } = useNetworks();
  const WHITELISTED_NETWORKS = networks?.data || [];
  const [selectedTokens, setSelectedTokens] = useState(["USDC"]);
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean;
    data: {
      user: {
        id: string;
        username: string;
        email: string;
        apiKey?: string;
        isMerchant?: boolean;
      };
      token?: string;
      testStealthAddress?: {
        address: string;
        chainId: number;
        chainName: string;
      };
      instructions?: {
        apiKey?: string;
        token?: string;
        endpoint?: string;
        note?: string;
      };
    };
    message: string;
  } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    websiteUri: "",
    walletType: "personal",
  });

  const { authenticated, ready, user, logout } = usePrivy();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  useEffect(() => {
    const savedFormData = localStorage.getItem(FORM_DATA_KEY);
    const savedSelectedTokens = localStorage.getItem(SELECTED_TOKENS_KEY);

    if (savedFormData) {
      try {
        const parsedFormData = JSON.parse(savedFormData);
        setFormData(parsedFormData);
      } catch (error) {
        console.error("Error parsing saved form data:", error);
      }
    }

    if (savedSelectedTokens) {
      try {
        const parsedSelectedTokens = JSON.parse(savedSelectedTokens);
        setSelectedTokens(parsedSelectedTokens);
      } catch (error) {
        console.error("Error parsing saved selected tokens:", error);
      }
    }
  }, []);

  const clearFormData = () => {
    localStorage.removeItem(FORM_DATA_KEY);
    localStorage.removeItem(SELECTED_TOKENS_KEY);
    setFormData({
      username: "",
      websiteUri: "",
      walletType: "personal",
    });
    setSelectedTokens(["USDC"]);
  };

  const { login } = useLogin({
    onComplete: async (user) => {
      console.log("User data:", user);

      const savedFormData = localStorage.getItem(FORM_DATA_KEY);
      const currentFormData = savedFormData
        ? JSON.parse(savedFormData)
        : formData;

      console.log("formData", currentFormData);
      const message = "STEALTH_ADDRESS_GENERATION_HORIZEN_TESTNET";

      const signature = await walletClient?.signMessage({
        message: message,
      });

      console.log("signature", signature);

      if (!signature) return;

      const keys = generateKeysFromSignature(signature);

      const viewKeyNodeNumber = 0;
      const viewingPrivateKeyNode = extractViewingPrivateKeyNode(
        keys.viewingPrivateKey,
        viewKeyNodeNumber
      );

      const privateKeyBuffer = Buffer.from(
        keys.spendingPrivateKey.slice(2),
        "hex"
      );
      const spendingPublicKey = `0x${Buffer.from(
        secp256k1.getPublicKey(privateKeyBuffer, false)
      ).toString("hex")}`;

      const merchantKeys = {
        spendingPrivateKey: keys.spendingPrivateKey,
        viewingPrivateKey: keys.viewingPrivateKey,
        spendingPublicKey,
        viewingPrivateKeyNode,
        userAddress: user.user.wallet?.address,
      };

      console.log("merchantKeys", merchantKeys);

      const chains = [
        {
          chainId: WHITELISTED_NETWORKS[0].chainId,
          name: WHITELISTED_NETWORKS[0].name,
          tokenAddresses: WHITELISTED_NETWORKS[0].tokens.map(
            (token) => token.address
          ),
        },
      ];

      const registrationData = {
        username: currentFormData.username,
        email: user.user.google?.email,
        eoaaddress: address,
        viewingPrivateKey: merchantKeys.viewingPrivateKey,
        spendingPublicKey: merchantKeys.spendingPublicKey,
        isMerchant: currentFormData.walletType === "merchant",
        chains: chains,
      };

      console.log("registrationData", registrationData);

      const { data } = await axios.post(
        `${BACKEND_URL}/api/user/register`,
        registrationData
      );

      console.log("response", data);

      // Store the registration result to show success message
      setRegistrationResult(data);

      // Store merchant data in localStorage for dashboard access
      if (data.data.user.apiKey) {
        const merchantData = {
          username: data.data.user.username,
          email: data.data.user.email,
          apiKey: data.data.user.apiKey,
          isLive: false, // Start in test mode
        };
        localStorage.setItem("merchantData", JSON.stringify(merchantData));
      }

      clearFormData();
      setIsLoggingIn(false);
      // router.push(`/${currentFormData.username}/safes`);
    },
    onError: (error) => {
      if (error !== "exited_auth_flow") {
        console.error("Login error:", error);
      }
      setIsLoggingIn(false);
    },
  });

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const currentNetwork = WHITELISTED_NETWORKS.find(
    (network) => network.name === "Horizen Testnet"
  );
  const tokens = currentNetwork?.tokens || [];

  // Validation functions
  const validateUsername = (username: string) => {
    return (
      username.trim().length >= 3 &&
      username.trim().length <= 10 &&
      /^[a-zA-Z0-9_]+$/.test(username.trim())
    );
  };

  const validateWebsiteUri = (uri: string) => {
    try {
      const url = new URL(uri);
      return url.protocol === "https:" && uri.trim().length > 0;
    } catch {
      return false;
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };

    setFormData(newFormData);

    // Persist to localStorage
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(newFormData));
  };

  const handleTokenToggle = (tokenSymbol: string) => {
    const newSelectedTokens = selectedTokens.includes(tokenSymbol)
      ? selectedTokens.filter((token) => token !== tokenSymbol)
      : [...selectedTokens, tokenSymbol];

    setSelectedTokens(newSelectedTokens);

    // Persist to localStorage
    localStorage.setItem(
      SELECTED_TOKENS_KEY,
      JSON.stringify(newSelectedTokens)
    );
  };

  const handleWalletTypeChange = (walletType: "personal" | "merchant") => {
    const newFormData = {
      ...formData,
      walletType,
      // Clear websiteUri if switching to personal
      websiteUri: walletType === "personal" ? "" : formData.websiteUri,
    };

    setFormData(newFormData);

    // Persist to localStorage
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(newFormData));
  };

  const isFormValid =
    validateUsername(formData.username) &&
    (formData.walletType === "personal" ||
      validateWebsiteUri(formData.websiteUri)) &&
    selectedTokens.length > 0;

  const handleSubmit = async () => {
    if (authenticated) {
      logout();
    }

    if (!ready || authenticated) return;

    console.log("Form submitted:", {
      username: formData.username,
      websiteUri: formData.websiteUri,
      selectedTokens,
      network: currentNetwork?.name,
    });

    // Store form data in localStorage before redirect
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(formData));
    localStorage.setItem(SELECTED_TOKENS_KEY, JSON.stringify(selectedTokens));

    setIsLoggingIn(true);

    try {
      login();
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
    }
  };

  return {
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
    authenticated,
    ready,
    user,
    isLoggingIn,
    walletAddress: user?.wallet?.address,
  };
};
