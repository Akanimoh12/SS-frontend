"use client";

import type { Invoice } from "@/lib/api";
import { daysOverdue, isOverdueUiVisible } from "@/lib/overdue";
import type { LateInterestView } from "@/hooks/useLateInterest";
import { Money } from "@/components/currency";
import { formatXLM } from "@/lib/format";

interface OverdueBannerProps {
  invoice: Pick<Invoice, "status" | "due_date">;
  interest: LateInterestView;
  now?: Date;
}

/** Days overdue and accrued late interest on the invoice detail page (#607). */
export function OverdueBanner({ invoice, interest, now = new Date() }: OverdueBannerProps) {
  if (!isOverdueUiVisible(invoice, now)) return null;
  const days = daysOverdue(invoice.due_date, now);

  return (
    <div
      data-testid="overdue-banner"
      role="status"
      className="rounded-md border border-amber-500 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <p data-testid="overdue-days" className="font-medium">
        {days} {days === 1 ? "day" : "days"} overdue
      </p>
      {interest.accrued !== null ? (
        <p data-testid="overdue-interest" className="mt-1">
          Accrued late interest:{" "}
          <Money xlm={interest.accrued} xlmText={formatXLM(interest.accrued)} />
          {interest.lastAccrualDate && (
            <span className="text-muted-foreground">
              {" "}
              (last accrued {new Date(interest.lastAccrualDate).toLocaleDateString()})
            </span>
          )}
        </p>
      ) : (
        <p data-testid="overdue-interest-unavailable" className="mt-1">
          Late interest information is unavailable.
        </p>
      )}
    </div>
  );
}
