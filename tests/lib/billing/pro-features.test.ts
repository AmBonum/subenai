import { describe, it, expect } from "vitest";

import {
  PRO_FEATURES,
  isProFeatureAvailable,
  isProFeatureLocked,
  userHasPro,
} from "@/lib/billing/pro-features";

describe("PRO feature catalogue", () => {
  it("declares email_invites as a PRO-gated feature", () => {
    expect("email_invites" in PRO_FEATURES).toBe(true);
  });

  it("userHasPro() returns false until billing ships", () => {
    // This is the pinned default. When billing launches and we wire the
    // helper to read from auth/profile, swap this assertion at the same
    // time as the helper body. The flip needs to be deliberate.
    expect(userHasPro()).toBe(false);
  });

  it("isProFeatureAvailable returns false for gated features when user lacks PRO", () => {
    expect(isProFeatureAvailable("email_invites")).toBe(false);
  });

  it("isProFeatureLocked returns true for gated features when user lacks PRO", () => {
    expect(isProFeatureLocked("email_invites")).toBe(true);
  });

  it("isProFeatureLocked + isProFeatureAvailable are perfect inverses for gated features", () => {
    expect(isProFeatureAvailable("email_invites")).toBe(!isProFeatureLocked("email_invites"));
  });
});
