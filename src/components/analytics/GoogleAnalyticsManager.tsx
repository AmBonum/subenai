import { useEffect } from "react";
import { useConsent } from "@/hooks/useConsent";
import { applyDoNotTrackOverride, type GtagConsentState } from "./do-not-track";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function deniedState(): GtagConsentState {
  return {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
  };
}

function buildConsentState(input: {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}): GtagConsentState {
  return {
    ad_storage: input.marketing ? "granted" : "denied",
    ad_user_data: input.marketing ? "granted" : "denied",
    ad_personalization: input.marketing ? "granted" : "denied",
    analytics_storage: input.analytics ? "granted" : "denied",
    functionality_storage: input.preferences ? "granted" : "denied",
    personalization_storage: input.preferences ? "granted" : "denied",
    security_storage: "granted",
  };
}

const GTAG_SRC = "https://www.googletagmanager.com/gtag/js?id=G-95QZ12WGFD";

// Basic consent mode: index.html injects gtag.js only when a STORED record
// already grants analytics. When the user grants analytics during the
// session, this loads the script at that moment — until then nothing
// (not even cookieless pings) reaches Google.
function ensureGtagScript() {
  if (document.querySelector(`script[src^="https://www.googletagmanager.com/gtag/js"]`)) return;
  if (/^\/admin(\/|$)/.test(window.location.pathname)) return;
  if (navigator.doNotTrack === "1") return;
  const s = document.createElement("script");
  s.async = true;
  s.src = GTAG_SRC;
  s.setAttribute("data-gtag-loader", "1");
  document.head.appendChild(s);
}

export function GoogleAnalyticsManager() {
  const { record, hydrated } = useConsent();

  useEffect(() => {
    if (!hydrated) return;
    const baseState = record
      ? buildConsentState({
          analytics: record.categories.analytics,
          marketing: record.categories.marketing,
          preferences: record.categories.preferences,
        })
      : deniedState();

    const state = applyDoNotTrackOverride(baseState);
    if (state.analytics_storage === "granted") ensureGtagScript();
    window.gtag?.("consent", "update", state);
  }, [hydrated, record]);

  return null;
}
