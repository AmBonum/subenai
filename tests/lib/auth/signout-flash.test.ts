import { describe, it, expect, beforeEach } from "vitest";

import { setSignedOutFlash, consumeSignedOutFlash } from "@/lib/auth/signout-flash";

const KEY = "subenai.flash.signedOut";

describe("signout-flash", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("set writes the flag", () => {
    setSignedOutFlash();
    expect(window.sessionStorage.getItem(KEY)).toBe("1");
  });

  it("consume returns true exactly once and clears the flag", () => {
    setSignedOutFlash();
    expect(consumeSignedOutFlash()).toBe(true);
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
    // Second call must be a no-op — otherwise a page that mounts twice
    // (HMR, route remount) would replay the toast.
    expect(consumeSignedOutFlash()).toBe(false);
  });

  it("consume returns false when no flag is set", () => {
    expect(consumeSignedOutFlash()).toBe(false);
  });
});
