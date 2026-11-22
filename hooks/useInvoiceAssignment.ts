"use client";

import { useContext } from "react";
import { QueryClient, QueryClientContext, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelInvoiceAssignment,
  consentInvoiceAssignment,
  fetchInvoiceAssignment,
  proposeInvoiceAssignment,
  type InvoiceAssignment,
  type InvoiceAssignmentConsents,
  type InvoiceAssignmentParty,
} from "@/lib/api";

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

export function invoiceAssignmentQueryKey(invoiceId: string) {
  return ["invoice-assignment", invoiceId] as const;
}

const DEFAULT_CONSENTS: InvoiceAssignmentConsents = {
  issuer: false,
  old_debtor: false,
  new_debtor: false,
};

/**
 * Reads the pending debtor assignment status and three-party consents for an
 * invoice, and provides propose, consent, and cancel actions (#590).
 */
export function useInvoiceAssignment(invoiceId: string) {
  const contextClient = useContext(QueryClientContext);
  const queryClient = contextClient ?? fallbackQueryClient;
  const key = invoiceAssignmentQueryKey(invoiceId);

  const query = useQuery<InvoiceAssignment | null>(
    {
      queryKey: key,
      queryFn: () => fetchInvoiceAssignment(invoiceId),
      enabled: Boolean(invoiceId),
      staleTime: 15_000,
    },
    queryClient,
  );

  const propose = useMutation(
    {
      mutationFn: ({
        proposed_new_debtor,
        wallet,
      }: {
        proposed_new_debtor: string;
        wallet: string;
      }) => proposeInvoiceAssignment(invoiceId, { proposed_new_debtor, wallet }),
      onSuccess: (updated) => {
        queryClient.setQueryData(key, updated);
        toast.success("Debtor assignment proposed");
      },
      onError: () => {
        toast.error("Could not propose debtor assignment");
      },
    },
    queryClient,
  );

  const consent = useMutation(
    {
      mutationFn: ({
        party,
        wallet,
      }: {
        party: InvoiceAssignmentParty;
        wallet: string;
      }) => consentInvoiceAssignment(invoiceId, { party, wallet }),
      onSuccess: (updated) => {
        queryClient.setQueryData(key, updated);
        queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
        toast.success("Assignment consent recorded");
      },
      onError: () => {
        toast.error("Could not record consent");
      },
    },
    queryClient,
  );

  const cancel = useMutation(
    {
      mutationFn: ({ wallet }: { wallet: string }) =>
        cancelInvoiceAssignment(invoiceId, { wallet }),
      onSuccess: (updated) => {
        queryClient.setQueryData(key, updated);
        toast.success("Debtor assignment cancelled");
      },
      onError: () => {
        toast.error("Could not cancel debtor assignment");
      },
    },
    queryClient,
  );

  const assignment = query.data ?? null;
  const consents = assignment?.consents ?? DEFAULT_CONSENTS;

  return {
    ...query,
    assignment,
    status: assignment?.status ?? "none",
    isPendingAssignment: assignment?.status === "pending",
    isFinalized: assignment?.status === "finalized",
    consents,
    currentDebtor: assignment?.current_debtor ?? null,
    proposedNewDebtor: assignment?.proposed_new_debtor ?? null,
    propose,
    consent,
    cancel,
  };
}
