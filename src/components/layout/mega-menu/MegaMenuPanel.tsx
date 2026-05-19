import { Link } from "@tanstack/react-router";
import { ClipboardCheck, GraduationCap, Sparkles, type LucideIcon } from "lucide-react";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { tFor } from "@/i18n/marketing";
import type {
  MegaMenuPanel as PanelDef,
  MegaMenuFeaturedIcon,
  MegaMenuFeaturedTone,
} from "./mega-menu.types";

interface MegaMenuPanelProps {
  slug: string;
  panel: PanelDef;
}

// E25 Phase 0 — featured-tile visual treatment. The featured slot
// previously rendered as a text-only card with no visual contrast
// against the link list; on hover the dropdown looked unfinished.
// Adding a Lucide icon over a tone-mapped gradient lifts the perceived
// production value of the menu without an external asset pipeline.
// `tone` maps semantic intent to Tailwind classes here so callers
// (SiteHeader config) stay free of styling concerns.
const ICON_MAP: Record<MegaMenuFeaturedIcon, LucideIcon> = {
  ClipboardCheck,
  GraduationCap,
  Sparkles,
};

const TONE_MAP: Record<MegaMenuFeaturedTone, string> = {
  // Each gradient pairs a vibrant brand-adjacent hue with a softer
  // accent so the tile reads as a CTA, not a decorative panel.
  tests: "bg-gradient-to-br from-primary/30 via-primary/15 to-accent/20",
  schools: "bg-gradient-to-br from-accent/30 via-accent/15 to-primary/20",
  neutral: "bg-gradient-to-br from-muted/40 via-muted/20 to-card/40",
};

export function MegaMenuPanel({ slug, panel }: MegaMenuPanelProps) {
  const t = tFor("header");

  return (
    <div
      data-testid={`header-mega-panel-${slug}`}
      className="grid w-[560px] gap-6 p-6 md:grid-cols-[1fr_auto]"
    >
      <div className="flex flex-col gap-5">
        {panel.sections.map((section) => (
          <div key={section.headingKey} className="flex flex-col gap-2">
            <h3
              data-testid={`header-mega-panel-${slug}-heading-${section.headingKey}`}
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t(`menu.${slug}.${section.headingKey}`)}
            </h3>
            <ul className="flex flex-col gap-1">
              {section.links.map((link) => (
                <li key={link.key}>
                  <NavigationMenuLink asChild>
                    <Link
                      to={link.href}
                      data-testid={`header-mega-panel-link-${slug}-${link.key}`}
                      className="block rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                    >
                      {t(`menu.${slug}.${link.labelKey}`)}
                    </Link>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {panel.featured &&
        (() => {
          const featured = panel.featured;
          const Icon = featured.icon ? ICON_MAP[featured.icon] : null;
          const toneClass = featured.tone ? TONE_MAP[featured.tone] : null;
          const hasVisual = Icon !== null && toneClass !== null;
          if (!hasVisual) {
            // Legacy fallback — text-only card. Kept so a panel can opt
            // out of the visual treatment by omitting icon+tone.
            return (
              <div className="flex w-48 flex-col justify-end rounded-lg border border-border/40 bg-card/40 p-4">
                <NavigationMenuLink asChild>
                  <Link
                    to={featured.href}
                    data-testid={`header-mega-panel-${slug}-featured`}
                    className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {t(`menu.${slug}.${featured.labelKey}`)}
                  </Link>
                </NavigationMenuLink>
              </div>
            );
          }
          return (
            <NavigationMenuLink asChild>
              <Link
                to={featured.href}
                data-testid={`header-mega-panel-${slug}-featured`}
                className="group flex w-48 flex-col overflow-hidden rounded-lg border border-border/40 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div
                  data-testid={`header-mega-panel-${slug}-featured-visual`}
                  className={`flex h-24 items-center justify-center ${toneClass}`}
                >
                  <Icon
                    className="h-10 w-10 text-foreground/80 transition-transform group-hover:scale-110"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-1 items-end bg-card/60 p-3">
                  <span
                    data-testid={`header-mega-panel-${slug}-featured-label`}
                    className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary"
                  >
                    {t(`menu.${slug}.${featured.labelKey}`)}
                  </span>
                </div>
              </Link>
            </NavigationMenuLink>
          );
        })()}
    </div>
  );
}
