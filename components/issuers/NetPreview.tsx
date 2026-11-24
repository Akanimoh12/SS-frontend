"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NetPreview as NetPreviewModel } from "@/lib/analytics/netting";
import { formatXLM } from "@/lib/format";

/** Read-only preview of the gross amounts, net payment and investor split (#595). */
export function NetPreview({ preview }: { preview: NetPreviewModel }) {
  const allocationTotal = preview.allocations.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4" data-testid="net-preview">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross payable</p>
          <p className="font-semibold" data-testid="net-gross-payable">
            {formatXLM(preview.grossPayable)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross receivable</p>
          <p className="font-semibold" data-testid="net-gross-receivable">
            {formatXLM(preview.grossReceivable)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Net payable</p>
          <p className="font-semibold" data-testid="net-amount">
            {formatXLM(preview.netAmount)}
          </p>
        </div>
      </div>

      <p data-testid="net-payer" className="text-sm">
        {preview.payer === "issuer"
          ? "You pay the net amount to the debtor."
          : preview.payer === "debtor"
            ? "The debtor pays the net amount to you."
            : "The two sides cancel out, so no payment is needed."}
      </p>

      {preview.allocations.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Investor allocation</h4>
          <Table data-testid="net-allocation-table">
            <TableHeader>
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead className="text-right">Share of net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.allocations.map((allocation, index) => (
                <TableRow key={`${allocation.address}-${index}`}>
                  <TableCell className="font-mono text-xs">{allocation.address}</TableCell>
                  <TableCell className="text-right">{formatXLM(allocation.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold" data-testid="net-allocation-total">
                  {formatXLM(allocationTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
