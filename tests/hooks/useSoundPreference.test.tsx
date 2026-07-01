import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSoundPreference, __test__ } from "@/hooks/useSoundPreference";
import { ALL_ACCEPTED, saveConsent, clearConsent } from "@/lib/consent";

const { STORAGE_KEY } = __test__;

describe("useSoundPreference (E62)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to sounds off", () => {
    const { result } = renderHook(() => useSoundPreference());
    expect(result.current.soundsEnabled).toBe(false);
  });

  it("hydrates enabled=true from a prior stored '1'", () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    const { result } = renderHook(() => useSoundPreference());
    expect(result.current.soundsEnabled).toBe(true);
  });

  it("persists the choice to localStorage when preferences consent is present", () => {
    saveConsent(ALL_ACCEPTED);
    const { result } = renderHook(() => useSoundPreference());
    act(() => result.current.setSoundsEnabled(true));
    expect(result.current.soundsEnabled).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("still toggles in-session but does NOT persist without preferences consent", () => {
    clearConsent();
    const { result } = renderHook(() => useSoundPreference());
    act(() => result.current.setSoundsEnabled(true));
    expect(result.current.soundsEnabled).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
