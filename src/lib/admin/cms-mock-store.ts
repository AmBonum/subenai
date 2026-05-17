// Mock CMS store for AH-9. Swapped to Supabase in AH-11.
//
// Schema mirrors planned DB tables: cms_pages, cms_header, cms_footer,
// cms_navigation, cms_share_card_config, quick_test_config.

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

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;
export const newId = (p = "id") => uid(p);

function nowIso() {
  return new Date().toISOString();
}

export const seedPages: CmsPage[] = [
  {
    id: "pg_o_projekte",
    slug: "o-projekte-rozsirene",
    title: "O projekte — rozšírené",
    seo_description: "Detailný pohľad na misiu SubenAI a tím za projektom.",
    content_blocks: [
      { id: newId("blk"), kind: "heading", text: "O projekte" },
      {
        id: newId("blk"),
        kind: "paragraph",
        text: "SubenAI je nezisková iniciatíva, ktorá učí Slovákov rozoznať online podvody.",
      },
      {
        id: newId("blk"),
        kind: "cta",
        label: "Spustiť rýchly test",
        url: "/test",
      },
    ],
    status: "published",
    published_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "pg_draft_skoly",
    slug: "skoly-rozsirene",
    title: "Pre školy — rozšírené",
    seo_description: "Pripravujeme rozšírenú stránku pre školy.",
    content_blocks: [{ id: newId("blk"), kind: "heading", text: "Pre školy" }],
    status: "draft",
    published_at: null,
    updated_at: "2026-05-13T09:00:00.000Z",
  },
];

export const seedHeader: CmsHeader = {
  logo_url: "/logo.svg",
  cta_label: "Spustiť rýchly test",
  cta_url: "/test",
  mobile_trigger_label: "Otvoriť menu",
};

export const seedFooter: CmsFooter = {
  columns: [
    {
      id: newId("col"),
      title: "Obsah",
      links: [
        { id: newId("lnk"), label: "Spustiť test", url: "/test" },
        { id: newId("lnk"), label: "Sada testov", url: "/testy" },
      ],
    },
    {
      id: newId("col"),
      title: "Projekt",
      links: [
        { id: newId("lnk"), label: "O projekte", url: "/o-projekte" },
        { id: newId("lnk"), label: "Kontakt", url: "/kontakt" },
      ],
    },
  ],
  socials: [{ id: newId("soc"), platform: "Facebook", url: "https://facebook.com/subenai" }],
};

export const seedNavigation: CmsNavItem[] = [
  {
    id: newId("nav"),
    label: "Testy",
    url: "/testy",
    position: 1,
    visible: true,
    open_in_new_tab: false,
    auth_only: false,
  },
  {
    id: newId("nav"),
    label: "Školenia",
    url: "/skolenia",
    position: 2,
    visible: true,
    open_in_new_tab: false,
    auth_only: false,
  },
  {
    id: newId("nav"),
    label: "Podporiť projekt",
    url: "/podpora",
    position: 3,
    visible: true,
    open_in_new_tab: false,
    auth_only: false,
  },
];

export const seedShareCard: CmsShareCard = {
  og_template_url: "/og/default.png",
  title_fallback: "SubenAI — Otestuj sa, kým ťa otestuje podvodník",
  description_fallback: "Krátke interaktívne testy o bezpečnosti na internete.",
};

export const seedQuickTestConfig: QuickTestConfig = {
  id: "qt_default",
  visible: true,
  title: "Rýchly test bezpečnosti",
  description: "Otestuj sa za 2 minúty.",
  branza: "Všeobecný test",
  time_seconds: 120,
  pass_percentage: 60,
  difficulty: "Ľahká",
  question_ids: [],
};

function makeStore<T>(initial: T) {
  let state = initial;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set: (next: T | ((prev: T) => T)) => {
      state = typeof next === "function" ? (next as (p: T) => T)(state) : next;
      subs.forEach((cb) => cb());
    },
    subscribe: (cb: () => void) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
  };
}

export const cmsPagesStore = makeStore<CmsPage[]>(seedPages);
export const cmsHeaderStore = makeStore<CmsHeader>(seedHeader);
export const cmsFooterStore = makeStore<CmsFooter>(seedFooter);
export const cmsNavigationStore = makeStore<CmsNavItem[]>(seedNavigation);
export const cmsShareCardStore = makeStore<CmsShareCard>(seedShareCard);
export const cmsQuickTestConfigStore = makeStore<QuickTestConfig>(seedQuickTestConfig);

export function createDraftPage(): CmsPage {
  const id = newId("pg");
  const page: CmsPage = {
    id,
    slug: `nova-stranka-${id.slice(-4)}`,
    title: "Nová stránka",
    seo_description: "",
    content_blocks: [],
    status: "draft",
    published_at: null,
    updated_at: nowIso(),
  };
  cmsPagesStore.set((prev) => [page, ...prev]);
  return page;
}

export function updatePage(id: string, patch: Partial<CmsPage>): void {
  cmsPagesStore.set((prev) =>
    prev.map((p) => (p.id === id ? { ...p, ...patch, updated_at: nowIso() } : p)),
  );
}

export function deletePage(id: string): void {
  cmsPagesStore.set((prev) => prev.filter((p) => p.id !== id));
}

export function publishPage(id: string): void {
  updatePage(id, { status: "published", published_at: nowIso() });
}

export function unpublishPage(id: string): void {
  updatePage(id, { status: "draft", published_at: null });
}

export function getPageBySlug(slug: string): CmsPage | undefined {
  return cmsPagesStore.get().find((p) => p.slug === slug);
}

export function resetCmsStoresForTests(): void {
  cmsPagesStore.set(
    seedPages.map((p) => ({ ...p, content_blocks: p.content_blocks.map((b) => ({ ...b })) })),
  );
  cmsHeaderStore.set({ ...seedHeader });
  cmsFooterStore.set({
    columns: seedFooter.columns.map((c) => ({ ...c, links: c.links.map((l) => ({ ...l })) })),
    socials: seedFooter.socials.map((s) => ({ ...s })),
  });
  cmsNavigationStore.set(seedNavigation.map((n) => ({ ...n })));
  cmsShareCardStore.set({ ...seedShareCard });
  cmsQuickTestConfigStore.set({
    ...seedQuickTestConfig,
    question_ids: [...seedQuickTestConfig.question_ids],
  });
}
