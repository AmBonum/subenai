// Cross-navigation flash for "you have been signed out" — set on
// signout (just before the hard redirect), read once on the next page,
// then cleared. sessionStorage (not localStorage) so a different tab
// or a later session doesn't accidentally trigger a stale toast.

const KEY = "subenai.flash.signedOut";

export function setSignedOutFlash(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Storage may be unavailable (privacy mode, quota) — non-fatal.
  }
}

export function consumeSignedOutFlash(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.sessionStorage.getItem(KEY);
    if (v) {
      window.sessionStorage.removeItem(KEY);
      return true;
    }
  } catch {
    // No storage → silently no flash, fine.
  }
  return false;
}
