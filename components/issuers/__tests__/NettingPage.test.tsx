import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { NettingPage } from "../NettingPage";
import { useNettingAgreements } from "@/hooks/useNettingAgreements";
import { useNettingInvoices } from "@/hooks/useNettingInvoices";
import { useAuth } from "@/hooks/useAuth";
import {
  cancelNettingAgreement,
  respondNettingConsent,
  settleNettingAgreement,
} from "@/lib/api";
import type { NettingAgreement } from "@/lib/analytics/netting";

vi.mock("@/hooks/useNettingAgreements", () => ({ useNettingAgreements: vi.fn() }));
vi.mock("@/hooks/useNettingInvoices", () => ({ useNettingInvoices: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/api", () => ({
  fetchNettingAgreements: vi.fn(),
  fetchNettingInvoices: vi.fn(),
  proposeNettingAgreement: vi.fn(),
  respondNettingConsent: vi.fn(),
  settleNettingAgreement: vi.fn(),
  cancelNettingAgreement: vi.fn(),
}));

const mockAgreements = vi.mocked(useNettingAgreements);
const mockInvoices = vi.mocked(useNettingInvoices);
const mockAuth = vi.mocked(useAuth);
const consent = vi.mocked(respondNettingConsent);
const settle = vi.mocked(settleNettingAgreement);
const cancel = vi.mocked(cancelNettingAgreement);

function agreement(overrides: Partial<NettingAgreement> = {}): NettingAgreement {
  return {
    id: "agr-1",
    debtor: "Debtor A",
    creditor: "Issuer",
    status: "pending",
    issuerConsent: false,
    debtorConsent: false,
    invoices: [],
    createdAt: "2026-11-21T00:00:00Z",
    ...overrides,
  };
}

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockReturnValue({ jwt: "token", address: "GISSUER", isConnecting: false, loginWithWallet: vi.fn(), logout: vi.fn() });
  mockInvoices.mockReturnValue({ data: [], isLoading: false, isError: false } as never);
  consent.mockResolvedValue(agreement());
  settle.mockResolvedValue(agreement({ status: "settled" }));
  cancel.mockResolvedValue(agreement({ status: "cancelled" }));
});

describe("NettingPage", () => {
  it("keeps Settle disabled until both parties consent", () => {
    mockAgreements.mockReturnValue({ data: [agreement()], isLoading: false, isError: false } as never);
    renderWithClient(<NettingPage />);

    const button = screen.getByTestId("netting-settle-agr-1");
    expect(button).toBeDisabled();
    expect(screen.getByTestId("netting-consent-action-agr-1")).toBeEnabled();
  });

  it("enables Settle once both consents are present", () => {
    mockAgreements.mockReturnValue({
      data: [agreement({ issuerConsent: true, debtorConsent: true })],
      isLoading: false,
      isError: false,
    } as never);
    renderWithClient(<NettingPage />);

    expect(screen.getByTestId("netting-settle-agr-1")).toBeEnabled();
  });

  it("records issuer consent with the right party", async () => {
    mockAgreements.mockReturnValue({ data: [agreement()], isLoading: false, isError: false } as never);
    renderWithClient(<NettingPage />);

    fireEvent.click(screen.getByTestId("netting-consent-action-agr-1"));
    await waitFor(() => expect(consent).toHaveBeenCalledWith("agr-1", "issuer", true, "token"));
  });

  it("disables Cancel for a settled agreement", () => {
    mockAgreements.mockReturnValue({
      data: [agreement({ status: "settled" })],
      isLoading: false,
      isError: false,
    } as never);
    renderWithClient(<NettingPage />);

    expect(screen.getByTestId("netting-cancel-agr-1")).toBeDisabled();
    expect(screen.getByTestId("netting-settle-agr-1")).toBeDisabled();
  });

  it("calls settle when both parties have signed", async () => {
    mockAgreements.mockReturnValue({
      data: [agreement({ issuerConsent: true, debtorConsent: true })],
      isLoading: false,
      isError: false,
    } as never);
    renderWithClient(<NettingPage />);

    fireEvent.click(screen.getByTestId("netting-settle-agr-1"));
    await waitFor(() => expect(settle).toHaveBeenCalledWith("agr-1", "token"));
  });

  it("calls cancel for an active agreement", async () => {
    mockAgreements.mockReturnValue({ data: [agreement()], isLoading: false, isError: false } as never);
    renderWithClient(<NettingPage />);

    fireEvent.click(screen.getByTestId("netting-cancel-agr-1"));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith("agr-1", "token"));
  });

  it("shows an explicit unavailable state when both queries fail", () => {
    mockAgreements.mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);
    mockInvoices.mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);
    renderWithClient(<NettingPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
  });
});
