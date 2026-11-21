"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  drawCreditLine,
  fetchCreditLine,
  repayCreditLine,
} from "@/lib/api/creditLine";
import type { CreditLine } from "@/lib/creditLine";

export const CREDIT_LINE_QUERY_KEY = ["issuer", "credit-line"] as const;

export function useCreditLine() {
  return useQuery({
    queryKey: CREDIT_LINE_QUERY_KEY,
    queryFn: fetchCreditLine,
    staleTime: 30_000,
    retry: false,
  });
}

function useCreditLineMutation(
  action: (amount: number) => Promise<CreditLine | null>,
  successMessage: string,
  errorMessage: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (line) => {
      queryClient.setQueryData(CREDIT_LINE_QUERY_KEY, line);
      void queryClient.invalidateQueries({ queryKey: CREDIT_LINE_QUERY_KEY });
      toast.success(successMessage);
    },
    onError: () => {
      toast.error(errorMessage);
    },
  });
}

export function useDrawCreditLine() {
  return useCreditLineMutation(drawCreditLine, "Credit drawn successfully", "Could not draw credit");
}

export function useRepayCreditLine() {
  return useCreditLineMutation(repayCreditLine, "Repayment recorded", "Could not record repayment");
}
