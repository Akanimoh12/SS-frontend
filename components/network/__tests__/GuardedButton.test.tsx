import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GuardedButton } from "../GuardedButton";

const { mockGuard } = vi.hoisted(() => ({ mockGuard: vi.fn() }));

vi.mock("@/context/NetworkMismatchContext", () => ({
  useTransactionGuard: () => mockGuard(),
}));

describe("GuardedButton (#610)", () => {
  it("is enabled with no tooltip when networks match", () => {
    mockGuard.mockReturnValue({ disabled: false, reason: "" });
    render(<GuardedButton data-testid="cta">Invest</GuardedButton>);

    expect(screen.getByTestId("cta")).toBeEnabled();
    expect(screen.queryByTestId("guarded-button-tooltip")).not.toBeInTheDocument();
  });

  it("is disabled during a mismatch", () => {
    mockGuard.mockReturnValue({ disabled: true, reason: "Switch to Testnet" });
    render(<GuardedButton data-testid="cta">Invest</GuardedButton>);

    expect(screen.getByTestId("cta")).toBeDisabled();
  });
});
