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

    window.gtag?.("consent", "update", applyDoNotTrackOverride(baseState));
  }, [hydrated, record]);

  return null;
}
