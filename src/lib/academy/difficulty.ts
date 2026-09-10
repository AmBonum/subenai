import type { AcademyContentType } from "@/lib/academy/queries";

// E65 — Slovak labels for blog_posts.difficulty. Lessons read it as a skill
// level; articles read it as the audience lane of the safe-AI section.
export type AcademyDifficulty = "beginner" | "advanced";

export const LESSON_DIFFICULTY_LABELS: Record<AcademyDifficulty, string> = {
  beginner: "začiatočník",
  advanced: "pokročilý",
};

export const LANE_LABELS: Record<AcademyDifficulty, string> = {
  beginner: "pre každého",
  advanced: "pre odborníkov",
};

export function isAcademyDifficulty(value: string | null | undefined): value is AcademyDifficulty {
  return value === "beginner" || value === "advanced";
}

export function difficultyLabel(
  contentType: AcademyContentType,
  difficulty: string | null | undefined,
): string | null {
  if (!isAcademyDifficulty(difficulty)) return null;
  return contentType === "lesson" ? LESSON_DIFFICULTY_LABELS[difficulty] : LANE_LABELS[difficulty];
}
