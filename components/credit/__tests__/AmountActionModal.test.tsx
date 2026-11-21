import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DrawModal } from "../DrawModal";
import { RepayModal } from "../RepayModal";
import type { CreditLine } from "@/lib/creditLine";

const line: CreditLine = {
  limit: 1000,
  drawn: 300,
  accruedInterest: 50,
  status: "open",
  currency: "XLM",
  history: [],
};

describe("DrawModal and RepayModal (#588)", () => {
  it("blocks a draw above the available amount", () => {
    render(
      <DrawModal
        line={line}
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        available={650}
      />
    );

    fireEvent.change(screen.getByTestId("draw-modal-amount"), { target: { value: "651" } });
    expect(screen.getByTestId("draw-modal-error")).toHaveTextContent("exceeds available credit");
    expect(screen.getByTestId("draw-submit")).toBeDisabled();
  });

  it("submits a valid draw", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(
      <DrawModal
        line={line}
        open
        onOpenChange={onOpenChange}
        onSubmit={submit}
        available={650}
      />
    );

    fireEvent.change(screen.getByTestId("draw-modal-amount"), { target: { value: "100" } });
    fireEvent.click(screen.getByTestId("draw-submit"));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(100));
  });

  it("blocks a frozen-line draw but allows repayment", () => {
    const frozen = { ...line, status: "frozen" as const };
    const { unmount } = render(
      <DrawModal
        line={frozen}
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        available={650}
      />
    );
    fireEvent.change(screen.getByTestId("draw-modal-amount"), { target: { value: "10" } });
    expect(screen.getByTestId("draw-modal-error")).toHaveTextContent("frozen");
    unmount();

    render(
      <RepayModal
        line={frozen}
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        outstanding={350}
      />
    );
    fireEvent.change(screen.getByTestId("repay-modal-amount"), { target: { value: "10" } });
    expect(screen.queryByTestId("repay-modal-error")).not.toBeInTheDocument();
  });

  it("blocks repayment above the outstanding balance", () => {
    render(
      <RepayModal
        line={line}
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        outstanding={350}
      />
    );
    fireEvent.change(screen.getByTestId("repay-modal-amount"), { target: { value: "351" } });
    expect(screen.getByTestId("repay-modal-error")).toHaveTextContent("outstanding balance");
  });
});
