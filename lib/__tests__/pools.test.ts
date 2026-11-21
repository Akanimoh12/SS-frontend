import { describe, it, expect } from "vitest";
import {
  allocatePool,
  buildYieldCurvePoints,
  calculatePoolYieldAtUtilization,
  getCurveSlopes,
  weightedAverageYield,
  type PoolRateModelParams,
} from "../pools";
import type { PoolInvoice } from "../api";

const basket: PoolInvoice[] = [
  { invoice_id: "a", name: "A", sector: "sme", weight: 50, yield_percentage: 10 },
  { invoice_id: "b", name: "B", sector: "real_estate", weight: 30, yield_percentage: 8 },
  { invoice_id: "c", name: "C", sector: "trade_finance", weight: 20, yield_percentage: 5 },
];

describe("weightedAverageYield", () => {
  it("weights each yield by its share of the pool", () => {
    expect(weightedAverageYield(basket)).toBeCloseTo(8.4);
  });

  it("returns 0 for an empty pool", () => {
    expect(weightedAverageYield([])).toBe(0);
  });
});

describe("allocatePool", () => {
  it("splits the amount pro rata by weight", () => {
    expect(allocatePool(1000, basket).map((a) => a.amount)).toEqual([500, 300, 200]);
  });

  it("always sums to the amount entered", () => {
    const thirds: PoolInvoice[] = [1, 2, 3].map((n) => ({
      invoice_id: String(n),
      name: String(n),
      sector: "sme",
      weight: 100 / 3,
      yield_percentage: 5,
    }));
    const total = allocatePool(100, thirds).reduce((sum, a) => sum + Math.round(a.amount * 100), 0);
    expect(total).toBe(10000);
  });

  it("returns zero allocations for a non-positive amount", () => {
    expect(allocatePool(0, basket).every((a) => a.amount === 0)).toBe(true);
  });
});

describe("pool yield curve calculations (#598)", () => {
  const modelParams: PoolRateModelParams = {
    base_rate: 4,
    kink_utilization: 80,
    slope_1: 6,
    slope_2: 20,
  };

  it("computes the exact base rate, kink rate, and max rate", () => {
    expect(calculatePoolYieldAtUtilization(0, modelParams)).toBe(4);
    expect(calculatePoolYieldAtUtilization(40, modelParams)).toBe(7);
    expect(calculatePoolYieldAtUtilization(80, modelParams)).toBe(10);
    expect(calculatePoolYieldAtUtilization(90, modelParams)).toBe(20);
    expect(calculatePoolYieldAtUtilization(100, modelParams)).toBe(30);
  });

  it("shows a steeper post-kink slope than pre-kink slope", () => {
    const slopes = getCurveSlopes(modelParams);
    expect(slopes.preKinkSlope).toBeCloseTo(0.075);
    expect(slopes.postKinkSlope).toBeCloseTo(1.0);
    expect(slopes.postKinkSlope).toBeGreaterThan(slopes.preKinkSlope);
    expect(slopes.kinkRate).toBe(10);
    expect(slopes.maxRate).toBe(30);
  });

  it("includes the kink point in the generated curve points", () => {
    const nonAlignedParams: PoolRateModelParams = {
      ...modelParams,
      kink_utilization: 73,
    };
    const points = buildYieldCurvePoints(nonAlignedParams, 10);
    const kinkPoint = points.find((pt) => pt.isKink);
    expect(kinkPoint).toBeDefined();
    expect(kinkPoint?.utilization).toBe(73);
    expect(kinkPoint?.rate).toBe(10);
  });
});
