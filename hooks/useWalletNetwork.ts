"use client";

import { useCallback } from "react";
import { useWallet } from "@/context/WalletContext";
import { useActiveNetwork } from "@/hooks/useActiveNetwork";
import type { Network, WalletKind } from "@/lib/stellar";

export interface WalletNetworkView {
  isConnected: boolean;
  isInitializing: boolean;
  walletKind: WalletKind | null;
  walletNetwork: Network | null;
  appNetwork: Network;
  isMismatched: boolean;
  refresh: () => Promise<void>;
}

/**
 * Compares the connected wallet's network with the app's active network (#610).
 * Derivation only; the 10s recheck and banner live in NetworkMismatchProvider.
 */
export function useWalletNetwork(): WalletNetworkView {
  const {
    network: walletNetwork,
    wallet: walletKind,
    isConnected,
    isInitializing,
    refreshNetwork,
  } = useWallet();
  const { network: appNetwork } = useActiveNetwork();

  const refresh = useCallback(() => refreshNetwork(), [refreshNetwork]);

  return {
    isConnected,
    isInitializing,
    walletKind,
    walletNetwork,
    appNetwork,
    isMismatched:
      isConnected && walletNetwork !== null && walletNetwork !== appNetwork,
    refresh,
  };
}
