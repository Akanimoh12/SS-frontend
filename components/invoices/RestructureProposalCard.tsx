"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Scale, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { VoteResultBar } from "@/components/invoices/VoteResultBar";
import { useRestructureVotes } from "@/hooks/useRestructureVotes";
import {
  calculateRestructureRecovery,
  type RestructureProposal,
  type RestructureVoteDecision,
} from "@/lib/api";

export interface RestructureProposalCardProps {
  invoiceId: string;
  /** Connected investor's principal claim in XLM (0 when not an investor). */
  investorClaim?: number;
  walletAddress?: string | null;
}

function formatDueDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RestructureProposalCard({
  invoiceId,
  investorClaim = 0,
  walletAddress,
}: RestructureProposalCardProps) {
  const {
    proposal: remoteProposal,
    vote,
  } = useRestructureVotes(invoiceId, walletAddress);

  const [localProposal, setLocalProposal] = useState<RestructureProposal | null>(
    remoteProposal,
  );

  useEffect(() => {
    setLocalProposal(remoteProposal);
  }, [remoteProposal]);

  if (!localProposal) return null;

  const isInvestor = Boolean(walletAddress && investorClaim > 0);
  const existingVote: RestructureVoteDecision | null =
    localProposal.user_vote ??
    (walletAddress && localProposal.voted_wallets
      ? localProposal.voted_wallets[walletAddress] ?? null
      : null);

  const endsAtTime = localProposal.ends_at
    ? new Date(localProposal.ends_at).getTime()
    : null;
  const timeExpired =
    endsAtTime !== null && !Number.isNaN(endsAtTime) && endsAtTime <= Date.now();
  const isVotingEnded = localProposal.status !== "active" || timeExpired;

  const acceptedPct =
    localProposal.total_principal > 0
      ? (localProposal.accepted_principal / localProposal.total_principal) * 100
      : 0;

  const outcomeStatus: "executed" | "failed" | null = isVotingEnded
    ? localProposal.status === "executed" ||
      (localProposal.status === "active" &&
        acceptedPct >= localProposal.supermajority_threshold_pct)
      ? "executed"
      : "failed"
    : null;

  const recoveryAmount = calculateRestructureRecovery(
    investorClaim,
    localProposal.haircut_percentage,
  );

  const canVote = isInvestor && !existingVote && !isVotingEnded;

  function handleVote(decision: RestructureVoteDecision) {
    if (!canVote || !walletAddress) return;
    const optimistic: RestructureProposal = {
      ...localProposal!,
      accepted_principal:
        decision === "accept"
          ? localProposal!.accepted_principal + investorClaim
          : localProposal!.accepted_principal,
      rejected_principal:
        decision === "reject"
          ? localProposal!.rejected_principal + investorClaim
          : localProposal!.rejected_principal,
      user_vote: decision,
      voted_wallets: {
        ...(localProposal!.voted_wallets ?? {}),
        [walletAddress]: decision,
      },
    };
    setLocalProposal(optimistic);
    vote.mutate(
      { wallet: walletAddress, decision, principal: investorClaim },
      {
        onSuccess: (updated) => {
          if (updated) setLocalProposal(updated);
        },
      },
    );
  }

  return (
    <Card data-testid="restructure-proposal-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Restructuring proposal</h2>
          </div>
          <span
            className="rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize"
            data-testid="restructure-status-badge"
          >
            {outcomeStatus ?? localProposal.status}
          </span>
        </div>
        {localProposal.reason && (
          <p className="text-sm text-muted-foreground">{localProposal.reason}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Final outcome banner after voting period ends */}
        {outcomeStatus && (
          <div
            role="status"
            data-testid="restructure-outcome-banner"
            data-outcome={outcomeStatus}
            className={`flex items-center gap-2.5 rounded-lg border p-3.5 text-sm ${
              outcomeStatus === "executed"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300"
            }`}
          >
            {outcomeStatus === "executed" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold">
                {outcomeStatus === "executed"
                  ? "Proposal executed — restructuring terms approved"
                  : "Proposal failed — supermajority threshold was not reached"}
              </p>
              <p className="text-xs opacity-90">
                {outcomeStatus === "executed"
                  ? `Payoff reduced by ${localProposal.haircut_percentage}% with new due date ${formatDueDate(localProposal.new_due_date)}.`
                  : "Original invoice obligation and default rules remain in effect."}
              </p>
            </div>
          </div>
        )}

        {/* Proposal terms: haircut, new due date, and investor recovery */}
        <dl className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Haircut percentage</dt>
            <dd
              className="mt-0.5 text-lg font-bold tabular-nums"
              data-testid="restructure-haircut"
            >
              {localProposal.haircut_percentage}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Proposed new due date</dt>
            <dd
              className="mt-0.5 text-lg font-bold"
              data-testid="restructure-new-due-date"
            >
              {formatDueDate(localProposal.new_due_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Your recovery under proposal</dt>
            <dd
              className="mt-0.5 text-lg font-bold tabular-nums"
              data-testid="restructure-recovery-amount"
            >
              {isInvestor
                ? `${recoveryAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} XLM`
                : "—"}
            </dd>
            {isInvestor && (
              <p className="text-[11px] text-muted-foreground">
                From {investorClaim.toLocaleString()} XLM claim
              </p>
            )}
          </div>
        </dl>

        {/* Principal-weighted vote result bar with supermajority threshold marker */}
        <VoteResultBar
          acceptedPrincipal={localProposal.accepted_principal}
          rejectedPrincipal={localProposal.rejected_principal}
          totalPrincipal={localProposal.total_principal}
          supermajorityThreshold={localProposal.supermajority_threshold_pct}
        />

        {/* Voting controls / state notices */}
        {canVote && (
          <div
            className="flex flex-wrap items-center gap-3 pt-1"
            data-testid="restructure-vote-actions"
          >
            <Button
              onClick={() => handleVote("accept")}
              disabled={vote.isPending}
              data-testid="restructure-vote-accept"
            >
              Accept proposal
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleVote("reject")}
              disabled={vote.isPending}
              data-testid="restructure-vote-reject"
            >
              Reject proposal
            </Button>
            <span className="text-xs text-muted-foreground">
              Voting with {investorClaim.toLocaleString()} XLM principal weight
            </span>
          </div>
        )}

        {isInvestor && existingVote && (
          <p
            className="rounded-md border bg-muted/40 px-3 py-2 text-xs font-medium"
            data-testid="restructure-already-voted"
          >
            You have already voted to{" "}
            <strong className="uppercase">{existingVote}</strong> this proposal with{" "}
            {investorClaim.toLocaleString()} XLM.
          </p>
        )}

        {!isInvestor && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="restructure-non-investor-notice"
          >
            Only investors holding principal in this invoice can cast a vote.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
