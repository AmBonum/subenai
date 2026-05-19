import { ShieldCheck, Clock, Gift } from "lucide-react";

import { tFor } from "@/i18n/quiz";

// E25 Phase 1 — trust strip rendered above the catalog grid on /tests.
// Three tiles answer the three highest-friction questions every
// first-time visitor asks within 2 seconds of landing:
//   1. "Will you spam / leak my data?" → Anonymous
//   2. "How long will this take?" → 5 minutes
//   3. "Will I have to pay?" → Free
//
// Lucide icons (already in the bundle for the mega-menu) keep this
// asset-free. Same pattern is reused on /courses in Phase 2.
export function TestsValueStrip() {
  const t = tFor("testy");
  return (
    <section
      data-testid="tests-value-strip"
      aria-label={t("value_anonymous") + " · " + t("value_fast") + " · " + t("value_free")}
      className="mb-10 grid gap-3 sm:grid-cols-3"
    >
      <ValueTile
        icon={<ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />}
        label={t("value_anonymous")}
        desc={t("value_anonymous_desc")}
        testid="tests-value-strip-anonymous"
      />
      <ValueTile
        icon={<Clock className="h-5 w-5 text-primary" aria-hidden="true" />}
        label={t("value_fast")}
        desc={t("value_fast_desc")}
        testid="tests-value-strip-fast"
      />
      <ValueTile
        icon={<Gift className="h-5 w-5 text-primary" aria-hidden="true" />}
        label={t("value_free")}
        desc={t("value_free_desc")}
        testid="tests-value-strip-free"
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
