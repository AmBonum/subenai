// AH-11.6 — Canonical CMS type module.
//
// Type definitions for cms_pages / cms_header / cms_footer /
// cms_navigation / cms_share_card_config / quick_test_config.
// Production runtime data flows through @/lib/admin/queries.ts +
// Supabase (AH-11.5a). The mock store at @/lib/admin/cms-mock-store
// remains as a seed source for Vitest fixtures only.

export type PageStatus = "draft" | "published";

export type BlockKind = "heading" | "paragraph" | "image" | "cta";

export interface CmsBlock {
  id: string;
  kind: BlockKind;
  text?: string;
  url?: string;
  alt?: string;
  label?: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  seo_description: string;
  content_blocks: CmsBlock[];
  status: PageStatus;
  published_at: string | null;
  updated_at: string;
  owner_id?: string;
}

export interface CmsHeader {
  logo_url: string;
  cta_label: string;
  cta_url: string;
  mobile_trigger_label: string;
}

export interface CmsFooterLink {
  id: string;
  label: string;
  url: string;
}

export interface CmsFooterColumn {
  id: string;
  title: string;
  links: CmsFooterLink[];
}

export interface CmsSocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface CmsFooter {
  columns: CmsFooterColumn[];
  socials: CmsSocialLink[];
}

export interface CmsNavItem {
  id: string;
  label: string;
  url: string;
  position: number;
  visible: boolean;
  open_in_new_tab: boolean;
  auth_only: boolean;
}

export interface CmsShareCard {
  og_template_url: string;
  title_fallback: string;
  description_fallback: string;
}

export interface QuickTestConfig {
  id: string;
  visible: boolean;
  title: string;
  description: string;
  branza: string;
  time_seconds: number;
  pass_percentage: number;
  difficulty: "Ľahká" | "Stredná" | "Ťažká";
  question_ids: string[];
}
