import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useInterimPayments } from "@/hooks/useInterimPayments";
import type { InterimPaymentsResponse } from "@/lib/api";
import { SettlementTimeline } from "../SettlementTimeline";

vi.mock("@/hooks/useInterimPayments", () => ({
  useInterimPayments: vi.fn(),
}));

const mockedUseInterimPayments = vi.mocked(useInterimPayments);
type HookReturn = ReturnType<typeof useInterimPayments>;

const RESPONSE: InterimPaymentsResponse = {
  invoice_id: "inv-1",
  total_due: 10_000,
  payments: [
    { id: "p1", amount: 4_000, paid_at: "2026-01-05T00:00:00.000Z" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseInterimPayments.mockReturnValue({
    data: RESPONSE,
    isLoading: false,
    isError: false,
  } as HookReturn);
});

describe("SettlementTimeline late interest (#607)", () => {
  it("adds accrued late interest to the amount owed and labels it", () => {
    render(
      <SettlementTimeline invoiceId="inv-1" totalDue={10_000} lateInterest={500} />
    );

    // total due 10,000 + 500 interest, 4,000 repaid → 6,500 remaining
    expect(screen.getByTestId("settlement-remaining")).toHaveTextContent(
      "6,500 XLM remaining"
    );
    expect(screen.getByTestId("settlement-late-interest")).toHaveTextContent(
      "500 XLM accrued late interest"
    );
  });

  it("does not change totals when interest is unavailable", () => {
    render(
      <SettlementTimeline
        invoiceId="inv-1"
        totalDue={10_000}
        lateInterest={null}
      />
    );

    expect(screen.getByTestId("settlement-remaining")).toHaveTextContent(
      "6,000 XLM remaining"
    );
    expect(
      screen.queryByTestId("settlement-late-interest")
    ).not.toBeInTheDocument();
  });
});
