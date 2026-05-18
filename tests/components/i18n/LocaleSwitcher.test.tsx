// AH-15.1 — LocaleSwitcher UX: shows the current language label and routes
// a click on an option through the LocaleContext setter.
import { describe, it, expect, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import {
  LocaleProvider,
  DEFAULT_LOCALE,
  __resetLocaleForTests,
  getCurrentLocale,
} from "@/i18n/locale-context";

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetLocaleForTests(DEFAULT_LOCALE);
    // jsdom defaults navigator.language to "en-US". Pin to sk so the
    // "default trigger label" test asserts the documented default.
    Object.defineProperty(window.navigator, "language", {
      value: "sk-SK",
      configurable: true,
    });
  });

  it("renders the trigger with the current locale label", () => {
    render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("locale-switcher-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("locale-switcher-current").textContent).toContain("Slovenčina");
  });

  it("switches the active locale when an option is selected", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>,
    );
    await user.click(screen.getByTestId("locale-switcher-trigger"));
    const enOption = await screen.findByTestId("locale-switcher-option-en");
    await act(async () => {
      await user.click(enOption);
    });
    expect(screen.getByTestId("locale-switcher-current").textContent).toContain("English");
    expect(getCurrentLocale()).toBe("en");
  });
});
