/** Typed credit-line client with explicit degradation (#588). */

import type {
  CreditLine,
  CreditLineEvent,
  CreditLineStatus,
} from "@/lib/creditLine";
import { API_BASE, ApiError, isNotFound, readApiJson } from "./shared";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function statusOf(value: unknown): CreditLineStatus | null {
  return value === "open" || value === "frozen" || value === "closed" ? value : null;
}

function eventOf(value: unknown): CreditLineEvent | null {
  if (!isRecord(value)) return null;
  const amount = numeric(value.amount);
  if (
    typeof value.id !== "string" ||
    (value.type !== "draw" && value.type !== "repay") ||
    amount === null ||
    typeof value.occurredAt !== "string"
  ) {
    return null;
  }
  return { id: value.id, type: value.type, amount, occurredAt: value.occurredAt };
}

/** Returns null when the issuer has no open line or the payload is unusable. */
export function normalizeCreditLine(value: unknown): CreditLine | null {
  if (!isRecord(value)) return null;
  const candidate = "credit_line" in value ? value.credit_line : value;
  if (!isRecord(candidate)) return null;

  const limit = numeric(candidate.limit);
  const drawn = numeric(candidate.drawn);
  const accruedInterest =
    numeric(candidate.accrued_interest) ?? numeric(candidate.accruedInterest) ?? 0;
  const status = statusOf(candidate.status);
  if (limit === null || drawn === null || status === null) return null;

  const history = Array.isArray(candidate.history)
    ? candidate.history.map(eventOf).filter((entry): entry is CreditLineEvent => entry !== null)
    : [];

  return {
    limit,
    drawn,
    accruedInterest,
    status,
    currency: candidate.currency === "USDC" ? "USDC" : "XLM",
    history,
    lastUpdatedAt: typeof candidate.last_updated_at === "string" ? candidate.last_updated_at : null,
  };
}

async function requireOk(response: Response): Promise<void> {
  if (!response.ok) {
    throw new ApiError(response.status, `Credit line request failed (${response.status})`);
  }
}

export async function fetchCreditLine(): Promise<CreditLine | null> {
  try {
    const response = await fetch(`${API_BASE}/issuer/credit-line`);
    await requireOk(response);
    return normalizeCreditLine(await readApiJson<unknown>(response));
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function drawCreditLine(amount: number): Promise<CreditLine | null> {
  const response = await fetch(`${API_BASE}/issuer/credit-line/draw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  await requireOk(response);
  return normalizeCreditLine(await readApiJson<unknown>(response));
}

export async function repayCreditLine(amount: number): Promise<CreditLine | null> {
  const response = await fetch(`${API_BASE}/issuer/credit-line/repay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  await requireOk(response);
  return normalizeCreditLine(await readApiJson<unknown>(response));
}
