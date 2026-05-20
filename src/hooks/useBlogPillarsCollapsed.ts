import { useCallback, useEffect, useState } from "react";

import { trackBlogPillarsToggle } from "@/lib/analytics/blog-events";

const STORAGE_KEY = "blog:pillars-open";
const DESKTOP_MQ = "(min-width: 768px)";

// SSR-safe controller for the /blog index pillars Collapsible. Default
// state per breakpoint (collapsed on mobile, expanded on desktop) is
// computed *after* hydration — server renders `open=false` deterministically
// to avoid hydration mismatches, then a post-mount effect reads
// localStorage (if user already toggled in a prior session) or
// matchMedia (initial breakpoint default) and applies. `hydrated` lets
// consumers gate animations or pre-toggle UI until the real state is known.
//
// Analytics: trackBlogPillarsToggle fires ONLY on user-initiated
// `setOpen()` calls, never on the hydration default application —
// otherwise every page view would emit a "closed" event on mobile.
export function useBlogPillarsCollapsed() {
  const [open, setOpenState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") {
      setOpenState(true);
    } else if (stored === "0") {
      setOpenState(false);
    } else if (typeof window.matchMedia === "function") {
      // No prior decision — pick the breakpoint default. matchMedia is
      // guarded for jsdom (the unit-test env doesn't implement it).
      setOpenState(window.matchMedia(DESKTOP_MQ).matches);
    }
    setHydrated(true);
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    }
    trackBlogPillarsToggle({ open: next });
  }, []);

  return { open, setOpen, hydrated } as const;
}

export const __test__ = { STORAGE_KEY, DESKTOP_MQ };
