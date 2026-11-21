import { describe, it, expect } from "vitest";
import {
  buildRateLadder,
  formatCountdown,
  formatRate,
  projectAuction,
  type RateAuctionData,
} from "../rateAuction";

const START = Date.parse("2026-11-21T00:00:00Z");

function auction(overrides: Partial<RateAuctionData> = {}): RateAuctionData {
  return {
    invoice_id: "inv-1",
    status: "active",
    start_rate: 4,
    max_rate: 6,
    step_bps: 50,
    step_seconds: 60,
    started_at: "2026-11-21T00:00:00Z",
    funded_percent: 40,
    ...overrides,
  };
}

describe("buildRateLadder", () => {
  it("builds inclusive steps from start to maximum", () => {
    expect(buildRateLadder(auction()).map((step) => step.rate)).toEqual([4, 4.5, 5, 5.5, 6]);
  });

  it("caps oversized ladders", () => {
    const steps = buildRateLadder(
      auction({ start_rate: 0, max_rate: 1000, step_bps: 1 }),
    );
    expect(steps).toHaveLength(200);
  });

  it("handles invalid or inverted ranges", () => {
    expect(buildRateLadder(auction({ step_bps: 0 }))).toEqual([{ index: 0, rate: 4 }]);
    expect(buildRateLadder(auction({ max_rate: 3 }))).toEqual([{ index: 0, rate: 4 }]);
    expect(buildRateLadder(auction({ start_rate: Number.NaN }))).toEqual([]);
  });
});

describe("projectAuction", () => {
  const cases: Array<[string, number, number, number | null]> = [
    ["at start", START, 4, 60],
    ["just before first step", START + 59_000, 4, 1],
    ["at first step", START + 60_000, 4.5, 60],
    ["at third step", START + 180_000, 5.5, 60],
    ["at maximum", START + 240_000, 6, null],
    ["beyond maximum", START + 600_000, 6, null],
  ];

  it.each(cases)("%s -> rate %s, next in %s", (_label, now, rate, next) => {
    const view = projectAuction(auction(), now);
    expect(view.currentRate).toBe(rate);
    expect(view.nextStepInSeconds).toBe(next);
  });

  it("reports the maximum and funded percentage", () => {
    const view = projectAuction(auction(), START + 60_000);
    expect(view.maxRate).toBe(6);
    expect(view.fundedPercent).toBe(40);
    expect(view.currentStepIndex).toBe(1);
  });

  it("freezes a closed filled auction", () => {
    const view = projectAuction(auction({ status: "closed_filled" }), START + 10_000);
    expect(view.isClosed).toBe(true);
    expect(view.isUnfilled).toBe(false);
    expect(view.nextStepInSeconds).toBeNull();
    expect(view.currentRate).toBe(4);
  });

  it("marks an unfilled outcome", () => {
    const view = projectAuction(auction({ status: "closed_unfilled" }), START);
    expect(view.isUnfilled).toBe(true);
  });

  it("degrades safely with a bad start time", () => {
    const view = projectAuction(auction({ started_at: "bad" }), START);
    expect(view.currentRate).toBe(4);
    expect(view.nextStepInSeconds).toBeNull();
  });
});

describe("formatting", () => {
  it("formats rates with two decimals", () => {
    expect(formatRate(4.5)).toBe("4.50%");
    expect(formatRate(0)).toBe("0.00%");
  });

  it("formats countdowns", () => {
    expect(formatCountdown(null)).toBe("Final step");
    expect(formatCountdown(0)).toBe("0m 00s");
    expect(formatCountdown(59)).toBe("0m 59s");
    expect(formatCountdown(60)).toBe("1m 00s");
    expect(formatCountdown(125)).toBe("2m 05s");
  });
});
