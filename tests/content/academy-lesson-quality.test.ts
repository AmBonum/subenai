import { describe, it, expect } from "vitest";
import { COURSES } from "@/content/courses";
import { courseToMarkdown } from "@/lib/academy/course-to-markdown";
import { GLOSSARY } from "@/content/academy/glossary";

// E55.7 — content-quality gate over the generated lesson bodies (the exact
// Markdown users read at /academy/$slug). Deterministic guard rails that
// catch copyedit/conversion regressions a human pass might miss, and lock
// the editorial rules from the E55 spec in place for future courses.

// Strip the [[visual:…]] shortcodes (their base64 payload carries the
// deliberately-scammy mockup text, which is exempt from prose rules).
function prose(slug: string): string {
  const course = COURSES.find((c) => c.slug === slug)!;
  return courseToMarkdown(course).replace(/\[\[visual:b64:[A-Za-z0-9+/=]+\]\]/g, "");
}

// Core English-only terms whose first prose mention must carry a Slovak gloss
// (per the spec). Excludes terms with an established Slovak form the courses
// gloss instead (e.g. "ransomvér (vydieračský softvér…)") — a stem check
// can't equate the English/Slovak spellings, and the concept is already
// explained at first mention.
const MUST_GLOSS = ["phishing", "smishing", "vishing", "scam", "malvertising"];

describe("academy lesson quality gate", () => {
  it("no empty parentheses (broken gloss) in any lesson body", () => {
    for (const course of COURSES) {
      const body = prose(course.slug);
      expect(body.includes("()"), `${course.slug} has an empty ()`).toBe(false);
      expect(/\(\s+\)/.test(body), `${course.slug} has a whitespace-only ()`).toBe(false);
    }
  });

  it("no double-space or stray double punctuation from conversion", () => {
    for (const course of COURSES) {
      // Markdown bodies are single-spaced prose; the converter never emits
      // doubled spaces or ",," / ".." inside a line.
      const lines = prose(course.slug)
        .split("\n")
        .filter((l) => !l.startsWith("#"));
      for (const line of lines) {
        expect(/ {2,}\S/.test(line), `${course.slug}: double space in "${line.slice(0, 60)}"`).toBe(
          false,
        );
        expect(/[,;]{2,}|\.{4,}/.test(line), `${course.slug}: doubled punctuation`).toBe(false);
      }
    }
  });

  it("each core English term used outside a gloss is glossed at least once there", () => {
    for (const course of COURSES) {
      const body = prose(course.slug).toLowerCase();
      // A term that only ever appears INSIDE a parenthetical (e.g. "phishing"
      // within "vishing (phishing cez telefonát)") is explanatory, not a
      // standalone mention — strip parentheticals before deciding if it needs
      // its own gloss.
      const bare = body.replace(/\([^)]*\)/g, "");
      for (const term of MUST_GLOSS) {
        // Match the term as a stem so Slovak declension ("phishingu",
        // "scamu") still counts — both for presence and gloss detection.
        if (!new RegExp(`\\b${term}\\w*`).test(bare)) continue;
        // A glossed mention is "<term…> (" — the parenthetical Slovak note.
        const glossed = new RegExp(`\\b${term}\\w*[^\\n(]{0,4}\\(`).test(body);
        expect(glossed, `${course.slug}: "${term}" appears but is never glossed with "(…)"`).toBe(
          true,
        );
      }
    }
  });

  it("the glossary covers every MUST_GLOSS term", () => {
    for (const term of MUST_GLOSS) {
      expect(GLOSSARY[term], `glossary missing "${term}"`).toBeTruthy();
    }
  });
});
