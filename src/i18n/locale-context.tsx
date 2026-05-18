// AH-15.1 — locale state for the trilingual UI shell (sk / en / cs).
//
// The provider renders the default locale on SSR and rehydrates from
// `localStorage` (fallback: `navigator.language`) after mount, which avoids a
// hydration mismatch on Cloudflare Pages. A module-level `currentLocale`
// mirrors the context state for non-React callers (the `tFor()` resolver
// imports `getCurrentLocale()` directly because it isn't a React hook).
//
// Co-located component + hook + constants in one file is intentional —
// splitting just to please Fast Refresh would obscure the unit of meaning.
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Locale = "sk" | "en" | "cs";

export const LOCALES: Locale[] = ["sk", "en", "cs"];
export const DEFAULT_LOCALE: Locale = "sk";
const STORAGE_KEY = "subenai.locale";
const EVENT_NAME = "subenai:locale-change";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

function isLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && LOCALES.includes(value as Locale);
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // localStorage may throw in privacy-restricted contexts; fall through.
  }
  const browser = window.navigator.language.slice(0, 2).toLowerCase();
  if (isLocale(browser)) return browser;
  return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const next = readInitialLocale();
    setLocaleState(next);
    currentLocale = next;
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    currentLocale = next;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore quota / disabled-storage errors.
      }
      window.dispatchEvent(new CustomEvent<Locale>(EVENT_NAME, { detail: next }));
    }
  }, []);

  // Force-remount the tree under the provider on locale change. The resolver
  // is hook-free for module-level / `head()` compatibility, so component
  // re-renders aren't auto-triggered by context. Remounting via `key={locale}`
  // makes the switch instant; the trade-off (form-local state resets) is
  // acceptable for a deliberate user action.
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <Fragment key={locale}>{children}</Fragment>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

// Module-level mirror so non-hook callers (the `tFor()` resolver) can read the
// active locale synchronously without threading a React context through every
// module that translates strings.
let currentLocale: Locale = DEFAULT_LOCALE;
if (typeof window !== "undefined") {
  currentLocale = readInitialLocale();
  window.addEventListener(EVENT_NAME, (e) => {
    const next = (e as CustomEvent<Locale>).detail;
    if (isLocale(next)) currentLocale = next;
  });
}

export function getCurrentLocale(): Locale {
  return currentLocale;
}

// Test-only helper. Resets the module-level locale so unit tests that
// instantiate multiple providers in sequence don't leak state.
export function __resetLocaleForTests(next: Locale = DEFAULT_LOCALE): void {
  currentLocale = next;
}
