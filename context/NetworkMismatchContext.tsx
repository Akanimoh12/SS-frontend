"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useWalletNetwork } from "@/hooks/useWalletNetwork";
import { NetworkMismatchBanner } from "@/components/network/NetworkMismatchBanner";
import type { Network, WalletKind } from "@/lib/stellar";
import { NETWORK_LABELS } from "@/lib/stellar/network";

/** Only poll the wallet while the mismatch banner is actually visible. */
const RECHECK_INTERVAL_MS = 10_000;

interface NetworkMismatchContextValue {
  isMismatched: boolean;
  walletNetwork: Network | null;
  appNetwork: Network;
  walletKind: WalletKind | null;
  reason: string;
}

const disabledState: NetworkMismatchContextValue = {
  isMismatched: false,
  walletNetwork: null,
  appNetwork: "testnet",
  walletKind: null,
  reason: "",
};

const NetworkMismatchContext =
  createContext<NetworkMismatchContextValue>(disabledState);

export function NetworkMismatchProvider({ children }: { children: ReactNode }) {
  const {
    isMismatched,
    walletNetwork,
    appNetwork,
    walletKind,
    refresh,
    isInitializing,
  } = useWalletNetwork();

  useEffect(() => {
    if (!isMismatched) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, RECHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isMismatched, refresh]);

  const value = useMemo<NetworkMismatchContextValue>(() => {
    const appLabel = NETWORK_LABELS[appNetwork];
    const walletLabel = walletNetwork ? NETWORK_LABELS[walletNetwork] : "an unknown network";
    return {
      isMismatched,
      walletNetwork,
      appNetwork,
      walletKind,
      reason: `Switch your wallet from ${walletLabel} to ${appLabel} to enable transactions.`,
    };
  }, [isMismatched, walletNetwork, appNetwork, walletKind]);

  return (
    <NetworkMismatchContext.Provider value={value}>
      {/* Do not flash a banner while the persisted wallet session is loading. */}
      <NetworkMismatchBanner
        visible={isMismatched && !isInitializing}
        walletNetwork={walletNetwork}
        appNetwork={appNetwork}
        walletKind={walletKind}
      />
      {children}
    </NetworkMismatchContext.Provider>
  );
}

export function useNetworkMismatch(): NetworkMismatchContextValue {
  return useContext(NetworkMismatchContext);
}

/** Disables transaction CTAs while the wallet and app networks differ (#610). */
export function useTransactionGuard(): { disabled: boolean; reason: string } {
  const { isMismatched, reason } = useNetworkMismatch();
  return { disabled: isMismatched, reason };
}
