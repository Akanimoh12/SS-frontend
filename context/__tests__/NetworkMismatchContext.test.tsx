import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NetworkMismatchProvider,
  useTransactionGuard,
} from "../NetworkMismatchContext";

const mockUseWalletNetwork = vi.fn();

vi.mock("@/hooks/useWalletNetwork", () => ({
  useWalletNetwork: () => mockUseWalletNetwork(),
}));

function view(overrides: Record<string, unknown> = {}) {
  return {
    isConnected: true,
    isInitializing: false,
    walletKind: "freighter" as const,
    walletNetwork: "mainnet" as const,
    appNetwork: "testnet" as const,
    isMismatched: true,
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function GuardProbe() {
  const { disabled } = useTransactionGuard();
  return <div data-testid="guard-probe">{disabled ? "disabled" : "enabled"}</div>;
}

describe("NetworkMismatchProvider (#610)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the banner and disables transactions during a mismatch", () => {
    mockUseWalletNetwork.mockReturnValue(view());
    render(
      <NetworkMismatchProvider>
        <GuardProbe />
      </NetworkMismatchProvider>
    );
    expect(screen.getByTestId("network-mismatch-banner")).toBeInTheDocument();
    expect(screen.getByTestId("guard-probe")).toHaveTextContent("disabled");
  });

  it("rechecks every 10 seconds while mismatched and stops on recovery", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    mockUseWalletNetwork.mockReturnValue(view({ refresh }));
    const { rerender } = render(
      <NetworkMismatchProvider>
        <GuardProbe />
      </NetworkMismatchProvider>
    );

    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(refresh).toHaveBeenCalledTimes(2);

    // Once the wallet matches, polling stops and the banner clears.
    mockUseWalletNetwork.mockReturnValue(
      view({ isMismatched: false, walletNetwork: "testnet", refresh })
    );
    rerender(
      <NetworkMismatchProvider>
        <GuardProbe />
      </NetworkMismatchProvider>
    );
    expect(screen.queryByTestId("network-mismatch-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("guard-probe")).toHaveTextContent("enabled");

    const callsBefore = refresh.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(refresh).toHaveBeenCalledTimes(callsBefore);
  });

  it("shows no banner when no wallet is connected", () => {
    mockUseWalletNetwork.mockReturnValue(
      view({ isConnected: false, isMismatched: false, walletNetwork: null, walletKind: null })
    );
    render(
      <NetworkMismatchProvider>
        <GuardProbe />
      </NetworkMismatchProvider>
    );
    expect(screen.queryByTestId("network-mismatch-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("guard-probe")).toHaveTextContent("enabled");
  });
});
