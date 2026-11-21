import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RestructureProposalCard } from "../RestructureProposalCard";
import type { RestructureProposal } from "@/lib/api";

const mockUseRestructureVotes = vi.fn();
const mockVoteMutate = vi.fn();

vi.mock("@/hooks/useRestructureVotes", () => ({
  useRestructureVotes: (invoiceId: string, walletAddress?: string | null) =>
    mockUseRestructureVotes(invoiceId, walletAddress),
}));

const INVESTOR_WALLET = "GINVESTOR11111111111111111111111111111111111111111111111";

function makeProposal(overrides: Partial<RestructureProposal> = {}): RestructureProposal {
  return {
    id: "prop-589",
    invoice_id: "inv-589",
    haircut_percentage: 25,
    new_due_date: "2027-03-15T00:00:00.000Z",
    total_principal: 10000,
    accepted_principal: 4000,
    rejected_principal: 1000,
    supermajority_threshold_pct: 66.67,
    ends_at: "2030-01-01T00:00:00.000Z",
    status: "active",
    user_vote: null,
    ...overrides,
  };
}

function setupHook(proposal: RestructureProposal | null) {
  mockUseRestructureVotes.mockReturnValue({
    proposal,
    acceptedPrincipal: proposal?.accepted_principal ?? 0,
    rejectedPrincipal: proposal?.rejected_principal ?? 0,
    notVotedPrincipal: Math.max(
      0,
      (proposal?.total_principal ?? 0) -
        (proposal?.accepted_principal ?? 0) -
        (proposal?.rejected_principal ?? 0),
    ),
    totalPrincipal: proposal?.total_principal ?? 0,
    supermajorityThreshold: proposal?.supermajority_threshold_pct ?? 66.67,
    isLoading: false,
    isError: false,
    vote: { mutate: mockVoteMutate, isPending: false },
  });
}

describe("RestructureProposalCard (#589)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays the haircut percentage, new due date, and recovery amount equal to the investor's claim after haircut", () => {
    setupHook(makeProposal({ haircut_percentage: 25 }));

    render(
      <RestructureProposalCard
        invoiceId="inv-589"
        investorClaim={2000}
        walletAddress={INVESTOR_WALLET}
      />,
    );

    expect(screen.getByTestId("restructure-haircut")).toHaveTextContent("25%");
    expect(screen.getByTestId("restructure-new-due-date")).toHaveTextContent("15 Mar 2027");
    // 2000 XLM claim with 25% haircut -> 1,500.00 XLM recovery
    expect(screen.getByTestId("restructure-recovery-amount")).toHaveTextContent("1,500.00 XLM");
  });

  it("positions the threshold marker at the configured supermajority and shows principal breakdown", () => {
    setupHook(
      makeProposal({
        total_principal: 10000,
        accepted_principal: 4000,
        rejected_principal: 1500,
        supermajority_threshold_pct: 75,
      }),
    );

    render(
      <RestructureProposalCard
        invoiceId="inv-589"
        investorClaim={2000}
        walletAddress={INVESTOR_WALLET}
      />,
    );

    const marker = screen.getByTestId("vote-threshold-marker");
    expect(marker).toHaveAttribute("data-threshold", "75");
    expect(marker.style.left).toBe("75%");

    expect(screen.getByTestId("vote-principal-accepted")).toHaveTextContent("4,000 XLM (40.0%)");
    expect(screen.getByTestId("vote-principal-rejected")).toHaveTextContent("1,500 XLM (15.0%)");
    expect(screen.getByTestId("vote-principal-not-voted")).toHaveTextContent("4,500 XLM (45.0%)");
  });

  it("submits a principal-weighted vote and prevents a second vote attempt in the UI", () => {
    setupHook(makeProposal());

    render(
      <RestructureProposalCard
        invoiceId="inv-589"
        investorClaim={2000}
        walletAddress={INVESTOR_WALLET}
      />,
    );

    fireEvent.click(screen.getByTestId("restructure-vote-accept"));

    expect(mockVoteMutate).toHaveBeenCalledWith(
      {
        wallet: INVESTOR_WALLET,
        decision: "accept",
        principal: 2000,
      },
      expect.any(Object),
    );

    // Vote buttons are removed and replaced by the already-voted confirmation
    expect(screen.queryByTestId("restructure-vote-accept")).not.toBeInTheDocument();
    expect(screen.queryByTestId("restructure-vote-reject")).not.toBeInTheDocument();
    expect(screen.getByTestId("restructure-already-voted")).toHaveTextContent(/accept/i);
    expect(screen.getByTestId("vote-principal-accepted")).toHaveTextContent("6,000 XLM (60.0%)");
  });

  it("hides vote buttons for an investor who has already voted", () => {
    setupHook(makeProposal({ user_vote: "reject" }));

    render(
      <RestructureProposalCard
        invoiceId="inv-589"
        investorClaim={2000}
        walletAddress={INVESTOR_WALLET}
      />,
    );

    expect(screen.queryByTestId("restructure-vote-accept")).not.toBeInTheDocument();
    expect(screen.queryByTestId("restructure-vote-reject")).not.toBeInTheDocument();
    expect(screen.getByTestId("restructure-already-voted")).toHaveTextContent(/reject/i);
  });

  it("shows results but no vote buttons to non-investors", () => {
    setupHook(makeProposal());

    render(
      <RestructureProposalCard
        invoiceId="inv-589"
        investorClaim={0}
        walletAddress="GNONINVESTOR11111111111111111111111111111111111111111111"
      />,
    );

    expect(screen.getByTestId("vote-result-bar")).toBeInTheDocument();
    expect(screen.queryByTestId("restructure-vote-accept")).not.toBeInTheDocument();
    expect(screen.queryByTestId("restructure-vote-reject")).not.toBeInTheDocument();
    expect(screen.getByTestId("restructure-non-investor-notice")).toBeInTheDocument();
  });

  it("renders the final outcome banner reflecting executed or failed status after voting ends", () => {
    setupHook(
      makeProposal({
        status: "executed",
        accepted_principal: 8000,
        rejected_principal: 1000,
        ends_at: "2025-01-01T00:00:00.000Z",
      }),
    );

    const { unmount } = render(
      <RestructureProposalCard
        invoiceId="inv-589"
        investorClaim={2000}
        walletAddress={INVESTOR_WALLET}
      />,
    );

    const executedBanner = screen.getByTestId("restructure-outcome-banner");
    expect(executedBanner).toHaveAttribute("data-outcome", "executed");
    expect(executedBanner).toHaveTextContent(/Proposal executed/i);
    expect(screen.queryByTestId("restructure-vote-accept")).not.toBeInTheDocument();
    unmount();

    setupHook(
      makeProposal({
        status: "failed",
        accepted_principal: 3000,
        rejected_principal: 5000,
        ends_at: "2025-01-01T00:00:00.000Z",
      }),
    );

    render(
      <RestructureProposalCard
        invoiceId="inv-589"
        investorClaim={2000}
        walletAddress={INVESTOR_WALLET}
      />,
    );

    const failedBanner = screen.getByTestId("restructure-outcome-banner");
    expect(failedBanner).toHaveAttribute("data-outcome", "failed");
    expect(failedBanner).toHaveTextContent(/Proposal failed/i);
  });
});
