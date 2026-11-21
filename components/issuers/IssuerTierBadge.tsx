"use client";

import { Award } from "lucide-react";
import { useIssuerTier } from "@/hooks/useIssuerTier";
import {
  ISSUER_TIER_LABELS,
  normalizeIssuerTierName,
  type IssuerTierName,
} from "@/lib/issuers";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<IssuerTierName, string> = {
  bronze:
    "border-amber-700/30 bg-amber-100 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/60 dark:text-amber-200",
  silver:
    "border-slate-400/40 bg-slate-100 text-slate-800 dark:border-slate-500/50 dark:bg-slate-800 dark:text-slate-100",
  gold:
    "border-yellow-500/50 bg-yellow-100 text-yellow-900 dark:border-yellow-500/50 dark:bg-yellow-950/60 dark:text-yellow-200",
};

export interface IssuerTierBadgeProps {
  /** Optional address to read the tier via `useIssuerTier(address)`. */
  address?: string | null;
  /** Optional explicit tier; when supplied, avoids waiting for a network fetch. */
  tier?: IssuerTierName | string | null;
  className?: string;
}

export function IssuerTierBadge({
  address,
  tier: explicitTier,
  className,
}: IssuerTierBadgeProps) {
  const { tier: fetchedTier } = useIssuerTier(explicitTier ? null : address);
  const rawTier = explicitTier ?? fetchedTier;

  if (!rawTier) return null;

  const resolvedTier = normalizeIssuerTierName(rawTier);
  const label = ISSUER_TIER_LABELS[resolvedTier];

  return (
    <span
      data-testid="issuer-tier-badge"
      data-tier={resolvedTier}
      aria-label={`Issuer tier: ${label}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TIER_STYLES[resolvedTier],
        className,
      )}
    >
      <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
