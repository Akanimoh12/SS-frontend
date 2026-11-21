import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NetworkMismatchBanner } from "../NetworkMismatchBanner";
import { NetworkMismatchGuide } from "../NetworkMismatchGuide";

describe("NetworkMismatchBanner (#610)", () => {
  it("names both networks and opens the guide", () => {
    render(
      <NetworkMismatchBanner
        visible
        walletNetwork="mainnet"
        appNetwork="testnet"
        walletKind="freighter"
      />
    );

    expect(screen.getByTestId("network-mismatch-banner")).toBeInTheDocument();
    expect(screen.getByTestId("network-mismatch-message")).toHaveTextContent("Mainnet");
    expect(screen.getByTestId("network-mismatch-message")).toHaveTextContent("Testnet");

    expect(screen.queryByTestId("network-guide-modal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("network-mismatch-switch"));
    expect(screen.getByTestId("network-guide-modal")).toBeInTheDocument();
  });

  it("renders nothing when there is no mismatch", () => {
    render(
      <NetworkMismatchBanner
        visible={false}
        walletNetwork="testnet"
        appNetwork="testnet"
        walletKind="freighter"
      />
    );
    expect(screen.queryByTestId("network-mismatch-banner")).not.toBeInTheDocument();
  });
});

describe("NetworkMismatchGuide (#610)", () => {
  it("shows steps for the connected wallet type", () => {
    render(
      <NetworkMismatchGuide
        open
        onOpenChange={vi.fn()}
        walletKind="albedo"
        walletNetwork="mainnet"
        appNetwork="testnet"
      />
    );
    expect(screen.getByTestId("network-guide-title")).toHaveTextContent("Albedo");
    expect(screen.getByTestId("network-guide-steps")).toBeInTheDocument();
    expect(screen.getByTestId("network-guide-step-1")).toBeInTheDocument();
  });

  it("shows a neutral note for xBull reference steps", () => {
    render(
      <NetworkMismatchGuide
        open
        onOpenChange={vi.fn()}
        walletKind="xbull"
        walletNetwork="mainnet"
        appNetwork="testnet"
      />
    );
    expect(screen.getByTestId("network-guide-title")).toHaveTextContent("xBull");
    expect(screen.getByTestId("network-guide-note")).toHaveTextContent(/not currently a supported wallet/i);
  });
});
