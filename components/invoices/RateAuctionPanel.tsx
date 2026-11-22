"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCountdown, formatRate } from "@/lib/analytics/rateAuction";
import { commitRateAuction } from "@/lib/api";
import { useOptionalAuth } from "@/context/AuthContext";
import { useRateAuction } from "@/hooks/useRateAuction";
import { RateStepChart } from "./RateStepChart";

/** Investor participation view for a descending-rate funding auction (#594). */
export function RateAuctionPanel({ invoiceId }: { invoiceId: string }) {
  const auth = useOptionalAuth();
  const { data: auction, view, isLoading, isError } = useRateAuction(invoiceId);
  const [amount, setAmount] = useState("");
  const [lockedRate, setLockedRate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Render nothing when the invoice has no auction. This panel is additive to
  // the invoice detail page and must not change the page for other invoices.
  if (!isLoading && !isError && auction === null) return null;
  if (isLoading) {
    return (
      <Card data-testid="rate-auction-loading">
        <CardContent className="py-6 text-center text-sm text-muted-foreground" role="status">
          Loading auction...
        </CardContent>
      </Card>
    );
  }
  if (isError || !auction || !view) {
    return (
      <Card data-testid="rate-auction-error">
        <CardContent className="py-6 text-center text-sm text-destructive" role="alert">
          Auction data is unavailable right now.
        </CardContent>
      </Card>
    );
  }

  const parsedAmount = Number(amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const formDisabled = view.isClosed || !validAmount || submitting;

  async function commit() {
    if (!auction || !view || formDisabled) return;
    const rate = view.currentRate;
    setLockedRate(rate);
    setError(null);
    setSubmitting(true);
    try {
      await commitRateAuction(
        {
          invoiceId: auction.invoice_id,
          amount: parsedAmount,
          lockedRate: rate,
        },
        auth?.jwt ?? undefined,
      );
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "Commit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card data-testid="rate-auction-panel">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Funding auction</CardTitle>
            <CardDescription>
              The offered yield rises step by step until the invoice is funded.
            </CardDescription>
          </div>
          {view.isClosed ? (
            <Badge variant="secondary" data-testid="rate-auction-closed">
              {view.status === "closed_unfilled" ? "Closed unfilled" : "Closed filled"}
            </Badge>
          ) : (
            <Badge variant="default" data-testid="rate-auction-active">
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current rate</p>
            <p className="text-xl font-semibold" data-testid="rate-auction-current">
              {formatRate(view.currentRate)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Next step in</p>
            <p className="text-xl font-semibold" data-testid="rate-auction-countdown">
              {formatCountdown(view.nextStepInSeconds)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Funded</p>
            <p className="text-xl font-semibold" data-testid="rate-auction-funded">
              {view.fundedPercent}%
            </p>
          </div>
        </div>

        <RateStepChart auction={auction} currentStepIndex={view.currentStepIndex} />

        <p className="text-sm text-muted-foreground">
          Maximum rate: {formatRate(view.maxRate)}. Your rate is fixed at the moment you commit.
        </p>

        {view.isClosed ? (
          <div className="space-y-2 rounded-lg border p-4" data-testid="rate-auction-result">
            <p className="text-sm font-medium">
              {view.status === "closed_unfilled"
                ? "This auction closed without full funding."
                : "This auction closed and was fully funded."}
            </p>
            {view.isUnfilled && (
              <p className="text-sm text-muted-foreground" data-testid="rate-auction-refund">
                If you committed to an unfilled auction, your funds are refunded automatically.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border p-4">
            <label htmlFor="rate-auction-amount" className="block text-sm font-medium">
              Commit amount
            </label>
            <Input
              id="rate-auction-amount"
              data-testid="rate-auction-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount in XLM"
            />
            <Button
              type="button"
              onClick={() => void commit()}
              disabled={formDisabled}
              data-testid="rate-auction-commit"
            >
              Commit at {formatRate(view.currentRate)}
            </Button>
            {error && (
              <p className="text-sm text-destructive" role="alert" data-testid="rate-auction-error-message">
                <AlertCircle className="mr-1 inline h-4 w-4" aria-hidden="true" />
                {error}
              </p>
            )}
            {lockedRate !== null && !error && (
              <p className="text-sm text-green-600" data-testid="rate-auction-confirmation">
                Committed at {formatRate(lockedRate)}. This rate is locked.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
