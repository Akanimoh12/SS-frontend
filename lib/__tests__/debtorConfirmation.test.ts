import { describe, expect, it } from "vitest";
import {
  MIN_REJECTION_REASON_LENGTH,
  classifyTokenFailure,
  validateRejectionReason,
} from "../debtorConfirmation";

describe("classifyTokenFailure", () => {
  it("maps HTTP statuses to token states", () => {
    expect(classifyTokenFailure(410)).toBe("expired");
    expect(classifyTokenFailure(409)).toBe("used");
    expect(classifyTokenFailure(404)).toBe("invalid");
    expect(classifyTokenFailure(400)).toBe("invalid");
  });

  it("treats other statuses as unknown", () => {
    expect(classifyTokenFailure(500)).toBe("unknown");
    expect(classifyTokenFailure(503)).toBe("unknown");
  });

  it("prefers an explicit error code over the status", () => {
    expect(classifyTokenFailure(404, { code: "token_expired" })).toBe("expired");
    expect(classifyTokenFailure(410, { error: { code: "token_already_used" } })).toBe("used");
    expect(classifyTokenFailure(500, { error: { code: "invalid_token" } })).toBe("invalid");
  });

  it("ignores payloads it cannot read", () => {
    expect(classifyTokenFailure(410, null)).toBe("expired");
    expect(classifyTokenFailure(409, "oops")).toBe("used");
  });
});

describe("validateRejectionReason", () => {
  it("requires a reason", () => {
    expect(validateRejectionReason("")).toMatch(/enter a reason/i);
    expect(validateRejectionReason("    ")).toMatch(/enter a reason/i);
  });

  it("requires a minimum length after trimming", () => {
    expect(validateRejectionReason("  ab ")).toMatch(/at least/i);
    expect(validateRejectionReason("a".repeat(MIN_REJECTION_REASON_LENGTH - 1))).not.toBeNull();
  });

  it("accepts a real reason", () => {
    expect(validateRejectionReason("a".repeat(MIN_REJECTION_REASON_LENGTH))).toBeNull();
    expect(validateRejectionReason("Goods never delivered")).toBeNull();
  });
});
