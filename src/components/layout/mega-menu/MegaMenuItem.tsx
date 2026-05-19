import { Link } from "@tanstack/react-router";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { tFor } from "@/i18n/marketing";
import { cn } from "@/lib/utils";
import { MegaMenuPanel } from "./MegaMenuPanel";
import type { MegaMenuItemDef } from "./mega-menu.types";

interface MegaMenuItemProps {
  item: MegaMenuItemDef;
  active: boolean;
}

export function MegaMenuItem({ item, active }: MegaMenuItemProps) {
  const t = tFor("header");
  const label = t(`menu.${item.slug}.label`);
  const colorClass = active ? "text-foreground" : "text-muted-foreground";

  if (item.panel) {
    return (
      <NavigationMenuItem>
        <NavigationMenuTrigger
          data-testid={`header-mega-trigger-${item.slug}`}
          className={cn("text-sm font-medium", colorClass)}
        >
          {label}
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <MegaMenuPanel slug={item.slug} panel={item.panel} />
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  if (!item.href) return null;

  return (
    <NavigationMenuItem>
      <NavigationMenuLink asChild>
        <Link
          to={item.href}
          data-testid={`header-mega-link-${item.slug}`}
          className={cn(navigationMenuTriggerStyle(), "text-sm font-medium", colorClass)}
        >
          {label}
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}
