/**
 * Debtor confirmation API client (#574).
 *
 * A debtor opens an emailed link, reviews the invoice and confirms or rejects
 * the obligation. The link carries a one-time token; nothing here needs a
 * wallet or a login, so requests are sent without credentials headers.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface DebtorInvoiceSummary {
  invoiceNumber: string;
  issuerName: string;
  amount: string;
  currency: string;
  dueDate: string;
  documentUrl: string | null;
}

export type DebtorDecision =
  | { action: "confirm" }
  | { action: "reject"; reason: string };

/** Why a token cannot be used. `unknown` covers network and server failures. */
export type DebtorTokenFailure = "expired" | "used" | "invalid" | "unknown";

export class DebtorConfirmationError extends Error {
  readonly kind: DebtorTokenFailure;

  constructor(kind: DebtorTokenFailure, message: string) {
    super(message);
    this.name = "DebtorConfirmationError";
    this.kind = kind;
  }
}

export const DEBTOR_TOKEN_MESSAGES: Record<DebtorTokenFailure, string> = {
  expired: "This confirmation link has expired. Ask the issuer to send you a new one.",
  used: "This confirmation link has already been used. No further action is needed.",
  invalid: "This confirmation link is not valid. Check that you opened the full link from your email.",
  unknown: "We could not load this confirmation right now. Please try again.",
};

export const MIN_REJECTION_REASON_LENGTH = 5;

function readCode(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.code === "string") return record.code;
  const error = record.error;
  if (typeof error === "object" && error !== null) {
    const code = (error as Record<string, unknown>).code;
    if (typeof code === "string") return code;
  }
  return null;
}

/**
 * Maps a failed response to a token state. An explicit error code wins over the
 * HTTP status: 404 is invalid, 410 is expired, 409 is already used.
 */
export function classifyTokenFailure(status: number, payload?: unknown): DebtorTokenFailure {
  const code = (readCode(payload) ?? "").toLowerCase();
  if (code.includes("expired")) return "expired";
  if (code.includes("used") || code.includes("already")) return "used";
  if (code.includes("invalid") || code.includes("not_found")) return "invalid";

  if (status === 410) return "expired";
  if (status === 409) return "used";
  if (status === 400 || status === 404) return "invalid";
  return "unknown";
}

/** Returns an error message for an unusable rejection reason, or null when it is fine. */
export function validateRejectionReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return "Enter a reason for rejecting this invoice.";
  if (trimmed.length < MIN_REJECTION_REASON_LENGTH) {
    return `Reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters.`;
  }
  return null;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeSummary(payload: unknown): DebtorInvoiceSummary {
  const root = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
  const data = (typeof root.data === "object" && root.data !== null ? root.data : root) as Record<string, unknown>;
  const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

  return {
    invoiceNumber: text(data.invoiceNumber ?? data.invoice_number),
    issuerName: text(data.issuerName ?? data.issuer_name),
    amount: String(data.amount ?? "0"),
    currency: text(data.currency, "USDC"),
    dueDate: text(data.dueDate ?? data.due_date),
    documentUrl: text(data.documentUrl ?? data.document_url) || null,
  };
}

export async function fetchDebtorConfirmation(token: string): Promise<DebtorInvoiceSummary> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/debtor-confirmations/${encodeURIComponent(token)}`);
  } catch {
    throw new DebtorConfirmationError("unknown", DEBTOR_TOKEN_MESSAGES.unknown);
  }

  if (!res.ok) {
    const kind = classifyTokenFailure(res.status, await readJson(res));
    throw new DebtorConfirmationError(kind, DEBTOR_TOKEN_MESSAGES[kind]);
  }
  return normalizeSummary(await readJson(res));
}

export async function submitDebtorConfirmation(
  token: string,
  decision: DebtorDecision
): Promise<void> {
  const body =
    decision.action === "confirm"
      ? { decision: "confirm" }
      : { decision: "reject", reason: decision.reason.trim() };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/debtor-confirmations/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new DebtorConfirmationError("unknown", DEBTOR_TOKEN_MESSAGES.unknown);
  }

  if (!res.ok) {
    const kind = classifyTokenFailure(res.status, await readJson(res));
    throw new DebtorConfirmationError(kind, DEBTOR_TOKEN_MESSAGES[kind]);
  }
}
