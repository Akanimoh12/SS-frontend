import { describe, it, expect } from "vitest";
import {
  canCancel,
  canSettle,
  computeNetPreview,
  selectableInvoices,
  withConsent,
  withStatus,
  type NettingAgreement,
  type NettingInvoice,
} from "../netting";

function invoice(overrides: Partial<NettingInvoice>): NettingInvoice {
  return {
    id: "inv-1",
    title: "Invoice 1",
    debtor: "Debtor A",
    direction: "payable",
    amount: 100,
    status: "open",
    investors: [{ address: "GINV1", amount: 100 }],
    ...overrides,
  };
}

function agreement(overrides: Partial<NettingAgreement> = {}): NettingAgreement {
  return {
    id: "agr-1",
    debtor: "Debtor A",
    creditor: "Issuer",
    status: "pending",
    issuerConsent: false,
    debtorConsent: false,
    invoices: [],
    createdAt: "2026-11-21T00:00:00Z",
    ...overrides,
  };
}

describe("selectableInvoices", () => {
  it("blocks settled and disputed invoices with a reason", () => {
    const result = selectableInvoices([
      invoice({ id: "open", status: "open" }),
      invoice({ id: "funded", status: "funded" }),
      invoice({ id: "settled", status: "settled" }),
      invoice({ id: "disputed", status: "disputed" }),
    ]);

    expect(result.eligible.map((item) => item.id)).toEqual(["open", "funded"]);
    expect(result.blocked.map((item) => item.reason)).toEqual(["Already settled", "Under dispute"]);
  });
});

describe("computeNetPreview", () => {
  it("net amount is the difference of the gross amounts, issuer pays", () => {
    const preview = computeNetPreview([
      invoice({ id: "a", direction: "payable", amount: 150 }),
      invoice({ id: "b", direction: "receivable", amount: 100 }),
    ]);

    expect(preview.grossPayable).toBe(150);
    expect(preview.grossReceivable).toBe(100);
    expect(preview.netAmount).toBe(50);
    expect(preview.payer).toBe("issuer");
  });

  it("debtor pays when the receivable side is larger", () => {
    const preview = computeNetPreview([
      invoice({ id: "a", direction: "payable", amount: 40 }),
      invoice({ id: "b", direction: "receivable", amount: 90 }),
    ]);
    expect(preview.netAmount).toBe(50);
    expect(preview.payer).toBe("debtor");
  });

  it("no payment is due when gross sides match", () => {
    const preview = computeNetPreview([
      invoice({ id: "a", direction: "payable", amount: 75 }),
      invoice({ id: "b", direction: "receivable", amount: 75 }),
    ]);
    expect(preview.netAmount).toBe(0);
    expect(preview.payer).toBeNull();
    expect(preview.allocations).toEqual([]);
  });

  it("ignores settled and disputed invoices in the preview", () => {
    const preview = computeNetPreview([
      invoice({ id: "a", direction: "payable", amount: 150 }),
      invoice({ id: "b", direction: "receivable", amount: 100, status: "settled" }),
      invoice({ id: "c", direction: "receivable", amount: 200, status: "disputed" }),
    ]);
    expect(preview.grossReceivable).toBe(0);
    expect(preview.netAmount).toBe(150);
  });

  it("allocates the net across investors so the table sums exactly", () => {
    const preview = computeNetPreview([
      invoice({
        id: "a",
        direction: "payable",
        amount: 150,
        investors: [
          { address: "G1", amount: 25 },
          { address: "G2", amount: 75 },
        ],
      }),
      invoice({ id: "b", direction: "receivable", amount: 100 }),
    ]);

    expect(preview.allocations.map((item) => item.address)).toEqual(["G1", "G2"]);
    const total = preview.allocations.reduce((sum, item) => sum + item.amount, 0);
    expect(total).toBe(preview.netAmount);
  });

  it("splits allocation across multiple paying invoices proportionally", () => {
    const preview = computeNetPreview([
      invoice({
        id: "a",
        direction: "payable",
        amount: 100,
        investors: [{ address: "G1", amount: 100 }],
      }),
      invoice({
        id: "b",
        direction: "payable",
        amount: 300,
        investors: [{ address: "G2", amount: 300 }],
      }),
      invoice({ id: "c", direction: "receivable", amount: 200 }),
    ]);

    expect(preview.netAmount).toBe(200);
    expect(preview.allocations.map((item) => item.address)).toEqual(["G1", "G2"]);
    expect(preview.allocations[0].amount).toBe(50);
    expect(preview.allocations[1].amount).toBe(150);
    expect(preview.allocations.reduce((sum, item) => sum + item.amount, 0)).toBe(200);
  });

  it("uses an Unallocated row when investor data is missing", () => {
    const preview = computeNetPreview([
      invoice({ id: "a", direction: "payable", amount: 100, investors: [] }),
    ]);
    expect(preview.allocations).toEqual([{ address: "Unallocated", amount: 100 }]);
  });
});

describe("agreement state rules", () => {
  it("allows settle only when pending and both parties consent", () => {
    expect(canSettle(agreement())).toBe(false);
    expect(canSettle(agreement({ issuerConsent: true }))).toBe(false);
    expect(canSettle(agreement({ issuerConsent: true, debtorConsent: true }))).toBe(true);
    expect(
      canSettle(agreement({ status: "settled", issuerConsent: true, debtorConsent: true })),
    ).toBe(false);
  });

  it("allows cancel until the agreement is terminal", () => {
    expect(canCancel(agreement())).toBe(true);
    expect(canCancel(agreement({ status: "draft" }))).toBe(true);
    expect(canCancel(agreement({ status: "settled" }))).toBe(false);
    expect(canCancel(agreement({ status: "cancelled" }))).toBe(false);
  });

  it("withConsent and withStatus return new objects", () => {
    const original = agreement();
    const consented = withConsent(original, "issuer", true);

    expect(consented.issuerConsent).toBe(true);
    expect(original.issuerConsent).toBe(false);
    expect(withStatus(consented, "settled").status).toBe("settled");
    expect(consented.status).toBe("pending");
  });
});
