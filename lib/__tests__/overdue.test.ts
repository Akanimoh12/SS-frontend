import { describe, expect, it } from "vitest";
import {
  daysOverdue,
  investorInterestShare,
  isOverdueStatus,
  isOverdueUiVisible,
} from "@/lib/overdue";

const now = new Date("2026-11-21T12:00:00Z");

describe("overdue rules (#607)", () => {
  it("computes whole days from the due date", () => {
    expect(daysOverdue("2026-11-19T23:59:00Z", now)).toBe(2);
    expect(daysOverdue("2026-11-21T23:59:00Z", now)).toBe(0);
    expect(daysOverdue("2026-11-22T00:00:00Z", now)).toBe(0);
    expect(daysOverdue(null, now)).toBe(0);
    expect(daysOverdue("not-a-date", now)).toBe(0);
  });

  it("hides overdue UI for settled and defaulted invoices", () => {
    const overdueDate = "2026-11-01T00:00:00Z";
    expect(isOverdueUiVisible({ status: "funded", due_date: overdueDate }, now)).toBe(true);
    expect(isOverdueUiVisible({ status: "settled", due_date: overdueDate }, now)).toBe(false);
    expect(isOverdueUiVisible({ status: "defaulted", due_date: overdueDate }, now)).toBe(false);
    expect(isOverdueStatus("open", now, overdueDate)).toBe(true);
  });

  it("allocates interest proportionally to the position share", () => {
    expect(investorInterestShare(100, 25)).toBe(25);
    expect(investorInterestShare(100, null)).toBeNull();
    expect(investorInterestShare(Number.NaN, 25)).toBeNull();
    expect(investorInterestShare(0, 25)).toBe(0);
  });
});
