import type { APIRequestContext } from "@playwright/test";

/**
 * Environment guard for the E37 pack suites: the /tests catalog, the
 * /tests/$slug detail pages and the composer pack chips all read live
 * rows through `get_platform_packs()` — there is no mock layer for them
 * (see specs/test-packs/e37-db-backed-catalog.md, "Live preview deploy
 * needs the Phase B' migration applied + platform@subenai.sk Dashboard
 * user — without those the catalog is empty").
 *
 * When the configured Supabase project has zero published packs the
 * suites cannot meaningfully run; specs call this helper and skip with
 * a loud provisioning message instead of failing on empty grids.
 */

export const PACKS_SKIP_MESSAGE =
  "Skipping: get_platform_packs() returned 0 rows — the configured Supabase " +
  "project has no published platform packs. Apply the E37 Phase B'/D seed " +
  "(supabase/migrations/20260521280000_e37_platform_packs_unified.sql) and " +
  "create the platform@subenai.sk Dashboard user, then re-run.";

let cached: boolean | undefined;

export async function platformPacksAvailable(request: APIRequestContext): Promise<boolean> {
  if (cached !== undefined) return cached;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = false;
    return cached;
  }
  try {
    const res = await request.post(`${url}/rest/v1/rpc/get_platform_packs`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      data: {},
    });
    const rows: unknown = res.ok() ? await res.json() : [];
    cached = Array.isArray(rows) && rows.length > 0;
  } catch {
    cached = false;
  }
  return cached;
}
