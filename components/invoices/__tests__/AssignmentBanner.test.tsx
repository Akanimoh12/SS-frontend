import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssignmentBanner } from "../AssignmentBanner";
import type { InvoiceAssignment } from "@/lib/api";

const mockUseInvoiceAssignment = vi.fn();
const mockPropose = vi.fn();
const mockConsent = vi.fn();
const mockCancel = vi.fn();

vi.mock("@/hooks/useInvoiceAssignment", () => ({
  useInvoiceAssignment: (invoiceId: string) => mockUseInvoiceAssignment(invoiceId),
}));

const ISSUER = "GISSUER1111111111111111111111111111111111111111111111111";
const OLD_DEBTOR = "GOLDDEBTOR1111111111111111111111111111111111111111111111";
const NEW_DEBTOR = "GNEWDEBTOR1111111111111111111111111111111111111111111111";
const OUTSIDER = "GOUTSIDER11111111111111111111111111111111111111111111111";

function makeAssignment(overrides: Partial<InvoiceAssignment> = {}): InvoiceAssignment {
  return {
    invoice_id: "inv-590",
    status: "pending",
    issuer_address: ISSUER,
    current_debtor: OLD_DEBTOR,
    old_debtor: OLD_DEBTOR,
    proposed_new_debtor: NEW_DEBTOR,
    consents: {
      issuer: true,
      old_debtor: false,
      new_debtor: false,
    },
    is_disputed: false,
    is_settling: false,
    ...overrides,
  };
}

function setupHook(assignment: InvoiceAssignment | null) {
  mockUseInvoiceAssignment.mockReturnValue({
    assignment,
    status: assignment?.status ?? "none",
    isPendingAssignment: assignment?.status === "pending",
    isFinalized: assignment?.status === "finalized",
    consents: assignment?.consents ?? {
      issuer: false,
      old_debtor: false,
      new_debtor: false,
    },
    currentDebtor: assignment?.current_debtor ?? null,
    proposedNewDebtor: assignment?.proposed_new_debtor ?? null,
    isLoading: false,
    isError: false,
    propose: { mutate: mockPropose, isPending: false },
    consent: { mutate: mockConsent, isPending: false },
    cancel: { mutate: mockCancel, isPending: false },
  });
}

