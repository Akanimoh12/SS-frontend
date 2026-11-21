"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  computeNetPreview,
  selectableInvoices,
  type NettingInvoice,
} from "@/lib/analytics/netting";
import type { ProposeNettingInput } from "@/lib/api";
import { formatXLM } from "@/lib/format";
import { NetPreview } from "./NetPreview";

export interface NewNettingWizardProps {
  invoices: readonly NettingInvoice[];
  creditor: string;
  onPropose: (input: ProposeNettingInput) => Promise<void>;
  onClose: () => void;
}

/**
 * Select a debtor and invoices, then preview the offset balances (#595).
 * Settled and disputed invoices stay visible with a reason but cannot be
 * selected.
 */
export function NewNettingWizard({
  invoices,
  creditor,
  onPropose,
  onClose,
}: NewNettingWizardProps) {
  const debtors = useMemo(
    () => Array.from(new Set(invoices.map((invoice) => invoice.debtor))).sort(),
    [invoices],
  );
  const [debtor, setDebtor] = useState(debtors[0] ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const debtorInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.debtor === debtor),
    [invoices, debtor],
  );
  const { eligible, blocked } = useMemo(
    () => selectableInvoices(debtorInvoices),
    [debtorInvoices],
  );
  const selectedInvoices = useMemo(
    () => eligible.filter((invoice) => selectedIds.has(invoice.id)),
    [eligible, selectedIds],
  );
  const preview = useMemo(() => computeNetPreview(selectedInvoices), [selectedInvoices]);

  const rows = [
    ...eligible.map((item) => ({ invoice: item, reason: null as string | null })),
    ...blocked.map((item) => ({ invoice: item.invoice, reason: item.reason })),
  ];

  const hasBothSides =
    selectedInvoices.some((invoice) => invoice.direction === "payable") &&
    selectedInvoices.some((invoice) => invoice.direction === "receivable");
  const canPropose = Boolean(debtor) && hasBothSides && !submitting;

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!canPropose) return;
    setSubmitting(true);
    try {
      await onPropose({
        debtor,
        creditor,
        invoices: selectedInvoices.map((invoice) => ({
          id: invoice.id,
          direction: invoice.direction,
          amount: invoice.amount,
        })),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card data-testid="netting-wizard">
      <CardHeader>
        <CardTitle>New netting agreement</CardTitle>
        <CardDescription>
          Pick invoices owing in each direction, then review the offset result.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block text-sm" htmlFor="netting-debtor">
          Counterparty
          <select
            id="netting-debtor"
            data-testid="netting-debtor-select"
            value={debtor}
            onChange={(event) => {
              setDebtor(event.target.value);
              setSelectedIds(new Set());
            }}
            className="mt-1 block w-full rounded-md border bg-background p-2"
          >
            {debtors.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        {debtorInvoices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No invoices for this counterparty.
          </p>
        ) : (
          <div className="space-y-2" data-testid="netting-invoice-list">
            {rows.map(({ invoice, reason }) => {
              const isBlocked = reason !== null;
              const control = (
                <span>
                  <input
                    type="checkbox"
                    id={`netting-invoice-${invoice.id}`}
                    data-testid={`netting-invoice-${invoice.id}`}
                    checked={selectedIds.has(invoice.id)}
                    disabled={isBlocked}
                    onChange={() => toggle(invoice.id)}
                  />
                </span>
              );

              return (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {isBlocked ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>{control}</TooltipTrigger>
                          <TooltipContent>{reason}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      control
                    )}
                    <label htmlFor={`netting-invoice-${invoice.id}`}>
                      {invoice.title}{" "}
                      <span className="text-muted-foreground">({invoice.direction})</span>
                    </label>
                  </div>
                  <span className="font-medium">{formatXLM(invoice.amount)}</span>
                </div>
              );
            })}
          </div>
        )}

        {selectedInvoices.length > 0 && <NetPreview preview={preview} />}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={!canPropose}
            data-testid="netting-propose"
          >
            Propose agreement
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
