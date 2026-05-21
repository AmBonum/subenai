import { z } from "zod";

/**
 * Industry buckets we support. Adding a new bucket is a single union
 * extension — no other code path needs to know about it. Keep ordering
 * stable so that `industry` filter chips don't reshuffle on deploys.
 */
export type Industry =
  | "eshop"
  | "gastro"
  | "autoservis"
  | "it"
  | "verejne_sluzby"
  | "dispecing"
  | "doprava"
  | "marketing"
  | "zdravotnictvo"
  | "skoly"
  | "strojova_vyroba"
  | "pneuservis"
  | "sme_ucto"
  | "horeca"
  | "servis"
  | "ziaci"
  | "studenti"
  | "seniori"
  | "vseobecny"
  // E37 Phase F (2026-05-21) — extended for DB-native packs. These four
  // values exist only on `public.platform_pack_metadata.industry`, never
  // on static `src/content/test-packs/*.ts` files. They stay in the TS
  // union for type-safety of INDUSTRY_LABEL lookups + filter chips.
  // Phase G will deduplicate when the static layer is removed.
  | "heslo_2fa"
  | "ai_deepfake"
  | "socialne_siete"
  | "rodicia";

/**
 * One industry test pack. Loaded statically as a TS module per
 * `src/content/test-packs/{slug}.ts` and registered in `index.ts`.
 *
 * `passingThreshold` is a DEFAULT SUGGESTION shown on the
 * `/test/firma/{slug}` flow — composer (E8.2) can override it
 * per-set when companies build their own configurations.
 */
export interface TestPack {
  slug: string;
  title: string;
  tagline: string;
  industry: Industry;
  industryEmoji: string;
  /** One-sentence persona blurb shown on the firma route. */
  targetPersona: string;
  /** Hand-curated question IDs from the bank (8–25 items). */
  questionIds: string[];
  /** Optional 0..1 — share of legit/honeypot questions if author wants higher. */
  honeypotRatio?: number;
  /** 0..100, default 70. DEFAULT SUGGESTION; composer can override. */
  passingThreshold: number;
  publishedAt: string;
  updatedAt: string;
  sources?: { label: string; url: string }[];
}

const SLUG_RE = /^[a-z0-9-]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

const industrySchema = z.enum([
  "eshop",
  "gastro",
  "autoservis",
  "it",
  "verejne_sluzby",
  "dispecing",
  "doprava",
  "marketing",
  "zdravotnictvo",
  "skoly",
  "strojova_vyroba",
  "pneuservis",
  "sme_ucto",
  "horeca",
  "servis",
  "ziaci",
  "studenti",
  "seniori",
  "vseobecny",
  "heslo_2fa",
  "ai_deepfake",
  "socialne_siete",
  "rodicia",
]);

export const testPackSchema: z.ZodType<TestPack> = z.object({
  slug: z.string().regex(SLUG_RE, "slug must match [a-z0-9-]+"),
  title: z.string().min(1),
  tagline: z.string().min(1),
  industry: industrySchema,
  industryEmoji: z.string().min(1),
  targetPersona: z.string().min(1),
  questionIds: z
    .array(z.string().min(1))
    .min(8, "pack must have at least 8 questions")
    .max(25, "pack manifest is capped at 25 questions"),
  honeypotRatio: z.number().min(0).max(1).optional(),
  passingThreshold: z.number().int().min(0).max(100),
  publishedAt: z.string().regex(ISO_DATE_RE),
  updatedAt: z.string().regex(ISO_DATE_RE),
  sources: z.array(z.object({ label: z.string().min(1), url: z.string().url() })).optional(),
});
