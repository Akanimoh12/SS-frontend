/**
 * Descending-rate auction math for issue #594.
 *
 * The ladder and live step projection are pure functions of the auction data
 * plus a clock supplied by the caller, which keeps the countdown testable.
 */

export type AuctionStatus = "active" | "closed_filled" | "closed_unfilled";

export interface RateAuctionData {
  invoice_id: string;
  status: AuctionStatus;
  /** Starting annual yield percentage. */
  start_rate: number;
  /** Ceiling annual yield percentage. */
  max_rate: number;
  /** Increase per step, in basis points (25 bps = 0.25%). */
  step_bps: number;
  step_seconds: number;
  /** ISO timestamp when the ladder started climbing. */
  started_at: string;
  funded_percent: number;
}

export interface RateStep {
  index: number;
  rate: number;
}

export interface AuctionView {
  status: AuctionStatus;
  currentRate: number;
  maxRate: number;
  fundedPercent: number;
  currentStepIndex: number;
  nextStepInSeconds: number | null;
  isClosed: boolean;
  isUnfilled: boolean;
}

const MAX_STEPS = 200;
const ROUND = 100;

function round(value: number): number {
  return Math.round(value * ROUND) / ROUND;
}

/** Build the yield ladder from the start rate to the ceiling, inclusive. */
export function buildRateLadder(data: RateAuctionData): RateStep[] {
  const start = Number(data.start_rate);
  const max = Number(data.max_rate);
  const increment = Number(data.step_bps) / 100;

  if (!Number.isFinite(start) || !Number.isFinite(max) || !Number.isFinite(increment)) return [];
  if (increment <= 0 || max < start) return [{ index: 0, rate: round(start) }];

  const steps: RateStep[] = [];
  for (let index = 0; index < MAX_STEPS; index += 1) {
    const rate = round(start + index * increment);
    if (rate > max) break;
    steps.push({ index, rate });
    if (rate === round(max)) break;
  }
  return steps;
}

/**
 * Project the current step and countdown. A closed auction stops climbing and
 * never reports a next step, so the commit form can disable itself cleanly.
 */
export function projectAuction(data: RateAuctionData, nowMs: number): AuctionView {
  const steps = buildRateLadder(data);
  const isClosed = data.status !== "active";
  const startedAt = Date.parse(data.started_at);
  const stepSeconds = Number.isFinite(Number(data.step_seconds))
    ? Math.max(1, Math.floor(Number(data.step_seconds)))
    : 1;

  if (steps.length === 0 || Number.isNaN(startedAt)) {
    return {
      status: data.status,
      currentRate: Number(data.start_rate) || 0,
      maxRate: Number(data.max_rate) || 0,
      fundedPercent: Number(data.funded_percent) || 0,
      currentStepIndex: 0,
      nextStepInSeconds: null,
      isClosed,
      isUnfilled: data.status === "closed_unfilled",
    };
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  const rawStep = Math.floor(elapsedSeconds / stepSeconds);
  const currentStepIndex = Math.min(rawStep, steps.length - 1);
  const atCeiling = currentStepIndex === steps.length - 1;
  const nextStepInSeconds =
    isClosed || atCeiling ? null : stepSeconds - (elapsedSeconds % stepSeconds);

  return {
    status: data.status,
    currentRate: steps[currentStepIndex].rate,
    maxRate: steps[steps.length - 1].rate,
    fundedPercent: Number(data.funded_percent) || 0,
    currentStepIndex,
    nextStepInSeconds,
    isClosed,
    isUnfilled: data.status === "closed_unfilled",
  };
}

export function formatRate(rate: number): string {
  return `${Number(rate || 0).toFixed(2)}%`;
}

/** Compact countdown used by the commit form. */
export function formatCountdown(seconds: number | null): string {
  if (seconds === null) return "Final step";
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}m ${rest.toString().padStart(2, "0")}s`;
}
