/**
 * Issuer netting math and state rules for issue #595.
 *
 * Everything here is pure: preview amounts, eligibility, consent transitions
 * and investor allocation are all derived from plain input objects.
 */

export type InvoiceNettingStatus = "open" | "funded" | "settled" | "disputed";
export type NettingDirection = "payable" | "receivable";
export type NettingParty = "issuer" | "debtor";
export type NettingStatus = "draft" | "pending" | "settled" | "cancelled";

export interface NettingInvestorShare {
  address: string;
  /** This investor's committed amount on the invoice. */
  amount: number;
}

export interface NettingInvoice {
  id: string;
  title: string;
  debtor: string;
  direction: NettingDirection;
  amount: number;
  status: InvoiceNettingStatus;
  investors: NettingInvestorShare[];
}

export interface NettingAgreement {
  id: string;
  debtor: string;
  creditor: string;
  status: NettingStatus;
  issuerConsent: boolean;
  debtorConsent: boolean;
  invoices: NettingInvoice[];
  createdAt: string;
}

export interface NetAllocation {
  address: string;
  amount: number;
}

export interface NetPreview {
  grossPayable: number;
  grossReceivable: number;
  netAmount: number;
  /** Null when the two gross sides cancel out exactly. */
  payer: NettingParty | null;
  allocations: NetAllocation[];
}

const ROUND = 10000;

function round(value: number): number {
  return Math.round(value * ROUND) / ROUND;
}

function isSelectable(invoice: NettingInvoice): boolean {
  return invoice.status !== "settled" && invoice.status !== "disputed";
}

export interface BlockedInvoice {
  invoice: NettingInvoice;
  reason: string;
}

/** Split invoices into selectable ones and blocked ones with a reason. */
export function selectableInvoices(invoices: readonly NettingInvoice[]): {
  eligible: NettingInvoice[];
  blocked: BlockedInvoice[];
} {
  const eligible: NettingInvoice[] = [];
  const blocked: BlockedInvoice[] = [];

  for (const invoice of invoices) {
    if (invoice.status === "settled") {
      blocked.push({ invoice, reason: "Already settled" });
    } else if (invoice.status === "disputed") {
      blocked.push({ invoice, reason: "Under dispute" });
    } else {
      eligible.push(invoice);
    }
  }

  return { eligible, blocked };
}

/**
 * Compute the net payable and its allocation across investors.
 *
 * Only the paying side is allocated, since only that side must fund the net
 * transfer. Rounding drift is assigned to the final allocation so the table
 * always sums to the net amount.
 */
export function computeNetPreview(invoices: readonly NettingInvoice[]): NetPreview {
  const { eligible } = selectableInvoices(invoices);

  let grossPayable = 0;
  let grossReceivable = 0;
  for (const invoice of eligible) {
    const amount = Number(invoice.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (invoice.direction === "payable") grossPayable += amount;
    else grossReceivable += amount;
  }

  grossPayable = round(grossPayable);
  grossReceivable = round(grossReceivable);
  const netAmount = round(Math.abs(grossPayable - grossReceivable));
  const payer: NettingParty | null =
    grossPayable > grossReceivable ? "issuer" : grossReceivable > grossPayable ? "debtor" : null;

  if (payer === null || netAmount <= 0) {
    return { grossPayable, grossReceivable, netAmount: 0, payer: null, allocations: [] };
  }

  const direction: NettingDirection = payer === "issuer" ? "payable" : "receivable";
  const payingInvoices = eligible.filter(
    (invoice) => invoice.direction === direction && Number(invoice.amount) > 0,
  );
  const payingGross = payingInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  const allocations: NetAllocation[] = [];
  for (const invoice of payingInvoices) {
    const invoiceShare = Number(invoice.amount) / payingGross;
    const investorTotal = invoice.investors.reduce(
      (sum, investor) => sum + Math.max(0, Number(investor.amount) || 0),
      0,
    );

    if (investorTotal <= 0) continue;

    for (const investor of invoice.investors) {
      const weight = Math.max(0, Number(investor.amount) || 0) / investorTotal;
      allocations.push({
        address: investor.address,
        amount: round(netAmount * invoiceShare * weight),
      });
    }
  }

  if (allocations.length === 0) {
    allocations.push({ address: "Unallocated", amount: netAmount });
  } else {
    const total = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    const drift = round(netAmount - total);
    if (drift !== 0) {
      const last = allocations[allocations.length - 1];
      last.amount = round(last.amount + drift);
    }
  }

  return { grossPayable, grossReceivable, netAmount, payer, allocations };
}

export function canSettle(agreement: NettingAgreement): boolean {
  return agreement.status === "pending" && agreement.issuerConsent && agreement.debtorConsent;
}

export function canCancel(agreement: NettingAgreement): boolean {
  return agreement.status !== "settled" && agreement.status !== "cancelled";
}

/** Return a new agreement with the selected party's consent updated. */
export function withConsent(
  agreement: NettingAgreement,
  party: NettingParty,
  consent: boolean,
): NettingAgreement {
  return {
    ...agreement,
    issuerConsent: party === "issuer" ? consent : agreement.issuerConsent,
    debtorConsent: party === "debtor" ? consent : agreement.debtorConsent,
  };
}

/** Return a new agreement in the requested terminal state. */
export function withStatus(agreement: NettingAgreement, status: NettingStatus): NettingAgreement {
  return { ...agreement, status };
}
