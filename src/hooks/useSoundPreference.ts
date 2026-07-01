import { useCallback, useEffect, useState } from "react";

import { hasConsent, loadConsent } from "@/lib/consent";

const STORAGE_KEY = "iiq:sounds-enabled";

// E62 — site-wide "play sounds" preference. Scam-call recordings in a test
// only appear when this is on. SSR-safe: the server renders the default
// (off) deterministically; a post-mount effect reads localStorage. The
// choice persists only with "preferences" consent (same rule as every other
// UI toggle — see useBlogPillarsCollapsed); without consent it still works
// for the session but doesn't survive reload. Default OFF: audio must be
// opt-in, never surprise-plays.
export function useSoundPreference() {
  const [soundsEnabled, setState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") setState(true);
    setHydrated(true);
  }, []);

  const setSoundsEnabled = useCallback((next: boolean) => {
    setState(next);
    if (typeof window !== "undefined" && hasConsent(loadConsent(), "preferences")) {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    }
  }, []);

  return { soundsEnabled, setSoundsEnabled, hydrated } as const;
}

export const __test__ = { STORAGE_KEY };
