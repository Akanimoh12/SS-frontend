"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AmountProblem, AmountValidation, CreditLine } from "@/lib/creditLine";

const PROBLEM_MESSAGES: Record<AmountProblem, string> = {
  "not-a-number": "Enter a valid amount",
  "not-positive": "Amount must be greater than zero",
  frozen: "Draws are disabled while the credit line is frozen",
  "exceeds-available": "Amount exceeds available credit",
  "exceeds-outstanding": "Amount exceeds the outstanding balance",
};

interface AmountActionModalProps {
  testId: string;
  title: string;
  description: string;
  actionLabel: string;
  line: CreditLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validate: (line: CreditLine, amount: number) => AmountValidation;
  submit: (amount: number) => Promise<unknown>;
  submitTestId: string;
  children?: ReactNode;
}

/** Shared validation shell for the draw and repay dialogs (#588). */
export function AmountActionModal({
  testId,
  title,
  description,
  actionLabel,
  line,
  open,
  onOpenChange,
  validate,
  submit,
  submitTestId,
  children,
}: AmountActionModalProps) {
  const [rawAmount, setRawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const amount = Number(rawAmount);

  const validation = useMemo<AmountValidation>(
    () => (rawAmount.trim() === "" ? { ok: true } : validate(line, amount)),
    [rawAmount, amount, line, validate]
  );

  async function onSubmit() {
    const result = validate(line, amount);
    if (!result.ok) return;
    setSubmitting(true);
    try {
      await submit(amount);
      setRawAmount("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor={`${testId}-amount`} className="text-sm font-medium">
            Amount ({line.currency})
          </label>
          <Input
            id={`${testId}-amount`}
            data-testid={`${testId}-amount`}
            inputMode="decimal"
            value={rawAmount}
            onChange={(event) => setRawAmount(event.target.value)}
            placeholder="0.00"
          />
          {!validation.ok && (
            <p data-testid={`${testId}-error`} className="text-sm text-destructive">
              {PROBLEM_MESSAGES[validation.problem]}
            </p>
          )}
          {children}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            data-testid={submitTestId}
            onClick={() => void onSubmit()}
            disabled={!validation.ok || rawAmount.trim() === "" || submitting}
          >
            {submitting ? "Working..." : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
