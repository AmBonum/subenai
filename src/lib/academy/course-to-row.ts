import type { Course, CourseCategory, CourseDifficulty } from "@/content/courses";
import { courseToMarkdown } from "@/lib/academy/course-to-markdown";

// E55.4 — pure mapping from a static course module to the `blog_posts` row
// that backs the unified academy (content_type = 'lesson'). The SQL generator
// resolves category_slug / author_slug to ids via subselects; everything else
// is a column value. Kept side-effect free so it can be golden-tested.

// Course taxonomy → existing blog_categories slugs (seeded in
// 20260520000000_blog_schema.sql). One stable mapping for all lessons.
const CATEGORY_SLUG: Record<CourseCategory, string> = {
  sms: "sms-a-telefon",
  email: "phishing-a-emaily",
  voice: "sms-a-telefon",
  marketplace: "fake-eshopy",
  investicie: "digitalna-bezpecnost",
  vztahy: "socialne-siete",
  data: "cyber-hygiena",
  obecne: "digitalna-bezpecnost",
};

const DIFFICULTY: Record<CourseDifficulty, "beginner" | "advanced"> = {
  začiatočník: "beginner",
  pokročilý: "advanced",
};

export const LESSON_AUTHOR_SLUG = "subenai-editorial";

export interface AcademyLessonRow {
  slug: string;
  language: "sk";
  category_slug: string;
  author_slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  body_mdx: string;
  content_type: "lesson";
  difficulty: "beginner" | "advanced";
  estimated_minutes: number;
  hero_emoji: string;
  reading_minutes: number;
  status: "published";
  published_at: string;
  sources: { label: string; url: string }[];
}

export function courseToAcademyRow(course: Course): AcademyLessonRow {
  return {
    slug: course.slug,
    language: "sk",
    category_slug: CATEGORY_SLUG[course.category],
    author_slug: LESSON_AUTHOR_SLUG,
    title: course.title,
    subtitle: course.tagline,
    excerpt: course.tagline,
    body_mdx: courseToMarkdown(course),
    content_type: "lesson",
    difficulty: DIFFICULTY[course.difficulty],
    estimated_minutes: course.estimatedMinutes,
    hero_emoji: course.heroEmoji,
    reading_minutes: course.estimatedMinutes,
    status: "published",
    published_at: course.publishedAt,
    sources: course.sources ?? [],
  };
}
