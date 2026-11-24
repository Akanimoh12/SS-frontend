import { describe, it, expect } from "vitest";
import {
  buildConcentrationGroups,
  DEFAULT_CONCENTRATION_THRESHOLD,
  resolveMaturityBucket,
  sharesSumTo100,
  UNSPECIFIED_LABEL,
  type ConcentrationPosition,
  type ConcentrationTab,
} from "../concentration";

const NOW = Date.parse("2026-11-21T00:00:00Z");

function position(overrides: Partial<ConcentrationPosition>): ConcentrationPosition {
  return {
    invoice_id: "inv-1",
    invoice_title: "Invoice 1",
    committed_amount: 100,
    status: "active",
    ...overrides,
  };
}

describe("buildConcentrationGroups", () => {
  const cases: Array<[ConcentrationTab, ConcentrationPosition[], string[], number[]]> = [
    [
      "debtor",
      [
        position({ invoice_id: "a", debtor: "Acme", committed_amount: 60 }),
        position({ invoice_id: "b", debtor: "Globex", committed_amount: 40 }),
      ],
      ["Acme", "Globex"],
      [60, 40],
    ],
    [
      "jurisdiction",
      [
        position({ invoice_id: "a", jurisdiction: "NG", committed_amount: 70 }),
        position({ invoice_id: "b", jurisdiction: "US", committed_amount: 30 }),
      ],
      ["NG", "US"],
      [70, 30],
    ],
    [
      "maturity",
      [
        position({ invoice_id: "a", maturity_bucket: "Short", committed_amount: 80 }),
        position({ invoice_id: "b", maturity_bucket: "Long", committed_amount: 20 }),
      ],
      ["Short", "Long"],
      [80, 20],
    ],
  ];

  it.each(cases)("groups by %s and computes shares", (tab, positions, labels, shares) => {
    const groups = buildConcentrationGroups(positions, tab, DEFAULT_CONCENTRATION_THRESHOLD, NOW);
    expect(groups.map((group) => group.label)).toEqual(labels);
    expect(groups.map((group) => group.sharePercent)).toEqual(shares);
    expect(sharesSumTo100(groups)).toBe(true);
  });

  it("switches grouping without changing the underlying positions", () => {
    const positions = [
      position({ invoice_id: "a", debtor: "Acme", jurisdiction: "NG", committed_amount: 50 }),
      position({ invoice_id: "b", debtor: "Acme", jurisdiction: "US", committed_amount: 50 }),
    ];

    const byDebtor = buildConcentrationGroups(positions, "debtor", 25, NOW);
    const byJurisdiction = buildConcentrationGroups(positions, "jurisdiction", 25, NOW);

    expect(byDebtor).toHaveLength(1);
    expect(byDebtor[0].sharePercent).toBe(100);
    expect(byJurisdiction.map((group) => group.label).sort()).toEqual(["NG", "US"]);
  });

  it("flags shares strictly above the threshold", () => {
    const positions = [
      position({ invoice_id: "a", debtor: "A", committed_amount: 80 }),
      position({ invoice_id: "b", debtor: "B", committed_amount: 20 }),
    ];

    const groups = buildConcentrationGroups(positions, "debtor", 25, NOW);

    expect(groups[0].warning).toBe(true);
    expect(groups[1].warning).toBe(false);
  });

  it("does not flag a share exactly at the threshold", () => {
    const groups = buildConcentrationGroups(
      [position({ debtor: "A", committed_amount: 25 }), position({ debtor: "B", committed_amount: 75 })],
      "debtor",
      25,
      NOW,
    );
    expect(groups.find((group) => group.label === "A")?.warning).toBe(false);
  });

  it("assigns rounding drift so shares sum to exactly 100", () => {
    const positions = Array.from({ length: 3 }, (_, index) =>
      position({ invoice_id: `inv-${index}`, debtor: `D${index}`, committed_amount: 1 }),
    );
    const groups = buildConcentrationGroups(positions, "debtor", 25, NOW);

    expect(sharesSumTo100(groups)).toBe(true);
    expect(groups.reduce((sum, group) => sum + group.sharePercent, 0)).toBe(100);
  });

  it("groups missing dimensions as Unspecified", () => {
    const groups = buildConcentrationGroups([position({ debtor: null })], "debtor", 25, NOW);
    expect(groups[0].label).toBe(UNSPECIFIED_LABEL);
  });

  it("ignores settled positions and non-positive amounts", () => {
    const groups = buildConcentrationGroups(
      [
        position({ invoice_id: "a", debtor: "Open", committed_amount: 100 }),
        position({ invoice_id: "b", debtor: "Settled", status: "settled", committed_amount: 900 }),
        position({ invoice_id: "c", debtor: "Zero", committed_amount: 0 }),
      ],
      "debtor",
      25,
      NOW,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Open");
  });

  it("returns an empty list for an empty portfolio", () => {
    expect(buildConcentrationGroups([], "debtor", 25, NOW)).toEqual([]);
    expect(sharesSumTo100([])).toBe(true);
  });
});

describe("resolveMaturityBucket", () => {
  const cases: Array<[string, string, string]> = [
    ["2026-11-20T00:00:00Z", "Matured", "past dates are matured"],
    ["2026-11-21T00:00:00Z", "Matured", "today is matured"],
    ["2026-12-10T00:00:00Z", "0 to 30 days", "within 30 days"],
    ["2027-01-10T00:00:00Z", "31 to 90 days", "within 90 days"],
    ["2027-10-01T00:00:00Z", "91 to 365 days", "within a year"],
    ["2028-01-01T00:00:00Z", "Over 1 year", "over a year"],
  ];

  it.each(cases)("%s -> %s", (lockup, expected) => {
    expect(resolveMaturityBucket(position({ lockup_expires_at: lockup }), NOW)).toBe(expected);
  });

  it("uses an explicit bucket when supplied", () => {
    expect(
      resolveMaturityBucket(position({ maturity_bucket: "Custom", lockup_expires_at: "bad" }), NOW),
    ).toBe("Custom");
  });

  it("returns Unspecified for missing or invalid dates", () => {
    expect(resolveMaturityBucket(position({}), NOW)).toBe(UNSPECIFIED_LABEL);
    expect(resolveMaturityBucket(position({ lockup_expires_at: "not-a-date" }), NOW)).toBe(
      UNSPECIFIED_LABEL,
    );
  });
});
