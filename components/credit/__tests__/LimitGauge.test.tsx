import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LimitGauge } from "../LimitGauge";

describe("LimitGauge (#588)", () => {
  it("renders the drawn, accrued and available segments and values", () => {
    render(
      <LimitGauge
        limit={1000}
        currency="XLM"
        segments={{ drawn: 300, accrued: 50, available: 650 }}
      />
    );

    expect(screen.getByTestId("gauge-drawn")).toHaveStyle({ width: "30%" });
    expect(screen.getByTestId("gauge-accrued")).toHaveStyle({ width: "5%" });
    expect(screen.getByTestId("gauge-available")).toHaveStyle({ width: "65%" });
    expect(screen.getByTestId("gauge-available-value")).toHaveTextContent("650.00 XLM");
  });

  it("does not divide by zero for an empty line", () => {
    render(
      <LimitGauge
        limit={0}
        currency="USDC"
        segments={{ drawn: 0, accrued: 0, available: 0 }}
      />
    );
    expect(screen.getByTestId("gauge-available")).toHaveStyle({ width: "0%" });
  });
});
