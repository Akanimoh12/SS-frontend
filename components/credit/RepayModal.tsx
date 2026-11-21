"use client";

import type { CreditLine } from "@/lib/creditLine";
import { validateRepayAmount } from "@/lib/creditLine";
import { AmountActionModal } from "./AmountActionModal";
import { formatCreditAmount } from "./format";

interface RepayModalProps {
  line: CreditLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number) => Promise<unknown>;
  outstanding: number;
}

export function RepayModal({ line, open, onOpenChange, onSubmit, outstanding }: RepayModalProps) {
  return (
    <AmountActionModal
      testId="repay-modal"
      submitTestId="repay-submit"
      title="Repay credit"
      description="Repay drawn credit and accrued interest. Repayment stays available on a frozen line."
      actionLabel="Repay"
      line={line}
      open={open}
      onOpenChange={onOpenChange}
      validate={validateRepayAmount}
      submit={onSubmit}
    >
      <p data-testid="repay-outstanding" className="text-sm text-muted-foreground">
        Outstanding: {formatCreditAmount(outstanding, line.currency)}
      </p>
    </AmountActionModal>
  );
}
