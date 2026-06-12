// No-flash invariant: the inline script in `index.html`'s head applies the
// persisted font size + `.reduce-motion` before first paint (this app
// client-mounts via src/main.tsx, so a route-level head() script would run
// too late). It must stay in exact lockstep with this provider: same storage
// keys, same defaults, same matchMedia query, same FONT_SIZES map.
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FontSize = "s" | "m" | "l" | "xl";
export type MotionPref = "system" | "on" | "off";

export const FONT_STORAGE_KEY = "subenai-a11y-font";
export const MOTION_STORAGE_KEY = "subenai-a11y-motion";

export const FONT_SIZES: Record<FontSize, string> = {
  s: "87.5%",
  m: "100%",
  l: "112.5%",
  xl: "125%",
};

const FONT_OPTIONS: FontSize[] = ["s", "m", "l", "xl"];
const MOTION_OPTIONS: MotionPref[] = ["system", "on", "off"];

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

interface AccessibilityContextValue {
  fontSize: FontSize;
  motion: MotionPref;
  /** Whether motion is effectively reduced right now ("system" resolved). */
  reduceMotion: boolean;
  setFontSize: (next: FontSize) => void;
  setMotion: (next: MotionPref) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function isFontSize(value: string | null): value is FontSize {
  return value !== null && FONT_OPTIONS.includes(value as FontSize);
}

function isMotionPref(value: string | null): value is MotionPref {
  return value !== null && MOTION_OPTIONS.includes(value as MotionPref);
}

function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function resolveMotion(pref: MotionPref): boolean {
  if (pref === "system") return systemPrefersReducedMotion();
  return pref === "on";
}

function readStored<T extends string>(key: string, guard: (v: string | null) => v is T): T | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(key);
    return guard(stored) ? stored : null;
  } catch {
    return null;
  }
}

function applyFontSize(size: FontSize): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = FONT_SIZES[size];
}

// CSS keys off the `.reduce-motion` class ONLY — the provider (and the
// index.html bootstrap) resolve the OS preference here so styles.css has a
// single source of truth instead of duplicated media-query logic.
function applyReduceMotion(reduced: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", reduced);
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>("m");
  const [motion, setMotionState] = useState<MotionPref>("system");
  const [reduceMotion, setReduceMotion] = useState(false);

  // Rehydrate from localStorage after mount (SSR rendered the defaults).
  useEffect(() => {
    const storedFont = readStored(FONT_STORAGE_KEY, isFontSize) ?? "m";
    const storedMotion = readStored(MOTION_STORAGE_KEY, isMotionPref) ?? "system";
    const resolved = resolveMotion(storedMotion);
    setFontSizeState(storedFont);
    setMotionState(storedMotion);
    setReduceMotion(resolved);
    applyFontSize(storedFont);
    applyReduceMotion(resolved);
  }, []);

  // While on "system", track OS changes live.
  useEffect(() => {
    if (motion !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => {
      setReduceMotion(mql.matches);
      applyReduceMotion(mql.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [motion]);

  const setFontSize = useCallback((next: FontSize) => {
    setFontSizeState(next);
    applyFontSize(next);
    try {
      window.localStorage.setItem(FONT_STORAGE_KEY, next);
    } catch {
      // ignore — private mode / storage disabled; in-memory state still works
    }
  }, []);

  const setMotion = useCallback((next: MotionPref) => {
    const resolved = resolveMotion(next);
    setMotionState(next);
    setReduceMotion(resolved);
    applyReduceMotion(resolved);
    try {
      window.localStorage.setItem(MOTION_STORAGE_KEY, next);
    } catch {
      // ignore — private mode / storage disabled; in-memory state still works
    }
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({ fontSize, motion, reduceMotion, setFontSize, setMotion }),
    [fontSize, motion, reduceMotion, setFontSize, setMotion],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within an AccessibilityProvider");
  return ctx;
}
