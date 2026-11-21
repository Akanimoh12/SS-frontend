"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePoolRateModel } from "@/hooks/usePoolRateModel";
import {
  buildYieldCurvePoints,
  calculatePoolYieldAtUtilization,
  getCurveSlopes,
  type PoolRateModel,
} from "@/lib/pools";

const SVG_WIDTH = 600;
const SVG_HEIGHT = 240;
const PAD_LEFT = 48;
const PAD_RIGHT = 28;
const PAD_TOP = 28;
const PAD_BOTTOM = 36;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

function toX(utilization: number): number {
  const clamped = Math.min(100, Math.max(0, utilization));
  return Math.round((PAD_LEFT + (clamped / 100) * PLOT_WIDTH) * 100) / 100;
}

function toY(rate: number, yMax: number): number {
  const safeMax = yMax > 0 ? yMax : 1;
  const clamped = Math.min(safeMax, Math.max(0, rate));
  return Math.round((PAD_TOP + PLOT_HEIGHT - (clamped / safeMax) * PLOT_HEIGHT) * 100) / 100;
}

export interface YieldCurveChartProps {
  poolId: string;
  /** Optional direct model override for controlled views or unit tests. */
  initialModel?: PoolRateModel | null;
}

export function YieldCurveChart({ poolId, initialModel }: YieldCurveChartProps) {
  const {
    parameters: hookParams,
    currentUtilization: hookUtilization,
    currentRate: hookRate,
    isLoading,
    isError,
  } = usePoolRateModel(poolId);

  const parameters = initialModel
    ? {
        base_rate: initialModel.base_rate,
        kink_utilization: initialModel.kink_utilization,
        slope_1: initialModel.slope_1,
        slope_2: initialModel.slope_2,
      }
    : hookParams;

  const currentUtilization = initialModel
    ? initialModel.current_utilization
    : hookUtilization;
  const currentRate = initialModel ? initialModel.current_rate : hookRate;

  const [simulatedUtilization, setSimulatedUtilization] = useState<number>(
    currentUtilization ?? 50,
  );

  useEffect(() => {
    if (currentUtilization !== null && currentUtilization !== undefined) {
      setSimulatedUtilization(currentUtilization);
    }
  }, [currentUtilization]);

  const points = useMemo(
    () => (parameters ? buildYieldCurvePoints(parameters, 5) : []),
    [parameters],
  );

  const slopes = useMemo(
    () => (parameters ? getCurveSlopes(parameters) : null),
    [parameters],
  );

  const simulatedRate = useMemo(
    () =>
      parameters
        ? calculatePoolYieldAtUtilization(simulatedUtilization, parameters)
        : 0,
    [parameters, simulatedUtilization],
  );

  if (!initialModel && isLoading) {
    return (
      <Card data-testid="yield-curve-loading">
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if ((!initialModel && isError) || !parameters || !slopes || currentUtilization === null || currentRate === null) {
    return null;
  }

  const yMax = Math.max(slopes.maxRate * 1.15, currentRate * 1.15, 10);
  const startX = toX(0);
  const startY = toY(parameters.base_rate, yMax);
  const kinkX = toX(parameters.kink_utilization);
  const kinkY = toY(slopes.kinkRate, yMax);
  const endX = toX(100);
  const endY = toY(slopes.maxRate, yMax);

  const currentX = toX(currentUtilization);
  const currentY = toY(currentRate, yMax);
  const simX = toX(simulatedUtilization);
  const simY = toY(simulatedRate, yMax);

  const polylinePoints = points
    .map((pt) => `${toX(pt.utilization)},${toY(pt.rate, yMax)}`)
    .join(" ");

  return (
    <Card data-testid="yield-curve-chart">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Dynamic yield curve</h2>
            <p className="text-sm text-muted-foreground">
              Pool yield adjusts dynamically with capital utilization
            </p>
          </div>
          <div
            className="rounded-md border bg-muted/40 px-3 py-1.5 text-xs"
            data-testid="yield-curve-current-summary"
          >
            <span className="text-muted-foreground">Current: </span>
            <span className="font-semibold tabular-nums">
              {currentUtilization.toFixed(1)}% utilization · {currentRate.toFixed(2)}% APR
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* SVG Yield Curve Plot */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="h-60 w-full"
            role="img"
            aria-label={`Pool yield curve from ${parameters.base_rate.toFixed(2)}% at 0% utilization to ${slopes.maxRate.toFixed(2)}% at 100% utilization, with kink at ${parameters.kink_utilization}% utilization (${slopes.kinkRate.toFixed(2)}%)`}
            data-testid="yield-curve-svg"
          >
            {/* Axes */}
            <line
              x1={PAD_LEFT}
              y1={PAD_TOP + PLOT_HEIGHT}
              x2={SVG_WIDTH - PAD_RIGHT}
              y2={PAD_TOP + PLOT_HEIGHT}
              stroke="currentColor"
              strokeOpacity={0.25}
            />
            <line
              x1={PAD_LEFT}
              y1={PAD_TOP}
              x2={PAD_LEFT}
              y2={PAD_TOP + PLOT_HEIGHT}
              stroke="currentColor"
              strokeOpacity={0.25}
            />

            {/* X-axis tick labels */}
            {[0, 25, 50, 75, 100].map((tick) => (
              <g key={tick} transform={`translate(${toX(tick)}, ${PAD_TOP + PLOT_HEIGHT})`}>
                <line y1={0} y2={4} stroke="currentColor" strokeOpacity={0.4} />
                <text
                  y={18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {tick}%
                </text>
              </g>
            ))}

            {/* Kink vertical dashed reference line */}
            <line
              x1={kinkX}
              y1={PAD_TOP}
              x2={kinkX}
              y2={PAD_TOP + PLOT_HEIGHT}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              data-testid="yield-curve-kink-line"
            />

            {/* Pre-kink segment and Post-kink segment showing explicit slope change */}
            <line
              x1={startX}
              y1={startY}
              x2={kinkX}
              y2={kinkY}
              stroke="#2563eb"
              strokeWidth={2.5}
              data-testid="yield-curve-pre-kink"
              data-slope={slopes.preKinkSlope}
            />
            <line
              x1={kinkX}
              y1={kinkY}
              x2={endX}
              y2={endY}
              stroke="#dc2626"
              strokeWidth={2.5}
              data-testid="yield-curve-post-kink"
              data-slope={slopes.postKinkSlope}
            />

            {/* Full curve polyline */}
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeOpacity={0.15}
              strokeWidth={4}
              points={polylinePoints}
              data-testid="yield-curve-polyline"
            />

            {/* Kink point marker and label */}
            <g data-testid="yield-curve-kink-point" data-utilization={parameters.kink_utilization} data-rate={slopes.kinkRate}>
              <circle cx={kinkX} cy={kinkY} r={4.5} fill="#f59e0b" />
              <text
                x={kinkX}
                y={Math.max(14, kinkY - 10)}
                textAnchor="middle"
                className="fill-amber-600 text-[10px] font-medium"
                data-testid="yield-curve-kink-label"
              >
                Kink ({parameters.kink_utilization}% · {slopes.kinkRate.toFixed(2)}%)
              </text>
            </g>

            {/* Simulated slider position indicator */}
            <circle
              cx={simX}
              cy={simY}
              r={4}
              fill="none"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="2 2"
              data-testid="yield-curve-simulated-dot"
              data-utilization={simulatedUtilization}
              data-rate={simulatedRate}
            />

            {/* Pool current position labelled dot */}
            <g data-testid="yield-curve-current-position">
              <circle
                cx={currentX}
                cy={currentY}
                r={6}
                fill="#16a34a"
                stroke="#ffffff"
                strokeWidth={2}
                data-testid="yield-curve-current-dot"
                data-utilization={currentUtilization}
                data-rate={currentRate}
              />
              <text
                x={Math.min(SVG_WIDTH - PAD_RIGHT - 45, Math.max(PAD_LEFT + 45, currentX))}
                y={Math.min(PAD_TOP + PLOT_HEIGHT - 8, currentY + 18)}
                textAnchor="middle"
                className="fill-emerald-700 dark:fill-emerald-400 text-[11px] font-semibold"
                data-testid="yield-curve-current-label"
              >
                Current ({currentUtilization}% · {currentRate.toFixed(2)}%)
              </text>
            </g>
          </svg>
        </div>

        {/* Accessible text alternative listing key points on the yield curve */}
        <div
          className="rounded-lg border bg-muted/20 p-3 text-xs"
          role="region"
          aria-label="Yield curve key points"
          data-testid="yield-curve-text-alternative"
        >
          <p className="mb-1.5 font-medium text-foreground">Key curve points</p>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            <li data-testid="key-point-base">
              <span className="text-muted-foreground">0% utilization (Base): </span>
              <span className="font-medium tabular-nums">{parameters.base_rate.toFixed(2)}%</span>
            </li>
            <li data-testid="key-point-kink">
              <span className="text-muted-foreground">
                {parameters.kink_utilization}% utilization (Kink):{" "}
              </span>
              <span className="font-medium tabular-nums">{slopes.kinkRate.toFixed(2)}%</span>
            </li>
            <li data-testid="key-point-current">
              <span className="text-muted-foreground">
                {currentUtilization}% utilization (Current):{" "}
              </span>
              <span className="font-medium tabular-nums">{currentRate.toFixed(2)}%</span>
            </li>
            <li data-testid="key-point-max">
              <span className="text-muted-foreground">100% utilization (Max): </span>
              <span className="font-medium tabular-nums">{slopes.maxRate.toFixed(2)}%</span>
            </li>
          </ul>
        </div>

        {/* Utilization simulator slider */}
        <div className="space-y-2 rounded-lg border p-4" data-testid="yield-curve-simulator">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor={`utilization-slider-${poolId}`} className="text-sm font-medium">
              Simulate utilization
            </Label>
            <div className="text-sm">
              <span
                className="font-medium tabular-nums text-muted-foreground"
                data-testid="yield-curve-simulated-utilization"
              >
                {simulatedUtilization}% utilization
              </span>
              <span className="mx-1.5 text-muted-foreground">→</span>
              <span
                className="font-semibold tabular-nums text-primary"
                data-testid="yield-curve-simulated-rate"
              >
                {simulatedRate.toFixed(2)}% APR
              </span>
            </div>
          </div>
          <input
            id={`utilization-slider-${poolId}`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={simulatedUtilization}
            onChange={(e) => setSimulatedUtilization(Number(e.target.value))}
            aria-label="Simulated utilization percentage"
            data-testid="yield-curve-slider"
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>Kink: {parameters.kink_utilization}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Collapsible model parameters section */}
        <details
          className="rounded-lg border px-4 py-3 text-sm"
          data-testid="yield-curve-model-details"
        >
          <summary
            className="cursor-pointer font-medium select-none"
            data-testid="yield-curve-details-toggle"
          >
            Rate model parameters
          </summary>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Base rate</dt>
              <dd className="mt-0.5 font-semibold tabular-nums" data-testid="param-base-rate">
                {parameters.base_rate.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kink utilization</dt>
              <dd
                className="mt-0.5 font-semibold tabular-nums"
                data-testid="param-kink-utilization"
              >
                {parameters.kink_utilization}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Slope 1 (pre-kink)</dt>
              <dd className="mt-0.5 font-semibold tabular-nums" data-testid="param-slope-1">
                +{parameters.slope_1.toFixed(2)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Slope 2 (post-kink)</dt>
              <dd className="mt-0.5 font-semibold tabular-nums" data-testid="param-slope-2">
                +{parameters.slope_2.toFixed(2)}%
              </dd>
            </div>
          </dl>
        </details>

        {/* Explanatory note on existing positions */}
        <div
          className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground"
          data-testid="yield-curve-existing-positions-note"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Existing positions keep the rate they were opened at. Changes along the utilization
            curve apply only to new pool allocations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
