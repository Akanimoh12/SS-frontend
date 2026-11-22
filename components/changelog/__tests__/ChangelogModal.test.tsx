import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChangelogModal } from "../ChangelogModal";
import { changelogEntries } from "@/lib/changelog";

describe("ChangelogModal (#611)", () => {
  it("renders entries grouped by month, newest first, with styled tags", () => {
    render(<ChangelogModal open onOpenChange={vi.fn()} />);

    expect(screen.getByTestId("changelog-title")).toHaveTextContent("What's new");
    const newest = changelogEntries[0];
    expect(screen.getByTestId(`changelog-entry-${newest.id}`)).toBeInTheDocument();

    // Every entry tag renders with its own data-tag for distinct styling.
    for (const tagName of ["New", "Improved", "Fixed"] as const) {
      const tags = screen.getAllByTestId(`changelog-tag-${tagName}`);
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) {
        expect(tag).toHaveAttribute("data-tag", tagName);
        expect(tag).toHaveTextContent(tagName);
      }
    }

    // At least one month group header is shown.
    expect(screen.getAllByText(/2026$/).length).toBeGreaterThan(0);
  });

  it("renders an optional link when an entry provides one", () => {
    const withLink = changelogEntries.find((entry) => entry.link);
    render(<ChangelogModal open onOpenChange={vi.fn()} />);
    if (withLink) {
      expect(screen.getByTestId(`changelog-link-${withLink.id}`)).toHaveAttribute(
        "href",
        withLink.link!
      );
    }
  });

  it("closes on Escape", async () => {
    const onOpenChange = vi.fn();
    render(<ChangelogModal open onOpenChange={onOpenChange} />);

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("moves focus into the dialog when opened", async () => {
    render(<ChangelogModal open onOpenChange={vi.fn()} />);
    await waitFor(() => {
      const modal = screen.getByTestId("changelog-modal");
      expect(modal.contains(document.activeElement)).toBe(true);
    });
  });
});
