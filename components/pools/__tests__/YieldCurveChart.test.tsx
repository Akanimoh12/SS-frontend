import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { YieldCurveChart } from "../YieldCurveChart";
import type { PoolRateModel } from "@/lib/pools";

const mockUsePoolRateModel = vi.fn();

vi.mock("@/hooks/usePoolRateModel", () => ({
  usePoolRateModel: (poolId: string) => mockUsePoolRateModel(poolId),
}));

const sampleModel: PoolRateModel = {
  pool_id: "pool-1",
  base_rate: 4,
  kink_utilization: 80,
  slope_1: 6,
  slope_2: 20,
  current_utilization: 60,
  current_rate: 8.5,
};

describe("YieldCurveChart (#598)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePoolRateModel.mockReturnValue({
      model: sampleModel,
      data: sampleModel,
      parameters: {
        base_rate: sampleModel.base_rate,
        kink_utilization: sampleModel.kink_utilization,
        slope_1: sampleModel.slope_1,
        slope_2: sampleModel.slope_2,
      },
      currentUtilization: sampleModel.current_utilization,
      currentRate: sampleModel.current_rate,
      isLoading: false,
      isError: false,
    });
  });

  it("renders a visible change in slope at the kink point", () => {
    render(<YieldCurveChart poolId="pool-1" />);

    const preKink = screen.getByTestId("yield-curve-pre-kink");
    const postKink = screen.getByTestId("yield-curve-post-kink");
    const kinkPoint = screen.getByTestId("yield-curve-kink-point");

    const preSlope = Number(preKink.getAttribute("data-slope"));
    const postSlope = Number(postKink.getAttribute("data-slope"));

    expect(preSlope).toBeCloseTo(0.075);
    expect(postSlope).toBeCloseTo(1.0);
    expect(postSlope).toBeGreaterThan(preSlope);

    expect(kinkPoint).toHaveAttribute("data-utilization", "80");
    expect(kinkPoint).toHaveAttribute("data-rate", "10");
    expect(screen.getByTestId("yield-curve-kink-label")).toHaveTextContent(
      "Kink (80% · 10.00%)",
    );
  });

  it("marks the pool's current position with a dot matching reported utilization and rate", () => {
    render(<YieldCurveChart poolId="pool-1" />);

    const dot = screen.getByTestId("yield-curve-current-dot");
    expect(dot).toHaveAttribute("data-utilization", "60");
    expect(dot).toHaveAttribute("data-rate", "8.5");
    expect(screen.getByTestId("yield-curve-current-label")).toHaveTextContent(
      "Current (60% · 8.50%)",
    );
  });

  it("updates the simulated rate when the utilization slider changes", () => {
    render(<YieldCurveChart poolId="pool-1" />);

    const slider = screen.getByTestId("yield-curve-slider");
    expect(screen.getByTestId("yield-curve-simulated-utilization")).toHaveTextContent(
      "60% utilization",
    );
    expect(screen.getByTestId("yield-curve-simulated-rate")).toHaveTextContent(
      "8.50% APR",
    );

    // Move slider to 40% (pre-kink: 4 + (40/80)*6 = 7.00%)
    fireEvent.change(slider, { target: { value: "40" } });
    expect(screen.getByTestId("yield-curve-simulated-utilization")).toHaveTextContent(
      "40% utilization",
    );
    expect(screen.getByTestId("yield-curve-simulated-rate")).toHaveTextContent(
      "7.00% APR",
    );

    // Move slider to 90% (post-kink: 4 + 6 + ((90-80)/20)*20 = 20.00%)
    fireEvent.change(slider, { target: { value: "90" } });
    expect(screen.getByTestId("yield-curve-simulated-utilization")).toHaveTextContent(
      "90% utilization",
    );
    expect(screen.getByTestId("yield-curve-simulated-rate")).toHaveTextContent(
      "20.00% APR",
    );
  });

  it("renders a text alternative listing key curve points", () => {
    render(<YieldCurveChart poolId="pool-1" />);

    const alt = screen.getByTestId("yield-curve-text-alternative");
    expect(alt).toBeInTheDocument();
    expect(screen.getByTestId("key-point-base")).toHaveTextContent("4.00%");
    expect(screen.getByTestId("key-point-kink")).toHaveTextContent("80%");
    expect(screen.getByTestId("key-point-kink")).toHaveTextContent("10.00%");
    expect(screen.getByTestId("key-point-current")).toHaveTextContent("60%");
    expect(screen.getByTestId("key-point-current")).toHaveTextContent("8.50%");
    expect(screen.getByTestId("key-point-max")).toHaveTextContent("30.00%");
  });

  it("displays model parameters in the collapsible details section and shows the existing positions note", () => {
    render(<YieldCurveChart poolId="pool-1" />);

    expect(screen.getByTestId("yield-curve-model-details")).toBeInTheDocument();
    expect(screen.getByTestId("param-base-rate")).toHaveTextContent("4.00%");
    expect(screen.getByTestId("param-kink-utilization")).toHaveTextContent("80%");
    expect(screen.getByTestId("param-slope-1")).toHaveTextContent("+6.00%");
    expect(screen.getByTestId("param-slope-2")).toHaveTextContent("+20.00%");

    expect(
      screen.getByTestId("yield-curve-existing-positions-note"),
    ).toHaveTextContent("Existing positions keep the rate they were opened at");
  });
});
