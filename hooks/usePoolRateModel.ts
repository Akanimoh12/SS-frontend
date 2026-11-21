"use client";

import { useContext } from "react";
import { QueryClient, QueryClientContext, useQuery } from "@tanstack/react-query";
import { fetchPoolRateModel } from "@/lib/api";
import type { PoolRateModel, PoolRateModelParams } from "@/lib/pools";

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export function poolRateModelQueryKey(poolId: string) {
  return ["pool-rate-model", poolId] as const;
}

/**
 * Fetches a pool's dynamic utilization rate model parameters, current
 * utilization percentage, and current yield rate (#598).
 */
export function usePoolRateModel(poolId: string) {
  const contextClient = useContext(QueryClientContext);
  const query = useQuery<PoolRateModel>(
    {
      queryKey: poolRateModelQueryKey(poolId),
      queryFn: () => fetchPoolRateModel(poolId),
      enabled: Boolean(poolId),
      staleTime: 30_000,
    },
    contextClient ?? fallbackQueryClient,
  );

  const parameters: PoolRateModelParams | null = query.data
    ? {
        base_rate: query.data.base_rate,
        kink_utilization: query.data.kink_utilization,
        slope_1: query.data.slope_1,
        slope_2: query.data.slope_2,
      }
    : null;

  return {
    ...query,
    model: query.data ?? null,
    parameters,
    currentUtilization: query.data?.current_utilization ?? null,
    currentRate: query.data?.current_rate ?? null,
  };
}
