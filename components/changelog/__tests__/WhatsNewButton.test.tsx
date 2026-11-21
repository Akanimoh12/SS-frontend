import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WhatsNewButton } from "../WhatsNewButton";
import {
  CHANGELOG_SEEN_KEY,
  changelogEntries,
  latestEntryId,
} from "@/lib/changelog";

const latest = latestEntryId(changelogEntries)!;

beforeEach(() => {
  window.localStorage.clear();
});

describe("WhatsNewButton (#611)", () => {
  it("shows the dot when a newer entry exists", () => {
    render(<WhatsNewButton />);
    expect(screen.getByTestId("whats-new-dot")).toBeInTheDocument();
  });

  it("does not show the dot when the latest entry was seen", () => {
    window.localStorage.setItem(CHANGELOG_SEEN_KEY, latest);
    render(<WhatsNewButton />);
    expect(screen.queryByTestId("whats-new-dot")).not.toBeInTheDocument();
  });

  it("opens the modal and clears the dot when clicked", async () => {
    render(<WhatsNewButton />);
    expect(screen.getByTestId("whats-new-dot")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("whats-new-button"));

    await waitFor(() => expect(screen.getByTestId("changelog-modal")).toBeInTheDocument());
    expect(screen.queryByTestId("whats-new-dot")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CHANGELOG_SEEN_KEY)).toBe(latest);
  });
});
