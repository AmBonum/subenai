import { createFileRoute } from "@tanstack/react-router";

import type { RespondentFilters } from "@/lib/edu/types";
import { tFor } from "@/i18n/quiz";

// E38 Phase D — structured filter state lives on the URL so a deep
// link reproduces the exact narrowed view (per-set, shareable, no
// storage write → no consent gating). Free-text name/email stays in
// component state because high-frequency keystrokes aren't worth the
// router round-trip on every character.
function parsePassValue(raw: unknown): RespondentFilters["pass"] {
  return raw === "yes" || raw === "no" ? raw : undefined;
}

function parseScoreValue(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
  }
  return undefined;
}

function parseDateValue(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  // YYYY-MM-DD only — anything else is dropped so we don't round-trip
  // partially-typed garbage through the URL.
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

export const Route = createFileRoute("/test/builder/$id/results")({
  validateSearch: (raw: Record<string, unknown>): RespondentFilters => ({
    pass: parsePassValue(raw.pass),
    scoreMin: parseScoreValue(raw.scoreMin),
    scoreMax: parseScoreValue(raw.scoreMax),
    dateFrom: parseDateValue(raw.dateFrom),
    dateTo: parseDateValue(raw.dateTo),
  }),
  head: () => {
    const t = tFor("results_page");
    return {
      meta: [{ title: t("meta_title") }, { name: "robots", content: "noindex, nofollow" }],
    };
  },
});
