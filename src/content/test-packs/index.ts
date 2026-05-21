// E37 Phase G3d — the static manifest layer has been deleted. The DB
// (public.tests + public.platform_pack_metadata) is now the single
// source of truth for packs; this barrel only re-exports the shared
// TS types + Zod schema that downstream consumers (TestPackCard,
// pack-queries, INDUSTRY_LABEL, etc.) still depend on.

export type { TestPack, Industry } from "./_schema";
export { testPackSchema } from "./_schema";
