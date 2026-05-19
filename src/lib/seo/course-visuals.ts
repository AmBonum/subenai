// E25 Phase 2 — per-CourseCategory visual identity.
//
// Parallel to industry-visuals.ts and blog/category-visuals.ts. The
// 8 course categories share a coherent palette language with the
// blog system so a reader who arrives from /blog and clicks a related
// course recognizes the visual continuity.

import type { CourseCategory } from "@/content/courses";

export interface CourseVisual {
  gradientFrom: string;
  gradientTo: string;
}

const DEFAULT_VISUAL: CourseVisual = {
  gradientFrom: "from-slate-600/40",
  gradientTo: "to-slate-900/40",
};

export const COURSE_VISUALS: Record<CourseCategory, CourseVisual> = {
  // SMS / telefón — orange/amber (matches blog "sms-a-telefon")
  sms: { gradientFrom: "from-orange-500/40", gradientTo: "to-amber-800/40" },
  // E-mail phishing — rose (matches blog "phishing-a-emaily")
  email: { gradientFrom: "from-rose-500/40", gradientTo: "to-rose-900/40" },
  // Vishing / voice — purple (voice-call distinctness from text-message orange)
  voice: { gradientFrom: "from-purple-500/40", gradientTo: "to-violet-900/40" },
  // Marketplace + fake e-shops — blue (commerce trust signal)
  marketplace: { gradientFrom: "from-blue-500/40", gradientTo: "to-indigo-900/40" },
  // Investment scams — yellow/gold (money association)
  investicie: { gradientFrom: "from-yellow-500/40", gradientTo: "to-amber-900/40" },
  // Romance / relationship scams — pink (relationship semantic)
  vztahy: { gradientFrom: "from-pink-500/40", gradientTo: "to-rose-900/40" },
  // Data + privacy — emerald (privacy / shield association)
  data: { gradientFrom: "from-emerald-500/40", gradientTo: "to-teal-900/40" },
  // Generic / cross-topic — brand palette
  obecne: { gradientFrom: "from-primary/40", gradientTo: "to-accent/40" },
};

export function visualForCourseCategory(category: CourseCategory): CourseVisual {
  return COURSE_VISUALS[category] ?? DEFAULT_VISUAL;
}
