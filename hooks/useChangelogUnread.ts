"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CHANGELOG_SEEN_KEY,
  changelogEntries,
  latestEntryId,
} from "@/lib/changelog";

/**
 * Tracks whether a newer changelog entry exists than the one the user last
 * saw (#611). Reads localStorage only after mount so server and client markup
 * match; with no stored value a new visitor is treated as having unread news.
 */
export function useChangelogUnread() {
  const [unread, setUnread] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const latest = latestEntryId(changelogEntries);
    if (!latest) {
      setIsReady(true);
      return;
    }
    let seen: string | null = null;
    try {
      seen = window.localStorage.getItem(CHANGELOG_SEEN_KEY);
    } catch {
      // Storage blocked: treat the latest entry as unread.
    }
    setUnread(seen !== latest);
    setIsReady(true);
  }, []);

  const markSeen = useCallback(() => {
    const latest = latestEntryId(changelogEntries);
    if (!latest) return;
    try {
      window.localStorage.setItem(CHANGELOG_SEEN_KEY, latest);
    } catch {
      // Storage blocked: still clear the indicator for this session.
    }
    setUnread(false);
  }, []);

  return { unread, isReady, markSeen };
}
