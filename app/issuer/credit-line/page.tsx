"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuardedButton } from "@/components/network/GuardedButton";
import { CreditLineHistory } from "@/components/credit/CreditLineHistory";
import { DrawModal } from "@/components/credit/DrawModal";
import { LimitGauge } from "@/components/credit/LimitGauge";
import { RepayModal } from "@/components/credit/RepayModal";
import { formatCreditAmount } from "@/components/credit/format";
import { useCreditLine, useDrawCreditLine, useRepayCreditLine } from "@/hooks/useCreditLine";
import { creditLineSegments, isFrozen } from "@/lib/creditLine";

/** Issuer credit-line dashboard (#588). */
export default function CreditLinePage() {
  const { data: line, isLoading, isError } = useCreditLine();
  const draw = useDrawCreditLine();
  const repay = useRepayCreditLine();
  const [drawOpen, setDrawOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);

  const segments = useMemo(() => (line ? creditLineSegments(line) : null), [line]);
  const frozen = line ? isFrozen(line) : false;

  if (isLoading) {
    return <div data-testid="credit-line-loading" className="container mx-auto px-4 py-8">Loading credit line...</div>;
  }

  if (isError) {
    return (
      <div data-testid="credit-line-unavailable" className="container mx-auto px-4 py-8">
        Credit line information is currently unavailable. Please try again later.
      </div>
    );
  }

  if (!line || !segments) {
    return (
      <div data-testid="credit-line-empty" className="container mx-auto px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold">Credit line</h1>
        <p className="text-muted-foreground">
          You do not have an open credit line yet. Issuers with a repeated settlement
          history are eligible for one.
        </p>
      </div>
    );
  }

  return (
    <main data-testid="credit-line-page" className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Credit line</h1>
          <p className="text-sm text-muted-foreground">
            Limit {formatCreditAmount(line.limit, line.currency)}
          </p>
        </div>
        <div className="flex gap-2">
          <GuardedButton
            data-testid="open-draw"
            onClick={() => setDrawOpen(true)}
            disabled={frozen}
            title={frozen ? "Draws are disabled on a frozen credit line" : undefined}
          >
            Draw credit
          </GuardedButton>
          <GuardedButton data-testid="open-repay" variant="outline" onClick={() => setRepayOpen(true)}>
            Repay credit
          </GuardedButton>
        </div>
      </div>

      {frozen && (
        <div data-testid="frozen-notice" role="status" className="rounded-md border border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
          This credit line is frozen. New draws are blocked, but repayments are still accepted.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available credit</CardTitle>
        </CardHeader>
        <CardContent>
          <LimitGauge segments={segments} limit={line.limit} currency={line.currency} />
        </CardContent>
      </Card>

      <CreditLineHistory line={line} />

      <DrawModal
        line={line}
        open={drawOpen}
        onOpenChange={setDrawOpen}
        available={segments.available}
        onSubmit={(amount) => draw.mutateAsync(amount)}
      />
      <RepayModal
        line={line}
        open={repayOpen}
        onOpenChange={setRepayOpen}
        outstanding={segments.drawn + segments.accrued}
        onSubmit={(amount) => repay.mutateAsync(amount)}
      />
    </main>
  );
}
