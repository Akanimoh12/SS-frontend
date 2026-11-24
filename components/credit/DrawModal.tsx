"use client";

import type { CreditLine } from "@/lib/creditLine";
import { validateDrawAmount } from "@/lib/creditLine";
import { AmountActionModal } from "./AmountActionModal";
import { formatCreditAmount } from "./format";

interface DrawModalProps {
  line: CreditLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number) => Promise<unknown>;
  available: number;
}

export function DrawModal({ line, open, onOpenChange, onSubmit, available }: DrawModalProps) {
  return (
    <AmountActionModal
      testId="draw-modal"
      submitTestId="draw-submit"
      title="Draw credit"
      description="Move funds from your available credit line."
      actionLabel="Draw"
      line={line}
      open={open}
      onOpenChange={onOpenChange}
      validate={validateDrawAmount}
      submit={onSubmit}
    >
      <p data-testid="draw-available" className="text-sm text-muted-foreground">
        Available: {formatCreditAmount(available, line.currency)}
      </p>
    </AmountActionModal>
  );
}
