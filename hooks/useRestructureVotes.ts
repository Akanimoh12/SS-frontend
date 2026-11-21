"use client";

import { useContext } from "react";
import { QueryClient, QueryClientContext, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchRestructureProposal,
  voteOnRestructureProposal,
  type RestructureProposal,
  type RestructureVoteDecision,
} from "@/lib/api";

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

export function restructureVotesQueryKey(invoiceId: string) {
  return ["restructure-votes", invoiceId] as const;
}

/**
 * Reads an invoice's restructuring proposal, principal-weighted vote tallies,
 * and supermajority threshold, and provides a vote mutation (#589).
 */
export function useRestructureVotes(invoiceId: string, walletAddress?: string | null) {
  const contextClient = useContext(QueryClientContext);
  const queryClient = contextClient ?? fallbackQueryClient;
  const key = restructureVotesQueryKey(invoiceId);

  const query = useQuery<RestructureProposal | null>(
    {
      queryKey: key,
      queryFn: () => fetchRestructureProposal(invoiceId, walletAddress),
      enabled: Boolean(invoiceId),
      staleTime: 15_000,
    },
    queryClient,
  );

  const vote = useMutation(
    {
      mutationFn: ({
        wallet,
        decision,
        principal,
      }: {
        wallet: string;
        decision: RestructureVoteDecision;
        principal?: number;
      }) => voteOnRestructureProposal(invoiceId, { wallet, decision, principal }),
      onSuccess: (updated) => {
        queryClient.setQueryData(key, updated);
        toast.success("Restructuring vote submitted");
      },
      onError: () => {
        toast.error("Could not submit restructuring vote");
      },
    },
    queryClient,
  );

  const proposal = query.data ?? null;
  const acceptedPrincipal = proposal?.accepted_principal ?? 0;
  const rejectedPrincipal = proposal?.rejected_principal ?? 0;
  const totalPrincipal = proposal?.total_principal ?? 0;
  const notVotedPrincipal = Math.max(
    0,
    totalPrincipal - acceptedPrincipal - rejectedPrincipal,
  );
  const supermajorityThreshold = proposal?.supermajority_threshold_pct ?? 66.67;

  return {
    ...query,
    proposal,
    acceptedPrincipal,
    rejectedPrincipal,
    notVotedPrincipal,
    totalPrincipal,
    supermajorityThreshold,
    vote,
  };
}
