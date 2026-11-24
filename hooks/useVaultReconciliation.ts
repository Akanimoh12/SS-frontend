"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVaultReconciliation } from "@/lib/api";
import { useAuth } from "./useAuth";

export const VAULT_RECONCILIATION_QUERY_KEY = ["admin", "vaults", "reconciliation"] as const;

/** Vault snapshot plus contract balance for the admin reconciliation view (#596). */
export function useVaultReconciliation() {
  const { jwt } = useAuth();

  return useQuery({
    queryKey: VAULT_RECONCILIATION_QUERY_KEY,
    queryFn: () => fetchVaultReconciliation(jwt ?? undefined),
    enabled: Boolean(jwt),
    refetchOnWindowFocus: false,
  });
}
