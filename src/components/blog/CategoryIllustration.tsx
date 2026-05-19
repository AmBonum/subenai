import type { ReactElement } from "react";

// E16.4 — Per-category SVG illustrations used as the centerpiece of
// the BlogHeroFallback (gradient placeholder for posts without a
// hero_image_url).
//
// Design system contract — every illustration MUST follow:
//   • viewBox 0 0 200 200 (square; rendered up to ~640×360 in banner)
//   • Lines are stroke="currentColor" stroke-width="2.5" with
//     stroke-linecap/linejoin="round"
//   • Fills are currentColor with fillOpacity 0.08–0.18 (layered
//     surfaces for depth without printing through the gradient)
//   • Negative space is left for breathing room; no edge-to-edge
//     compositions
//   • One clear focal shape + one supporting decoration
//
// The hero passes `color="white"` so currentColor resolves to white on
// the dark category gradient. Override is allowed for future contexts
// (light-themed pages, admin previews, etc).

interface CategoryIllustrationProps {
  slug: string;
  className?: string;
  testid?: string;
}

const COMMON_PROPS = {
  viewBox: "0 0 200 200",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  xmlns: "http://www.w3.org/2000/svg",
};

// 1. Phishing — envelope with a fishing hook piercing it.
function PhishingIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <rect x="38" y="78" width="124" height="80" rx="6" fill="currentColor" fillOpacity={0.12} />
      <rect x="38" y="78" width="124" height="80" rx="6" />
      <path d="M38 86 L100 130 L162 86" />
      <path d="M100 22 L100 90" />
      <path d="M100 90 Q100 110 118 110 Q132 110 132 96" strokeWidth={3} />
      <circle cx="100" cy="22" r="5" fill="currentColor" />
    </svg>
  );
}

// 2. SMS & phone — handset with a warning bubble.
function SmsIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <rect x="58" y="36" width="84" height="140" rx="14" fill="currentColor" fillOpacity={0.1} />
      <rect x="58" y="36" width="84" height="140" rx="14" />
      <line x1="86" y1="48" x2="114" y2="48" />
      <circle cx="100" cy="164" r="3.5" fill="currentColor" />
      <rect x="22" y="74" width="76" height="48" rx="10" fill="currentColor" fillOpacity={0.18} />
      <rect x="22" y="74" width="76" height="48" rx="10" />
      <path d="M30 122 L42 134 L42 122" fill="currentColor" fillOpacity={0.18} />
      <line x1="60" y1="92" x2="60" y2="100" strokeWidth={3.5} />
      <circle cx="60" cy="108" r="2" fill="currentColor" />
    </svg>
  );
}

// 3. Fake e-shops — shopping cart crossed with a warning slash.
function EshopIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <path d="M30 50 L52 50 L70 130 L150 130 L168 70 L66 70" />
      <circle cx="78" cy="154" r="9" fill="currentColor" fillOpacity={0.12} />
      <circle cx="78" cy="154" r="9" />
      <circle cx="138" cy="154" r="9" fill="currentColor" fillOpacity={0.12} />
      <circle cx="138" cy="154" r="9" />
      <line x1="38" y1="42" x2="166" y2="170" strokeWidth={4} />
    </svg>
  );
}

// 4. Social networks — overlapping speech bubbles.
function SocialIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <path
        d="M30 70 Q30 50 50 50 L110 50 Q130 50 130 70 L130 100 Q130 120 110 120 L70 120 L50 138 L52 120 Q30 120 30 100 Z"
        fill="currentColor"
        fillOpacity={0.1}
      />
      <path d="M30 70 Q30 50 50 50 L110 50 Q130 50 130 70 L130 100 Q130 120 110 120 L70 120 L50 138 L52 120 Q30 120 30 100 Z" />
      <path
        d="M80 110 Q80 90 100 90 L150 90 Q170 90 170 110 L170 140 Q170 160 150 160 L130 160 L148 178 L122 160 Q80 160 80 140 Z"
        fill="currentColor"
        fillOpacity={0.18}
      />
      <path d="M80 110 Q80 90 100 90 L150 90 Q170 90 170 110 L170 140 Q170 160 150 160 L130 160 L148 178 L122 160 Q80 160 80 140 Z" />
    </svg>
  );
}

