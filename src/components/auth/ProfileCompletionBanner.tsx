// AH-13.5 — One-time nudge for users whose display_name still looks
// like the local part of their email. Triggered most often for Google
// sign-ups where the trigger fills `display_name` from the email when
// the full name isn't available. Dismissal is per-user via
// localStorage — we deliberately don't persist this in the DB because
// it's purely transient UX.

import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentProfile } from "@/lib/platform/queries";
import { hasConsent, loadConsent } from "@/lib/consent";
import { tFor } from "@/i18n/auth";

const dismissKey = (uid: string) => `subenai.profile-banner.dismissed.${uid}`;

const looksLikeEmailPrefix = (
  displayName: string | null | undefined,
  email: string | null | undefined,
) => {
  if (!displayName || !email) return false;
  const local = email.split("@")[0]?.toLowerCase().trim();
  if (!local) return false;
  const dn = displayName.toLowerCase().trim();
  return dn === local;
};

export function ProfileCompletionBanner() {
  const t = tFor("profile_banner");
  const { data: profile } = useCurrentProfile();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    if (typeof window === "undefined") return;
    const isDismissed = window.localStorage.getItem(dismissKey(profile.id)) === "1";
    setDismissed(isDismissed);
  }, [profile?.id]);

  if (!profile) return null;
  if (!looksLikeEmailPrefix(profile.display_name, profile.email)) return null;
  if (dismissed) return null;

  const onDismiss = () => {
    // E40 — per-user dismiss flag is a "preferences" cookie per /cookies.
    // Without consent the banner re-appears next session; dismissing
    // it still hides it for the current session.
    if (typeof window !== "undefined" && profile.id && hasConsent(loadConsent(), "preferences")) {
      window.localStorage.setItem(dismissKey(profile.id), "1");
    }
    setDismissed(true);
  };

  return (
    <div
      className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"
      role="status"
      data-testid="app-profile-completion-banner"
    >
      <div className="space-y-1">
        <p className="font-medium" data-testid="app-profile-completion-title">
          {t("title")}
        </p>
        <p className="text-muted-foreground">{t("body")}</p>
        <Link
          to="/app/account/profile"
          className="inline-block pt-1 text-primary underline"
          data-testid="app-profile-completion-cta"
        >
          {t("cta")}
        </Link>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dismiss_aria")}
        className="text-muted-foreground hover:text-foreground"
        data-testid="app-profile-completion-dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
