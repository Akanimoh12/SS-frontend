"use client";

import { useContext } from "react";
import { QueryClient, QueryClientContext, useQuery } from "@tanstack/react-query";
import { fetchIssuerTier } from "@/lib/api";
import type { IssuerTierStatus } from "@/lib/issuers";

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export function issuerTierQueryKey(address?: string | null) {
  return ["issuer-tier", address ?? ""] as const;
}

/**
 * Reads an issuer's on-chain tier (Bronze, Silver, Gold), configured limits,
 * settlement/late/default history counts, next-tier requirements, and any
 * demotion notice (#604).
 */
export function useIssuerTier(address?: string | null) {
  const contextClient = useContext(QueryClientContext);
  const queryClient = contextClient ?? fallbackQueryClient;

  const query = useQuery<IssuerTierStatus | null>(
    {
      queryKey: issuerTierQueryKey(address),
      queryFn: () => fetchIssuerTier(address as string),
      enabled: Boolean(address),
      staleTime: 60_000,
    },
    queryClient,
  );

  const status = query.data ?? null;

  return {
    ...query,
    status,
    tier: status?.tier ?? null,
    limits: status?.limits ?? null,
    history: status?.history ?? null,
    nextTierRequirements: status?.next_tier_requirements ?? null,
    demotion: status?.demotion ?? null,
  };
}
