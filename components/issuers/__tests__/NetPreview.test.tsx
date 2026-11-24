import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NetPreview } from "../NetPreview";
import { computeNetPreview, type NettingInvoice } from "@/lib/analytics/netting";

function invoice(overrides: Partial<NettingInvoice>): NettingInvoice {
  return {
    id: "inv-1",
    title: "Invoice 1",
    debtor: "Debtor A",
    direction: "payable",
    amount: 100,
    status: "open",
    investors: [{ address: "G1", amount: 40 }, { address: "G2", amount: 60 }],
    ...overrides,
  };
}

describe("NetPreview", () => {
  it("shows gross amounts, net and who pays", () => {
    const preview = computeNetPreview([
      invoice({ id: "a", direction: "payable", amount: 150 }),
      invoice({ id: "b", direction: "receivable", amount: 100 }),
    ]);

    render(<NetPreview preview={preview} />);

    expect(screen.getByTestId("net-gross-payable")).toHaveTextContent("150.00 XLM");
    expect(screen.getByTestId("net-gross-receivable")).toHaveTextContent("100.00 XLM");
    expect(screen.getByTestId("net-amount")).toHaveTextContent("50.00 XLM");
    expect(screen.getByTestId("net-payer")).toHaveTextContent("You pay the net amount");
  });

  it("renders an allocation table whose total equals the net", () => {
    const preview = computeNetPreview([
      invoice({ id: "a", direction: "payable", amount: 150 }),
      invoice({ id: "b", direction: "receivable", amount: 100 }),
    ]);

    render(<NetPreview preview={preview} />);

    expect(screen.getByTestId("net-allocation-table")).toBeInTheDocument();
    expect(screen.getByTestId("net-allocation-total")).toHaveTextContent("50.00 XLM");
  });

  it("omits the allocation table when nothing is payable", () => {
    const preview = computeNetPreview([
      invoice({ id: "a", direction: "payable", amount: 50 }),
      invoice({ id: "b", direction: "receivable", amount: 50 }),
    ]);

    render(<NetPreview preview={preview} />);
    expect(screen.queryByTestId("net-allocation-table")).not.toBeInTheDocument();
  });
});
