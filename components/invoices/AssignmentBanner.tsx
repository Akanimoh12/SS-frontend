"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvoiceAssignment } from "@/hooks/useInvoiceAssignment";
import type {
  InvoiceAssignment,
  InvoiceAssignmentParty,
} from "@/lib/api";

export interface AssignmentBannerProps {
  invoiceId: string;
  issuerAddress?: string | null;
  walletAddress?: string | null;
  isDisputed?: boolean;
  isSettling?: boolean;
}

function sameAddress(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function resolveAssignmentParty(
  walletAddress: string | null | undefined,
  assignment: InvoiceAssignment,
): InvoiceAssignmentParty | null {
  if (!walletAddress) return null;
  if (sameAddress(walletAddress, assignment.issuer_address)) return "issuer";
  if (sameAddress(walletAddress, assignment.old_debtor)) return "old_debtor";
  if (sameAddress(walletAddress, assignment.proposed_new_debtor)) return "new_debtor";
  return null;
}

export function AssignmentBanner({
  invoiceId,
  issuerAddress,
  walletAddress,
  isDisputed: propDisputed = false,
  isSettling: propSettling = false,
}: AssignmentBannerProps) {
  const { assignment: remoteAssignment, propose, consent, cancel } =
    useInvoiceAssignment(invoiceId);

  const [localAssignment, setLocalAssignment] = useState<InvoiceAssignment | null>(
    remoteAssignment,
  );
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [newDebtorInput, setNewDebtorInput] = useState("");

  useEffect(() => {
    setLocalAssignment(remoteAssignment);
  }, [remoteAssignment]);

  if (!localAssignment) return null;

  const effectiveIssuer = localAssignment.issuer_address || issuerAddress || "";
  const isIssuer = sameAddress(walletAddress, effectiveIssuer);
  const party = resolveAssignmentParty(walletAddress, {
    ...localAssignment,
    issuer_address: effectiveIssuer,
  });

  const isDisputed = Boolean(propDisputed || localAssignment.is_disputed);
  const isSettling = Boolean(propSettling || localAssignment.is_settling);
  const isBlocked = isDisputed || isSettling;

  const blockedMessage = isDisputed
    ? localAssignment.blocked_reason ||
      "Assignment actions are blocked because this invoice is currently disputed."
    : isSettling
      ? localAssignment.blocked_reason ||
        "Assignment actions are blocked while this invoice is settling."
      : null;

  const { status, consents, proposed_new_debtor, old_debtor, current_debtor } =
    localAssignment;

  const canConsent =
    status === "pending" &&
    party !== null &&
    !consents[party];

  const hasAlreadyConsented =
    status === "pending" &&
    party !== null &&
    consents[party];

  function handleConsent() {
    if (!party || !walletAddress || isBlocked) return;
    const nextConsents = {
      ...localAssignment!.consents,
      [party]: true,
    };
    const allConsented =
      nextConsents.issuer && nextConsents.old_debtor && nextConsents.new_debtor;
    const optimistic: InvoiceAssignment = {
      ...localAssignment!,
      consents: nextConsents,
      status: allConsented ? "finalized" : "pending",
      current_debtor:
        allConsented && localAssignment!.proposed_new_debtor
          ? localAssignment!.proposed_new_debtor
          : localAssignment!.current_debtor,
    };
    setLocalAssignment(optimistic);
    consent.mutate(
      { party, wallet: walletAddress },
      {
        onSuccess: (data) => {
          if (data) setLocalAssignment(data);
        },
      },
    );
  }

  function handleConfirmCancel() {
    if (!walletAddress || isBlocked) return;
    const optimistic: InvoiceAssignment = {
      ...localAssignment!,
      status: "none",
      proposed_new_debtor: null,
      consents: { issuer: false, old_debtor: false, new_debtor: false },
    };
    setLocalAssignment(optimistic);
    setCancelDialogOpen(false);
    cancel.mutate(
      { wallet: walletAddress },
      {
        onSuccess: (data) => {
          if (data) setLocalAssignment(data);
        },
      },
    );
  }

  function handleConfirmPropose() {
    const trimmed = newDebtorInput.trim();
    if (!trimmed || !walletAddress || isBlocked) return;
    const optimistic: InvoiceAssignment = {
      ...localAssignment!,
      status: "pending",
      proposed_new_debtor: trimmed,
      consents: { issuer: true, old_debtor: false, new_debtor: false },
    };
    setLocalAssignment(optimistic);
    setProposeDialogOpen(false);
    setNewDebtorInput("");
    propose.mutate(
      { proposed_new_debtor: trimmed, wallet: walletAddress },
      {
        onSuccess: (data) => {
          if (data) setLocalAssignment(data);
        },
      },
    );
  }

  const checklistSteps: {
    key: InvoiceAssignmentParty;
    label: string;
    address: string | null;
    consented: boolean;
  }[] = [
    {
      key: "issuer",
      label: "Issuer",
      address: effectiveIssuer,
      consented: consents.issuer,
    },
    {
      key: "old_debtor",
      label: "Current debtor",
      address: old_debtor,
      consented: consents.old_debtor,
    },
    {
      key: "new_debtor",
      label: "Proposed new debtor",
      address: proposed_new_debtor,
      consented: consents.new_debtor,
    },
  ];

  const completedCount = checklistSteps.filter((s) => s.consented).length;

  return (
    <Card
      className="border-amber-500/40 bg-amber-500/5"
      data-testid="assignment-banner"
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-amber-600" aria-hidden="true" />
            <h2 className="text-base font-semibold">
              {status === "pending"
                ? "Pending debtor assignment"
                : status === "finalized"
                  ? "Debtor assignment finalized"
                  : "Debtor obligation assignment"}
            </h2>
          </div>
          {current_debtor && (
            <div className="text-xs text-muted-foreground">
              Active debtor:{" "}
              <span
                className="font-mono font-semibold text-foreground"
                data-testid="invoice-active-debtor"
              >
                {current_debtor}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isBlocked && blockedMessage && (
          <div
            role="alert"
            data-testid="assignment-blocked-message"
            className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{blockedMessage}</span>
          </div>
        )}

        {status === "finalized" && (
          <div
            role="status"
            data-testid="assignment-finalized-banner"
            className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              All three parties consented. Obligation transferred to{" "}
              <strong className="font-mono">{current_debtor}</strong>.
            </span>
          </div>
        )}

        {status === "pending" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Proposed new debtor: </span>
                <span
                  className="font-mono font-semibold"
                  data-testid="assignment-proposed-debtor"
                >
                  {proposed_new_debtor}
                </span>
              </div>
              <span
                className="text-xs font-medium text-muted-foreground"
                data-testid="assignment-consent-progress"
              >
                {completedCount} of 3 consents received
              </span>
            </div>

            {/* Three-step consent checklist */}
            <ol
              className="grid gap-2 sm:grid-cols-3"
              aria-label="Assignment consent checklist"
              data-testid="assignment-checklist"
            >
              {checklistSteps.map((step, index) => (
                <li
                  key={step.key}
                  data-testid={`consent-step-${step.key}`}
                  data-consented={String(step.consented)}
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
                    step.consented
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border bg-background"
                  }`}
                >
                  {step.consented ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Clock
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {index + 1}. {step.label}
                    </p>
                    {step.address && (
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {step.address}
                      </p>
                    )}
                    <p
                      className={`mt-1 font-medium ${
                        step.consented
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                      data-testid={`consent-status-${step.key}`}
                    >
                      {step.consented ? "Consented" : "Outstanding"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {hasAlreadyConsented && (
              <p
                className="text-xs text-emerald-700 dark:text-emerald-400"
                data-testid="assignment-already-consented"
              >
                You have already consented to this debtor assignment.
              </p>
            )}
          </>
        )}

        {(status === "none" || status === "cancelled") && (
          <p
            className="text-sm text-muted-foreground"
            data-testid="assignment-none-state"
          >
            No pending debtor assignment.
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canConsent && (
            <Button
              size="sm"
              onClick={handleConsent}
              disabled={isBlocked || consent.isPending}
              data-testid="assignment-consent-button"
            >
              {consent.isPending ? "Submitting..." : "Consent to assignment"}
            </Button>
          )}

          {isIssuer && status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isBlocked || cancel.isPending}
              data-testid="assignment-cancel-button"
            >
              <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Cancel assignment
            </Button>
          )}

          {isIssuer && (status === "none" || status === "cancelled") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProposeDialogOpen(true)}
              disabled={isBlocked || propose.isPending}
              data-testid="assignment-propose-button"
            >
              Propose assignment
            </Button>
          )}
        </div>
      </CardContent>

      {/* Propose assignment confirmation dialog */}
      <Dialog open={proposeDialogOpen} onOpenChange={setProposeDialogOpen}>
        <DialogContent data-testid="assignment-propose-dialog">
          <DialogHeader>
            <DialogTitle>Propose debtor assignment</DialogTitle>
            <DialogDescription>
              Transferring this invoice obligation requires on-chain consent from the issuer,
              the current debtor, and the proposed new debtor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="proposed-new-debtor">Proposed new debtor address</Label>
            <Input
              id="proposed-new-debtor"
              value={newDebtorInput}
              onChange={(e) => setNewDebtorInput(e.target.value)}
              placeholder="G..."
              data-testid="assignment-new-debtor-input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProposeDialogOpen(false)}
              data-testid="assignment-propose-dismiss"
            >
              Back
            </Button>
            <Button
              onClick={handleConfirmPropose}
              disabled={!newDebtorInput.trim() || isBlocked || propose.isPending}
              data-testid="assignment-propose-confirm"
            >
              Confirm proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel assignment confirmation dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent data-testid="assignment-cancel-dialog">
          <DialogHeader>
            <DialogTitle>Cancel debtor assignment?</DialogTitle>
            <DialogDescription>
              This will clear the pending assignment to{" "}
              <span className="font-mono">{proposed_new_debtor}</span> and reset any collected
              consents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              data-testid="assignment-cancel-dismiss"
            >
              Keep pending
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isBlocked || cancel.isPending}
              data-testid="assignment-cancel-confirm"
            >
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
