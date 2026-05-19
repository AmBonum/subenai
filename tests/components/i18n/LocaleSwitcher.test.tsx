// AH-15.1 — LocaleSwitcher UX.
//
// 2026-05-19: temporarily disabled — the component renders null while we
// hide the UI picker. Tests assert that disabled behaviour so re-enabling
// (single feature-flag flip) catches anything that drifted in the
// meantime via the legacy test cases held in git history.
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { LocaleProvider, DEFAULT_LOCALE, __resetLocaleForTests } from "@/i18n/locale-context";

describe("LocaleSwitcher (disabled)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetLocaleForTests(DEFAULT_LOCALE);
    Object.defineProperty(window.navigator, "language", {
      value: "sk-SK",
      configurable: true,
    });
  });

  it("renders nothing while LOCALE_SWITCHER_ENABLED is false", () => {
    const { container } = render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>,
    );
    // No trigger button, no menu items — component returns null.
    expect(container.querySelector('[data-testid="locale-switcher-trigger"]')).toBeNull();
    expect(container.textContent).toBe("");
  });
});
