import { useEffect, useMemo, useState } from "react";
import { Search, X, CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLibraryQuestions } from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";

interface Props {
  open: boolean;
  onClose: () => void;
  excludeIds: string[];
  onAdd: (ids: string[]) => void;
  /** Soft cap on how many more questions the test can accept. The picker
   *  surfaces this in the submit-button label and disables submission past
   *  the cap. NULL = no cap. */
  remainingCapacity: number | null;
}

const ALL = "all";

export function QuestionPickerDialog({
  open,
  onClose,
  excludeIds,
  onAdd,
  remainingCapacity,
}: Props) {
  const t = tFor("wizard");
  const tPicker = (k: string, params?: Record<string, string | number>) =>
    t(`question_picker.${k}` as never, params);

  const libraryQ = useLibraryQuestions();
  const allQuestions = useMemo(() => libraryQ.data ?? [], [libraryQ.data]);

  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState<string>(ALL);
  const [difficulty, setDifficulty] = useState<string>(ALL);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSearch("");
      setBranch(ALL);
      setDifficulty(ALL);
      setSelectedIds(new Set());
    }
  }, [open]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    for (const q of allQuestions) if (q.branch_slug) set.add(q.branch_slug);
    return Array.from(set).sort();
  }, [allQuestions]);

  const difficulties = useMemo(() => {
    const set = new Set<string>();
    for (const q of allQuestions) if (q.difficulty) set.add(q.difficulty);
    return Array.from(set).sort();
  }, [allQuestions]);

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allQuestions.filter((row) => {
      if (excludeSet.has(row.id)) return false;
      if (branch !== ALL && row.branch_slug !== branch) return false;
      if (difficulty !== ALL && row.difficulty !== difficulty) return false;
      if (q && !row.prompt.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allQuestions, excludeSet, branch, difficulty, search]);

  const allInResultsSelected = useMemo(
    () => filtered.length > 0 && filtered.every((row) => selectedIds.has(row.id)),
    [filtered, selectedIds],
  );

  const overCap = remainingCapacity !== null && selectedIds.size > remainingCapacity;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllInResults() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of filtered) next.add(row.id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleSubmit() {
    if (overCap || selectedIds.size === 0) return;
    onAdd(Array.from(selectedIds));
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-3 sm:max-w-3xl"
        data-testid="question-picker-dialog"
      >
        <DialogHeader>
          <DialogTitle>{tPicker("title")}</DialogTitle>
          <DialogDescription>
            {tPicker("description", { count: allQuestions.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder={tPicker("search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="question-picker-search-input"
              aria-label={tPicker("search_aria")}
            />
          </div>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger
              className="w-40"
              data-testid="question-picker-branch-filter"
              aria-label={tPicker("branch_filter_aria")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tPicker("branch_all")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger
              className="w-40"
              data-testid="question-picker-difficulty-filter"
              aria-label={tPicker("difficulty_filter_aria")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tPicker("difficulty_all")}</SelectItem>
              {difficulties.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className="flex items-center justify-between text-xs text-muted-foreground"
          data-testid="question-picker-result-count"
        >
          <span aria-live="polite">
            {tPicker("result_count", {
              shown: filtered.length,
              total: allQuestions.length - excludeIds.length,
              selected: selectedIds.size,
            })}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllInResults}
              disabled={filtered.length === 0 || allInResultsSelected}
              data-testid="question-picker-select-all-button"
            >
              {tPicker("select_all_in_results")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
              data-testid="question-picker-clear-selection-button"
            >
              {tPicker("clear_selection")}
            </Button>
          </div>
        </div>

        <ScrollArea className="-mr-3 h-[min(50vh,460px)] pr-3">
          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-12 text-center"
              data-testid="question-picker-empty-state"
            >
              <p className="text-sm font-medium text-foreground">{tPicker("empty_title")}</p>
              <p className="max-w-xs text-xs text-muted-foreground">{tPicker("empty_body")}</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((q) => {
                const checked = selectedIds.has(q.id);
                return (
                  <li
                    key={q.id}
                    data-testid={`question-picker-row-${q.id}`}
                    className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                      checked ? "border-primary/60 bg-primary/5" : "border-border/60"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(q.id)}
                      data-testid={`question-picker-row-${q.id}-checkbox`}
                      aria-label={tPicker("row_checkbox_aria", {
                        prompt: q.prompt.slice(0, 80),
                      })}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium leading-snug"
                        data-testid={`question-picker-row-${q.id}-prompt`}
                      >
                        {q.prompt}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {q.branch_slug && (
                          <Badge variant="outline" className="text-[10px]">
                            {q.branch_slug}
                          </Badge>
                        )}
                        {q.difficulty && (
                          <Badge variant="secondary" className="text-[10px]">
                            {q.difficulty}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {overCap && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
            data-testid="question-picker-over-cap-warning"
            role="alert"
          >
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              {tPicker("over_cap_warning", {
                selected: selectedIds.size,
                remaining: remainingCapacity ?? 0,
              })}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose} data-testid="question-picker-cancel-button">
            <X className="mr-2 h-4 w-4" aria-hidden />
            {tPicker("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || overCap}
            data-testid="question-picker-submit-button"
          >
            {tPicker("submit", { count: selectedIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
