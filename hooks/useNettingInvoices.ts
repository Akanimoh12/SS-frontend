"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNettingInvoices } from "@/lib/api";
import { useAuth } from "./useAuth";

export const NETTING_INVOICES_QUERY_KEY = ["issuer", "netting", "invoices"] as const;

/** Invoice candidates that can be grouped into a netting agreement (#595). */
export function useNettingInvoices() {
  const { jwt } = useAuth();

  return useQuery({
    queryKey: NETTING_INVOICES_QUERY_KEY,
    queryFn: () => fetchNettingInvoices(jwt ?? undefined),
    enabled: Boolean(jwt),
    refetchOnWindowFocus: false,
  });
}
