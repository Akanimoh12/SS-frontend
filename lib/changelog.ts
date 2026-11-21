/** Typed changelog accessors (#611). Pure logic over a static JSON file. */

import rawEntries from "@/src/content/changelog.json";

export const CHANGELOG_SEEN_KEY = "ss:changelog-seen";

export type ChangelogTag = "New" | "Improved" | "Fixed";

export interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  tag: ChangelogTag;
  link?: string;
}

export interface ChangelogMonthGroup {
  label: string;
  key: string;
  entries: ChangelogEntry[];
}

const TAGS: readonly ChangelogTag[] = ["New", "Improved", "Fixed"];

function isTag(value: unknown): value is ChangelogTag {
  return typeof value === "string" && (TAGS as readonly string[]).includes(value);
}

function normalizeEntry(value: unknown): ChangelogEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.date !== "string" ||
    Number.isNaN(Date.parse(record.date)) ||
    typeof record.title !== "string" ||
    typeof record.summary !== "string" ||
    !isTag(record.tag)
  ) {
    return null;
  }
  return {
    id: record.id,
    date: record.date,
    title: record.title,
    summary: record.summary,
    tag: record.tag,
    ...(typeof record.link === "string" ? { link: record.link } : {}),
  };
}

/** Sorts newest first; invalid rows are dropped rather than crashing the UI. */
export function sortEntries(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export const changelogEntries: ChangelogEntry[] = sortEntries(
  rawEntries
    .map(normalizeEntry)
    .filter((entry): entry is ChangelogEntry => entry !== null)
);

/** Id of the newest entry, or null when the changelog is empty. */
export function latestEntryId(entries: ChangelogEntry[] = changelogEntries): string | null {
  return sortEntries(entries)[0]?.id ?? null;
}

function monthLabel(date: string): { key: string; label: string } {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const key = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = parsed.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return { key, label };
}

/** Groups already-sorted entries by calendar month, preserving order. */
export function groupByMonth(entries: ChangelogEntry[]): ChangelogMonthGroup[] {
  const groups: ChangelogMonthGroup[] = [];
  for (const entry of sortEntries(entries)) {
    const { key, label } = monthLabel(entry.date);
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = { key, label, entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
}
