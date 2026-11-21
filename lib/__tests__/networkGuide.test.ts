import { describe, expect, it } from "vitest";
import { getNetworkGuide } from "@/lib/networkGuide";

describe("network switch guide (#610)", () => {
  it("returns wallet-specific steps for supported wallets", () => {
    const freighter = getNetworkGuide("freighter");
    const albedo = getNetworkGuide("albedo");

    expect(freighter.title).toContain("Freighter");
    expect(albedo.title).toContain("Albedo");
    expect(freighter.steps.length).toBeGreaterThan(0);
    expect(albedo.steps.length).toBeGreaterThan(0);
    expect(freighter.steps.map((s) => s.step)).toEqual([1, 2, 3, 4]);
  });

  it("includes informational xBull steps with a neutral note", () => {
    const xbull = getNetworkGuide("xbull");
    expect(xbull.title).toContain("xBull");
    expect(xbull.note).toMatch(/not currently a supported wallet/i);
    expect(xbull.steps.length).toBeGreaterThan(0);
  });

  it("falls back to a neutral guide when no wallet is connected", () => {
    const generic = getNetworkGuide(null);
    expect(generic.title).toBeTruthy();
    expect(generic.steps.length).toBeGreaterThan(0);
  });
});
