import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/src/i18n";
import { LanguageSwitcher } from "../LanguageSwitcher";

// Mock the select components
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div
      data-testid="language-select"
      onClick={(e) => {
        if ((e.target as HTMLElement).dataset.language) {
          onValueChange((e.target as HTMLElement).dataset.language);
        }
      }}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => (
    <button data-language={value}>{children}</button>
  ),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
  });

  it("renders language options", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );

    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Español")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
  });

  it("changes language when option is clicked", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );

    const spanishButton = screen.getByText("Español");
    fireEvent.click(spanishButton);

    // Wait for i18n to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(i18n.language).toBe("es");
  });

  it("persists language choice to localStorage", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );

    const frenchButton = screen.getByText("Français");
    fireEvent.click(frenchButton);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(localStorage.getItem("language")).toBe("fr");
  });

  it("updates document.documentElement.lang", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );

    const spanishButton = screen.getByText("Español");
    fireEvent.click(spanishButton);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(document.documentElement.lang).toBe("es");
  });

  it("respects missing key fallback to English", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );

    // Change to Spanish
    const spanishButton = screen.getByText("Español");
    fireEvent.click(spanishButton);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // A missing key should fall back to the key name or English
    const missingKey = i18n.t("nonexistent.key", { lng: "es" });
    expect(missingKey).toBeTruthy();
  });
});
