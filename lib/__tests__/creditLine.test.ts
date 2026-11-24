import { describe, expect, it } from "vitest";
import {
  creditLineSegments,
  isFrozen,
  sortedHistory,
  validateDrawAmount,
  validateRepayAmount,
  type CreditLine,
} from "@/lib/creditLine";

function line(overrides: Partial<CreditLine> = {}): CreditLine {
  return {
    limit: 1000,
    drawn: 300,
    accruedInterest: 50,
    status: "open",
    currency: "XLM",
    history: [],
    ...overrides,
  };
}

describe("credit-line rules (#588)", () => {
  it("keeps gauge segments non-negative and summing to the limit", () => {
    for (const candidate of [
      line(),
      line({ drawn: 1200, accruedInterest: 100 }),
      line({ drawn: -50, accruedInterest: -20 }),
      line({ limit: 0, drawn: 10 }),
    ]) {
      const segments = creditLineSegments(candidate);
      expect(segments.drawn).toBeGreaterThanOrEqual(0);
      expect(segments.accrued).toBeGreaterThanOrEqual(0);
      expect(segments.available).toBeGreaterThanOrEqual(0);
      expect(segments.drawn + segments.accrued + segments.available).toBeCloseTo(
        Math.max(0, candidate.limit),
        6
      );
    }
  });

  it("blocks draws above the available amount", () => {
    expect(validateDrawAmount(line(), 650)).toEqual({ ok: true });
    expect(validateDrawAmount(line(), 650.01)).toEqual({ ok: false, problem: "exceeds-available" });
    expect(validateDrawAmount(line(), 0)).toEqual({ ok: false, problem: "not-positive" });
    expect(validateDrawAmount(line(), Number.NaN)).toEqual({ ok: false, problem: "not-a-number" });
  });

  it("blocks draws on a frozen line but keeps repayment enabled", () => {
    const frozen = line({ status: "frozen" });
    expect(isFrozen(frozen)).toBe(true);
    expect(validateDrawAmount(frozen, 10)).toEqual({ ok: false, problem: "frozen" });
    expect(validateRepayAmount(frozen, 10)).toEqual({ ok: true });
  });

  it("blocks repayment above the outstanding balance", () => {
    expect(validateRepayAmount(line(), 350)).toEqual({ ok: true });
    expect(validateRepayAmount(line(), 351)).toEqual({ ok: false, problem: "exceeds-outstanding" });
  });

  it("returns history newest first", () => {
    const rows = sortedHistory(
      line({
        history: [
          { id: "old", type: "draw", amount: 1, occurredAt: "2026-01-01T00:00:00Z" },
          { id: "new", type: "repay", amount: 2, occurredAt: "2026-02-01T00:00:00Z" },
        ],
      })
    );
    expect(rows.map((row) => row.id)).toEqual(["new", "old"]);
  });
});
