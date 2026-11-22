"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IssuerTierBadge } from "@/components/issuers/IssuerTierBadge";
import { useIssuerTier } from "@/hooks/useIssuerTier";
import {
  ISSUER_TIER_LABELS,
  computeIssuerTierProgress,
  type IssuerTierStatus,
} from "@/lib/issuers";

export interface TierProgressCardProps {
  address?: string | null;
  /** Optional direct status override for controlled rendering or tests. */
  initialStatus?: IssuerTierStatus | null;
}

export function TierProgressCard({ address, initialStatus }: TierProgressCardProps) {
  const { status: fetchedStatus } = useIssuerTier(initialStatus ? null : address);
  const status = initialStatus ?? fetchedStatus;

  if (!status) return null;

  const progress = computeIssuerTierProgress(status);
  const nextTierLabel = progress.nextTier
    ? ISSUER_TIER_LABELS[progress.nextTier]
    : null;

  const hasDemotion = Boolean(
    status.demotion?.demoted ||
      (status.demotion?.reason && status.demotion.reason.trim().length > 0),
  );

  return (
    <Card data-testid="tier-progress-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Issuer tier &amp; limits</h2>
            <p className="text-sm text-muted-foreground">
              Your issuance limits scale with your on-chain settlement history
            </p>
          </div>
          <IssuerTierBadge tier={status.tier} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Demotion notice after a default */}
        {hasDemotion && status.demotion && (
          <div
            role="alert"
            data-testid="issuer-tier-demotion-notice"
            className="flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-500/10 p-3.5 text-sm text-red-800 dark:text-red-300"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Tier demoted
                {status.demotion.previous_tier
                  ? ` from ${ISSUER_TIER_LABELS[status.demotion.previous_tier]} to ${ISSUER_TIER_LABELS[status.tier]}`
                  : ` to ${ISSUER_TIER_LABELS[status.tier]}`}
              </p>
              <p
                className="mt-0.5 text-xs opacity-90"
                data-testid="issuer-tier-demotion-reason"
              >
                {status.demotion.reason}
              </p>
            </div>
          </div>
        )}

        {/* Current tier limits: max invoice value and open exposure */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3.5">
            <p className="text-xs text-muted-foreground">Max invoice value</p>
            <p
              className="mt-1 text-xl font-bold tabular-nums"
              data-testid="tier-max-invoice-value"
            >
              {status.limits.max_invoice_value.toLocaleString()} XLM
            </p>
          </div>

          <div className="rounded-lg border p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Open exposure</span>
              <span className="font-medium text-muted-foreground">
                {progress.exposureUsagePct}% used
              </span>
            </div>
            <p
              className="mt-1 text-xl font-bold tabular-nums"
              data-testid="tier-open-exposure"
            >
              {status.limits.current_open_exposure.toLocaleString()} /{" "}
              <span data-testid="tier-max-open-exposure">
                {status.limits.max_open_exposure.toLocaleString()} XLM
              </span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress.exposureUsagePct}%` }}
                data-testid="tier-exposure-bar"
              />
            </div>
          </div>
        </div>

        {/* Progress toward the next tier */}
        {progress.nextTier && nextTierLabel ? (
          <div
            className="space-y-3 rounded-lg border bg-muted/20 p-4"
            data-testid="tier-next-progress"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Progress to {nextTierLabel} tier
              </p>
              <span
                className="text-xs font-medium tabular-nums text-muted-foreground"
                data-testid="tier-settled-count"
              >
                {status.history.settled_count} / {progress.requiredSettledCount} settled
              </span>
            </div>

            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress.settledProgressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress to ${nextTierLabel} tier`}
              data-testid="tier-settled-progress-bar"
            >
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress.settledProgressPct}%` }}
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Requirements for {nextTierLabel}
              </p>
              <ul
                className="space-y-1.5 text-xs"
                data-testid="tier-next-requirements"
              >
                <li
                  className="flex items-center justify-between gap-2"
                  data-testid="tier-req-settled"
                >
                  <span>
                    Settle at least {progress.requiredSettledCount} invoices on time
                  </span>
                  <span className="font-semibold tabular-nums">
                    {status.history.settled_count} / {progress.requiredSettledCount} (
                    {progress.settledRemaining} remaining)
                  </span>
                </li>
                <li
                  className="flex items-center justify-between gap-2"
                  data-testid="tier-req-late"
                >
                  <span>
                    At most {progress.maxAllowedLateCount} late{" "}
                    {progress.maxAllowedLateCount === 1 ? "settlement" : "settlements"}
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      progress.lateWithinThreshold
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-destructive"
                    }`}
                    data-testid="tier-late-count"
                  >
                    {status.history.late_count} / {progress.maxAllowedLateCount} late
                  </span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm"
            data-testid="tier-max-reached"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck
                className="h-5 w-5 shrink-0 text-yellow-700 dark:text-yellow-400"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Highest tier unlocked (Gold)</p>
                <p className="text-xs text-muted-foreground">
                  You have unlocked the maximum invoice value and open exposure limits.
                </p>
              </div>
            </div>
            <div className="text-right text-xs tabular-nums">
              <p data-testid="tier-settled-count">
                {status.history.settled_count} settled
              </p>
              <p className="text-muted-foreground" data-testid="tier-late-count">
                {status.history.late_count} late
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
