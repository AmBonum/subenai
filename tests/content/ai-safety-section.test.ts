import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import matter from "gray-matter";

import { AI_SAFETY_BACKFILL_PATH, buildAiSafetyBackfillSql } from "@/lib/blog/ai-safety-backfill";

import {
  AI_SAFETY_ARTICLES,
  AI_SAFETY_CATEGORY_SLUG,
  AI_SAFETY_LESSON_SLUGS,
  AI_SAFETY_PILLAR_SLUG,
  AI_SAFETY_QUIZ_IDS,
} from "@/content/academy/ai-safety-section";
import { COURSES } from "@/content/courses";
import { courseToAcademyRow } from "@/lib/academy/course-to-row";
import { CATEGORY_VISUALS } from "@/lib/blog/category-visuals";
import { PILLAR_SLUGS } from "@/lib/blog/pillar-slugs";
import { getQuestionById } from "@/lib/quiz/bank/questions";

// E65 — the safe-AI section is wired across content, DB seed, SEO and UI
// layers. This suite is the single tripwire that all of them agree.

const ROOT = resolve(__dirname, "..", "..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("E65 ai-safety section manifest", () => {
  it("has one pillar, five beginner and five advanced articles", () => {
    const pillar = AI_SAFETY_ARTICLES.filter((a) => a.lane === null);
    expect(pillar.map((a) => a.slug)).toEqual([AI_SAFETY_PILLAR_SLUG]);
    expect(AI_SAFETY_ARTICLES.filter((a) => a.lane === "beginner")).toHaveLength(5);
    expect(AI_SAFETY_ARTICLES.filter((a) => a.lane === "advanced")).toHaveLength(5);
  });

  it("quiz ids are unique and e65-prefixed", () => {
    expect(new Set(AI_SAFETY_QUIZ_IDS).size).toBe(AI_SAFETY_QUIZ_IDS.length);
    for (const id of AI_SAFETY_QUIZ_IDS) expect(id).toMatch(/^e65-[a-z0-9-]+-\d+$/);
  });

  it("every manifest quiz id resolves in the question bank", () => {
    for (const id of AI_SAFETY_QUIZ_IDS) expect(getQuestionById(id), id).not.toBeNull();
  });

  it("every section lesson is a registered course mapped into the section category", () => {
    for (const slug of AI_SAFETY_LESSON_SLUGS) {
      const course = COURSES.find((c) => c.slug === slug);
      expect(course, slug).toBeDefined();
      expect(courseToAcademyRow(course!).category_slug).toBe(AI_SAFETY_CATEGORY_SLUG);
    }
  });
});

describe("E65 category wiring", () => {
  it("category row exists in the migration and the DEPLOY_SETUP mirror", () => {
    expect(read("supabase/migrations/20260910100000_blog_category_ai_safety.sql")).toContain(
      `('${AI_SAFETY_CATEGORY_SLUG}'`,
    );
    expect(read("DEPLOY_SETUP.sql")).toContain(`('${AI_SAFETY_CATEGORY_SLUG}'`);
  });

  it("category has a visual + illustration and is in the sitemap generator", () => {
    expect(CATEGORY_VISUALS[AI_SAFETY_CATEGORY_SLUG]).toBeDefined();
    expect(read("src/components/blog/CategoryIllustration.tsx")).toContain(
      `"${AI_SAFETY_CATEGORY_SLUG}":`,
    );
    expect(read("scripts/generate-sitemap.mjs")).toContain(`"${AI_SAFETY_CATEGORY_SLUG}"`);
  });

  it("pillar is registered in both PILLAR_SLUGS lists", () => {
    expect(PILLAR_SLUGS.has(AI_SAFETY_PILLAR_SLUG)).toBe(true);
    expect(read("scripts/generate-sitemap.mjs")).toContain(`"${AI_SAFETY_PILLAR_SLUG}"`);
  });
});

// Voice-guide §5 banned phrases + the locked product/brand terms. "revolučn"
// is a stem so both "revolučný" and "revolucionizovať" declensions match.
const BANNED = [
  "v dnešnej dobe",
  "v digitálnom svete",
  "v ére internetu",
  "moderný človek",
  "v 21. storočí",
  "v dnešnom uponáhľanom svete",
  "netreba zdôrazňovať",
  "každý z nás vie",
  "v neposlednom rade",
  "prelomová technológia",
  "revolučn",
  "vykrojené na mieru",
  "v rámci možností",
  "je nutné podotknúť",
  "je dôležité si uvedomiť",
  "je viac než zrejmé",
  "kvíz",
  "SubenAI",
  "Subenai",
];

const BLOG_DIR = resolve(ROOT, "src/content/blog");
const KNOWN_SLUGS = new Set([
  ...readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, "")),
  ...COURSES.map((c) => c.slug),
]);