describe("AssignmentBanner (#590)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the three-step checklist showing who has consented and who is outstanding", () => {
    setupHook(makeAssignment());

    render(
      <AssignmentBanner
        invoiceId="inv-590"
        issuerAddress={ISSUER}
        walletAddress={OUTSIDER}
      />,
    );

    expect(screen.getByTestId("assignment-proposed-debtor")).toHaveTextContent(NEW_DEBTOR);
    expect(screen.getByTestId("consent-step-issuer")).toHaveAttribute("data-consented", "true");
    expect(screen.getByTestId("consent-status-issuer")).toHaveTextContent("Consented");
    expect(screen.getByTestId("consent-step-old_debtor")).toHaveAttribute(
      "data-consented",
      "false",
    );
    expect(screen.getByTestId("consent-status-old_debtor")).toHaveTextContent("Outstanding");
    expect(screen.getByTestId("consent-step-new_debtor")).toHaveAttribute(
      "data-consented",
      "false",
    );
    expect(screen.getByTestId("consent-status-new_debtor")).toHaveTextContent("Outstanding");
  });

  it("shows the Consent button only to an unconsented party and hides it for others", () => {
    setupHook(makeAssignment());

    // Outsider sees no consent button and no cancel button
    const { unmount: unmountOutsider } = render(
      <AssignmentBanner invoiceId="inv-590" issuerAddress={ISSUER} walletAddress={OUTSIDER} />,
    );
    expect(screen.queryByTestId("assignment-consent-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("assignment-cancel-button")).not.toBeInTheDocument();
    unmountOutsider();

    // Issuer has already consented -> sees cancel button and already-consented text, but no consent button
    const { unmount: unmountIssuer } = render(
      <AssignmentBanner invoiceId="inv-590" issuerAddress={ISSUER} walletAddress={ISSUER} />,
    );
    expect(screen.queryByTestId("assignment-consent-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("assignment-already-consented")).toBeInTheDocument();
    expect(screen.getByTestId("assignment-cancel-button")).toBeInTheDocument();
    unmountIssuer();

    // Old debtor has NOT consented -> sees consent button, no cancel button
    const { unmount: unmountOldDebtor } = render(
      <AssignmentBanner invoiceId="inv-590" issuerAddress={ISSUER} walletAddress={OLD_DEBTOR} />,
    );
    expect(screen.getByTestId("assignment-consent-button")).toBeInTheDocument();
    expect(screen.queryByTestId("assignment-cancel-button")).not.toBeInTheDocument();
    unmountOldDebtor();

    // New debtor has NOT consented -> sees consent button, no cancel button
    render(
      <AssignmentBanner invoiceId="inv-590" issuerAddress={ISSUER} walletAddress={NEW_DEBTOR} />,
    );
    expect(screen.getByTestId("assignment-consent-button")).toBeInTheDocument();
    expect(screen.queryByTestId("assignment-cancel-button")).not.toBeInTheDocument();
  });

  it("updates the checklist in real time and finalizes the new debtor on the invoice once all three consent", () => {
    setupHook(
      makeAssignment({
        consents: { issuer: true, old_debtor: true, new_debtor: false },
      }),
    );

    render(
      <AssignmentBanner invoiceId="inv-590" issuerAddress={ISSUER} walletAddress={NEW_DEBTOR} />,
    );

    expect(screen.getByTestId("invoice-active-debtor")).toHaveTextContent(OLD_DEBTOR);

    fireEvent.click(screen.getByTestId("assignment-consent-button"));

    expect(mockConsent).toHaveBeenCalledWith(
      { party: "new_debtor", wallet: NEW_DEBTOR },
      expect.any(Object),
    );
    expect(screen.getByTestId("assignment-finalized-banner")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-active-debtor")).toHaveTextContent(NEW_DEBTOR);
  });

  it("allows the issuer to cancel a pending assignment via confirmation dialog, clearing pending state", () => {
    setupHook(makeAssignment());

    render(
      <AssignmentBanner invoiceId="inv-590" issuerAddress={ISSUER} walletAddress={ISSUER} />,
    );

    fireEvent.click(screen.getByTestId("assignment-cancel-button"));
    expect(screen.getByTestId("assignment-cancel-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("assignment-cancel-confirm"));

    expect(mockCancel).toHaveBeenCalledWith({ wallet: ISSUER }, expect.any(Object));
    expect(screen.getByTestId("assignment-none-state")).toBeInTheDocument();
    expect(screen.queryByTestId("assignment-checklist")).not.toBeInTheDocument();
  });

  it("allows the issuer to propose a new debtor assignment via confirmation dialog", () => {
    setupHook(
      makeAssignment({
        status: "none",
        proposed_new_debtor: null,
        consents: { issuer: false, old_debtor: false, new_debtor: false },
      }),
    );

    render(
      <AssignmentBanner invoiceId="inv-590" issuerAddress={ISSUER} walletAddress={ISSUER} />,
    );

    fireEvent.click(screen.getByTestId("assignment-propose-button"));
    expect(screen.getByTestId("assignment-propose-dialog")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("assignment-new-debtor-input"), {
      target: { value: NEW_DEBTOR },
    });
    fireEvent.click(screen.getByTestId("assignment-propose-confirm"));

    expect(mockPropose).toHaveBeenCalledWith(
      { proposed_new_debtor: NEW_DEBTOR, wallet: ISSUER },
      expect.any(Object),
    );
    expect(screen.getByTestId("assignment-proposed-debtor")).toHaveTextContent(NEW_DEBTOR);
    expect(screen.getByTestId("consent-step-issuer")).toHaveAttribute("data-consented", "true");
  });

  it("blocks actions and shows an explanation when the invoice is disputed or settling", () => {
    setupHook(makeAssignment({ is_disputed: true }));

    const { unmount } = render(
      <AssignmentBanner
        invoiceId="inv-590"
        issuerAddress={ISSUER}
        walletAddress={OLD_DEBTOR}
        isDisputed
      />,
    );

    expect(screen.getByTestId("assignment-blocked-message")).toHaveTextContent(/disputed/i);
    expect(screen.getByTestId("assignment-consent-button")).toBeDisabled();
    unmount();

    setupHook(makeAssignment({ is_disputed: false, is_settling: true }));
    render(
      <AssignmentBanner
        invoiceId="inv-590"
        issuerAddress={ISSUER}
        walletAddress={ISSUER}
        isSettling
      />,
    );

    expect(screen.getByTestId("assignment-blocked-message")).toHaveTextContent(/settling/i);
    expect(screen.getByTestId("assignment-cancel-button")).toBeDisabled();
  });
});
