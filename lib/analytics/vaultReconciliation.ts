/**
 * Vault reconciliation math for issue #596.
 *
 * The contract balance and the backend vault listing are supplied by the
 * caller. This module only compares them and prepares the table view.
 */

export type VaultInvoiceStatus = "open" | "funded" | "closed" | "settled" | "defaulted";

export interface VaultRow {
  invoice_id: string;
  invoice_title?: string;
  balance: number;
  lifetime_in: number;
  lifetime_out: number;
  status: VaultInvoiceStatus;
}

export interface VaultReconciliationData {
  contract_balance: number;
  vaults: VaultRow[];
  checked_at: string;
}

export interface ReconciliationSummary {
  contractBalance: number;
  vaultTotal: number;
  difference: number;
  passed: boolean;
  checkedAt: string;
  vaultCount: number;
}

export type VaultSortKey = "balance" | "lifetime_in" | "lifetime_out";

/** Token comparisons tolerate sub-strip float noise but nothing larger. */
const EPSILON = 1e-9;

export function summarizeReconciliation(data: VaultReconciliationData): ReconciliationSummary {
  const vaultTotal = data.vaults.reduce((sum, vault) => sum + Number(vault.balance || 0), 0);
  const difference = Number(data.contract_balance || 0) - vaultTotal;

  return {
    contractBalance: Number(data.contract_balance || 0),
    vaultTotal,
    difference,
    passed: Math.abs(difference) < EPSILON,
    checkedAt: data.checked_at,
    vaultCount: data.vaults.length,
  };
}

/** A vault that still holds funds after its invoice closed needs attention. */
export function isStaleClosedVault(vault: VaultRow): boolean {
  return (vault.status === "closed" || vault.status === "settled") && Number(vault.balance || 0) > 0;
}

export function sortVaults(
  vaults: readonly VaultRow[],
  key: VaultSortKey,
  descending: boolean = true,
): VaultRow[] {
  return [...vaults].sort((a, b) => {
    const delta = Number(a[key] || 0) - Number(b[key] || 0);
    const result = delta === 0 ? a.invoice_id.localeCompare(b.invoice_id) : delta;
    return descending ? -result : result;
  });
}
