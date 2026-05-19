// AH-11.6 carve-out — CMS mock seed store, retained for Vitest fixtures.
//
// Type definitions live in `@/lib/admin/cms-types`. Production CMS reads
// flow through `@/lib/admin/queries.ts` + Supabase (AH-11.5a). This file
// stays only for the seed arrays consumed by `tests/utils/admin-supabase-mock`
// and a handful of admin-route specs. Tree-shaken from the production
// bundle because no runtime code path imports it.

export type {
  PageStatus,
  BlockKind,
  CmsBlock,
  CmsPage,
  CmsHeader,
  CmsFooterLink,
  CmsFooterColumn,
  CmsSocialLink,
  CmsFooter,
  CmsNavItem,
  CmsShareCard,
  QuickTestConfig,
} from "@/lib/admin/cms-types";

import type {
  CmsPage,
  CmsHeader,
  CmsFooter,
  CmsNavItem,
  CmsShareCard,
  QuickTestConfig,
} from "@/lib/admin/cms-types";

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
        { id: newId("lnk"), label: "Sada testov", url: "/tests" },
      ],
    },
    {
      id: newId("col"),
      title: "Projekt",
      links: [
        { id: newId("lnk"), label: "O projekte", url: "/about" },
        { id: newId("lnk"), label: "Kontakt", url: "/contact" },
      ],
    },
  ],
  socials: [{ id: newId("soc"), platform: "Facebook", url: "https://facebook.com/subenai" }],
};

export const seedNavigation: CmsNavItem[] = [
  {
    id: newId("nav"),
    label: "Testy",
    url: "/tests",
    position: 1,
    visible: true,
    open_in_new_tab: false,
    auth_only: false,
  },
  {
    id: newId("nav"),
    label: "Školenia",
    url: "/courses",
    position: 2,
    visible: true,
    open_in_new_tab: false,
    auth_only: false,
  },
  {
    id: newId("nav"),
    label: "Podporiť projekt",
    url: "/support",
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
