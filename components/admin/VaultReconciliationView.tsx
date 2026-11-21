"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  isStaleClosedVault,
  sortVaults,
  summarizeReconciliation,
  type VaultSortKey,
} from "@/lib/analytics/vaultReconciliation";
import { formatXLM } from "@/lib/format";
import { useVaultReconciliation } from "@/hooks/useVaultReconciliation";

const SORT_COLUMNS: Array<{ key: VaultSortKey; label: string }> = [
  { key: "balance", label: "Balance" },
  { key: "lifetime_in", label: "Lifetime in" },
  { key: "lifetime_out", label: "Lifetime out" },
];

/**
 * Admin reconciliation table for issue #596.
 *
 * The pass/fail decision and stale-vault detection are pure functions; this
 * component only owns sort order and renders the result.
 */
export function VaultReconciliationView() {
  const { data, isLoading, isError, isFetching, refetch } = useVaultReconciliation();
  const [sortKey, setSortKey] = useState<VaultSortKey>("balance");
  const [descending, setDescending] = useState(true);

  const summary = useMemo(() => (data ? summarizeReconciliation(data) : null), [data]);
  const vaults = useMemo(
    () => sortVaults(data?.vaults ?? [], sortKey, descending),
    [data, sortKey, descending],
  );

  function toggleSort(key: VaultSortKey) {
    if (key === sortKey) {
      setDescending((value) => !value);
      return;
    }
    setSortKey(key);
    setDescending(true);
  }

  return (
    <Card data-testid="vault-reconciliation">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Vault reconciliation</CardTitle>
            <CardDescription>
              Compares the sum of invoice vaults with the contract token balance.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            data-testid="vault-reconciliation-refresh"
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="status">
            Loading reconciliation...
          </p>
        ) : isError || !summary ? (
          <p className="py-8 text-center text-sm text-destructive" role="alert">
            Vault reconciliation is unavailable right now.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3" data-testid="reconciliation-summary">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Contract balance</p>
                <p className="mt-1 text-lg font-semibold" data-testid="reconciliation-contract-balance">
                  {formatXLM(summary.contractBalance)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sum of vaults</p>
                <p className="mt-1 text-lg font-semibold" data-testid="reconciliation-vault-total">
                  {formatXLM(summary.vaultTotal)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Difference</p>
                <p className="mt-1 text-lg font-semibold" data-testid="reconciliation-difference">
                  {formatXLM(summary.difference)}
                </p>
              </div>
            </div>

            <div data-testid="reconciliation-result">
              {summary.passed ? (
                <Badge variant="default" data-testid="reconciliation-pass">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Balanced
                </Badge>
              ) : (
                <Badge variant="destructive" data-testid="reconciliation-fail">
                  <XCircle className="h-3 w-3" aria-hidden="true" />
                  Mismatch: {formatXLM(summary.difference)}
                </Badge>
              )}
              <p className="mt-2 text-xs text-muted-foreground" data-testid="reconciliation-timestamp">
                Last checked: {new Date(summary.checkedAt).toLocaleString()}
              </p>
            </div>

            <Table data-testid="vault-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  {SORT_COLUMNS.map((column) => (
                    <TableHead
                      key={column.key}
                      className="text-right"
                      aria-sort={
                        sortKey === column.key ? (descending ? "descending" : "ascending") : "none"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        data-testid={`sort-${column.key}`}
                        className="hover:text-foreground"
                      >
                        {column.label}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                  <TableHead>Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No invoice vaults returned.
                    </TableCell>
                  </TableRow>
                ) : (
                  vaults.map((vault) => {
                    const stale = isStaleClosedVault(vault);
                    return (
                      <TableRow
                        key={vault.invoice_id}
                        data-testid={`vault-row-${vault.invoice_id}`}
                        className={stale ? "bg-destructive/10" : undefined}
                      >
                        <TableCell className="font-medium">
                          {vault.invoice_title ?? vault.invoice_id}
                        </TableCell>
                        <TableCell className="text-right">{formatXLM(vault.balance)}</TableCell>
                        <TableCell className="text-right">{formatXLM(vault.lifetime_in)}</TableCell>
                        <TableCell className="text-right">{formatXLM(vault.lifetime_out)}</TableCell>
                        <TableCell className="capitalize">{vault.status}</TableCell>
                        <TableCell>
                          {stale ? (
                            <Badge variant="destructive" data-testid={`stale-vault-${vault.invoice_id}`}>
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                              Closed with balance
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
