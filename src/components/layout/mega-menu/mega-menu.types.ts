// Phase 1 — type definitions for the desktop mega-menu header.
//
// MegaMenuItemDef drives both the desktop NavigationMenu and the mobile
// Sheet/Accordion fallback. Items without `panel` render as flat links;
// items with `panel` render as a Radix `NavigationMenuTrigger` paired with
// a `NavigationMenuContent` panel on desktop and an Accordion section on
// mobile.

export interface MegaMenuPanelLink {
  /** Stable key under `header.menu.<slug>.panel_link_<key>` plus used in test-ids. */
  key: string;
  labelKey: string;
  href: string;
  descKey?: string;
}

export interface MegaMenuPanelSection {
  headingKey: string;
  links: MegaMenuPanelLink[];
}

/**
 * Icon name driving the featured tile visual. Maps internally in
 * MegaMenuPanel to a lucide-react component so callers stay decoupled
 * from the icon library import. Add new keys here as new tones land.
 */
export type MegaMenuFeaturedIcon = "ClipboardCheck" | "GraduationCap" | "Sparkles";

/**
 * Semantic tone driving the gradient palette on the featured tile.
 * The component owns the actual Tailwind classes — callers pick
 * intent, not styling.
 */
export type MegaMenuFeaturedTone = "tests" | "schools" | "neutral";

export interface MegaMenuFeatured {
  labelKey: string;
  href: string;
  /** Optional visual treatment. When `icon` is set the featured tile
   *  renders a two-zone card (gradient + icon on top, label below);
   *  when both `icon` and `tone` are omitted the tile falls back to
   *  the legacy text-only card. */
  icon?: MegaMenuFeaturedIcon;
  tone?: MegaMenuFeaturedTone;
}

export interface MegaMenuPanel {
  sections: MegaMenuPanelSection[];
  featured?: MegaMenuFeatured;
}

export interface MegaMenuItemDef {
  /** Stable React key + test-id slug. */
  slug: string;
  /** i18n key under `header.menu.<slug>.label`. */
  labelKey: string;
  /** i18n key under `header.menu.<slug>.desc` (currently unused on desktop trigger, surfaced in mobile accordion summary). */
  descKey: string;
  /** Direct route when there's no panel. */
  href?: string;
  panel?: MegaMenuPanel;
}
