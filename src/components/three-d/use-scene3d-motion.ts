import { createContext, useContext, useSyncExternalStore } from "react";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

function matches(query: string): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

// The OS query alone misses the in-app "reduce motion" toggle, which
// AccessibilityProvider resolves into the `.reduce-motion` class on <html>.
function readReduced(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("reduce-motion") || matches(REDUCED_QUERY);
}

function subscribeReduced(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_QUERY) : null;
  mql?.addEventListener?.("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => {
    mql?.removeEventListener?.("change", onChange);
    observer.disconnect();
  };
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, readReduced, () => false);
}

export function hasFinePointer(): boolean {
  return matches(FINE_POINTER_QUERY);
}

export const Scene3DMotionContext = createContext<{ animate: boolean }>({ animate: false });

export function useScene3DAnimate(): boolean {
  return useContext(Scene3DMotionContext).animate;
}
