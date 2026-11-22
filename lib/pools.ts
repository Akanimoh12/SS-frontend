import type { PoolInvoice } from "@/lib/api";

/** Weighted average yield of a basket, in percent. */
export function weightedAverageYield(invoices: PoolInvoice[]): number {
  const totalWeight = invoices.reduce((sum, inv) => sum + inv.weight, 0);
  if (totalWeight <= 0) return 0;
  return (
    invoices.reduce((sum, inv) => sum + inv.yield_percentage * inv.weight, 0) /
    totalWeight
  );
}

export interface PoolAllocation {
  invoice_id: string;
  name: string;
  amount: number;
}

/**
 * Splits `amount` across the basket pro rata by weight, in whole cents.
 * Rounding leftovers go to the largest-remainder rows so the split always
 * sums to exactly the amount entered.
 */
export function allocatePool(amount: number, invoices: PoolInvoice[]): PoolAllocation[] {
  const totalWeight = invoices.reduce((sum, inv) => sum + inv.weight, 0);
  if (!(amount > 0) || totalWeight <= 0) {
    return invoices.map((inv) => ({ invoice_id: inv.invoice_id, name: inv.name, amount: 0 }));
  }

  const totalCents = Math.round(amount * 100);
  const exact = invoices.map((inv) => (totalCents * inv.weight) / totalWeight);
  const cents = exact.map((value) => Math.floor(value));
  let leftover = totalCents - cents.reduce((sum, value) => sum + value, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    cents[index] += 1;
    leftover -= 1;
  }

  return invoices.map((inv, index) => ({
    invoice_id: inv.invoice_id,
    name: inv.name,
    amount: cents[index] / 100,
  }));
}

/** Kinked utilization rate model parameters (#598). */
export interface PoolRateModelParams {
  /** Base annual yield percentage at 0% utilization. */
  base_rate: number;
  /** Utilization percentage (0-100) where the curve slope steepens. */
  kink_utilization: number;
  /** Total yield increase (in percentage points) across the pre-kink range [0, kink]. */
  slope_1: number;
  /** Total yield increase (in percentage points) across the post-kink range (kink, 100]. */
  slope_2: number;
}

export interface PoolRateModel extends PoolRateModelParams {
  pool_id: string;
  /** Current pool utilization percentage (0-100). */
  current_utilization: number;
  /** Current pool yield rate percentage at `current_utilization`. */
  current_rate: number;
}

export interface YieldCurvePoint {
  utilization: number;
  rate: number;
  isKink?: boolean;
}

/**
 * Calculates the pool yield rate (%) at a given utilization percentage (0-100)
 * using the two-slope kinked utilization model (#598).
 */
export function calculatePoolYieldAtUtilization(
  utilization: number,
  params: PoolRateModelParams,
): number {
  const u = Math.min(100, Math.max(0, utilization));
  const kink = Math.min(100, Math.max(0, params.kink_utilization));

  let rate: number;
  if (kink <= 0) {
    rate = params.base_rate + params.slope_1 + (u / 100) * params.slope_2;
  } else if (u <= kink) {
    rate = params.base_rate + (u / kink) * params.slope_1;
  } else {
    const postRange = 100 - kink;
    const postProgress = postRange > 0 ? (u - kink) / postRange : 0;
    rate = params.base_rate + params.slope_1 + postProgress * params.slope_2;
  }

  return Math.round(rate * 10000) / 10000;
}

/**
 * Returns the pre-kink slope, post-kink slope, kink rate, and maximum rate
 * for a kinked utilization rate model (#598).
 */
export function getCurveSlopes(params: PoolRateModelParams): {
  preKinkSlope: number;
  postKinkSlope: number;
  kinkRate: number;
  maxRate: number;
} {
  const kink = Math.min(100, Math.max(0, params.kink_utilization));
  const preKinkSlope = kink > 0 ? params.slope_1 / kink : 0;
  const postKinkSlope = kink < 100 ? params.slope_2 / (100 - kink) : 0;
  const kinkRate = calculatePoolYieldAtUtilization(kink, params);
  const maxRate = calculatePoolYieldAtUtilization(100, params);

  return {
    preKinkSlope: Math.round(preKinkSlope * 10000) / 10000,
    postKinkSlope: Math.round(postKinkSlope * 10000) / 10000,
    kinkRate,
    maxRate,
  };
}

/**
 * Builds sampled points from 0% to 100% utilization, always including the exact
 * kink utilization point so the slope change is accurately plotted (#598).
 */
export function buildYieldCurvePoints(
  params: PoolRateModelParams,
  step = 5,
): YieldCurvePoint[] {
  const safeStep = step > 0 ? step : 5;
  const kink = Math.min(100, Math.max(0, params.kink_utilization));
  const utilizations = new Set<number>([0, kink, 100]);

  for (let u = 0; u <= 100; u += safeStep) {
    utilizations.add(Math.min(100, Math.round(u * 100) / 100));
  }

  return Array.from(utilizations)
    .sort((a, b) => a - b)
    .map((u) => ({
      utilization: u,
      rate: calculatePoolYieldAtUtilization(u, params),
      isKink: Math.abs(u - kink) < 1e-6,
    }));
}
