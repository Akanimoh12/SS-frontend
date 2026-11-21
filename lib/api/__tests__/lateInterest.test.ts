import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLateInterest,
  normalizeLateInterest,
} from "@/lib/api/lateInterest";

function respond(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("late-interest API client (#607)", () => {
  it("normalizes accrued interest from several field names", () => {
    expect(normalizeLateInterest({ accrued: 125 }, "inv-1")).toMatchObject({
      invoiceId: "inv-1",
      accrued: 125,
      lastAccrualDate: null,
    });
    expect(
      normalizeLateInterest(
        { accrued_interest: 25, last_accrual_date: "2026-11-01" },
        "inv-2"
      )
    ).toMatchObject({ accrued: 25, lastAccrualDate: "2026-11-01" });
  });

  it("returns null for unusable payloads", () => {
    expect(normalizeLateInterest(null, "inv-1")).toBeNull();
    expect(normalizeLateInterest({ accrued: "125" }, "inv-1")).toBeNull();
    expect(normalizeLateInterest({ accrued: Number.NaN }, "inv-1")).toBeNull();
  });

  it("returns null for a missing invoice id without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchLateInterest("")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a 404 as no interest data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(404, {})));
    expect(await fetchLateInterest("inv-1")).toBeNull();
  });

  it("surfaces other failures so the view can show unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(500, {})));
    await expect(fetchLateInterest("inv-1")).rejects.toThrow(/failed/i);
  });
});
