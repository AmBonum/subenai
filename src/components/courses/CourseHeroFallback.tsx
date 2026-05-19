import type { CourseCategory } from "@/content/courses";
import { visualForCourseCategory } from "@/lib/seo/course-visuals";

interface CourseHeroFallbackProps {
  category: CourseCategory;
  emoji: string;
  title: string;
  variant?: "card" | "featured";
  testid?: string;
}

// E25 Phase 2 — programmatic hero zone for CourseCard. Parallel to
// TestPackHeroFallback + BlogHeroFallback. Reuses the same gradient
// + radial-spotlight + hairline-texture treatment so the three
// catalog surfaces (/blog, /tests, /courses) feel like one design
// system.
//
// Difference from TestPackHeroFallback: maps over CourseCategory
// (8 values) instead of Industry (19 values) and uses the course's
// heroEmoji field as the pictogram.

export function CourseHeroFallback({
  category,
  emoji,
  title,
  variant = "card",
  testid,
}: CourseHeroFallbackProps) {
  const visual = visualForCourseCategory(category);
  const aspect = variant === "card" ? "aspect-video" : "aspect-[16/7]";
  const emojiSize = variant === "card" ? "text-6xl" : "text-7xl md:text-8xl";
  return (
    <div
      className={`relative w-full overflow-hidden rounded-t-2xl bg-gradient-to-br ${visual.gradientFrom} ${visual.gradientTo} ${aspect}`}
      data-testid={testid}
      role="img"
      aria-label={title}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 14px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.18) 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${emojiSize} drop-shadow-lg`} aria-hidden="true">
          {emoji}
        </span>
      </div>
    </div>
  );
}
