// E45 Phase 1 — Questions editor for /app/tests/$testId.
//
// Lets the owner: list current questions, add via QuestionPickerDialog,
// remove a single question (with FK-violation guard surfaced as a Slovak
// error toast), and reorder up/down. Reorder is optimistic — the local
// state is rewritten immediately while the bulk-position mutation is
// in-flight; React Query re-fetches on settle.
//
// Locator contract — every interactive element has a data-testid in the
// `test-editor-questions-*` namespace, per CLAUDE.md § Test IDs.

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuestionPickerDialog } from "@/components/app/tests/QuestionPickerDialog";
import {
  useAddQuestionsToTest,
  useLibraryQuestions,
  useRemoveQuestionFromTest,
  useUpdateTestQuestionOrder,
} from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";

interface Props {
  testId: string;
  questionIds: string[];
  /** Soft cap (matches the wizard's MAX_QUESTIONS_PER_TEST). NULL = no cap. */
  maxQuestions?: number | null;
}

export function QuestionsEditor({ testId, questionIds, maxQuestions = 100 }: Props) {
  const t = tFor("editor");
  const tQ = (k: string, params?: Record<string, string | number>) =>
    t(`questions.${k}` as never, params);

  // Local order mirror — lets the user reorder optimistically while the
  // batch position mutation is in flight. Re-sync whenever the server
  // ground truth changes (after add/remove/cache invalidation).
  const [localOrder, setLocalOrder] = useState<string[]>(questionIds);
  useEffect(() => {
    setLocalOrder(questionIds);
  }, [questionIds]);

  const [pickerOpen, setPickerOpen] = useState(false);

  const libraryQ = useLibraryQuestions();
  const addMut = useAddQuestionsToTest(testId);
  const removeMut = useRemoveQuestionFromTest(testId);
  const reorderMut = useUpdateTestQuestionOrder(testId);

  const libraryById = useMemo(() => {
    const map = new Map<
      string,
      { id: string; prompt: string; branch_slug: string | null; difficulty: string | null }
    >();
    for (const q of libraryQ.data ?? []) map.set(q.id, q);
    return map;
  }, [libraryQ.data]);

  const count = localOrder.length;
  const remaining = maxQuestions === null ? null : Math.max(0, maxQuestions - count);
  const atCap = maxQuestions !== null && count >= maxQuestions;

  const handleAdd = (ids: string[]) => {
    if (ids.length === 0) return;
    addMut.mutate(ids, {
      onError: (err) => toast.error(err.message || tQ("add_failed")),
      onSuccess: () => toast.success(tQ("add_success", { count: ids.length })),
    });
  };

  const handleRemove = (qid: string) => {
    // Optimistic local removal — if the mutation 500s on FK violation we
    // re-sync via the next useTest invalidation (handleError below).
    setLocalOrder((prev) => prev.filter((id) => id !== qid));
    removeMut.mutate(qid, {
      onError: (err) => {
        // R1: FK violation (23503) means at least one session_answer
        // still references this question. Surface the actionable message.
        const msg = err.message || "";
        if (msg.includes("23503") || /foreign key/i.test(msg)) {
          toast.error(tQ("remove_blocked_fk"));
        } else {
          toast.error(msg || tQ("remove_failed"));
        }
        setLocalOrder(questionIds); // re-sync from server truth
      },
      onSuccess: () => toast.success(tQ("remove_success")),
    });
  };

  const moveBy = (qid: string, delta: -1 | 1) => {
    setLocalOrder((prev) => {
      const idx = prev.indexOf(qid);
      const target = idx + delta;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const tmp = next[idx];
      next[idx] = next[target];
      next[target] = tmp;
      reorderMut.mutate(next, {
        onError: (err) => {
          toast.error(err.message || tQ("reorder_failed"));
          setLocalOrder(questionIds);
        },
      });
      return next;
    });
  };

  return (
    <div className="space-y-4" data-testid="test-editor-questions-root">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium" data-testid="test-editor-questions-count">
            {tQ("count_label", { count, max: maxQuestions ?? "∞" })}
          </p>
          <p className="text-xs text-muted-foreground">{tQ("hint")}</p>
        </div>
        <Button
          size="sm"
          onClick={() => setPickerOpen(true)}
          disabled={atCap}
          data-testid="test-editor-questions-add-button"
        >
          <Plus className="mr-2 h-3 w-3" />
          {tQ("add_button")}
        </Button>
      </div>

      {count === 0 ? (
        <div
          className="rounded-xl border border-dashed p-8 text-center"
          data-testid="test-editor-questions-empty-state"
        >
          <p className="text-sm font-medium text-foreground">{tQ("empty_title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tQ("empty_body")}</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => setPickerOpen(true)}
            data-testid="test-editor-questions-empty-cta"
          >
            <Plus className="mr-2 h-3 w-3" />
            {tQ("add_button")}
          </Button>
        </div>
      ) : (
        <ul className="space-y-1.5" data-testid="test-editor-questions-list">
          {localOrder.map((qid, idx) => {
            const meta = libraryById.get(qid);
            const isFirst = idx === 0;
            const isLast = idx === localOrder.length - 1;
            return (
              <li
                key={qid}
                data-testid={`test-editor-questions-row-${qid}`}
                className="flex items-start gap-2 rounded-md border border-border/60 bg-card p-3"
              >
                <span
                  className="mt-1 inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground"
                  data-testid={`test-editor-questions-row-${qid}-position`}
                  aria-label={tQ("position_aria", { idx: idx + 1 })}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium leading-snug"
                    data-testid={`test-editor-questions-row-${qid}-prompt`}
                  >
                    {meta?.prompt ?? tQ("missing_prompt")}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {meta?.branch_slug && (
                      <Badge variant="outline" className="text-[10px]">
                        {meta.branch_slug}
                      </Badge>
                    )}
                    {meta?.difficulty && (
                      <Badge variant="secondary" className="text-[10px]">
                        {meta.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveBy(qid, -1)}
                    disabled={isFirst || reorderMut.isPending}
                    aria-label={tQ("move_up_aria")}
                    data-testid={`test-editor-questions-row-${qid}-up`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveBy(qid, 1)}
                    disabled={isLast || reorderMut.isPending}
                    aria-label={tQ("move_down_aria")}
                    data-testid={`test-editor-questions-row-${qid}-down`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(qid)}
                    disabled={removeMut.isPending}
                    aria-label={tQ("remove_aria")}
                    data-testid={`test-editor-questions-row-${qid}-remove`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <QuestionPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={localOrder}
        onAdd={handleAdd}
        remainingCapacity={remaining}
      />
    </div>
  );
}
