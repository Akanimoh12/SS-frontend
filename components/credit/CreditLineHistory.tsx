"use client";

import { sortedHistory, type CreditLine } from "@/lib/creditLine";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCreditAmount } from "./format";

/** Recent draws and repayments with type, amount and timestamp (#588). */
export function CreditLineHistory({ line }: { line: CreditLine }) {
  const rows = sortedHistory(line);

  return (
    <section data-testid="credit-line-history" aria-label="Credit line history">
      <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
      {rows.length === 0 ? (
        <p data-testid="credit-history-empty" className="text-sm text-muted-foreground">
          No draws or repayments yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((event) => (
              <TableRow key={event.id} data-testid={`credit-history-${event.id}`}>
                <TableCell className="capitalize">{event.type}</TableCell>
                <TableCell>{formatCreditAmount(event.amount, line.currency)}</TableCell>
                <TableCell>
                  <time dateTime={event.occurredAt}>
                    {new Date(event.occurredAt).toLocaleString()}
                  </time>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
