import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { IssuerTierBadge } from "../IssuerTierBadge";
import { TierProgressCard } from "../TierProgressCard";
import { InvoiceCard } from "@/components/marketplace/invoice-card";
import { renderWithCardProviders } from "@/components/marketplace/__tests__/render-with-card-providers";
import { ISSUER_TIER_CONFIGS, type IssuerTierStatus } from "@/lib/issuers";
import type { Invoice } from "@/lib/api";

const mockUseIssuerTier = vi.fn();

vi.mock("@/hooks/useIssuerTier", () => ({
  useIssuerTier: (address?: string | null) => mockUseIssuerTier(address),
}));

const ISSUER_ADDR = "GISSUER6041111111111111111111111111111111111111111111111";

function makeTierStatus(overrides: Partial<IssuerTierStatus> = {}): IssuerTierStatus {
  const tier = overrides.tier ?? "bronze";
  const config = ISSUER_TIER_CONFIGS[tier];
  const nextTier = tier === "bronze" ? "silver" : tier === "silver" ? "gold" : null;

  return {
    address: ISSUER_ADDR,
    tier,
    limits: {
      max_invoice_value: config.max_invoice_value,
      max_open_exposure: config.max_open_exposure,
      current_open_exposure: 15_000,
    },
    history: {
      settled_count: 3,
      late_count: 1,
      defaulted_count: 0,
    },
    next_tier_requirements: nextTier
      ? {
          next_tier: nextTier,
          required_settled_count: ISSUER_TIER_CONFIGS[nextTier].min_settled_count,
          max_allowed_late_count: ISSUER_TIER_CONFIGS[nextTier].max_late_count,
        }
      : null,
    demotion: null,
    ...overrides,
  };
}

function setupHook(status: IssuerTierStatus | null) {
  mockUseIssuerTier.mockReturnValue({
    data: status,
    status,
    tier: status?.tier ?? null,
    limits: status?.limits ?? null,
    history: status?.history ?? null,
    nextTierRequirements: status?.next_tier_requirements ?? null,
    demotion: status?.demotion ?? null,
    isLoading: false,
    isError: false,
  });
}

