import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverdueBanner } from "../OverdueBanner";
import { OverdueChip } from "../OverdueChip";
import { InvestorLateInterest } from "../InvestorLateInterest";
import type { LateInterestView } from "@/hooks/useLateInterest";

// Keep the money display deterministic and independent of the currency rate
// fetch; these tests exercise overdue logic, not multi-currency conversion.
vi.mock("@/components/currency", () => ({
  Money: ({ xlmText }: { xlmText?: string }) => <span>{xlmText}</span>,
}));

const { mockUseLateInterest } = vi.hoisted(() => ({ mockUseLateInterest: vi.fn() }));
vi.mock("@/hooks/useLateInterest", () => ({
  useLateInterest: mockUseLateInterest,
}));

const now = new Date("2026-11-21T12:00:00Z");
const overdue = {
  status: "funded" as const,
  due_date: "2026-11-19T00:00:00Z",
};

function interest(overrides: Partial<LateInterestView> = {}): LateInterestView {
  return {
    accrued: null,
    lastAccrualDate: null,
    source: "none",
    isLoading: false,
    ...overrides,
  };
}

describe("OverdueBanner (#607)", () => {
  it("shows whole days overdue and accrued late interest", () => {
    render(
      <OverdueBanner
        invoice={overdue}
        now={now}
        interest={interest({ accrued: 42.5, source: "api" })}
      />
    );
    expect(screen.getByTestId("overdue-days")).toHaveTextContent("2 days overdue");
    expect(screen.getByTestId("overdue-interest")).toHaveTextContent("42.50 XLM");
  });

  it("uses singular wording for one day", () => {
    render(
      <OverdueBanner
        invoice={{ status: "funded", due_date: "2026-11-20T00:00:00Z" }}
        now={now}
        interest={interest()}
      />
    );
    expect(screen.getByTestId("overdue-days")).toHaveTextContent("1 day overdue");
  });

  it("shows an explicit unavailable state when the backend has no value", () => {
    render(<OverdueBanner invoice={overdue} now={now} interest={interest()} />);
    expect(screen.getByTestId("overdue-interest-unavailable")).toHaveTextContent(
      "unavailable"
    );
  });

  it("hides the banner for settled, defaulted and not-yet-due invoices", () => {
    const { unmount } = render(
      <OverdueBanner
        invoice={{ status: "settled", due_date: overdue.due_date }}
        now={now}
        interest={interest({ accrued: 10 })}
      />
    );
    expect(screen.queryByTestId("overdue-banner")).not.toBeInTheDocument();
    unmount();

    const second = render(
      <OverdueBanner
        invoice={{ status: "defaulted", due_date: overdue.due_date }}
        now={now}
        interest={interest({ accrued: 10 })}
      />
    );
    expect(screen.queryByTestId("overdue-banner")).not.toBeInTheDocument();
    second.unmount();

    render(
      <OverdueBanner
        invoice={{ status: "funded", due_date: "2026-12-01T00:00:00Z" }}
        now={now}
        interest={interest({ accrued: 10 })}
      />
    );
    expect(screen.queryByTestId("overdue-banner")).not.toBeInTheDocument();
  });
});

describe("OverdueChip (#607)", () => {
  it("shows the chip only for overdue, non-settled/defaulted rows", () => {
    const { rerender } = render(<OverdueChip status="funded" dueDate={overdue.due_date} now={now} />);
    expect(screen.getByTestId("overdue-chip")).toHaveTextContent("Overdue");

    rerender(<OverdueChip status="settled" dueDate={overdue.due_date} now={now} />);
    expect(screen.queryByTestId("overdue-chip")).not.toBeInTheDocument();

    rerender(<OverdueChip status="defaulted" dueDate={overdue.due_date} now={now} />);
    expect(screen.queryByTestId("overdue-chip")).not.toBeInTheDocument();

    rerender(<OverdueChip status="funded" dueDate="2026-12-01T00:00:00Z" now={now} />);
    expect(screen.queryByTestId("overdue-chip")).not.toBeInTheDocument();
  });
});

describe("InvestorLateInterest (#607)", () => {
  it("renders the proportional share from the backend value", () => {
    mockUseLateInterest.mockReturnValue(
      interest({ accrued: 200, source: "api" })
    );
    render(<InvestorLateInterest invoiceId="inv-1" sharePercent={25} />);
    expect(screen.getByTestId("investor-late-interest")).toHaveTextContent("50.00 XLM");
  });

  it("renders unavailable when the share or accrued value is missing", () => {
    mockUseLateInterest.mockReturnValue(interest({ accrued: 200, source: "api" }));
    const { unmount } = render(<InvestorLateInterest invoiceId="inv-1" sharePercent={null} />);
    expect(screen.getByTestId("investor-late-interest")).toHaveTextContent("Unavailable");
    unmount();

    mockUseLateInterest.mockReturnValue(interest());
    render(<InvestorLateInterest invoiceId="inv-1" sharePercent={25} />);
    expect(screen.getByTestId("investor-late-interest")).toHaveTextContent("Unavailable");
  });
});
