import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type MqlListener = (e: { matches: boolean }) => void;

function installMatchMedia(prefersDark: boolean) {
  const listeners = new Set<MqlListener>();
  const mql = {
    matches: prefersDark,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, cb: MqlListener) => listeners.add(cb),
    removeEventListener: (_: string, cb: MqlListener) => listeners.delete(cb),
    addListener: (cb: MqlListener) => listeners.add(cb),
    removeListener: (cb: MqlListener) => listeners.delete(cb),
    dispatchEvent: () => true,
    onchange: null,
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return {
    emit(next: boolean) {
      mql.matches = next;
      act(() => listeners.forEach((cb) => cb({ matches: next })));
    },
  };
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

beforeEach(() => {
  window.localStorage.removeItem(THEME_STORAGE_KEY);
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("ThemeProvider", () => {
  it("defaults to system and resolves to light when OS prefers light", () => {
    installMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(isDark()).toBe(false);
  });

  it("resolves to dark when system + OS prefers dark", () => {
    installMatchMedia(true);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(isDark()).toBe(true);
  });

  it("switching to dark adds .dark and to light removes it", async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await user.click(screen.getByTestId("theme-toggle-trigger"));
    await user.click(await screen.findByTestId("theme-toggle-option-dark"));
    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await user.click(screen.getByTestId("theme-toggle-trigger"));
    await user.click(await screen.findByTestId("theme-toggle-option-light"));
    expect(isDark()).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("system choice follows live OS changes", () => {
    const mm = installMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(isDark()).toBe(false);
    mm.emit(true);
    expect(isDark()).toBe(true);
    mm.emit(false);
    expect(isDark()).toBe(false);
  });

  it("rehydrates the persisted choice on mount", () => {
    installMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(isDark()).toBe(true);
  });

  it("marks the active option with aria-current and a check icon", async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await user.click(screen.getByTestId("theme-toggle-trigger"));
    await user.click(await screen.findByTestId("theme-toggle-option-dark"));

    await user.click(screen.getByTestId("theme-toggle-trigger"));
    expect(await screen.findByTestId("theme-toggle-option-dark")).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByTestId("theme-toggle-check-dark")).toBeInTheDocument();
  });
});

describe("useTheme", () => {
  it("throws outside a ThemeProvider", () => {
    function Bare() {
      useTheme();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow(/ThemeProvider/);
    spy.mockRestore();
  });
});
