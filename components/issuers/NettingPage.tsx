"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canCancel,
  canSettle,
  computeNetPreview,
  type NettingAgreement,
} from "@/lib/analytics/netting";
import {
  cancelNettingAgreement,
  proposeNettingAgreement,
  respondNettingConsent,
  settleNettingAgreement,
  type ProposeNettingInput,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  NETTING_AGREEMENTS_QUERY_KEY,
  useNettingAgreements,
} from "@/hooks/useNettingAgreements";
import { NETTING_INVOICES_QUERY_KEY, useNettingInvoices } from "@/hooks/useNettingInvoices";
import { NewNettingWizard } from "./NewNettingWizard";
import { NetPreview } from "./NetPreview";

/** Issuer netting agreement list and workflow for issue #595. */
export function NettingPage() {
  const { address, jwt } = useAuth();
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);

  const agreements = useNettingAgreements();
  const invoices = useNettingInvoices();

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: NETTING_AGREEMENTS_QUERY_KEY });
  }

  const consent = useMutation({
    mutationFn: (vars: { id: string; value: boolean }) =>
      respondNettingConsent(vars.id, "issuer", vars.value, jwt ?? undefined),
    onSuccess: refresh,
  });
  const settle = useMutation({
    mutationFn: (id: string) => settleNettingAgreement(id, jwt ?? undefined),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelNettingAgreement(id, jwt ?? undefined),
    onSuccess: refresh,
  });
  const propose = useMutation({
    mutationFn: (input: ProposeNettingInput) => proposeNettingAgreement(input, jwt ?? undefined),
    onSuccess: () => {
      setShowWizard(false);
      refresh();
      void queryClient.invalidateQueries({ queryKey: NETTING_INVOICES_QUERY_KEY });
    },
  });

  const unavailable = agreements.isError && invoices.isError;

  return (
    <Card data-testid="netting-page">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Netting agreements</CardTitle>
            <CardDescription>
              Offset multi-invoice balances with a counterparty and settle only the difference.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowWizard(true)}
            data-testid="netting-new"
          >
            New agreement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showWizard && (
          <NewNettingWizard
            invoices={invoices.data ?? []}
            creditor={address ?? ""}
            onPropose={async (input) => {
              await propose.mutateAsync(input);
            }}
            onClose={() => setShowWizard(false)}
          />
        )}

        {unavailable ? (
          <p className="py-8 text-center text-sm text-destructive" role="alert">
            Netting is unavailable right now.
          </p>
        ) : agreements.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="status">
            Loading agreements...
          </p>
        ) : (agreements.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground" data-testid="netting-empty">
            No netting agreements yet.
          </p>
        ) : (
          <div className="space-y-4">
            {(agreements.data ?? []).map((agreement) => (
              <AgreementRow
                key={agreement.id}
                agreement={agreement}
                busy={consent.isPending || settle.isPending || cancel.isPending}
                onConsent={(value) => consent.mutate({ id: agreement.id, value })}
                onSettle={() => settle.mutate(agreement.id)}
                onCancel={() => cancel.mutate(agreement.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AgreementRowProps {
  agreement: NettingAgreement;
  busy: boolean;
  onConsent: (value: boolean) => void;
  onSettle: () => void;
  onCancel: () => void;
}

function AgreementRow({ agreement, busy, onConsent, onSettle, onCancel }: AgreementRowProps) {
  const preview = computeNetPreview(agreement.invoices);

  return (
    <div className="space-y-3 rounded-lg border p-4" data-testid={`netting-agreement-${agreement.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{agreement.debtor}</p>
          <p className="text-xs text-muted-foreground">Created {new Date(agreement.createdAt).toLocaleDateString()}</p>
        </div>
        <Badge variant="secondary" data-testid={`netting-status-${agreement.id}`}>
          {agreement.status}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-4 text-xs" data-testid={`netting-consent-${agreement.id}`}>
        <span>Issuer consent: {agreement.issuerConsent ? "signed" : "pending"}</span>
        <span>Debtor consent: {agreement.debtorConsent ? "signed" : "pending"}</span>
      </div>

      <NetPreview preview={preview} />

      <div className="flex flex-wrap gap-2">
        {agreement.status === "pending" && !agreement.issuerConsent && (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => onConsent(true)}
            data-testid={`netting-consent-action-${agreement.id}`}
          >
            Consent
          </Button>
        )}
        {agreement.status === "pending" && agreement.issuerConsent && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onConsent(false)}
            data-testid={`netting-withdraw-${agreement.id}`}
          >
            Withdraw consent
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={busy || !canSettle(agreement)}
          onClick={onSettle}
          data-testid={`netting-settle-${agreement.id}`}
        >
          Settle
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy || !canCancel(agreement)}
          onClick={onCancel}
          data-testid={`netting-cancel-${agreement.id}`}
        >
          Cancel agreement
        </Button>
      </div>
    </div>
  );
}
