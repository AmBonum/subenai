import { Link } from "@tanstack/react-router";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { tFor } from "@/i18n/marketing";
import type { MegaMenuPanel as PanelDef } from "./mega-menu.types";

interface MegaMenuPanelProps {
  slug: string;
  panel: PanelDef;
}

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

      {panel.featured && (
        <div className="flex w-48 flex-col justify-end rounded-lg border border-border/40 bg-card/40 p-4">
          <NavigationMenuLink asChild>
            <Link
              to={panel.featured.href}
              data-testid={`header-mega-panel-${slug}-featured`}
              className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              {t(`menu.${slug}.${panel.featured.labelKey}`)}
            </Link>
          </NavigationMenuLink>
        </div>
      )}
    </div>
  );
}