function loadArticle(slug: string) {
  const { data, content } = matter(read(`src/content/blog/${slug}.mdx`));
  const body = content.trim();
  return { data: data as Record<string, unknown>, body, words: body.split(/\s+/).length };
}

describe("E65 article integrity", () => {
  const articles = AI_SAFETY_ARTICLES.map((a) => ({ ...a, ...loadArticle(a.slug) }));

  it("frontmatter matches the manifest (category, lane, pillar flag, course)", () => {
    for (const a of articles) {
      expect(a.data.category_slug, a.slug).toBe(AI_SAFETY_CATEGORY_SLUG);
      expect(a.data.difficulty ?? null, a.slug).toBe(a.lane);
      expect(a.data.pillar === true, a.slug).toBe(a.slug === AI_SAFETY_PILLAR_SLUG);
      expect(AI_SAFETY_LESSON_SLUGS as readonly string[], a.slug).toContain(
        a.data.related_course_slug,
      );
    }
  });

  it("word bands and source minimums", () => {
    for (const a of articles) {
      const [min, max, srcMin] = a.lane === null ? [2200, 3000, 6] : [1100, 1800, 4];
      expect(a.words, `${a.slug}: ${a.words} words`).toBeGreaterThanOrEqual(min);
      expect(a.words, `${a.slug}: ${a.words} words`).toBeLessThanOrEqual(max);
      expect((a.data.sources as unknown[]).length, a.slug).toBeGreaterThanOrEqual(srcMin);
    }
  });

  it("house style: no banned phrases, no legacy /blog or /courses links", () => {
    for (const a of articles) {
      const text = `${a.data.title} ${a.data.excerpt} ${a.body}`;
      for (const phrase of BANNED) {
        expect(text.includes(phrase), `${a.slug}: "${phrase}"`).toBe(false);
      }
      expect(a.body.includes("](/blog/"), a.slug).toBe(false);
      expect(a.body.includes("](/courses/"), a.slug).toBe(false);
    }
  });

  it("beginner lane never says útočník", () => {
    for (const a of articles.filter((x) => x.lane === "beginner")) {
      expect(/útočník/i.test(a.body), a.slug).toBe(false);
    }
  });

  it("every internal /academy link resolves to an existing article or lesson", () => {
    for (const a of articles) {
      for (const m of a.body.matchAll(/\]\(\/academy\/([a-z0-9-]+)\)/g)) {
        expect(KNOWN_SLUGS.has(m[1]), `${a.slug} → ${m[1]}`).toBe(true);
      }
    }
  });

  it("clusters link to the pillar and the pillar links to every cluster + lesson", () => {
    const pillar = articles.find((a) => a.slug === AI_SAFETY_PILLAR_SLUG)!;
    for (const a of articles.filter((x) => x.lane !== null)) {
      expect(a.body.includes(`](/academy/${AI_SAFETY_PILLAR_SLUG})`), a.slug).toBe(true);
      expect(pillar.body.includes(`](/academy/${a.slug})`), `pillar → ${a.slug}`).toBe(true);
    }
    for (const slug of AI_SAFETY_LESSON_SLUGS) {
      expect(pillar.body.includes(`](/academy/${slug})`), `pillar → ${slug}`).toBe(true);
    }
  });

  it("each manifest quiz id is embedded exactly once and every embedded id resolves", () => {
    for (const a of articles) {
      const embedded = [...a.body.matchAll(/^\[\[quiz:([a-z0-9_-]+)\]\]\s*$/gim)].map((m) => m[1]);
      expect([...embedded].sort(), a.slug).toEqual([...a.quizIds].sort());
      for (const id of embedded) expect(getQuestionById(id), `${a.slug}: ${id}`).not.toBeNull();
    }
  });

  it("ends with the test CTA", () => {
    for (const a of articles) expect(a.body.trimEnd().endsWith("`/test`"), a.slug).toBe(true);
  });
});

describe("E65 backfill SQL", () => {
  const SQL_PATH = AI_SAFETY_BACKFILL_PATH;

  it("carries every manifest article, pillar first", () => {
    const sql = read(SQL_PATH);
    const positions = AI_SAFETY_ARTICLES.map((a) => sql.indexOf(`$slug$${a.slug}$slug$`));
    for (const [i, pos] of positions.entries()) {
      expect(pos, AI_SAFETY_ARTICLES[i].slug).toBeGreaterThan(-1);
    }
    expect(positions[0]).toBeLessThan(Math.min(...positions.slice(1)));
  });

  it("is byte-identical to a fresh in-memory generation", () => {
    expect(buildAiSafetyBackfillSql(ROOT)).toBe(read(SQL_PATH));
  });
});
