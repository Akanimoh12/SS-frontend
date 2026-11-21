import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConcentrationPanel } from "../ConcentrationPanel";
import { usePortfolioConcentration } from "@/hooks/usePortfolioConcentration";
import type { ConcentrationBucket } from "@/lib/analytics/concentration";

vi.mock("@/hooks/usePortfolioConcentration", () => ({
  usePortfolioConcentration: vi.fn(),
}));

const mockHook = vi.mocked(usePortfolioConcentration);

const buckets: ConcentrationBucket[] = [
  { key: "Acme", label: "Acme", principal: 80, sharePercent: 80, warning: true, positionIds: ["a"] },
  { key: "Globex", label: "Globex", principal: 20, sharePercent: 20, warning: false, positionIds: ["b"] },
];

beforeEach(() => {
  mockHook.mockReturnValue({
    groups: buckets,
    isLoading: false,
    isError: false,
    isEmpty: false,
    refetch: vi.fn(),
    tab: "debtor",
    threshold: 25,
  });
});

describe("ConcentrationPanel", () => {
  it("renders each group with its share and only flags high exposure", () => {
    render(<ConcentrationPanel />);

    expect(screen.getByTestId("concentration-table")).toBeInTheDocument();
    expect(screen.getByTestId("concentration-row-Acme")).toHaveTextContent("80%");
    expect(screen.getByTestId("concentration-warning-Acme")).toBeInTheDocument();
    expect(screen.queryByTestId("concentration-warning-Globex")).not.toBeInTheDocument();
  });

  it("renders a keyboard reachable treemap with labelled segments", () => {
    render(<ConcentrationPanel />);

    const treemap = screen.getByTestId("exposure-treemap");
    expect(treemap).toHaveAttribute("role", "group");
    const segment = screen.getByTestId("treemap-Acme");
    expect(segment.tagName).toBe("BUTTON");
    expect(segment).toHaveAttribute("aria-label", expect.stringContaining("Acme: 80%"));
  });

  it("switches grouping without a page reload", () => {
    render(<ConcentrationPanel />);

    const tab = screen.getByRole("tab", { name: "Jurisdiction" });
    fireEvent.mouseDown(tab, { button: 0 });

    expect(mockHook).toHaveBeenCalledWith("jurisdiction", 25);
  });

  it("passes a custom threshold to the hook", () => {
    render(<ConcentrationPanel threshold={40} />);
    expect(mockHook).toHaveBeenCalledWith("debtor", 40);
  });

  it("shows the empty state without a table or treemap", () => {
    mockHook.mockReturnValue({
      groups: [],
      isLoading: false,
      isError: false,
      isEmpty: true,
      refetch: vi.fn(),
      tab: "debtor",
      threshold: 25,
    });

    render(<ConcentrationPanel />);

    expect(screen.getByTestId("concentration-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("concentration-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("exposure-treemap")).not.toBeInTheDocument();
  });

  it("renders an explicit unavailable state on error", () => {
    mockHook.mockReturnValue({
      groups: [],
      isLoading: false,
      isError: true,
      isEmpty: false,
      refetch: vi.fn(),
      tab: "debtor",
      threshold: 25,
    });

    render(<ConcentrationPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
  });
});
