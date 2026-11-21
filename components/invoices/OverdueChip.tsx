"use client";

import { daysOverdue } from "@/lib/overdue";
import { Badge } from "@/components/ui/badge";

interface OverdueChipProps {
  /** Invoice or position status; settled and defaulted rows hide the chip. */
  status: string;
  dueDate?: string | null;
  now?: Date;
}

/** Overdue status chip reused on marketplace and portfolio rows (#607). */
export function OverdueChip({ status, dueDate, now = new Date() }: OverdueChipProps) {
  if (status === "settled" || status === "defaulted") return null;
  if (daysOverdue(dueDate, now) === 0) return null;
  return (
    <Badge data-testid="overdue-chip" variant="destructive">
      Overdue
    </Badge>
  );
}
