import { useState } from "react";
import { ChevronDown, ListChecks, Plus } from "lucide-react";

import { QuestionPicker } from "./QuestionPicker";
import type { Question } from "@/lib/quiz/bank/questions";
import { tFor } from "@/i18n/quiz";

// E33 Phase 1 — collapsed-by-default wrapper for the 243-question
// QuestionPicker.
//
// Before: section 2 rendered all 243 questions inline (with native
// content-visibility virtualization but still ~21,000 px tall when
// unfiltered). Users had to scroll past it to reach section 3
// (Nastavenia / settings). The composer functioned like a database
// UI rather than a product.
//
// After: by default section 2 shows ONLY a compact summary card with
// the selected count + an "Open picker" CTA. Click expands the full
// QuestionPicker inline (filters + 243-item list). Pack preloads
// from section 1 still populate `selectedIds`; users see the count
// move without ever opening the picker, so settings (section 3) is
// above the fold immediately.
//
// QuestionPicker itself is unchanged — this is a pure wrapper. The
// existing testids (`composer-picker-search`, `composer-picker-selected-count`)
// keep working when expanded, which preserves the existing e2e
// contract (TC-01 / TC-02 / TC-04 navigation flows).

interface Props {
  questions: Question[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

function formatSelectedSummary(t: ReturnType<typeof tFor>, count: number): string {
  if (count === 0) return t("step_2_zero_state_cta");
  if (count === 1) return t("step_2_summary_singular", { count });
  if (count < 5) return t("step_2_summary_few", { count });
  return t("step_2_summary_many", { count });
}

export function ComposerStep2Picker({ questions, selectedIds, onToggle }: Props) {
  const t = tFor("composer");
  const [expanded, setExpanded] = useState(false);
  const count = selectedIds.size;
  const summary = formatSelectedSummary(t, count);

  return (
    <div className="space-y-3" data-testid="composer-step-2-wrapper">
      <div
        data-testid="composer-step-2-summary"
        className={`flex flex-col items-stretch gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-start sm:justify-between ${
          count === 0
            ? "border-dashed border-border/60 bg-card/30"
            : "border-primary/30 bg-primary/5"
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              count === 0 ? "bg-muted/40 text-muted-foreground" : "bg-primary/15 text-primary"
            }`}
            aria-hidden="true"
          >
            {count === 0 ? <Plus className="h-5 w-5" /> : <ListChecks className="h-5 w-5" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              data-testid="composer-step-2-summary-text"
              className={`text-sm font-semibold ${
                count === 0 ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {summary}
            </span>
          </div>
        </div>
        {/* Toggle was previously `inline-flex shrink-0` next to the
            summary in a `justify-between` row, which forced the row
            min-width to icon + text + button + gaps. On 320 px viewports
            (composer audit, 2026-05-20) that pushed both this button
            and the bottom fixed action bar 97 px past the right edge.
            The new shape stacks the summary above the button on
            <sm, falls back to side-by-side at sm+. `w-full sm:w-auto`
            makes the button stretch on mobile (better tap target) and
            sit at natural width on desktop. */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          data-testid="composer-step-2-toggle"
          aria-expanded={expanded}
          aria-controls="composer-step-2-picker"
          className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/15 sm:w-auto sm:justify-start"
        >
          {expanded
            ? t("step_2_close_picker")
            : t("step_2_open_picker", { count: questions.length })}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded ? (
        <div
          id="composer-step-2-picker"
          data-testid="composer-step-2-picker"
          className="rounded-xl border border-border/60 bg-background/40 p-4"
        >
          <QuestionPicker questions={questions} selectedIds={selectedIds} onToggle={onToggle} />
        </div>
      ) : null}
    </div>
  );
}
