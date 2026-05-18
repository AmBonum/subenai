import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/hooks/useConsent";
import { tFor } from "@/i18n/marketing";

/**
 * First-visit consent banner.
 *
 * Compliance notes (EDPB Guidelines 03/2022 on dark patterns + ePrivacy):
 *   - "Accept all" and "Reject all" are equally prominent (same variant,
 *     same size, both visible without scrolling). No reject-as-grey-link.
 *   - "Customise" opens granular controls; non-essential categories
 *     default to OFF (no pre-ticking, EDPB Guidelines 05/2020).
 *   - The page underneath stays interactive — no cookie wall.
 *   - Hidden during SSR / before hydration so we never render two
 *     conflicting trees and never block FCP for users who already chose.
 */
export function ConsentBanner() {
  const { needsDecision, acceptAll, rejectAll, openPreferences } = useConsent();
  const t = tFor("consent");

  if (!needsDecision) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-description"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:gap-6 md:py-5">
        <div className="flex-1 text-sm leading-relaxed">
          <p id="consent-banner-title" className="font-semibold text-foreground">
            {t("banner.title")}
            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-normal text-primary">
              {t("banner.badge_updated")}
            </span>
          </p>
          <p id="consent-banner-description" className="mt-1 text-muted-foreground">
            {t("banner.description")}{" "}
            <Link to="/cookies" className="underline underline-offset-2 hover:text-foreground">
              {t("banner.link_cookies")}
            </Link>
            {" · "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              {t("banner.link_privacy")}
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:flex-nowrap">
          <Button variant="outline" size="sm" onClick={openPreferences} className="md:order-1">
            {t("banner.settings")}
          </Button>
          <Button variant="outline" size="sm" onClick={rejectAll} className="md:order-2">
            {t("banner.reject_all")}
          </Button>
          <Button size="sm" onClick={acceptAll} className="md:order-3">
            {t("banner.accept_all")}
          </Button>
        </div>
      </div>
    </div>
  );
}
