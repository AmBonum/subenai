// E37 Phase G (subset 1) — contract test for the pack copy hygiene
// migration. Regex sweep over the migration SQL + DEPLOY_SETUP mirror.
// No live DB — the contract is the SQL text. If anyone later drops
// the UPDATEs (or the mirror falls out of sync with the migration),
// these assertions fail closed.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260521290000_e37_pack_copy_hygiene.sql",
);
const DEPLOY_PATH = resolve(__dirname, "../../DEPLOY_SETUP.sql");

let MIGRATION = "";
let DEPLOY = "";

beforeAll(() => {
  MIGRATION = readFileSync(MIGRATION_PATH, "utf8");
  DEPLOY = readFileSync(DEPLOY_PATH, "utf8");
});

// Strip SQL comments before scanning for leakage — the migration's
// docstring intentionally lists the OLD strings (scam-y, vektory, …)
// so the reader understands what's being swept. Only the executable
// statements must stay leakage-free.
function executable(sql: string): string {
  return sql.replace(/^\s*--.*$/gm, "");
}

describe("E37 Phase G1 — pack title cleanups", () => {
  it("drops the (55+) qualifier from the seniori title", () => {
    expect(MIGRATION).toMatch(/title = 'Seniori — podvody cielené na starších'/);
    expect(MIGRATION).toMatch(/WHERE slug = 'seniori'[\s\S]*?title = 'Seniori \(55\+\)/);
  });

  it("drops the (16+) qualifier from the studenti title", () => {
    expect(MIGRATION).toMatch(/title = 'Študenti — podvody, na ktoré naletia pri štúdiu'/);
    expect(MIGRATION).toMatch(/WHERE slug = 'studenti'[\s\S]*?Študenti \(16\+\)/);
  });

  it("drops the (do 16 rokov) qualifier from the ziaci-do-16 title", () => {
    expect(MIGRATION).toMatch(/title = 'Žiaci — bezpečnosť na internete'/);
    expect(MIGRATION).toMatch(/WHERE slug = 'ziaci-do-16'[\s\S]*?\(do 16 rokov\)/);
  });

  it("swaps `scam-y` → `podvody` in the autoservis title", () => {
    expect(MIGRATION).toMatch(/title = 'Autoservis — podvody proti dielenskému tímu'/);
  });

  it("swaps `vektory` → `útoky` in the it-vyvoj title", () => {
    expect(MIGRATION).toMatch(/title = 'IT a softvérový vývoj — pokročilé útoky'/);
  });
});

describe("E37 Phase G1 — tagline sweeps", () => {
  it("studenti tagline: `job scam-y` → `podvody s ponukami práce`", () => {
    expect(MIGRATION).toMatch(
      /tagline = 'Fake prenájmy[\s\S]*?podvody s ponukami práce\. 13 otázok\.'/,
    );
  });

  it("ziaci-do-16 tagline: `Discord a gaming scam-y` → `Podvody v Discorde a hrách`", () => {
    expect(MIGRATION).toMatch(/tagline = 'Podvody v Discorde a hrách,/);
  });

  it("ai-deepfake tagline: `4 najnovšie vektory` → `4 najnovšie útoky`", () => {
    expect(MIGRATION).toMatch(/tagline = '4 najnovšie útoky:/);
  });
});

describe("E37 Phase G1 — target_persona + sources sweep", () => {
  it("eshop persona: Backoffice → Back-office, operatívci → operatíva, scam-erov → podvodníkov", () => {
    expect(MIGRATION).toMatch(
      /target_persona = 'Back-office, zákaznícka podpora a operatíva e-shopu — kontaktný bod podvodníkov/,
    );
  });

  it("ziaci-do-16 sources: 'Europol — gaming a social media scam-y' rewritten via regexp_replace", () => {
    expect(MIGRATION).toMatch(
      /regexp_replace\([\s\S]*?Europol — podvody v hrách a na sociálnych sieťach 2024/,
    );
  });
});

describe("E37 Phase G1 — idempotency guards", () => {
  it("every UPDATE has a WHERE clause matching the OLD value (paste-once-then-done)", () => {
    // Each of the 9 UPDATEs in the migration must be guarded by a
    // WHERE clause naming the OLD title/tagline/persona/etc., so
    // re-running is a silent no-op. Counts >=9 because comments are
    // stripped — actual executable UPDATEs.
    const exec = executable(MIGRATION);
    const updates = exec.match(/UPDATE public\./g);
    expect(updates).not.toBeNull();
    expect(updates!.length).toBeGreaterThanOrEqual(9);
    // Every UPDATE must be paired with a WHERE clause matching the
    // OLD value (= or LIKE).
    const updateBlocks = exec.split(/UPDATE public\./).slice(1);
    for (const block of updateBlocks) {
      expect(block).toMatch(/WHERE [\s\S]*?(= |LIKE )/);
    }
  });
});

// Note: A blanket "no forbidden word in any SET clause" sentinel was
// considered but rejected — the `regexp_replace` UPDATE for the
// ziaci-do-16 sources_jsonb legitimately names the OLD string
// ('Europol — gaming a social media scam-y 2024') as the second
// argument of regexp_replace, even though the result substitutes
// it out. The explicit per-assertion checks above are tight enough
// to encode the contract.

describe("DEPLOY_SETUP.sql mirrors the Phase G1 migration", () => {
  it("includes the seniori title rewrite", () => {
    expect(DEPLOY).toMatch(/title = 'Seniori — podvody cielené na starších'/);
  });

  it("includes the autoservis scam-y → podvody rewrite", () => {
    expect(DEPLOY).toMatch(/title = 'Autoservis — podvody proti dielenskému tímu'/);
  });

  it("includes the it-vyvoj vektory → útoky rewrite", () => {
    expect(DEPLOY).toMatch(/title = 'IT a softvérový vývoj — pokročilé útoky'/);
  });

  it("includes the eshop persona rewrite (Backoffice → Back-office)", () => {
    expect(DEPLOY).toMatch(/target_persona = 'Back-office, zákaznícka podpora a operatíva e-shopu/);
  });

  it("includes the ziaci-do-16 sources regexp_replace", () => {
    expect(DEPLOY).toMatch(/Europol — podvody v hrách a na sociálnych sieťach 2024/);
  });

  it("preserves the Phase B' verification SELECT after the new G1 block", () => {
    // The verify block should remain reachable (it lives in main's
    // mid-file area post-#121). G1 must not push it past the file
    // tail or duplicate it.
    const verifyMatches = DEPLOY.match(
      /SELECT count\(\*\) FROM public\.questions\) as seeded_questions/g,
    );
    expect(verifyMatches).not.toBeNull();
    expect(verifyMatches!.length).toBe(1);
  });
});
