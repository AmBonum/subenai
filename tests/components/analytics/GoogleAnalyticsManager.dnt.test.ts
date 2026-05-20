// E42 / C-9 — Do Not Track + Global Privacy Control respect.
//
// `/cookies` s5 promises that analytics + marketing are skipped when
// the browser signals DNT or GPC, regardless of stored consent. This
// spec locks the contract for the two pure helpers exported by
// GoogleAnalyticsManager so a future refactor cannot silently drop
// the override.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyDoNotTrackOverride, isDoNotTrackEnabled } from "@/components/analytics/do-not-track";

interface MutableNavigator {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
  msDoNotTrack?: string;
}

interface MutableWindow {
  doNotTrack?: string;
}

const ENV_BACKUP = {
  navigator: { ...(window.navigator as unknown as MutableNavigator) },
  windowDoNotTrack: (window as unknown as MutableWindow).doNotTrack,
};

beforeEach(() => {
  // Reset every signal source to "off".
  Object.defineProperty(window.navigator, "doNotTrack", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window.navigator, "globalPrivacyControl", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(window.navigator, "msDoNotTrack", {
    configurable: true,
    value: undefined,
  });
  delete (window as unknown as MutableWindow).doNotTrack;
});

afterEach(() => {
  Object.defineProperty(window.navigator, "doNotTrack", {
    configurable: true,
    value: ENV_BACKUP.navigator.doNotTrack,
  });
  Object.defineProperty(window.navigator, "globalPrivacyControl", {
    configurable: true,
    value: ENV_BACKUP.navigator.globalPrivacyControl,
  });
  Object.defineProperty(window.navigator, "msDoNotTrack", {
    configurable: true,
    value: ENV_BACKUP.navigator.msDoNotTrack,
  });
  if (ENV_BACKUP.windowDoNotTrack !== undefined) {
    (window as unknown as MutableWindow).doNotTrack = ENV_BACKUP.windowDoNotTrack;
  } else {
    delete (window as unknown as MutableWindow).doNotTrack;
  }
});

describe("isDoNotTrackEnabled — signal detection", () => {
  it("returns false when every signal source is absent", () => {
    expect(isDoNotTrackEnabled()).toBe(false);
  });

  it("returns true when navigator.globalPrivacyControl === true (GPC)", () => {
    Object.defineProperty(window.navigator, "globalPrivacyControl", {
      configurable: true,
      value: true,
    });
    expect(isDoNotTrackEnabled()).toBe(true);
  });

  it("returns true when navigator.doNotTrack === '1' (standard DNT)", () => {
    Object.defineProperty(window.navigator, "doNotTrack", {
      configurable: true,
      value: "1",
    });
    expect(isDoNotTrackEnabled()).toBe(true);
  });

  it("returns true when navigator.doNotTrack === 'yes' (legacy Firefox)", () => {
    Object.defineProperty(window.navigator, "doNotTrack", {
      configurable: true,
      value: "yes",
    });
    expect(isDoNotTrackEnabled()).toBe(true);
  });

  it("returns true when navigator.msDoNotTrack === '1' (legacy IE / older Edge)", () => {
    Object.defineProperty(window.navigator, "msDoNotTrack", {
      configurable: true,
      value: "1",
    });
    expect(isDoNotTrackEnabled()).toBe(true);
  });

  it("returns true when window.doNotTrack === '1' (Safari-style legacy)", () => {
    (window as unknown as MutableWindow).doNotTrack = "1";
    expect(isDoNotTrackEnabled()).toBe(true);
  });

  it("returns false when navigator.doNotTrack === '0' (user explicitly opted out of DNT)", () => {
    Object.defineProperty(window.navigator, "doNotTrack", {
      configurable: true,
      value: "0",
    });
    expect(isDoNotTrackEnabled()).toBe(false);
  });
});

describe("applyDoNotTrackOverride — gtag consent state", () => {
  const allGranted = {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
    functionality_storage: "granted",
    personalization_storage: "granted",
    security_storage: "granted",
  } as const;

  it("is a no-op when DNT is off", () => {
    expect(applyDoNotTrackOverride({ ...allGranted })).toEqual(allGranted);
  });

  it("forces ad_* + analytics_storage to denied when GPC is on, even if user accepted", () => {
    Object.defineProperty(window.navigator, "globalPrivacyControl", {
      configurable: true,
      value: true,
    });
    const result = applyDoNotTrackOverride({ ...allGranted });
    expect(result.ad_storage).toBe("denied");
    expect(result.ad_user_data).toBe("denied");
    expect(result.ad_personalization).toBe("denied");
    expect(result.analytics_storage).toBe("denied");
  });

  it("leaves functionality + personalization untouched (DNT is about tracking, not UI memory)", () => {
    Object.defineProperty(window.navigator, "doNotTrack", {
      configurable: true,
      value: "1",
    });
    const result = applyDoNotTrackOverride({ ...allGranted });
    expect(result.functionality_storage, "DNT must not override functionality bucket").toBe(
      "granted",
    );
    expect(result.personalization_storage, "DNT must not override personalization bucket").toBe(
      "granted",
    );
    expect(result.security_storage).toBe("granted");
  });
});
