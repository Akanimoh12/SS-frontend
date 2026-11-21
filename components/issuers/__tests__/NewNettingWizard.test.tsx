import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NewNettingWizard } from "../NewNettingWizard";
import type { NettingInvoice } from "@/lib/analytics/netting";
import type { ProposeNettingInput } from "@/lib/api";

function invoice(overrides: Partial<NettingInvoice>): NettingInvoice {
  return {
    id: "inv-1",
    title: "Invoice 1",
    debtor: "Debtor A",
    direction: "payable",
    amount: 100,
    status: "open",
    investors: [{ address: "G1", amount: 100 }],
    ...overrides,
  };
}

const invoices = [
  invoice({ id: "pay", direction: "payable", amount: 150 }),
  invoice({ id: "recv", direction: "receivable", amount: 100 }),
  invoice({ id: "settled", direction: "payable", status: "settled", amount: 999 }),
  invoice({ id: "disputed", direction: "receivable", status: "disputed", amount: 999 }),
];

describe("NewNettingWizard", () => {
  it("disables settled and disputed invoices", () => {
    render(
      <NewNettingWizard invoices={invoices} creditor="Issuer" onPropose={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId("netting-invoice-pay")).toBeEnabled();
    expect(screen.getByTestId("netting-invoice-recv")).toBeEnabled();
    expect(screen.getByTestId("netting-invoice-settled")).toBeDisabled();
    expect(screen.getByTestId("netting-invoice-disputed")).toBeDisabled();
  });

  it("requires invoices on both sides before proposing", () => {
    render(
      <NewNettingWizard invoices={invoices} creditor="Issuer" onPropose={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId("netting-propose")).toBeDisabled();
    fireEvent.click(screen.getByTestId("netting-invoice-pay"));
    expect(screen.getByTestId("netting-propose")).toBeDisabled();
  });

  it("previews the net and proposes the selected invoices", async () => {
    const onPropose = vi.fn().mockResolvedValue(undefined);
    render(
      <NewNettingWizard invoices={invoices} creditor="Issuer" onPropose={onPropose} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByTestId("netting-invoice-pay"));
    fireEvent.click(screen.getByTestId("netting-invoice-recv"));

    expect(screen.getByTestId("net-preview")).toBeInTheDocument();
    expect(screen.getByTestId("net-amount")).toHaveTextContent("50.00 XLM");

    fireEvent.click(screen.getByTestId("netting-propose"));
    await waitFor(() => expect(onPropose).toHaveBeenCalledTimes(1));
    const input = onPropose.mock.calls[0][0] as ProposeNettingInput;
    expect(input.debtor).toBe("Debtor A");
    expect(input.creditor).toBe("Issuer");
    expect(input.invoices.map((item) => item.id).sort()).toEqual(["pay", "recv"]);
  });
});
