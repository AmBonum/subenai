import { z } from "zod";
import type { Visual } from "@/lib/quiz/bank/questions";
import type { AudioEmbed } from "@/lib/academy/audio-shortcode";

export type CourseCategory =
  | "sms"
  | "email"
  | "voice"
  | "marketplace"
  | "investicie"
  | "vztahy"
  | "data"
  | "obecne";

export type CourseDifficulty = "začiatočník" | "pokročilý";

export type CourseSection =
  | { kind: "intro"; heading: string; body: string }
  | { kind: "example"; heading: string; visual: Visual; commentary: string }
  | { kind: "checklist"; heading: string; items: { good: boolean; text: string }[] }
  | { kind: "redflags"; heading: string; flags: string[] }
  | { kind: "do_dont"; heading: string; do: string[]; dont: string[] }
  | { kind: "scenario"; heading: string; story: string; right_action: string }
  | { kind: "embed"; heading: string; audio: AudioEmbed };

/**
 * A single free course shown under /kurzy. Add new courses by creating
 * a module under `src/content/courses/<slug>.ts`, then registering in
 * `index.ts`. The schema is the single source of truth — see
 * `tasks/E5-course-authoring-guide.md` for the workflow.
 */
export interface Course {
  slug: string;
  title: string;
  tagline: string;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  estimatedMinutes: number;
  heroEmoji: string;
  sections: CourseSection[];
  sources?: { label: string; url: string }[];
  /** Quiz category that this course teaches against — used for cross-links from review. */
  relatedQuestionsCategory?: "phishing" | "url" | "fake_vs_real" | "scenario";
  publishedAt: string;
  updatedAt: string;
}

const SLUG_RE = /^[a-z0-9-]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

const courseCategorySchema = z.enum([
  "sms",
  "email",
  "voice",
  "marketplace",
  "investicie",
  "vztahy",
  "data",
  "obecne",
]);

const sectionSchema: z.ZodType<CourseSection> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("intro"), heading: z.string().min(1), body: z.string().min(1) }),
  z.object({
    kind: z.literal("example"),
    heading: z.string().min(1),
    visual: z.unknown() as z.ZodType<Visual>,
    commentary: z.string().min(1),
  }),
  z.object({
    kind: z.literal("checklist"),
    heading: z.string().min(1),
    items: z.array(z.object({ good: z.boolean(), text: z.string().min(1) })).min(1),
  }),
  z.object({
    kind: z.literal("redflags"),
    heading: z.string().min(1),
    flags: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    kind: z.literal("do_dont"),
    heading: z.string().min(1),
    do: z.array(z.string().min(1)).min(1),
    dont: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    kind: z.literal("scenario"),
    heading: z.string().min(1),
    story: z.string().min(1),
    right_action: z.string().min(1),
  }),
  z.object({
    kind: z.literal("embed"),
    heading: z.string().min(1),
    audio: z.object({
      provider: z.enum(["youtube", "external"]),
      url: z.string().min(1),
      title: z.string().min(1),
      sourceName: z.string().min(1),
      sourceUrl: z.string().url().optional(),
      description: z.string().optional(),
    }),
  }),
]);

export const courseSchema: z.ZodType<Course> = z.object({
  slug: z.string().regex(SLUG_RE, "slug must match [a-z0-9-]+"),
  title: z.string().min(1),
  tagline: z.string().min(1),
  category: courseCategorySchema,
  difficulty: z.enum(["začiatočník", "pokročilý"]),
  estimatedMinutes: z.number().int().positive(),
  heroEmoji: z.string().min(1),
  sections: z.array(sectionSchema).min(1),
  sources: z.array(z.object({ label: z.string().min(1), url: z.string().url() })).optional(),
  relatedQuestionsCategory: z.enum(["phishing", "url", "fake_vs_real", "scenario"]).optional(),
  publishedAt: z.string().regex(ISO_DATE_RE),
  updatedAt: z.string().regex(ISO_DATE_RE),
});
