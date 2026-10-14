import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { REAL_CASE_TEMPLATES } from "@/content/templates/real-cases";
import { QUESTIONS } from "@/lib/quiz/bank/questions";
import { buildTemplateSeedsSql, questionDbUuid } from "../../scripts/template-seeds-sql";

const ROOT = join(__dirname, "../..");
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");
const OWN_MIGRATION = "20261012120000_e66_real_case_templates.sql";

const seededSql = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql") && f !== OWN_MIGRATION)
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
  .join("\n");
const bankById = new Map(QUESTIONS.map((q) => [q.id, q]));

describe("E66.3 real-case templates", () => {
  it("has unique slugs", () => {
    const slugs = REAL_CASE_TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("fills exactly the 15 legacy catalogue rows by their seeded id + slug", () => {
    const legacySql = readFileSync(
      join(MIGRATIONS_DIR, "20260520210000_templates_v2_ownership.sql"),
      "utf8",
    );
    const legacy = REAL_CASE_TEMPLATES.filter((t) => t.legacyId);
    expect(legacy).toHaveLength(15);
    for (const t of legacy) {
      expect(legacySql).toContain(`'${t.legacyId}'`);
      expect(legacySql).toContain(`'${t.slug}'`);
    }
  });

  it.each(REAL_CASE_TEMPLATES.map((t) => [t.slug, t] as const))(
    "%s references 8–15 distinct, seeded bank questions of mixed difficulty",
    (_slug, t) => {
      expect(t.questionSlugs.length).toBeGreaterThanOrEqual(8);
      expect(t.questionSlugs.length).toBeLessThanOrEqual(15);
      expect(new Set(t.questionSlugs).size).toBe(t.questionSlugs.length);
      for (const slug of t.questionSlugs) {
        expect(bankById.has(slug), `${slug} missing from bank`).toBe(true);
        expect(seededSql, `${slug} not seeded by any migration`).toContain(questionDbUuid(slug));
      }
      const difficulties = new Set(t.questionSlugs.map((s) => bankById.get(s)?.difficulty));
      expect(difficulties.size).toBeGreaterThanOrEqual(2);
    },
  );

  it.each(REAL_CASE_TEMPLATES.map((t) => [t.slug, t] as const))(
    "%s cites at least one https source",
    (_slug, t) => {
      expect(t.sources.length).toBeGreaterThanOrEqual(1);
      expect(t.sources.length).toBeLessThanOrEqual(3);
      for (const s of t.sources) {
        expect(s.url.startsWith("https://")).toBe(true);
        expect(s.label.trim()).not.toBe("");
      }
    },
  );

  it("committed migration and DEPLOY_SETUP.sql match the generator output", () => {
    const sql = buildTemplateSeedsSql();
    expect(readFileSync(join(MIGRATIONS_DIR, OWN_MIGRATION), "utf8")).toBe(sql);
    expect(readFileSync(join(ROOT, "DEPLOY_SETUP.sql"), "utf8")).toContain(sql);
  });
});
