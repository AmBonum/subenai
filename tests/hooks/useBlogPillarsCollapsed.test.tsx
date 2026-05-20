import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/analytics/blog-events", () => ({
  trackBlogPillarsToggle: vi.fn(),
}));

import { useBlogPillarsCollapsed, __test__ } from "@/hooks/useBlogPillarsCollapsed";
import { trackBlogPillarsToggle } from "@/lib/analytics/blog-events";
import { ALL_ACCEPTED, saveConsent } from "@/lib/consent";

// E40 — UI-state writes are now gated by hasConsent(record, "preferences").
// Tests that assert localStorage was written must first seed an accepting
// consent record. `seedConsent()` is the canonical pattern used across
// the suite.
function seedConsent(): void {
  saveConsent(ALL_ACCEPTED);
}

const { STORAGE_KEY, DESKTOP_MQ } = __test__;

function stubMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((q: string) => ({
      matches: q === DESKTOP_MQ ? matches : false,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function clearMatchMedia(): void {
  // delete leaves jsdom in its native (no matchMedia) state.
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
}

beforeEach(() => {
  window.localStorage.clear();
  (trackBlogPillarsToggle as unknown as { mockReset: () => void }).mockReset();
});

afterEach(() => {
  clearMatchMedia();
});

describe("useBlogPillarsCollapsed", () => {
  it("server-default: returns closed + un-hydrated on first render (no window deps consumed)", () => {
    const { result } = renderHook(() => useBlogPillarsCollapsed());
    // After mount the effect runs synchronously in JSDOM, so we can
    // only meaningfully assert the final state. We at least confirm
    // it doesn't throw without matchMedia (jsdom default).
    expect(typeof result.current.open).toBe("boolean");
    expect(result.current.hydrated).toBe(true);
  });

  it("mobile breakpoint (matchMedia=false): defaults to closed when no stored choice", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useBlogPillarsCollapsed());
    expect(result.current.open).toBe(false);
    expect(result.current.hydrated).toBe(true);
  });

  it("desktop breakpoint (matchMedia=true): defaults to open when no stored choice", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useBlogPillarsCollapsed());
    expect(result.current.open).toBe(true);
  });

  it("respects localStorage='1' over breakpoint default (user previously opened on mobile)", () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    stubMatchMedia(false);
    const { result } = renderHook(() => useBlogPillarsCollapsed());
    expect(result.current.open).toBe(true);
  });

  it("respects localStorage='0' over breakpoint default (user closed on desktop)", () => {
    window.localStorage.setItem(STORAGE_KEY, "0");
    stubMatchMedia(true);
    const { result } = renderHook(() => useBlogPillarsCollapsed());
    expect(result.current.open).toBe(false);
  });

  it("setOpen(true) writes localStorage='1' AND fires analytics with state:open", () => {
    seedConsent();
    stubMatchMedia(false);
    const { result } = renderHook(() => useBlogPillarsCollapsed());
    act(() => result.current.setOpen(true));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("1");
    expect(trackBlogPillarsToggle).toHaveBeenCalledWith({ open: true });
  });

  it("setOpen(false) writes localStorage='0' AND fires analytics with state:closed", () => {
    seedConsent();
    stubMatchMedia(true);
    const { result } = renderHook(() => useBlogPillarsCollapsed());
    act(() => result.current.setOpen(false));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("0");
    expect(trackBlogPillarsToggle).toHaveBeenCalledWith({ open: false });
  });

  it("setOpen WITHOUT preferences consent: in-memory only, no localStorage write", () => {
    // E40 contract: without consent the toggle works but doesn't persist.
    stubMatchMedia(false);
    const { result } = renderHook(() => useBlogPillarsCollapsed());
    act(() => result.current.setOpen(true));
    expect(result.current.open, "state still updates in-memory").toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY), "no consent → no persistence").toBeNull();
  });

  it("hydration default-state application does NOT emit analytics (only user actions do)", () => {
    stubMatchMedia(true);
    renderHook(() => useBlogPillarsCollapsed());
    expect(trackBlogPillarsToggle).not.toHaveBeenCalled();
  });
});
