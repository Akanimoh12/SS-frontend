import { formatUsdc, formatXLM } from "@/lib/format";

/** Render-only amount formatting for credit-line surfaces (#588). */
export function formatCreditAmount(
  amount: number,
  currency: "XLM" | "USDC"
): string {
  return currency === "USDC" ? formatUsdc(amount) : formatXLM(amount);
}
