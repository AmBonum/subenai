import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AccessibilityProvider,
  useAccessibility,
  FONT_STORAGE_KEY,
  MOTION_STORAGE_KEY,
} from "@/components/theme/AccessibilityProvider";
import { AccessibilityMenu } from "@/components/theme/AccessibilityMenu";

type MqlListener = (e: { matches: boolean }) => void;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function installMatchMedia(prefersReduced: boolean) {
  const listeners = new Set<MqlListener>();
  const reducedMql = {
    matches: prefersReduced,
    media: REDUCED_MOTION_QUERY,
    addEventListener: (_: string, cb: MqlListener) => listeners.add(cb),
    removeEventListener: (_: string, cb: MqlListener) => listeners.delete(cb),
    addListener: (cb: MqlListener) => listeners.add(cb),
    removeListener: (cb: MqlListener) => listeners.delete(cb),
    dispatchEvent: () => true,
    onchange: null,
  };
  const otherMql = { ...reducedMql, matches: false, media: "other" };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => (query === REDUCED_MOTION_QUERY ? reducedMql : otherMql)),
  });
  return {
    emit(next: boolean) {
      reducedMql.matches = next;
      act(() => listeners.forEach((cb) => cb({ matches: next })));
    },
  };
}

function htmlFontSize() {
  return document.documentElement.style.fontSize;
}

function isReduced() {
  return document.documentElement.classList.contains("reduce-motion");
}

function renderMenu() {
  return render(
    <AccessibilityProvider>
      <AccessibilityMenu />
    </AccessibilityProvider>,
  );
}

beforeEach(() => {
  window.localStorage.removeItem(FONT_STORAGE_KEY);
  window.localStorage.removeItem(MOTION_STORAGE_KEY);
  document.documentElement.classList.remove("reduce-motion");
  document.documentElement.style.fontSize = "";
});

afterEach(() => {
  document.documentElement.classList.remove("reduce-motion");
  document.documentElement.style.fontSize = "";
});

describe("AccessibilityProvider — font size", () => {
  it("defaults to normal (100%) with empty storage", () => {
    installMatchMedia(false);
    renderMenu();
    expect(htmlFontSize()).toBe("100%");
    expect(isReduced()).toBe(false);
  });

  it("selecting a size applies it to <html> and persists", async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTestId("a11y-menu-trigger"));
    await user.click(await screen.findByTestId("a11y-menu-font-xl"));
    expect(htmlFontSize()).toBe("125%");
    expect(window.localStorage.getItem(FONT_STORAGE_KEY)).toBe("xl");

    await user.click(screen.getByTestId("a11y-menu-trigger"));
    await user.click(await screen.findByTestId("a11y-menu-font-s"));
    expect(htmlFontSize()).toBe("87.5%");
    expect(window.localStorage.getItem(FONT_STORAGE_KEY)).toBe("s");
  });

  it("rehydrates the persisted size on mount", () => {
    installMatchMedia(false);
    window.localStorage.setItem(FONT_STORAGE_KEY, "l");
    renderMenu();
    expect(htmlFontSize()).toBe("112.5%");
  });
});

describe("AccessibilityProvider — reduced motion", () => {
  it("'on' adds .reduce-motion and persists", async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTestId("a11y-menu-trigger"));
    await user.click(await screen.findByTestId("a11y-menu-motion-on"));
    expect(isReduced()).toBe(true);
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe("on");
  });

  it("'system' follows the OS preference including live changes", async () => {
    const mm = installMatchMedia(true);
    renderMenu();
    expect(isReduced()).toBe(true);

    mm.emit(false);
    expect(isReduced()).toBe(false);
    mm.emit(true);
    expect(isReduced()).toBe(true);
  });

  it("pinned 'off' ignores an OS change", async () => {
    const mm = installMatchMedia(false);
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTestId("a11y-menu-trigger"));
    await user.click(await screen.findByTestId("a11y-menu-motion-off"));
    expect(isReduced()).toBe(false);
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe("off");

    mm.emit(true);
    expect(isReduced()).toBe(false);
  });

  it("rehydrates a persisted 'on' choice on mount", () => {
    installMatchMedia(false);
    window.localStorage.setItem(MOTION_STORAGE_KEY, "on");
    renderMenu();
    expect(isReduced()).toBe(true);
  });
});

describe("AccessibilityMenu — aria + keyboard", () => {
  it("marks active options with aria-current and a check icon", async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTestId("a11y-menu-trigger"));
    expect(await screen.findByTestId("a11y-menu-font-m")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("a11y-menu-font-check-m")).toBeInTheDocument();
    expect(screen.getByTestId("a11y-menu-motion-system")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("a11y-menu-font-xl")).not.toHaveAttribute("aria-current");

    await user.click(screen.getByTestId("a11y-menu-font-xl"));
    await user.click(screen.getByTestId("a11y-menu-trigger"));
    expect(await screen.findByTestId("a11y-menu-font-xl")).toHaveAttribute("aria-current", "true");
    expect(screen.queryByTestId("a11y-menu-font-check-m")).not.toBeInTheDocument();
  });

  it("is keyboard operable: Enter opens the menu, Escape closes it", async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByTestId("a11y-menu-trigger");
    expect(trigger).toHaveAttribute("aria-label");
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByTestId("a11y-menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("a11y-menu")).not.toBeInTheDocument();
  });
});

describe("useAccessibility", () => {
  it("throws outside an AccessibilityProvider", () => {
    function Bare() {
      useAccessibility();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow(/AccessibilityProvider/);
    spy.mockRestore();
  });
});
