"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Network, WalletKind } from "@/lib/stellar";
import { NETWORK_LABELS } from "@/lib/stellar/network";
import { NetworkMismatchGuide } from "./NetworkMismatchGuide";

interface NetworkMismatchBannerProps {
  walletNetwork: Network | null;
  appNetwork: Network;
  walletKind: WalletKind | null;
  visible: boolean;
}

/** Global wrong-network banner naming both networks (#610). */
export function NetworkMismatchBanner({
  walletNetwork,
  appNetwork,
  walletKind,
  visible,
}: NetworkMismatchBannerProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  if (!visible) return null;

  const walletLabel = walletNetwork ? NETWORK_LABELS[walletNetwork] : "unknown network";
  const appLabel = NETWORK_LABELS[appNetwork];

  return (
    <div
      data-testid="network-mismatch-banner"
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <p className="flex items-center gap-2" data-testid="network-mismatch-message">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        <span>
          Your wallet is on <strong>{walletLabel}</strong>, but this app is on{" "}
          <strong>{appLabel}</strong>. Transactions are paused until the networks match.
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        data-testid="network-mismatch-switch"
        onClick={() => setGuideOpen(true)}
      >
        Switch network
      </Button>
      <NetworkMismatchGuide
        open={guideOpen}
        onOpenChange={setGuideOpen}
        walletKind={walletKind}
        walletNetwork={walletNetwork}
        appNetwork={appNetwork}
      />
    </div>
  );
}
