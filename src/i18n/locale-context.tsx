// AH-15.1 — locale state for the trilingual UI shell (sk / en / cs).
//
// The provider renders the default locale on SSR and rehydrates from
// `localStorage` (fallback: `navigator.language`) after mount, which avoids a
// hydration mismatch on Cloudflare Pages. A module-level `currentLocale`
// mirrors the context state for non-React callers (the `tFor()` resolver
// imports `getCurrentLocale()` directly because it isn't a React hook).
//
// AH-perf — sk is eager; en + cs bundles are dynamic-imported on first
// switch. `setLocale` awaits the preload across every namespace before
// flipping state so the remount paints with translated copy. On mount
// hydration, if the persisted locale is non-sk, we kick the preload off
// in parallel with setting state; the first paint may briefly show the
// sk fallback (acceptable — same behaviour as a missing key) and the
// next render swaps in the translated copy once the bundles resolve.
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

// TEMPORARILY LOCKED to DEFAULT_LOCALE (2026-05-19) while the UI language
// picker is hidden. The translation infrastructure (resolver, lazy locale
// bundles, every en/cs JSON file) stays intact so engineering can keep
// adding strings in all 3 locales. To re-enable user-driven switching:
// restore the localStorage + navigator.language probe below and flip
// LOCALE_SWITCHER_ENABLED in `src/components/i18n/LocaleSwitcher.tsx`.
function readInitialLocale(): Locale {
  // LOCKED — see LOCALE_SWITCHER_DISABLED comment above. To restore
  // user-driven detection, replace this body with the localStorage +
  // navigator.language probe (preserved in git history at this file's
  // pre-2026-05-19 revision).
  return DEFAULT_LOCALE;
}

// Imported lazily inside callbacks to avoid a circular module init order
// (resolver → locale-context → resolver). The import is cheap once the
// module graph is warm.
async function preload(next: Locale): Promise<void> {
  if (next === "sk") return;
  const mod = await import("./_create-resolver");
  await mod.preloadLocale(next);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const next = readInitialLocale();
    currentLocale = next;
    if (next === "sk") {
      setLocaleState(next);
      return;
    }
    // Persisted non-sk locale: kick off preload, then commit state. The
    // first paint already happened with DEFAULT_LOCALE in scope; once the
    // promise resolves the state flip + Fragment-key remount paints the
    // translated tree. This is one extra frame at worst.
    let cancelled = false;
    void preload(next).then(() => {
      if (!cancelled) setLocaleState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (next === "sk") {
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
      return;
    }
    // Non-sk: await the preload before flipping state so the Fragment-key
    // remount paints with translated copy on the first render after switch.
    void preload(next).then(() => {
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
    });
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