// 5. AI scamy — abstract neural net nodes + connections.
function AiIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      {/* input layer */}
      <line x1="40" y1="60" x2="100" y2="50" />
      <line x1="40" y1="60" x2="100" y2="100" />
      <line x1="40" y1="100" x2="100" y2="50" />
      <line x1="40" y1="100" x2="100" y2="100" />
      <line x1="40" y1="100" x2="100" y2="150" />
      <line x1="40" y1="140" x2="100" y2="100" />
      <line x1="40" y1="140" x2="100" y2="150" />
      {/* hidden -> output */}
      <line x1="100" y1="50" x2="160" y2="100" />
      <line x1="100" y1="100" x2="160" y2="100" />
      <line x1="100" y1="150" x2="160" y2="100" />
      {/* nodes */}
      <circle cx="40" cy="60" r="9" fill="currentColor" fillOpacity={0.18} />
      <circle cx="40" cy="100" r="9" fill="currentColor" fillOpacity={0.18} />
      <circle cx="40" cy="140" r="9" fill="currentColor" fillOpacity={0.18} />
      <circle cx="40" cy="60" r="9" />
      <circle cx="40" cy="100" r="9" />
      <circle cx="40" cy="140" r="9" />
      <circle cx="100" cy="50" r="9" fill="currentColor" fillOpacity={0.18} />
      <circle cx="100" cy="100" r="9" fill="currentColor" fillOpacity={0.18} />
      <circle cx="100" cy="150" r="9" fill="currentColor" fillOpacity={0.18} />
      <circle cx="100" cy="50" r="9" />
      <circle cx="100" cy="100" r="9" />
      <circle cx="100" cy="150" r="9" />
      <circle cx="160" cy="100" r="11" fill="currentColor" fillOpacity={0.25} />
      <circle cx="160" cy="100" r="11" />
    </svg>
  );
}

// 6. Digital security — shield containing a padlock.
function SecurityIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <path
        d="M100 22 L162 50 L162 100 Q162 150 100 178 Q38 150 38 100 L38 50 Z"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <path d="M100 22 L162 50 L162 100 Q162 150 100 178 Q38 150 38 100 L38 50 Z" />
      <rect x="78" y="92" width="44" height="40" rx="4" fill="currentColor" fillOpacity={0.2} />
      <rect x="78" y="92" width="44" height="40" rx="4" />
      <path d="M86 92 L86 76 Q86 62 100 62 Q114 62 114 76 L114 92" />
      <circle cx="100" cy="110" r="3.5" fill="currentColor" />
      <line x1="100" y1="113" x2="100" y2="122" strokeWidth={3} />
    </svg>
  );
}

// 7. Quizzes — brain or thinking circuit.
function QuizIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <path
        d="M70 50 Q40 50 40 80 Q30 90 40 110 Q40 140 70 140 Q80 160 100 150 Q120 160 130 140 Q160 140 160 110 Q170 90 160 80 Q160 50 130 50 Q120 36 100 44 Q80 36 70 50 Z"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <path d="M70 50 Q40 50 40 80 Q30 90 40 110 Q40 140 70 140 Q80 160 100 150 Q120 160 130 140 Q160 140 160 110 Q170 90 160 80 Q160 50 130 50 Q120 36 100 44 Q80 36 70 50 Z" />
      <line x1="100" y1="50" x2="100" y2="150" />
      <path d="M75 80 Q90 92 100 80" />
      <path d="M100 80 Q110 92 125 80" />
      <path d="M70 110 Q88 122 100 110" />
      <path d="M100 110 Q112 122 130 110" />
    </svg>
  );
}

// 8. Stories — open book with marker.
function StoryIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <path
        d="M30 60 L30 150 L100 140 L170 150 L170 60 L100 50 Z"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <path d="M30 60 L30 150 L100 140 L170 150 L170 60 L100 50 Z" />
      <line x1="100" y1="50" x2="100" y2="140" />
      <line x1="50" y1="80" x2="86" y2="78" />
      <line x1="50" y1="100" x2="86" y2="98" />
      <line x1="50" y1="118" x2="80" y2="116" />
      <line x1="114" y1="78" x2="150" y2="80" />
      <line x1="114" y1="98" x2="150" y2="100" />
      <line x1="114" y1="116" x2="144" y2="118" />
    </svg>
  );
}

// 9. Parents & seniors — two stylised figures.
function FamilyIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <circle cx="74" cy="62" r="14" fill="currentColor" fillOpacity={0.18} />
      <circle cx="74" cy="62" r="14" />
      <path d="M50 158 Q50 110 74 110 Q98 110 98 158" fill="currentColor" fillOpacity={0.12} />
      <path d="M50 158 Q50 110 74 110 Q98 110 98 158" />
      <circle cx="132" cy="80" r="11" fill="currentColor" fillOpacity={0.18} />
      <circle cx="132" cy="80" r="11" />
      <path d="M115 158 Q115 118 132 118 Q149 118 149 158" fill="currentColor" fillOpacity={0.12} />
      <path d="M115 158 Q115 118 132 118 Q149 118 149 158" />
    </svg>
  );
}

// 10. Psychology — interlocking puzzle pieces.
function PsychologyIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <path
        d="M40 50 L86 50 Q86 62 96 62 Q106 62 106 50 L150 50 L150 96 Q138 96 138 106 Q138 116 150 116 L150 160 L106 160 Q106 148 96 148 Q86 148 86 160 L40 160 Z"
        fill="currentColor"
        fillOpacity={0.14}
      />
      <path d="M40 50 L86 50 Q86 62 96 62 Q106 62 106 50 L150 50 L150 96 Q138 96 138 106 Q138 116 150 116 L150 160 L106 160 Q106 148 96 148 Q86 148 86 160 L40 160 Z" />
      <circle cx="96" cy="106" r="6" fill="currentColor" />
    </svg>
  );
}

