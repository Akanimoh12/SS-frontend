"use client";

import type { CreditLineSegments } from "@/lib/creditLine";
import { formatCreditAmount } from "./format";

interface LimitGaugeProps {
  segments: CreditLineSegments;
  limit: number;
  currency: "XLM" | "USDC";
}

/** Stacked drawn / accrued / available bar (#588). */
export function LimitGauge({ segments, limit, currency }: LimitGaugeProps) {
  const scale = limit > 0 ? limit : 1;
  const width = (value: number) => `${(value / scale) * 100}%`;

  return (
    <div data-testid="limit-gauge" className="space-y-3">
      <div
        role="img"
        aria-label={`Drawn ${formatCreditAmount(segments.drawn, currency)}, accrued ${formatCreditAmount(segments.accrued, currency)}, available ${formatCreditAmount(segments.available, currency)}`}
        className="flex h-6 w-full overflow-hidden rounded-md bg-muted"
      >
        <div
          data-testid="gauge-drawn"
          className="bg-primary"
          style={{ width: width(segments.drawn) }}
        />
        <div
          data-testid="gauge-accrued"
          className="bg-amber-500"
          style={{ width: width(segments.accrued) }}
        />
        <div
          data-testid="gauge-available"
          className="bg-emerald-500"
          style={{ width: width(segments.available) }}
        />
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Drawn</dt>
          <dd data-testid="gauge-drawn-value">{formatCreditAmount(segments.drawn, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Accrued interest</dt>
          <dd data-testid="gauge-accrued-value">{formatCreditAmount(segments.accrued, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Available</dt>
          <dd data-testid="gauge-available-value">{formatCreditAmount(segments.available, currency)}</dd>
        </div>
      </dl>
    </div>
  );
}
