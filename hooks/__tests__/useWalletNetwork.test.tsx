import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWalletNetwork } from "../useWalletNetwork";

const mockUseWallet = vi.fn();
const mockUseActiveNetwork = vi.fn();
const mockRefreshNetwork = vi.fn();

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => mockUseWallet(),
}));

vi.mock("@/hooks/useActiveNetwork", () => ({
  useActiveNetwork: () => mockUseActiveNetwork(),
}));

describe("useWalletNetwork (#610)", () => {
  beforeEach(() => {
    mockRefreshNetwork.mockReset().mockResolvedValue(undefined);
    mockUseActiveNetwork.mockReturnValue({ network: "testnet" });
  });

  it("reports no mismatch when networks match", () => {
    mockUseWallet.mockReturnValue({
      network: "testnet",
      wallet: "freighter",
      isConnected: true,
      isInitializing: false,
      refreshNetwork: mockRefreshNetwork,
    });

    const { result } = renderHook(() => useWalletNetwork());
    expect(result.current.isMismatched).toBe(false);
  });

  it("reports a mismatch when wallet and app networks differ", () => {
    mockUseWallet.mockReturnValue({
      network: "mainnet",
      wallet: "albedo",
      isConnected: true,
      isInitializing: false,
      refreshNetwork: mockRefreshNetwork,
    });

    const { result } = renderHook(() => useWalletNetwork());
    expect(result.current.isMismatched).toBe(true);
    expect(result.current.walletKind).toBe("albedo");
    expect(result.current.appNetwork).toBe("testnet");
  });

  it("reports no mismatch when no wallet is connected", () => {
    mockUseWallet.mockReturnValue({
      network: null,
      wallet: null,
      isConnected: false,
      isInitializing: false,
      refreshNetwork: mockRefreshNetwork,
    });

    const { result } = renderHook(() => useWalletNetwork());
    expect(result.current.isMismatched).toBe(false);
  });
});
