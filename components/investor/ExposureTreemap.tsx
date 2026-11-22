"use client";

import { formatXLM } from "@/lib/format";
import type { ConcentrationBucket } from "@/lib/analytics/concentration";

export interface ExposureTreemapProps {
  buckets: readonly ConcentrationBucket[];
  onSelect?: (bucket: ConcentrationBucket) => void;
}

/**
 * A lightweight treemap built from sized, labelled buttons.
 *
 * Using real buttons keeps every segment keyboard reachable without adding a
 * charting dependency. Segment width is proportional to outstanding principal.
 */
export function ExposureTreemap({ buckets, onSelect }: ExposureTreemapProps) {
  if (buckets.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Exposure treemap"
      data-testid="exposure-treemap"
      className="flex h-40 w-full overflow-hidden rounded-lg border bg-muted/30"
    >
      {buckets.map((bucket) => (
        <button
          key={bucket.key}
          type="button"
          data-testid={`treemap-${bucket.key}`}
          style={{ flexGrow: Math.max(bucket.principal, 0.0001), flexBasis: 0 }}
          aria-label={`${bucket.label}: ${bucket.sharePercent}% of portfolio, ${formatXLM(bucket.principal)}`}
          title={`${bucket.label}: ${bucket.sharePercent}%`}
          onClick={() => onSelect?.(bucket)}
          className={[
            "min-w-0 overflow-hidden border-r border-background px-2 py-3 text-left transition-opacity",
            "hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
            bucket.warning ? "bg-destructive/20" : "bg-primary/15",
          ].join(" ")}
        >
          <span className="block truncate text-xs font-medium" aria-hidden="true">
            {bucket.label}
          </span>
          <span className="block text-sm font-semibold" aria-hidden="true">
            {bucket.sharePercent}%
          </span>
        </button>
      ))}
    </div>
  );
}
