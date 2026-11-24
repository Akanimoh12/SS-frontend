"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getNetworkGuide, type GuideWallet } from "@/lib/networkGuide";
import type { Network } from "@/lib/stellar";
import { NETWORK_LABELS } from "@/lib/stellar/network";

interface NetworkMismatchGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletKind: GuideWallet | null;
  walletNetwork: Network | null;
  appNetwork: Network;
}

/** Step-by-step switch guide for the connected wallet (#610). */
export function NetworkMismatchGuide({
  open,
  onOpenChange,
  walletKind,
  walletNetwork,
  appNetwork,
}: NetworkMismatchGuideProps) {
  const guide = getNetworkGuide(walletKind);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="network-guide-modal">
        <DialogHeader>
          <DialogTitle data-testid="network-guide-title">{guide.title}</DialogTitle>
          <DialogDescription>
            Your wallet is on {walletNetwork ? NETWORK_LABELS[walletNetwork] : "an unknown network"},
            {" "}but this app is on {NETWORK_LABELS[appNetwork]}. Follow these steps to switch your wallet.
          </DialogDescription>
        </DialogHeader>
        {guide.note && (
          <p data-testid="network-guide-note" className="text-sm text-muted-foreground">
            {guide.note}
          </p>
        )}
        <ol data-testid="network-guide-steps" className="space-y-3">
          {guide.steps.map((entry) => (
            <li key={entry.step} data-testid={`network-guide-step-${entry.step}`} className="flex gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {entry.step}
              </span>
              <span>{entry.text}</span>
            </li>
          ))}
        </ol>
        <DialogFooter>
          <Button data-testid="network-guide-close" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
