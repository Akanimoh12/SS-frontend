"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  changelogEntries,
  groupByMonth,
  type ChangelogTag,
} from "@/lib/changelog";

const TAG_STYLES: Record<ChangelogTag, string> = {
  New: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  Improved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  Fixed: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
};

interface ChangelogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "What's new" changelog with monthly groups and tagged entries (#611). */
export function ChangelogModal({ open, onOpenChange }: ChangelogModalProps) {
  const groups = useMemo(() => groupByMonth(changelogEntries), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="changelog-modal" className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="changelog-title">What&apos;s new</DialogTitle>
          <DialogDescription>
            The latest features and fixes in StellarSettle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {groups.length === 0 && (
            <p data-testid="changelog-empty" className="text-sm text-muted-foreground">
              No updates to show yet.
            </p>
          )}
          {groups.map((group) => (
            <section key={group.key} data-testid={`changelog-group-${group.key}`}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <ul className="space-y-4">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    data-testid={`changelog-entry-${entry.id}`}
                    className="rounded-md border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        data-testid={`changelog-tag-${entry.tag}`}
                        data-tag={entry.tag}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${TAG_STYLES[entry.tag]}`}
                      >
                        {entry.tag}
                      </span>
                      <time dateTime={entry.date} className="text-xs text-muted-foreground">
                        {new Date(`${entry.date}T00:00:00Z`).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </time>
                    </div>
                    <h4 className="mt-2 font-medium">{entry.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
                    {entry.link && (
                      <Link
                        href={entry.link}
                        data-testid={`changelog-link-${entry.id}`}
                        className="mt-2 inline-block text-sm text-primary hover:underline"
                      >
                        Learn more
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
