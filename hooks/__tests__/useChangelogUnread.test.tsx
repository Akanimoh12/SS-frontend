import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useChangelogUnread } from "../useChangelogUnread";
import {
  CHANGELOG_SEEN_KEY,
  changelogEntries,
  latestEntryId,
} from "@/lib/changelog";

const latest = latestEntryId(changelogEntries)!;

beforeEach(() => {
  window.localStorage.clear();
});

describe("useChangelogUnread (#611)", () => {
  it("is unread for a visitor with no seen entry", () => {
    const { result } = renderHook(() => useChangelogUnread());
    expect(result.current.unread).toBe(true);
    expect(result.current.isReady).toBe(true);
  });

  it("is not unread when the latest entry has been seen", () => {
    window.localStorage.setItem(CHANGELOG_SEEN_KEY, latest);
    const { result } = renderHook(() => useChangelogUnread());
    expect(result.current.unread).toBe(false);
  });

  it("is unread when an older entry was the last one seen", () => {
    window.localStorage.setItem(CHANGELOG_SEEN_KEY, "an-old-entry");
    const { result } = renderHook(() => useChangelogUnread());
    expect(result.current.unread).toBe(true);
  });

  it("marks the latest entry as seen and clears the indicator", () => {
    const { result } = renderHook(() => useChangelogUnread());
    expect(result.current.unread).toBe(true);

    act(() => {
      result.current.markSeen();
    });

    expect(result.current.unread).toBe(false);
    expect(window.localStorage.getItem(CHANGELOG_SEEN_KEY)).toBe(latest);
  });
});
