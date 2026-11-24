"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectAuction } from "@/lib/analytics/rateAuction";
import { fetchRateAuction } from "@/lib/api";

export function rateAuctionQueryKey(invoiceId: string) {
  return ["invoice", invoiceId, "rate-auction"] as const;
}

/**
 * Live auction projection for issue #594.
 *
 * Only the clock is local state. One interval drives all time-based values,
 * and it stops when the auction closes so a closed page does no needless work.
 */
export function useRateAuction(invoiceId: string) {
  const query = useQuery({
    queryKey: rateAuctionQueryKey(invoiceId),
    queryFn: () => fetchRateAuction(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 1000,
    refetchOnWindowFocus: false,
  });

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!query.data || query.data.status !== "active") return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [query.data]);

  const view = useMemo(
    () => (query.data ? projectAuction(query.data, nowMs) : null),
    [query.data, nowMs],
  );

  return { ...query, view };
}
