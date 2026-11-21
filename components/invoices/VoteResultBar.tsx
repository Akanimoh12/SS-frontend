"use client";

export interface VoteResultBarProps {
  acceptedPrincipal: number;
  rejectedPrincipal: number;
  totalPrincipal: number;
  /** Supermajority threshold percentage (0-100), e.g. 66.67 or 75. */
  supermajorityThreshold: number;
}

export function VoteResultBar({
  acceptedPrincipal,
  rejectedPrincipal,
  totalPrincipal,
  supermajorityThreshold,
}: VoteResultBarProps) {
  const safeTotal = totalPrincipal > 0 ? totalPrincipal : 0;
  const notVotedPrincipal = Math.max(
    0,
    safeTotal - acceptedPrincipal - rejectedPrincipal,
  );

  const acceptedPct =
    safeTotal > 0 ? Math.min(100, (acceptedPrincipal / safeTotal) * 100) : 0;
  const rejectedPct =
    safeTotal > 0
      ? Math.min(100 - acceptedPct, (rejectedPrincipal / safeTotal) * 100)
      : 0;
  const notVotedPct = Math.max(0, 100 - acceptedPct - rejectedPct);
  const thresholdPct = Math.min(100, Math.max(0, supermajorityThreshold));

  return (
    <div className="space-y-2.5" data-testid="vote-result-bar">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-muted-foreground">
          Principal-weighted tally ({safeTotal.toLocaleString()} XLM total)
        </span>
        <span
          className="font-semibold text-foreground"
          data-testid="vote-threshold-label"
        >
          Supermajority threshold: {thresholdPct}%
        </span>
      </div>

      {/* Stacked bar with supermajority threshold marker */}
      <div className="relative pt-2 pb-1">
        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(acceptedPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Accepted principal percentage"
        >
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${acceptedPct}%` }}
            data-testid="vote-bar-accepted"
            data-percentage={acceptedPct.toFixed(2)}
          />
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${rejectedPct}%` }}
            data-testid="vote-bar-rejected"
            data-percentage={rejectedPct.toFixed(2)}
          />
          <div
            className="h-full bg-slate-300 dark:bg-slate-700 transition-all"
            style={{ width: `${notVotedPct}%` }}
            data-testid="vote-bar-not-voted"
            data-percentage={notVotedPct.toFixed(2)}
          />
        </div>

        {/* Supermajority threshold marker */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${thresholdPct}%` }}
          data-testid="vote-threshold-marker"
          data-threshold={thresholdPct}
        >
          <div className="h-6 w-0.5 -translate-x-1/2 bg-foreground" />
        </div>
      </div>

      {/* Legend showing accepted, rejected, and not-yet-voted principal */}
      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div
          className="flex items-center justify-between rounded border px-2.5 py-1.5"
          data-testid="vote-principal-accepted"
        >
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Accepted
          </span>
          <span className="font-semibold tabular-nums">
            {acceptedPrincipal.toLocaleString()} XLM ({acceptedPct.toFixed(1)}%)
          </span>
        </div>

        <div
          className="flex items-center justify-between rounded border px-2.5 py-1.5"
          data-testid="vote-principal-rejected"
        >
          <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Rejected
          </span>
          <span className="font-semibold tabular-nums">
            {rejectedPrincipal.toLocaleString()} XLM ({rejectedPct.toFixed(1)}%)
          </span>
        </div>

        <div
          className="flex items-center justify-between rounded border px-2.5 py-1.5"
          data-testid="vote-principal-not-voted"
        >
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Not yet voted
          </span>
          <span className="font-semibold tabular-nums">
            {notVotedPrincipal.toLocaleString()} XLM ({notVotedPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
