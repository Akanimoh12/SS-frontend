/** Pure credit-line rules (#588). No I/O, no React, no formatting. */

export type CreditLineStatus = "open" | "frozen" | "closed";

export interface CreditLineEvent {
  id: string;
  type: "draw" | "repay";
  amount: number;
  occurredAt: string;
}

export interface CreditLine {
  limit: number;
  drawn: number;
  accruedInterest: number;
  status: CreditLineStatus;
  currency: "XLM" | "USDC";
  history: CreditLineEvent[];
  lastUpdatedAt?: string | null;
}

export interface CreditLineSegments {
  drawn: number;
  accrued: number;
  available: number;
}

export type AmountProblem =
  | "not-a-number"
  | "not-positive"
  | "frozen"
  | "exceeds-available"
  | "exceeds-outstanding";

export type AmountValidation = { ok: true } | { ok: false; problem: AmountProblem };

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isFrozen(line: CreditLine): boolean {
  return line.status === "frozen";
}

/**
 * Stacked gauge values. Clamping guarantees three non-negative segments whose
 * sum is always the limit, even when the backend reports an over-drawn line or
 * stale accrued interest (#588 acceptance criterion 1).
 */
export function creditLineSegments(line: CreditLine): CreditLineSegments {
  const limit = Math.max(0, finite(line.limit));
  const drawn = clamp(finite(line.drawn), 0, limit);
  const accrued = clamp(finite(line.accruedInterest), 0, limit - drawn);
  const available = Math.max(0, limit - drawn - accrued);
  return { drawn, accrued, available };
}

function validatePositiveAmount(amount: number): AmountValidation {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return { ok: false, problem: "not-a-number" };
  }
  if (amount <= 0) return { ok: false, problem: "not-positive" };
  return { ok: true };
}

/** Draws are blocked on a frozen line and cannot exceed available credit. */
export function validateDrawAmount(line: CreditLine, amount: number): AmountValidation {
  const positive = validatePositiveAmount(amount);
  if (!positive.ok) return positive;
  if (isFrozen(line)) return { ok: false, problem: "frozen" };
  const { available } = creditLineSegments(line);
  return amount > available ? { ok: false, problem: "exceeds-available" } : { ok: true };
}

/** Repayment stays enabled on a frozen line but cannot exceed the outstanding balance. */
export function validateRepayAmount(line: CreditLine, amount: number): AmountValidation {
  const positive = validatePositiveAmount(amount);
  if (!positive.ok) return positive;
  const { drawn, accrued } = creditLineSegments(line);
  return amount > drawn + accrued
    ? { ok: false, problem: "exceeds-outstanding" }
    : { ok: true };
}

export function sortedHistory(line: CreditLine): CreditLineEvent[] {
  return [...line.history].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}
