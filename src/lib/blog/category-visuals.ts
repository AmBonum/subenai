// E16.4 — per-category visual identity (gradient + accent + icon glyph).
//
// Each of the 15 blog categories (seeded in
// supabase/migrations/20260520000000_blog_schema.sql) gets a stable
// visual fingerprint:
//   • gradient   — Tailwind `bg-gradient-to-br` end-points used as hero
//                  fallback when blog_posts.hero_image_url IS NULL
//   • accent     — single Tailwind color used for category badge ring
//                  + chip highlight on the index page
//   • glyph      — single-character emoji-like SVG path, rendered by
//                  <CategoryGlyph slug=...> as a decorative motif
//
// Centralised here so /blog index, category archives, article pages,
// related-articles cards, and breadcrumbs all read the same source.
// Adding a new category = add a row here AND seed the slug in the
// migration.

export interface CategoryVisual {
  // Two Tailwind color names used in a `from-* to-*` linear gradient.
  // Keep within Tailwind's default palette so v4 JIT picks them up.
  gradientFrom: string;
  gradientTo: string;
  // Hex used inline (Tailwind v4 JIT inside arbitrary values would
  // require listing every shade; an inline color keeps things robust).
  accentHex: string;
  // Emoji used as a lightweight pictogram. Avoids shipping SVG assets
  // while still giving each category a recognizable signature.
  glyph: string;
  // Slovak short label (the DB row holds the long name).
  shortLabel: string;
}

const DEFAULT_VISUAL: CategoryVisual = {
  gradientFrom: "from-slate-700",
  gradientTo: "to-slate-900",
  accentHex: "#64748b",
  glyph: "🛡",
  shortLabel: "ostatné",
};

export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  "phishing-a-emaily": {
    gradientFrom: "from-rose-600",
    gradientTo: "to-rose-900",
    accentHex: "#e11d48",
    glyph: "🎣",
    shortLabel: "phishing",
  },
  "sms-a-telefon": {
    gradientFrom: "from-orange-500",
    gradientTo: "to-red-800",
    accentHex: "#ea580c",
    glyph: "📱",
    shortLabel: "sms & telefón",
  },
  "fake-eshopy": {
    gradientFrom: "from-amber-500",
    gradientTo: "to-orange-800",
    accentHex: "#f59e0b",
    glyph: "🛒",
    shortLabel: "fake e-shopy",
  },
  "socialne-siete": {
    gradientFrom: "from-fuchsia-600",
    gradientTo: "to-purple-900",
    accentHex: "#c026d3",
    glyph: "💬",
    shortLabel: "sociálne siete",
  },
  "ai-scamy": {
    gradientFrom: "from-cyan-500",
    gradientTo: "to-blue-900",
    accentHex: "#0891b2",
    glyph: "🤖",
    shortLabel: "ai scamy",
  },
  "digitalna-bezpecnost": {
    gradientFrom: "from-emerald-500",
    gradientTo: "to-teal-900",
    accentHex: "#059669",
    glyph: "🔐",
    shortLabel: "digitálna bezpečnosť",
  },
  kvizy: {
    gradientFrom: "from-violet-500",
    gradientTo: "to-indigo-900",
    accentHex: "#7c3aed",
    glyph: "🧠",
    shortLabel: "testy",
  },
  pribehy: {
    gradientFrom: "from-pink-500",
    gradientTo: "to-rose-900",
    accentHex: "#ec4899",
    glyph: "📖",
    shortLabel: "príbehy",
  },
  "rodicia-a-seniori": {
    gradientFrom: "from-sky-500",
    gradientTo: "to-blue-900",
    accentHex: "#0284c7",
    glyph: "👨‍👩‍👧",
    shortLabel: "rodičia & seniori",
  },
  psychologia: {
    gradientFrom: "from-purple-500",
    gradientTo: "to-indigo-900",
    accentHex: "#9333ea",
    glyph: "🧩",
    shortLabel: "psychológia",
  },
  "bezpecne-nakupovanie": {
    gradientFrom: "from-lime-500",
    gradientTo: "to-green-900",
    accentHex: "#65a30d",
    glyph: "💳",
    shortLabel: "nakupovanie",
  },
  "cyber-hygiena": {
    gradientFrom: "from-teal-500",
    gradientTo: "to-cyan-900",
    accentHex: "#0d9488",
    glyph: "🧼",
    shortLabel: "cyber hygiena",
  },
  "tech-explainers": {
    gradientFrom: "from-indigo-500",
    gradientTo: "to-blue-900",
    accentHex: "#4f46e5",
    glyph: "⚙️",
    shortLabel: "tech",
  },
  "news-a-trendy": {
    gradientFrom: "from-red-500",
    gradientTo: "to-rose-900",
    accentHex: "#dc2626",
    glyph: "📰",
    shortLabel: "novinky",
  },
  studenti: {
    gradientFrom: "from-yellow-500",
    gradientTo: "to-amber-900",
    accentHex: "#eab308",
    glyph: "🎓",
    shortLabel: "študenti",
  },
};

export function visualForCategory(slug: string): CategoryVisual {
  return CATEGORY_VISUALS[slug] ?? DEFAULT_VISUAL;
}
