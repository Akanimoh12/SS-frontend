import { afterEach, describe, expect, it, vi } from "vitest";
import {
  drawCreditLine,
  fetchCreditLine,
  normalizeCreditLine,
  repayCreditLine,
} from "@/lib/api/creditLine";

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

describe("credit-line API client (#588)", () => {
  it("normalizes a usable payload and ignores malformed history rows", () => {
    expect(
      normalizeCreditLine({
        limit: 1000,
        drawn: 200,
        accrued_interest: 25,
        status: "open",
        history: [
          { id: "a", type: "draw", amount: 200, occurredAt: "2026-01-01T00:00:00Z" },
          { id: "bad", type: "unknown", amount: 1, occurredAt: "2026-01-02T00:00:00Z" },
        ],
      })
    ).toMatchObject({
      limit: 1000,
      drawn: 200,
      accruedInterest: 25,
      status: "open",
      history: [{ id: "a" }],
    });
  });

  it("returns null when no line exists or the payload is unusable", () => {
    expect(normalizeCreditLine(null)).toBeNull();
    expect(normalizeCreditLine({ limit: "1000", drawn: 1, status: "open" })).toBeNull();
  });

  it("treats a 404 as no line", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(404, {})));
    expect(await fetchCreditLine()).toBeNull();
  });

  it("surfaces other failures so the page can show an unavailable state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(503, {})));
    await expect(fetchCreditLine()).rejects.toThrow(/failed/i);
  });

  it("posts the amount for draws and repayments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      respond(200, { limit: 1000, drawn: 250, status: "open" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await drawCreditLine(250);
    expect(fetchMock.mock.calls[0][0]).toContain("/issuer/credit-line/draw");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ amount: 250 });

    await repayCreditLine(50);
    expect(fetchMock.mock.calls[1][0]).toContain("/issuer/credit-line/repay");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ amount: 50 });
  });
});
