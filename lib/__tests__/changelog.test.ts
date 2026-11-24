import { describe, expect, it } from "vitest";
import {
  changelogEntries,
  groupByMonth,
  latestEntryId,
  sortEntries,
  type ChangelogEntry,
} from "@/lib/changelog";

function entry(id: string, date: string): ChangelogEntry {
  return { id, date, title: id, summary: "summary", tag: "New" };
}

describe("changelog data (#611)", () => {
  it("loads a typed, non-empty changelog from JSON", () => {
    expect(changelogEntries.length).toBeGreaterThan(0);
    expect(changelogEntries[0]).toMatchObject({
      id: expect.any(String),
      date: expect.any(String),
      title: expect.any(String),
      summary: expect.any(String),
      tag: expect.any(String),
    });
  });

  it("sorts entries newest first", () => {
    const sorted = sortEntries([
      entry("old", "2026-01-01"),
      entry("new", "2026-11-01"),
      entry("mid", "2026-06-01"),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["new", "mid", "old"]);
  });

  it("reports the latest entry id", () => {
    expect(latestEntryId([entry("a", "2026-01-01"), entry("b", "2026-02-01")])).toBe("b");
    expect(latestEntryId([])).toBeNull();
  });

  it("groups sorted entries by month with labels", () => {
    const groups = groupByMonth([
      entry("oct", "2026-10-28"),
      entry("nov-2", "2026-11-18"),
      entry("nov-1", "2026-11-05"),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["2026-11", "2026-10"]);
    expect(groups[0].label).toBe("November 2026");
    expect(groups[0].entries.map((e) => e.id)).toEqual(["nov-2", "nov-1"]);
  });
});
