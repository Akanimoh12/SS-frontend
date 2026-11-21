/** Pure overdue and late-interest allocation rules (#607). */

import type { Invoice } from "@/lib/api";

type InvoiceStatus = Invoice["status"];

function utcDay(value: number): number {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Whole UTC days past the due date; zero when the date is missing or future. */
export function daysOverdue(dueDate: string | null | undefined, now: Date): number {
  if (!dueDate) return 0;
  const due = Date.parse(dueDate);
  if (Number.isNaN(due)) return 0;
  return Math.max(0, Math.round((utcDay(now.getTime()) - utcDay(due)) / 86_400_000));
}

/** Settled and defaulted invoices never show overdue UI (#607). */
export function isOverdueUiVisible(
  invoice: Pick<Invoice, "status" | "due_date">,
  now: Date
): boolean {
  if (invoice.status === "settled" || invoice.status === "defaulted") return false;
  return daysOverdue(invoice.due_date, now) > 0;
}

export function isOverdueStatus(
  status: InvoiceStatus,
  now: Date,
  dueDate: string | null | undefined
): boolean {
  if (status === "settled" || status === "defaulted") return false;
  return daysOverdue(dueDate, now) > 0;
}

/**
 * Investor's proportional share of accrued interest. Returns null when the
 * backend value or the position share is missing, so callers show "unavailable"
 * instead of inventing a number (#607).
 */
export function investorInterestShare(
  accrued: number | null | undefined,
  sharePercent: number | null | undefined
): number | null {
  if (typeof accrued !== "number" || !Number.isFinite(accrued)) return null;
  if (typeof sharePercent !== "number" || !Number.isFinite(sharePercent)) return null;
  return (accrued * sharePercent) / 100;
}
