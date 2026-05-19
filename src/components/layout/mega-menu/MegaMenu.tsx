import { NavigationMenu, NavigationMenuList } from "@/components/ui/navigation-menu";
import { MegaMenuItem } from "./MegaMenuItem";
import type { MegaMenuItemDef } from "./mega-menu.types";

interface MegaMenuProps {
  items: readonly MegaMenuItemDef[];
  activeSlug: string | null;
}

export function MegaMenu({ items, activeSlug }: MegaMenuProps) {
  return (
    <NavigationMenu data-testid="header-mega-menu">
      <NavigationMenuList className="gap-1">
        {items.map((item) => (
          <MegaMenuItem key={item.slug} item={item} active={activeSlug === item.slug} />
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
