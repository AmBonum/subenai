// E25 Phase 1 — per-industry visual identity for test-pack cards.
//
// Modeled on src/lib/blog/category-visuals.ts (blog category palette
// system). Each industry maps to a stable two-stop Tailwind gradient
// used as the hero zone of a TestPackCard. The pack's industryEmoji
// renders centered over the gradient; the title + meta render below.
//
// Adding a new industry = add a row here + extend the `Industry`
// union in src/content/test-packs/_schema.ts. The fallback covers
// any new industry that hasn't been styled yet — no runtime crash,
// just a neutral gradient.

import type { Industry } from "@/content/test-packs";

export interface IndustryVisual {
  /** Tailwind `bg-gradient-to-br` from-* class. */
  gradientFrom: string;
  /** Tailwind `bg-gradient-to-br` to-* class. */
  gradientTo: string;
}

const DEFAULT_VISUAL: IndustryVisual = {
  gradientFrom: "from-slate-600/40",
  gradientTo: "to-slate-900/40",
};

export const INDUSTRY_VISUALS: Record<Industry, IndustryVisual> = {
  // Commerce + retail — energetic warm hues
  eshop: { gradientFrom: "from-blue-600/40", gradientTo: "to-indigo-800/40" },
  // Hospitality — warm food tones
  gastro: { gradientFrom: "from-orange-500/40", gradientTo: "to-red-700/40" },
  horeca: { gradientFrom: "from-amber-500/40", gradientTo: "to-orange-700/40" },
  // Automotive + industrial — neutral steel
  autoservis: { gradientFrom: "from-zinc-600/40", gradientTo: "to-slate-800/40" },
  pneuservis: { gradientFrom: "from-stone-600/40", gradientTo: "to-zinc-800/40" },
  strojova_vyroba: { gradientFrom: "from-gray-600/40", gradientTo: "to-slate-800/40" },
  servis: { gradientFrom: "from-slate-600/40", gradientTo: "to-gray-800/40" },
  // Technology — cool tech blues
  it: { gradientFrom: "from-cyan-500/40", gradientTo: "to-blue-800/40" },
  dispecing: { gradientFrom: "from-sky-500/40", gradientTo: "to-cyan-800/40" },
  // Public + civic — institutional greens
  verejne_sluzby: { gradientFrom: "from-emerald-500/40", gradientTo: "to-teal-800/40" },
  // Transit — yellow/amber motion
  doprava: { gradientFrom: "from-amber-500/40", gradientTo: "to-yellow-700/40" },
  // Marketing + creative — magenta/pink
  marketing: { gradientFrom: "from-pink-500/40", gradientTo: "to-fuchsia-800/40" },
  // Healthcare — medical rose
  zdravotnictvo: { gradientFrom: "from-rose-500/40", gradientTo: "to-red-800/40" },
  // Education — academic violet
  skoly: { gradientFrom: "from-violet-500/40", gradientTo: "to-purple-800/40" },
  // Finance + accounting — trustworthy blue
  sme_ucto: { gradientFrom: "from-blue-500/40", gradientTo: "to-sky-800/40" },
  // Persona-targeted packs — distinct from industry packs
  ziaci: { gradientFrom: "from-lime-500/40", gradientTo: "to-green-800/40" },
  studenti: { gradientFrom: "from-teal-500/40", gradientTo: "to-cyan-800/40" },
  seniori: { gradientFrom: "from-amber-500/40", gradientTo: "to-orange-700/40" },
  // Generic / cross-industry — brand palette
  vseobecny: { gradientFrom: "from-primary/40", gradientTo: "to-accent/40" },
};

export function visualForIndustry(industry: Industry): IndustryVisual {
  return INDUSTRY_VISUALS[industry] ?? DEFAULT_VISUAL;
}
