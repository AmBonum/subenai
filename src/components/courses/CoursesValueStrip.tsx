import { Clock, BookOpen, Gift } from "lucide-react";

import { tFor } from "@/i18n/quiz";

// E25 Phase 2 — trust strip rendered above the courses catalog grid.
// Parallel to TestsValueStrip but with course-specific value props:
//
//   1. 10 minutes — answers "how long does this take?"
//   2. Real examples — answers "is this corporate fluff?"
//   3. Free — answers "will I have to pay?"
//
// Same visual shape as TestsValueStrip so the two catalogs feel
// like part of one product line.
export function CoursesValueStrip() {
  const t = tFor("skolenia");
  return (
    <section
      data-testid="courses-value-strip"
      aria-label={t("value_short") + " · " + t("value_real") + " · " + t("value_free")}
      className="mb-10 grid gap-3 sm:grid-cols-3"
    >
      <ValueTile
        icon={<Clock className="h-5 w-5 text-primary" aria-hidden="true" />}
        label={t("value_short")}
        desc={t("value_short_desc")}
        testid="courses-value-strip-short"
      />
      <ValueTile
        icon={<BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />}
        label={t("value_real")}
        desc={t("value_real_desc")}
        testid="courses-value-strip-real"
      />
      <ValueTile
        icon={<Gift className="h-5 w-5 text-primary" aria-hidden="true" />}
        label={t("value_free")}
        desc={t("value_free_desc")}
        testid="courses-value-strip-free"
      />
    </section>
  );
}

interface ValueTileProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  testid: string;
}

function ValueTile({ icon, label, desc, testid }: ValueTileProps) {
  return (
    <div
      data-testid={testid}
      className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-4"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{desc}</span>
      </div>
    </div>
  );
}
