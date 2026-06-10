import type { CmsBlock, PageStatus } from "../../src/lib/admin/cms-types";
import { nextId, pad } from "./counters";

export type CmsPageRow = {
  id: string;
  slug: string;
  title: string;
  seo_description: string;
  blocks: CmsBlock[];
  status: PageStatus;
  published_at: string | null;
  updated_at: string;
};

export function seedCmsPage(overrides: Partial<CmsPageRow> = {}): CmsPageRow {
  const n = nextId("cms_page");
  const id = `pg_e2e_${pad(n)}`;
  return {
    id,
    slug: `e2e-stranka-${n}`,
    title: `E2E Stránka ${n}`,
    seo_description: "",
    blocks: [],
    status: "draft",
    published_at: null,
    updated_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
