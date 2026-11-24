import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CreditLinePage from "../page";
import type { CreditLine } from "@/lib/creditLine";

const { mockUseCreditLine, mockDraw, mockRepay } = vi.hoisted(() => ({
  mockUseCreditLine: vi.fn(),
  mockDraw: vi.fn(),
  mockRepay: vi.fn(),
}));

vi.mock("@/hooks/useCreditLine", () => ({
  useCreditLine: mockUseCreditLine,
  useDrawCreditLine: () => ({ mutateAsync: mockDraw }),
  useRepayCreditLine: () => ({ mutateAsync: mockRepay }),
}));

const line: CreditLine = {
  limit: 1000,
  drawn: 300,
  accruedInterest: 50,
  status: "open",
  currency: "XLM",
  history: [
    { id: "ev-1", type: "draw", amount: 300, occurredAt: "2026-11-01T10:00:00Z" },
  ],
};

beforeEach(() => {
  mockUseCreditLine.mockReturnValue({ data: line, isLoading: false, isError: false });
});

describe("CreditLinePage (#588)", () => {
  it("renders the gauge and a history row with type, amount and timestamp", () => {
    render(<CreditLinePage />);
    expect(screen.getByTestId("credit-line-page")).toBeInTheDocument();
    expect(screen.getByTestId("gauge-available-value")).toHaveTextContent("650.00 XLM");
    const row = screen.getByTestId("credit-history-ev-1");
    expect(row).toHaveTextContent("draw");
    expect(row).toHaveTextContent("300.00 XLM");
    expect(row.querySelector("time")).toHaveAttribute("datetime", "2026-11-01T10:00:00Z");
  });

  it("disables draws but keeps repayment enabled on a frozen line", () => {
    mockUseCreditLine.mockReturnValue({
      data: { ...line, status: "frozen" },
      isLoading: false,
      isError: false,
    });
    render(<CreditLinePage />);
    expect(screen.getByTestId("frozen-notice")).toBeInTheDocument();
    expect(screen.getByTestId("open-draw")).toBeDisabled();
    expect(screen.getByTestId("open-repay")).toBeEnabled();
  });

  it("shows an explanatory empty state for an issuer without a line", () => {
    mockUseCreditLine.mockReturnValue({ data: null, isLoading: false, isError: false });
    render(<CreditLinePage />);
    expect(screen.getByTestId("credit-line-empty")).toHaveTextContent("do not have an open credit line");
  });

  it("shows an unavailable state when the lookup fails", () => {
    mockUseCreditLine.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<CreditLinePage />);
    expect(screen.getByTestId("credit-line-unavailable")).toBeInTheDocument();
  });

  it("opens the draw dialog from the action button", () => {
    render(<CreditLinePage />);
    fireEvent.click(screen.getByTestId("open-draw"));
    expect(screen.getByTestId("draw-modal")).toBeInTheDocument();
  });
});
