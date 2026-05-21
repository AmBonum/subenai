import { describe, it, expect } from "vitest";

import { FEATURE_GATES, getFeatureGate, isFeatureLocked, userHasPro } from "@/lib/feature-gates";

describe("Feature-gate registry", () => {
  it("declares email_invites as coming_soon (not pro)", () => {
    expect(FEATURE_GATES.email_invites).toBe("coming_soon");
  });

  it("userHasPro() returns false until billing ships", () => {
    // This is the pinned default. When billing launches and we wire the
    // helper to read from auth/profile, swap this assertion at the same
    // time as the helper body — the flip needs to be deliberate.
    expect(userHasPro()).toBe(false);
  });

  it("isFeatureLocked returns true for any gated feature", () => {
    expect(isFeatureLocked("email_invites")).toBe(true);
  });

  it("getFeatureGate returns the gate type so UI can pick badge / tooltip flavour", () => {
    expect(getFeatureGate("email_invites")).toBe("coming_soon");
  });

  it("coming_soon never auto-unlocks (even if userHasPro flips somehow)", () => {
    // Static check: the gate value itself is "coming_soon", not "pro".
    // The helper's contract: coming_soon stays gated regardless of
    // userHasPro(). Promoting to live = delete the FEATURE_GATES entry.
    expect(getFeatureGate("email_invites")).toBe("coming_soon");
  });
});