// 11. Safe shopping — card with a shield overlay.
function ShoppingIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <rect x="28" y="56" width="124" height="80" rx="8" fill="currentColor" fillOpacity={0.12} />
      <rect x="28" y="56" width="124" height="80" rx="8" />
      <line x1="28" y1="80" x2="152" y2="80" strokeWidth={4} />
      <line x1="42" y1="118" x2="68" y2="118" />
      <line x1="76" y1="118" x2="92" y2="118" />
      <path
        d="M132 90 L172 100 L172 130 Q172 158 152 170 Q132 158 132 130 Z"
        fill="currentColor"
        fillOpacity={0.22}
      />
      <path d="M132 90 L172 100 L172 130 Q172 158 152 170 Q132 158 132 130 Z" />
      <path d="M144 128 L150 136 L162 118" strokeWidth={3.5} />
    </svg>
  );
}

// 12. Cyber hygiene — soap-bubble sparkles.
function HygieneIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <circle cx="100" cy="100" r="46" fill="currentColor" fillOpacity={0.14} />
      <circle cx="100" cy="100" r="46" />
      <circle cx="84" cy="86" r="6" fill="currentColor" fillOpacity={0.4} />
      <circle cx="58" cy="58" r="14" fill="currentColor" fillOpacity={0.18} />
      <circle cx="58" cy="58" r="14" />
      <circle cx="148" cy="64" r="10" fill="currentColor" fillOpacity={0.18} />
      <circle cx="148" cy="64" r="10" />
      <circle cx="156" cy="142" r="14" fill="currentColor" fillOpacity={0.18} />
      <circle cx="156" cy="142" r="14" />
      <circle cx="46" cy="148" r="10" fill="currentColor" fillOpacity={0.18} />
      <circle cx="46" cy="148" r="10" />
    </svg>
  );
}

// 13. Tech explainers — two interlocking gears.
function TechIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <g transform="translate(76 80)">
        <circle r="26" fill="currentColor" fillOpacity={0.14} />
        <circle r="26" />
        <circle r="10" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <rect
            key={deg}
            x="-4"
            y="-34"
            width="8"
            height="8"
            transform={`rotate(${deg})`}
            fill="currentColor"
            fillOpacity={0.4}
          />
        ))}
      </g>
      <g transform="translate(134 134)">
        <circle r="20" fill="currentColor" fillOpacity={0.14} />
        <circle r="20" />
        <circle r="7" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <rect
            key={deg}
            x="-3"
            y="-26"
            width="6"
            height="6"
            transform={`rotate(${deg})`}
            fill="currentColor"
            fillOpacity={0.4}
          />
        ))}
      </g>
    </svg>
  );
}

// 14. News & trends — newspaper with broadcast waves.
function NewsIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <rect x="38" y="68" width="124" height="100" rx="4" fill="currentColor" fillOpacity={0.12} />
      <rect x="38" y="68" width="124" height="100" rx="4" />
      <line x1="50" y1="86" x2="150" y2="86" strokeWidth={4} />
      <line x1="50" y1="106" x2="120" y2="106" />
      <line x1="50" y1="120" x2="130" y2="120" />
      <line x1="50" y1="134" x2="120" y2="134" />
      <line x1="50" y1="148" x2="100" y2="148" />
      <path d="M132 24 Q156 28 156 56" />
      <path d="M132 36 Q144 40 144 56" />
    </svg>
  );
}

// 15. Students — graduation cap.
function StudentIllustration() {
  return (
    <svg {...COMMON_PROPS}>
      <path d="M100 56 L30 90 L100 124 L170 90 Z" fill="currentColor" fillOpacity={0.18} />
      <path d="M100 56 L30 90 L100 124 L170 90 Z" />
      <path d="M60 104 L60 140 Q60 158 100 158 Q140 158 140 140 L140 104" />
      <line x1="170" y1="90" x2="170" y2="138" strokeWidth={3} />
      <circle cx="170" cy="142" r="5" fill="currentColor" />
    </svg>
  );
}

const REGISTRY: Record<string, () => ReactElement> = {
  "phishing-a-emaily": PhishingIllustration,
  "sms-a-telefon": SmsIllustration,
  "fake-eshopy": EshopIllustration,
  "socialne-siete": SocialIllustration,
  "ai-scamy": AiIllustration,
  "digitalna-bezpecnost": SecurityIllustration,
  kvizy: QuizIllustration,
  pribehy: StoryIllustration,
  "rodicia-a-seniori": FamilyIllustration,
  psychologia: PsychologyIllustration,
  "bezpecne-nakupovanie": ShoppingIllustration,
  "cyber-hygiena": HygieneIllustration,
  "tech-explainers": TechIllustration,
  "news-a-trendy": NewsIllustration,
  studenti: StudentIllustration,
};

export function CategoryIllustration({ slug, className, testid }: CategoryIllustrationProps) {
  const Illustration = REGISTRY[slug] ?? SecurityIllustration;
  return (
    <span className={className} data-testid={testid} aria-hidden="true">
      <Illustration />
    </span>
  );
}
