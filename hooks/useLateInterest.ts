"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLateInterest } from "@/lib/api/lateInterest";

export const LATE_INTEREST_QUERY_KEY = (invoiceId: string) =>
  ["invoice", invoiceId, "late-interest"] as const;

export interface LateInterestView {
  accrued: number | null;
  lastAccrualDate: string | null;
  source: "api" | "invoice" | "none";
  isLoading: boolean;
}

/**
 * Backend accrued interest when available, otherwise the value already present
 * on the invoice row. A "none" source is explicit so views can hide interest
 * rather than display a fabricated zero (#607).
 */
export function useLateInterest(
  invoiceId: string | null | undefined,
  invoiceFallback: number | null | undefined = null
): LateInterestView {
  const { data, isLoading } = useQuery({
    queryKey: LATE_INTEREST_QUERY_KEY(invoiceId ?? ""),
    queryFn: () => fetchLateInterest(invoiceId as string),
    enabled: Boolean(invoiceId),
    retry: false,
    staleTime: 60_000,
  });

  if (data) {
    return {
      accrued: data.accrued,
      lastAccrualDate: data.lastAccrualDate,
      source: "api",
      isLoading,
    };
  }

  if (typeof invoiceFallback === "number" && Number.isFinite(invoiceFallback)) {
    return { accrued: invoiceFallback, lastAccrualDate: null, source: "invoice", isLoading };
  }

  return { accrued: null, lastAccrualDate: null, source: "none", isLoading };
}
