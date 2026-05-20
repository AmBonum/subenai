// E42 / C-9 — Do Not Track + Global Privacy Control helpers.
//
// Pure functions extracted from GoogleAnalyticsManager so the
// component file only exports components (react-refresh hygiene).

type ConsentValue = "granted" | "denied";

export interface GtagConsentState {
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
  analytics_storage: ConsentValue;
  functionality_storage: ConsentValue;
  personalization_storage: ConsentValue;
  security_storage: ConsentValue;
}

/**
 * `/cookies` s5 promises: "Keď ich máš zapnuté, kategórie Analytics
 * a Marketing automaticky preskočíme aj keby si súhlas explicitne
 * udelil/a — preferencie prehliadača majú prednosť." This function
 * sources the four signal places browsers expose and returns true if
 * any is on; the caller then overrides ad_* + analytics_* to denied.
 */
export function isDoNotTrackEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & {
    doNotTrack?: string | null;
    globalPrivacyControl?: boolean;
    msDoNotTrack?: string;
  };
  if (nav.globalPrivacyControl === true) return true;
  if (nav.doNotTrack === "1" || nav.doNotTrack === "yes") return true;
  // Legacy IE / older Edge
  if (nav.msDoNotTrack === "1") return true;
  // Some browsers expose it on `window` instead of `navigator`.
  const win = window as Window & { doNotTrack?: string };
  if (win.doNotTrack === "1") return true;
  return false;
}

/**
 * Apply DNT / GPC override: regardless of the user's stored consent,
 * if any DNT signal is on, force ad + analytics buckets to denied.
 * Functionality / personalization stay tied to the "preferences"
 * category — DNT is about *tracking*, not UI memory.
 */
export function applyDoNotTrackOverride(state: GtagConsentState): GtagConsentState {
  if (!isDoNotTrackEnabled()) return state;
  return {
    ...state,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  };
}
