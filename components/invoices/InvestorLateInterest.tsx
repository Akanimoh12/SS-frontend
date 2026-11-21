"use client";

import { useLateInterest } from "@/hooks/useLateInterest";
import { investorInterestShare } from "@/lib/overdue";
import { Money } from "@/components/currency";
import { formatXLM } from "@/lib/format";

interface InvestorLateInterestProps {
  invoiceId: string;
  sharePercent: number | null | undefined;
  invoiceAccrued?: number | null;
}

/** Investor's proportional share of accrued late interest (#607). */
export function InvestorLateInterest({
  invoiceId,
  sharePercent,
  invoiceAccrued,
}: InvestorLateInterestProps) {
  const interest = useLateInterest(invoiceId, invoiceAccrued);
  const share = investorInterestShare(interest.accrued, sharePercent);

  return (
    <span data-testid="investor-late-interest" className="text-xs text-muted-foreground">
      Late interest share:{" "}
      {share === null ? (
        "Unavailable"
      ) : (
        <Money xlm={share} xlmText={formatXLM(share)} />
      )}
    </span>
  );
}
