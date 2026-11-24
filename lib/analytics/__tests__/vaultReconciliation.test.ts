import { describe, it, expect } from "vitest";
import {
  isStaleClosedVault,
  sortVaults,
  summarizeReconciliation,
  type VaultReconciliationData,
  type VaultRow,
} from "../vaultReconciliation";

function vault(overrides: Partial<VaultRow>): VaultRow {
  return {
    invoice_id: "inv-1",
    balance: 100,
    lifetime_in: 200,
    lifetime_out: 100,
    status: "open",
    ...overrides,
  };
}

function data(overrides: Partial<VaultReconciliationData>): VaultReconciliationData {
  return {
    contract_balance: 100,
    vaults: [vault({})],
    checked_at: "2026-11-21T00:00:00Z",
    ...overrides,
  };
}

describe("summarizeReconciliation", () => {
  const cases: Array<[string, number, VaultRow[], boolean, number]> = [
    ["zero difference passes", 100, [vault({ balance: 100 })], true, 0],
    ["positive difference fails", 120, [vault({ balance: 100 })], false, 20],
    ["negative difference fails", 80, [vault({ balance: 100 })], false, -20],
    ["empty vault list fails against a funded contract", 50, [], false, 50],
    ["multiple vaults are summed", 150, [vault({ invoice_id: "a", balance: 100 }), vault({ invoice_id: "b", balance: 50 })], true, 0],
  ];

  it.each(cases)("%s", (_label, contractBalance, vaults, passed, difference) => {
    const summary = summarizeReconciliation(data({ contract_balance: contractBalance, vaults }));
    expect(summary.passed).toBe(passed);
    expect(summary.difference).toBe(difference);
    expect(summary.vaultCount).toBe(vaults.length);
    expect(summary.checkedAt).toBe("2026-11-21T00:00:00Z");
  });
});

describe("isStaleClosedVault", () => {
  const cases: Array<[string, VaultRow, boolean]> = [
    ["closed with balance", vault({ status: "closed", balance: 10 }), true],
    ["settled with balance", vault({ status: "settled", balance: 10 }), true],
    ["closed with zero balance", vault({ status: "closed", balance: 0 }), false],
    ["open with balance", vault({ status: "open", balance: 10 }), false],
    ["funded with balance", vault({ status: "funded", balance: 10 }), false],
    ["defaulted with balance", vault({ status: "defaulted", balance: 10 }), false],
  ];

  it.each(cases)("%s -> %s", (label, row, expected) => {
    expect(isStaleClosedVault(row), label).toBe(expected);
  });
});

describe("sortVaults", () => {
  const rows = [
    vault({ invoice_id: "a", balance: 5, lifetime_in: 90, lifetime_out: 10 }),
    vault({ invoice_id: "b", balance: 20, lifetime_in: 30, lifetime_out: 15 }),
    vault({ invoice_id: "c", balance: 12, lifetime_in: 60, lifetime_out: 5 }),
  ];

  it("sorts by balance descending by default", () => {
    expect(sortVaults(rows, "balance").map((row) => row.invoice_id)).toEqual(["b", "c", "a"]);
  });

  it("sorts ascending when requested", () => {
    expect(sortVaults(rows, "balance", false).map((row) => row.invoice_id)).toEqual(["a", "c", "b"]);
  });

  it("sorts by lifetime totals", () => {
    expect(sortVaults(rows, "lifetime_in").map((row) => row.invoice_id)).toEqual(["a", "c", "b"]);
    expect(sortVaults(rows, "lifetime_out").map((row) => row.invoice_id)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the input", () => {
    const copy = [...rows];
    sortVaults(rows, "balance");
    expect(rows).toEqual(copy);
  });
});
