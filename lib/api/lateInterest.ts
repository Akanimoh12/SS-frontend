/** Typed late-interest client with explicit degradation (#607). */

import { API_BASE, ApiError, isNotFound, readApiJson } from "./shared";

export interface LateInterest {
  invoiceId: string;
  accrued: number;
  lastAccrualDate: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeLateInterest(value: unknown, invoiceId: string): LateInterest | null {
  if (!isRecord(value)) return null;
  const accrued = value.accrued ?? value.accrued_interest ?? value.amount;
  if (typeof accrued !== "number" || !Number.isFinite(accrued)) return null;
  const lastAccrualDate = value.last_accrual_date ?? value.lastAccrualDate;
  return {
    invoiceId,
    accrued,
    lastAccrualDate: typeof lastAccrualDate === "string" ? lastAccrualDate : null,
  };
}

/** Returns null when the endpoint is missing or the payload is unusable. */
export async function fetchLateInterest(invoiceId: string): Promise<LateInterest | null> {
  if (!invoiceId) return null;
  try {
    const response = await fetch(
      `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/late-interest`
    );
    if (!response.ok) throw new ApiError(response.status, "Late interest request failed");
    return normalizeLateInterest(await readApiJson<unknown>(response), invoiceId);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}
