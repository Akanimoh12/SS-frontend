import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VaultReconciliationView } from "../VaultReconciliationView";
import { useVaultReconciliation } from "@/hooks/useVaultReconciliation";
import type { VaultReconciliationData } from "@/lib/analytics/vaultReconciliation";

vi.mock("@/hooks/useVaultReconciliation", () => ({
  useVaultReconciliation: vi.fn(),
}));

const mockHook = vi.mocked(useVaultReconciliation);
const refetch = vi.fn();

function data(overrides: Partial<VaultReconciliationData> = {}): VaultReconciliationData {
  return {
    contract_balance: 150,
    checked_at: "2026-11-21T00:00:00Z",
    vaults: [
      { invoice_id: "inv-1", invoice_title: "Open invoice", balance: 100, lifetime_in: 200, lifetime_out: 100, status: "open" },
      { invoice_id: "inv-2", invoice_title: "Closed invoice", balance: 50, lifetime_in: 90, lifetime_out: 40, status: "closed" },
    ],
    ...overrides,
  };
}

function setHook(value: ReturnType<typeof useVaultReconciliation>) {
  mockHook.mockReturnValue(value);
}

beforeEach(() => {
  refetch.mockClear();
  setHook({ data: data(), isLoading: false, isError: false, isFetching: false, refetch } as unknown as ReturnType<typeof useVaultReconciliation>);
});

describe("VaultReconciliationView", () => {
  it("shows pass when the difference is zero", () => {
    render(<VaultReconciliationView />);
    expect(screen.getByTestId("reconciliation-pass")).toBeInTheDocument();
    expect(screen.queryByTestId("reconciliation-fail")).not.toBeInTheDocument();
  });

  it("shows fail with the amount when balances differ", () => {
    setHook({ data: data({ contract_balance: 160 }), isLoading: false, isError: false, isFetching: false, refetch } as unknown as ReturnType<typeof useVaultReconciliation>);
    render(<VaultReconciliationView />);

    const fail = screen.getByTestId("reconciliation-fail");
    expect(fail).toBeInTheDocument();
    expect(fail).toHaveTextContent("10.00 XLM");
  });

  it("highlights non-zero vaults on closed invoices", () => {
    render(<VaultReconciliationView />);
    expect(screen.getByTestId("stale-vault-inv-2")).toBeInTheDocument();
    expect(screen.queryByTestId("stale-vault-inv-1")).not.toBeInTheDocument();
  });

  it("sorts by balance descending then ascending", () => {
    render(<VaultReconciliationView />);

    const firstRow = () => screen.getAllByTestId(/^vault-row-/)[0];
    expect(firstRow()).toHaveAttribute("data-testid", "vault-row-inv-1");

    fireEvent.click(screen.getByTestId("sort-balance"));
    expect(firstRow()).toHaveAttribute("data-testid", "vault-row-inv-2");
  });

  it("sorts by lifetime totals", () => {
    render(<VaultReconciliationView />);
    fireEvent.click(screen.getByTestId("sort-lifetime_in"));
    expect(screen.getAllByTestId(/^vault-row-/)[0]).toHaveAttribute("data-testid", "vault-row-inv-1");
  });

  it("calls refetch from the Refresh button", () => {
    render(<VaultReconciliationView />);
    fireEvent.click(screen.getByTestId("vault-reconciliation-refresh"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders an explicit unavailable state on error", () => {
    setHook({ data: undefined, isLoading: false, isError: true, isFetching: false, refetch } as unknown as ReturnType<typeof useVaultReconciliation>);
    render(<VaultReconciliationView />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
  });
});
