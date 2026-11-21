"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNettingAgreements } from "@/lib/api";
import { useAuth } from "./useAuth";

export const NETTING_AGREEMENTS_QUERY_KEY = ["issuer", "netting", "agreements"] as const;

/** Issuer's netting agreements for issue #595. */
export function useNettingAgreements() {
  const { jwt } = useAuth();

  return useQuery({
    queryKey: NETTING_AGREEMENTS_QUERY_KEY,
    queryFn: () => fetchNettingAgreements(jwt ?? undefined),
    enabled: Boolean(jwt),
    refetchOnWindowFocus: false,
  });
}
