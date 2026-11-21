"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  DebtorConfirmationError,
  fetchDebtorConfirmation,
  submitDebtorConfirmation,
  type DebtorDecision,
} from "@/lib/debtorConfirmation";

export const debtorConfirmationQueryKey = (token: string) =>
  ["debtor-confirmation", token] as const;

/**
 * Loads the invoice summary behind a debtor confirmation link (#574).
 *
 * A token that is expired, used or invalid will not become valid by asking
 * again, so those failures are not retried. Only transient failures are.
 */
export function useDebtorConfirmation(token: string) {
  return useQuery({
    queryKey: debtorConfirmationQueryKey(token),
    queryFn: () => fetchDebtorConfirmation(token),
    enabled: token.length > 0,
    staleTime: Infinity,
    retry: (failureCount, error) =>
      !(error instanceof DebtorConfirmationError && error.kind !== "unknown") &&
      failureCount < 2,
  });
}

/** Submits the debtor's confirm or reject decision. */
export function useSubmitDebtorDecision(token: string) {
  return useMutation({
    mutationFn: (decision: DebtorDecision) => submitDebtorConfirmation(token, decision),
  });
}
