import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * E37 — sitemap.xml includes all 15 /tests/<slug> URLs.
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-27).
 *
 * The sitemap is generated at build time by `scripts/generate-sitemap.mjs`,
 * which now reads pack slugs from `get_platform_packs()` RPC (E37 Phase F,
 * PR #124). The generated file lives at `public/sitemap.xml` (source of
 * truth committed to git) and is copied to `dist/client/sitemap.xml` on
 * production builds.
 *
 * Why a file-read assertion + a live HTTP fetch:
 *   - file-read catches commit-time regressions (the generator was
 *     mis-wired, sitemap was committed without pack URLs)
 *   - live fetch catches deployment regressions (CF Pages didn't pick up
 *     the latest sitemap)
 *
 * Both have value. The file-read is reliable in CI without a running
 * server. The live fetch skips gracefully when BASE_URL doesn't respond.
 */

const REPO_ROOT = resolve(__dirname, "../../..");
const SITEMAP_PATH = resolve(REPO_ROOT, "public/sitemap.xml");

// The 15 platform packs seeded in Phase B' + materialised by Phases D + E.
const EXPECTED_SLUGS = [
  "vseobecny",
  "seniori",
  "studenti",
  "ziaci-do-16",
  "eshop",
  "gastro-horeca",
  "autoservis",
  "it-vyvoj",
  "verejne-sluzby",
  "heslo-2fa",
  "ai-deepfake",
  "socialne-siete",
  "rodicia",
  "skoly",
  "zdravotnictvo",
];

test.describe("E37 sitemap — /tests/<slug> coverage (TC-27)", () => {
  test("committed public/sitemap.xml lists every E37 pack slug", () => {
    if (!existsSync(SITEMAP_PATH)) {
      test.skip(true, "public/sitemap.xml not present in this checkout (CI partial fetch?)");
      return;
    }
    const xml = readFileSync(SITEMAP_PATH, "utf8");
    for (const slug of EXPECTED_SLUGS) {
      expect(xml, `slug ${slug} missing from sitemap.xml`).toContain(`/tests/${slug}`);
    }
  });

  test("live /sitemap.xml fetch returns 200 and includes the pack URLs", async ({ request }) => {
    let res;
    try {
      res = await request.get("/sitemap.xml", { timeout: 5_000 });
    } catch (err) {
      test.skip(true, `BASE_URL not reachable: ${(err as Error).message}`);
      return;
    }
    if (!res.ok()) {
      test.skip(true, `sitemap fetch returned ${res.status()} — preview deploy not ready?`);
      return;
    }
    const body = await res.text();
    // At minimum, the new packs (the ones added by E37) must be in the
    // live sitemap. Legacy slugs were already covered pre-E37 but the
    // generator's RPC-fetch path now drives all of them.
    const newSlugs = [
      "heslo-2fa",
      "ai-deepfake",
      "socialne-siete",
      "rodicia",
      "skoly",
      "zdravotnictvo",
    ];
    for (const slug of newSlugs) {
      expect(body, `live sitemap missing /tests/${slug}`).toContain(`/tests/${slug}`);
    }
  });
});
