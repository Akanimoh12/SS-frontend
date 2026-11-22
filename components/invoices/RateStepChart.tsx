"use client";

import { buildRateLadder, formatRate, type RateAuctionData } from "@/lib/analytics/rateAuction";

export interface RateStepChartProps {
  auction: RateAuctionData;
  currentStepIndex: number;
}

/** Step ladder for a descending-rate auction, with current and ceiling highlighted (#594). */
export function RateStepChart({ auction, currentStepIndex }: RateStepChartProps) {
  const steps = buildRateLadder(auction);

  if (steps.length === 0) return null;

  return (
    <div role="list" aria-label="Auction rate ladder" data-testid="rate-step-chart" className="space-y-1">
      {steps.map((step) => {
        const isCurrent = step.index === currentStepIndex;
        const isMax = step.index === steps.length - 1;
        return (
          <div
            key={step.index}
            role="listitem"
            data-testid={`rate-step-${step.index}`}
            data-current={isCurrent ? "true" : "false"}
            data-max={isMax ? "true" : "false"}
            aria-label={`Step ${step.index + 1}: ${formatRate(step.rate)}${isCurrent ? ", current step" : ""}${isMax ? ", maximum rate" : ""}`}
            className={[
              "flex items-center justify-between rounded px-3 py-1.5 text-sm",
              isCurrent ? "bg-primary font-semibold text-primary-foreground" : "bg-muted/50",
            ].join(" ")}
          >
            <span>Step {step.index + 1}</span>
            <span>{formatRate(step.rate)}</span>
          </div>
        );
      })}
    </div>
  );
}
