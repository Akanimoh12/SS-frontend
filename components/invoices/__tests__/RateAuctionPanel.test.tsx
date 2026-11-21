import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RateAuctionPanel } from "../RateAuctionPanel";
import { useRateAuction } from "@/hooks/useRateAuction";
import { useOptionalAuth } from "@/context/AuthContext";
import { commitRateAuction } from "@/lib/api";
import { projectAuction, type AuctionView, type RateAuctionData } from "@/lib/analytics/rateAuction";

vi.mock("@/hooks/useRateAuction", () => ({ useRateAuction: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useOptionalAuth: vi.fn() }));
vi.mock("@/lib/api", () => ({ commitRateAuction: vi.fn() }));

const mockHook = vi.mocked(useRateAuction);
const mockAuth = vi.mocked(useOptionalAuth);
const commit = vi.mocked(commitRateAuction);
const START = Date.parse("2026-11-21T00:00:00Z");

function auction(overrides: Partial<RateAuctionData> = {}): RateAuctionData {
  return {
    invoice_id: "inv-1",
    status: "active",
    start_rate: 4,
    max_rate: 6,
    step_bps: 50,
    step_seconds: 60,
    started_at: "2026-11-21T00:00:00Z",
    funded_percent: 40,
    ...overrides,
  };
}

function setHook(data: RateAuctionData | null, now = START) {
  const view: AuctionView | null = data ? projectAuction(data, now) : null;
  mockHook.mockReturnValue({ data, view, isLoading: false, isError: false } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockReturnValue({ jwt: "token", address: "GINV", isConnecting: false, loginWithWallet: vi.fn(), logout: vi.fn() });
  commit.mockResolvedValue({ commitment_id: "cm-1" });
  setHook(auction());
});

describe("RateAuctionPanel", () => {
  it("renders on the public invoice view even with no auth provider", () => {
    mockAuth.mockReturnValue(null);
    render(<RateAuctionPanel invoiceId="inv-1" />);

    expect(screen.getByTestId("rate-auction-panel")).toBeInTheDocument();
    expect(screen.getByTestId("rate-auction-current")).toHaveTextContent("4.00%");
  });

  it("renders nothing when the invoice has no auction", () => {
    setHook(null);
    const { container } = render(<RateAuctionPanel invoiceId="inv-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the live rate, countdown and funded percentage", () => {
    render(<RateAuctionPanel invoiceId="inv-1" />);

    expect(screen.getByTestId("rate-auction-current")).toHaveTextContent("4.00%");
    expect(screen.getByTestId("rate-auction-countdown")).toHaveTextContent("1m 00s");
    expect(screen.getByTestId("rate-auction-funded")).toHaveTextContent("40%");
  });

  it("highlights the current step and the maximum", () => {
    setHook(auction(), START + 60_000);
    render(<RateAuctionPanel invoiceId="inv-1" />);

    expect(screen.getByTestId("rate-step-1")).toHaveAttribute("data-current", "true");
    expect(screen.getByTestId("rate-step-4")).toHaveAttribute("data-max", "true");
  });

  it("locks the displayed rate on commit", async () => {
    render(<RateAuctionPanel invoiceId="inv-1" />);

    fireEvent.change(screen.getByTestId("rate-auction-amount"), { target: { value: "100" } });
    fireEvent.click(screen.getByTestId("rate-auction-commit"));

    await waitFor(() =>
      expect(commit).toHaveBeenCalledWith(
        { invoiceId: "inv-1", amount: 100, lockedRate: 4 },
        "token",
      ),
    );
    expect(await screen.findByTestId("rate-auction-confirmation")).toHaveTextContent("4.00%");
  });

  it("disables the form for a closed filled auction", () => {
    setHook(auction({ status: "closed_filled" }));
    render(<RateAuctionPanel invoiceId="inv-1" />);

    expect(screen.getByTestId("rate-auction-result")).toBeInTheDocument();
    expect(screen.queryByTestId("rate-auction-commit")).not.toBeInTheDocument();
  });

  it("shows refund guidance for a closed unfilled auction", () => {
    setHook(auction({ status: "closed_unfilled" }));
    render(<RateAuctionPanel invoiceId="inv-1" />);

    expect(screen.getByTestId("rate-auction-refund")).toBeInTheDocument();
  });

  it("disables commit until a positive amount is entered", () => {
    render(<RateAuctionPanel invoiceId="inv-1" />);
    expect(screen.getByTestId("rate-auction-commit")).toBeDisabled();

    fireEvent.change(screen.getByTestId("rate-auction-amount"), { target: { value: "10" } });
    expect(screen.getByTestId("rate-auction-commit")).toBeEnabled();
  });
});
