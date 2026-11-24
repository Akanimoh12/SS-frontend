"use client";

import { useMemo } from "react";
import {
  buildConcentrationGroups,
  DEFAULT_CONCENTRATION_THRESHOLD,
  type ConcentrationTab,
} from "@/lib/analytics/concentration";
import { usePortfolio } from "./usePortfolio";

/**
 * Group the investor's open positions by the selected concentration tab.
 * The grouping is a pure derivation of the portfolio query, so switching tabs
 * never triggers a fetch or a page reload (issue #597).
 */
export function usePortfolioConcentration(
  tab: ConcentrationTab = "debtor",
  threshold: number = DEFAULT_CONCENTRATION_THRESHOLD,
) {
  const { data, isLoading, isError, refetch } = usePortfolio();

  const groups = useMemo(
    () => buildConcentrationGroups(data?.positions ?? [], tab, threshold),
    [data, tab, threshold],
  );

  return {
    groups,
    isLoading,
    isError,
    refetch,
    isEmpty: !isLoading && groups.length === 0,
    tab,
    threshold,
  };
}
