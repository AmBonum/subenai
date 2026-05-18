// AH-15.1 — covers LocaleProvider hydration, persistence, and the
// module-level mirror that non-React `tFor` callers depend on.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  useLocale,
  LocaleProvider,
  getCurrentLocale,
  __resetLocaleForTests,
  DEFAULT_LOCALE,
} from "@/i18n/locale-context";

const STORAGE_KEY = "subenai.locale";

function Probe() {
  const { locale, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="probe-locale">{locale}</span>
      <button data-testid="probe-set-en" onClick={() => setLocale("en")}>
        en
      </button>
      <button data-testid="probe-set-cs" onClick={() => setLocale("cs")}>
        cs
      </button>
    </div>
  );
}

describe("LocaleContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetLocaleForTests(DEFAULT_LOCALE);
    // jsdom defaults navigator.language to "en-US" which trips the
    // browser-language fallback. Pin to "sk-SK" so the "no preference"
    // and "invalid localStorage" tests assert the documented default.
    Object.defineProperty(window.navigator, "language", {
      value: "sk-SK",
      configurable: true,
    });
  });

  it("defaults to sk when no preference is stored", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("probe-locale").textContent).toBe("sk");
    expect(getCurrentLocale()).toBe("sk");
  });

  it("rehydrates the persisted locale from localStorage on mount", () => {
    window.localStorage.setItem(STORAGE_KEY, "en");
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("probe-locale").textContent).toBe("en");
    expect(getCurrentLocale()).toBe("en");
  });

  it("setLocale persists to localStorage and dispatches a CustomEvent", () => {
    const listener = vi.fn();
    window.addEventListener("subenai:locale-change", listener);
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    act(() => {
      screen.getByTestId("probe-set-cs").click();
    });
    expect(screen.getByTestId("probe-locale").textContent).toBe("cs");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("cs");
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe("cs");
    window.removeEventListener("subenai:locale-change", listener);
  });

  it("getCurrentLocale tracks setLocale for non-hook callers", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    act(() => {
      screen.getByTestId("probe-set-en").click();
    });
    expect(getCurrentLocale()).toBe("en");
  });

  it("ignores invalid values in localStorage and falls back to sk", () => {
    window.localStorage.setItem(STORAGE_KEY, "fr");
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("probe-locale").textContent).toBe("sk");
  });
});
