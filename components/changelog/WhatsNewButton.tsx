"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangelogModal } from "./ChangelogModal";
import { useChangelogUnread } from "@/hooks/useChangelogUnread";

/** Header button with an unread dot that opens the changelog (#611). */
export function WhatsNewButton() {
  const [open, setOpen] = useState(false);
  const { unread, markSeen } = useChangelogUnread();

  function handleOpenChange(next: boolean) {
    if (next) markSeen();
    setOpen(next);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="What's new"
        data-testid="whats-new-button"
        onClick={() => handleOpenChange(true)}
        className="relative"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        {unread && (
          <span
            data-testid="whats-new-dot"
            aria-hidden="true"
            className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-background"
          />
        )}
      </Button>
      <ChangelogModal open={open} onOpenChange={handleOpenChange} />
    </>
  );
}
