import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivacySettings } from "../PrivacySettings";
import * as api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth");
vi.mock("@/lib/api");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseAuth = vi.mocked(useAuth);
const mockRequestDataExport = vi.mocked(api.requestDataExport);
const mockPollDataExportStatus = vi.mocked(api.pollDataExportStatus);
const mockRequestAccountDeletion = vi.mocked(api.requestAccountDeletion);
const mockCancelAccountDeletion = vi.mocked(api.cancelAccountDeletion);

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe("PrivacySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ jwt: "test-token" } as any);
  });

  describe("Data Export", () => {
    it("shows request button initially", async () => {
      mockPollDataExportStatus.mockResolvedValue({
        status: "pending",
      } as any);

      renderWithProviders(<PrivacySettings />);

      expect(screen.getByRole("button", { name: /Request export/i })).toBeInTheDocument();
    });

    it("polls status after requesting export", async () => {
      const user = userEvent.setup();
      mockRequestDataExport.mockResolvedValue({
        status: "pending",
        polling_interval_ms: 1000,
      } as any);
      mockPollDataExportStatus.mockResolvedValue({
        status: "pending",
      } as any);

      renderWithProviders(<PrivacySettings />);

      const button = screen.getByRole("button", { name: /Request export/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockRequestDataExport).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/being prepared/i)).toBeInTheDocument();
      });
    });

    it("shows download link when status is ready", async () => {
      mockPollDataExportStatus.mockResolvedValue({
        status: "ready",
        download_url: "https://example.com/export.zip",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      } as any);
      mockRequestDataExport.mockResolvedValue({
        status: "ready",
        download_url: "https://example.com/export.zip",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const user = userEvent.setup();
      renderWithProviders(<PrivacySettings />);

      const button = screen.getByRole("button", { name: /Request export/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /Download export/i })).toBeInTheDocument();
      });
    });

    it("shows expired state when download link expires", async () => {
      mockRequestDataExport.mockResolvedValue({
        status: "ready",
        download_url: "https://example.com/export.zip",
        expires_at: new Date(Date.now() - 1000).toISOString(),
      } as any);

      renderWithProviders(<PrivacySettings />);

      const button = screen.getByRole("button", { name: /Request export/i });
      await userEvent.setup().click(button);

      await waitFor(() => {
        expect(screen.getByText(/Download link expired/i)).toBeInTheDocument();
      });
    });
  });

  describe("Account Deletion", () => {
    it("requires exact confirmation phrase", async () => {
      const user = userEvent.setup();
      mockPollDataExportStatus.mockResolvedValue({
        status: "pending",
      } as any);

      renderWithProviders(<PrivacySettings />);

      const deleteButton = screen.getByRole("button", { name: /Request deletion/i });
      await user.click(deleteButton);

      const input = screen.getByPlaceholderText(/Type confirmation phrase/i);
      const submitButton = screen.getByRole("button", { name: /Delete my account/i });

      expect(submitButton).toBeDisabled();

      await user.type(input, "wrong phrase");
      expect(submitButton).toBeDisabled();

      await user.clear(input);
      await user.type(input, "delete my account");
      expect(submitButton).not.toBeDisabled();
    });

    it("shows 14-day grace period after deletion request", async () => {
      const user = userEvent.setup();
      const gracePeriodEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      mockRequestAccountDeletion.mockResolvedValue({
        grace_period_end: gracePeriodEnd,
      } as any);
      mockPollDataExportStatus.mockResolvedValue({
        status: "pending",
      } as any);

      renderWithProviders(<PrivacySettings />);

      const deleteButton = screen.getByRole("button", { name: /Request deletion/i });
      await user.click(deleteButton);

      const input = screen.getByPlaceholderText(/Type confirmation phrase/i);
      await user.type(input, "delete my account");

      const submitButton = screen.getByRole("button", { name: /Delete my account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/14 days/i)).toBeInTheDocument();
      });
    });

    it("allows cancelling deletion during grace period", async () => {
      const user = userEvent.setup();
      const gracePeriodEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      mockRequestAccountDeletion.mockResolvedValue({
        grace_period_end: gracePeriodEnd,
      } as any);
      mockCancelAccountDeletion.mockResolvedValue(undefined);
      mockPollDataExportStatus.mockResolvedValue({
        status: "pending",
      } as any);

      renderWithProviders(<PrivacySettings />);

      const deleteButton = screen.getByRole("button", { name: /Request deletion/i });
      await user.click(deleteButton);

      const input = screen.getByPlaceholderText(/Type confirmation phrase/i);
      await user.type(input, "delete my account");

      const submitButton = screen.getByRole("button", { name: /Delete my account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("cancel-deletion-btn")).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId("cancel-deletion-btn");
      await user.click(cancelButton);

      await waitFor(() => {
        expect(mockCancelAccountDeletion).toHaveBeenCalled();
      });
    });

    it("displays blocking reasons on 409 response", async () => {
      const user = userEvent.setup();
      const error = new Error("Cannot delete account") as any;
      error.status = 409;
      error.blocking_reasons = [
        { reason: "Active investments", details: "You have 2 active holdings" },
        { reason: "Pending transactions" },
      ];
      mockRequestAccountDeletion.mockRejectedValue(error);
      mockPollDataExportStatus.mockResolvedValue({
        status: "pending",
      } as any);

      renderWithProviders(<PrivacySettings />);

      const deleteButton = screen.getByRole("button", { name: /Request deletion/i });
      await user.click(deleteButton);

      const input = screen.getByPlaceholderText(/Type confirmation phrase/i);
      await user.type(input, "delete my account");

      const submitButton = screen.getByRole("button", { name: /Delete my account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Cannot delete account/i)).toBeInTheDocument();
        expect(screen.getByText(/Active investments/i)).toBeInTheDocument();
        expect(screen.getByText(/Pending transactions/i)).toBeInTheDocument();
      });
    });

    it("no request created when 409 blocking reasons returned", async () => {
      const user = userEvent.setup();
      const error = new Error("Cannot delete account") as any;
      error.status = 409;
      error.blocking_reasons = [{ reason: "Active investments" }];
      mockRequestAccountDeletion.mockRejectedValue(error);
      mockPollDataExportStatus.mockResolvedValue({
        status: "pending",
      } as any);

      renderWithProviders(<PrivacySettings />);

      const deleteButton = screen.getByRole("button", { name: /Request deletion/i });
      await user.click(deleteButton);

      const input = screen.getByPlaceholderText(/Type confirmation phrase/i);
      await user.type(input, "delete my account");

      const submitButton = screen.getByRole("button", { name: /Delete my account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/14 days/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Cannot delete account/i)).toBeInTheDocument();
      });
    });
  });
});