describe("IssuerTierBadge and TierProgressCard (#604)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Bronze, Silver, and Gold badges matching the on-chain tier with distinct styling", () => {
    setupHook(makeTierStatus({ tier: "bronze" }));
    const { unmount: u1 } = render(<IssuerTierBadge address={ISSUER_ADDR} />);
    const bronze = screen.getByTestId("issuer-tier-badge");
    expect(bronze).toHaveAttribute("data-tier", "bronze");
    expect(bronze).toHaveTextContent("Bronze");
    expect(bronze.className).toContain("bg-amber-100");
    u1();

    setupHook(makeTierStatus({ tier: "silver" }));
    const { unmount: u2 } = render(<IssuerTierBadge address={ISSUER_ADDR} />);
    const silver = screen.getByTestId("issuer-tier-badge");
    expect(silver).toHaveAttribute("data-tier", "silver");
    expect(silver).toHaveTextContent("Silver");
    expect(silver.className).toContain("bg-slate-100");
    u2();

    setupHook(makeTierStatus({ tier: "gold" }));
    render(<IssuerTierBadge address={ISSUER_ADDR} />);
    const gold = screen.getByTestId("issuer-tier-badge");
    expect(gold).toHaveAttribute("data-tier", "gold");
    expect(gold).toHaveTextContent("Gold");
    expect(gold.className).toContain("bg-yellow-100");
  });

  it("shows Bronze limits and progress toward Silver thresholds", () => {
    setupHook(
      makeTierStatus({
        tier: "bronze",
        history: { settled_count: 3, late_count: 1, defaulted_count: 0 },
      }),
    );

    render(<TierProgressCard address={ISSUER_ADDR} />);

    expect(screen.getByTestId("tier-max-invoice-value")).toHaveTextContent("25,000 XLM");
    expect(screen.getByTestId("tier-open-exposure")).toHaveTextContent(
      "15,000 / 50,000 XLM",
    );
    expect(screen.getByTestId("tier-settled-count")).toHaveTextContent("3 / 5 settled");
    expect(screen.getByTestId("tier-settled-progress-bar")).toHaveAttribute(
      "aria-valuenow",
      "60",
    );
    expect(screen.getByTestId("tier-req-settled")).toHaveTextContent("2 remaining");
    expect(screen.getByTestId("tier-late-count")).toHaveTextContent("1 / 1 late");
  });

  it("shows Silver limits and progress toward Gold thresholds", () => {
    setupHook(
      makeTierStatus({
        tier: "silver",
        limits: {
          max_invoice_value: ISSUER_TIER_CONFIGS.silver.max_invoice_value,
          max_open_exposure: ISSUER_TIER_CONFIGS.silver.max_open_exposure,
          current_open_exposure: 100_000,
        },
        history: { settled_count: 9, late_count: 0, defaulted_count: 0 },
      }),
    );

    render(<TierProgressCard address={ISSUER_ADDR} />);

    expect(screen.getByTestId("tier-max-invoice-value")).toHaveTextContent("100,000 XLM");
    expect(screen.getByTestId("tier-open-exposure")).toHaveTextContent(
      "100,000 / 250,000 XLM",
    );
    expect(screen.getByTestId("tier-settled-count")).toHaveTextContent("9 / 15 settled");
    expect(screen.getByTestId("tier-settled-progress-bar")).toHaveAttribute(
      "aria-valuenow",
      "60",
    );
    expect(screen.getByTestId("tier-req-settled")).toHaveTextContent("6 remaining");
    expect(screen.getByTestId("tier-late-count")).toHaveTextContent("0 / 0 late");
  });

  it("shows Gold limits and highest-tier unlocked state when Gold is reached", () => {
    setupHook(
      makeTierStatus({
        tier: "gold",
        limits: {
          max_invoice_value: ISSUER_TIER_CONFIGS.gold.max_invoice_value,
          max_open_exposure: ISSUER_TIER_CONFIGS.gold.max_open_exposure,
          current_open_exposure: 400_000,
        },
        history: { settled_count: 18, late_count: 0, defaulted_count: 0 },
        next_tier_requirements: null,
      }),
    );

    render(<TierProgressCard address={ISSUER_ADDR} />);

    expect(screen.getByTestId("tier-max-invoice-value")).toHaveTextContent("500,000 XLM");
    expect(screen.getByTestId("tier-open-exposure")).toHaveTextContent(
      "400,000 / 1,000,000 XLM",
    );
    expect(screen.getByTestId("tier-max-reached")).toBeInTheDocument();
  });

  it("displays a demotion notice with the cause after a default", () => {
    setupHook(
      makeTierStatus({
        tier: "bronze",
        history: { settled_count: 7, late_count: 1, defaulted_count: 1 },
        demotion: {
          demoted: true,
          previous_tier: "silver",
          reason: "Demoted after default on invoice INV-402.",
          demoted_at: "2026-10-10T00:00:00.000Z",
        },
      }),
    );

    render(<TierProgressCard address={ISSUER_ADDR} />);

    const notice = screen.getByTestId("issuer-tier-demotion-notice");
    expect(notice).toHaveTextContent("Tier demoted from Silver to Bronze");
    expect(screen.getByTestId("issuer-tier-demotion-reason")).toHaveTextContent(
      "Demoted after default on invoice INV-402.",
    );
  });

  it("displays the issuer tier badge on marketplace cards", () => {
    setupHook(makeTierStatus({ tier: "silver" }));

    const invoice: Invoice = {
      id: "inv-604",
      title: "Acme Export Receivable",
      seller: ISSUER_ADDR,
      amount: 50_000,
      raised: 20_000,
      investor_count: 4,
      status: "open",
      due_date: "2030-01-01T00:00:00.000Z",
      has_more: false,
      next_cursor: null,
      issuer_tier: "silver",
    };

    renderWithCardProviders(<InvoiceCard invoice={invoice} />);

    const badge = screen.getByTestId("issuer-tier-badge");
    expect(badge).toHaveAttribute("data-tier", "silver");
    expect(badge).toHaveTextContent("Silver");
  });
});
