import { useMemo, useState, type ChangeEvent } from "react";
import type { Category, Difficulty, Question } from "@/lib/quiz/bank/questions";
import { COMPOSER_LIMITS } from "@/lib/quiz/composer";
import { tFor } from "@/i18n/quiz";

const ALL_CATEGORIES: Category[] = ["phishing", "url", "fake_vs_real", "scenario", "honeypot"];
const ALL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface Props {
  questions: Question[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

export function QuestionPicker({ questions, selectedIds, onToggle }: Props) {
  const t = tFor("question_picker");
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set());
  const [activeDifficulties, setActiveDifficulties] = useState<Set<Difficulty>>(new Set());
  const [search, setSearch] = useState("");

  const categoryLabel = (c: Category) => t(`categories.${c}`);
  const difficultyLabel = (d: Difficulty) => t(`difficulties.${d}`);

  const filtered = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (activeCategories.size > 0 && !activeCategories.has(q.category)) return false;
      if (activeDifficulties.size > 0 && !activeDifficulties.has(q.difficulty)) return false;
      if (trimmed && !q.prompt.toLowerCase().includes(trimmed)) return false;
      return true;
    });
  }, [questions, activeCategories, activeDifficulties, search]);

  const atMax = selectedIds.size >= COMPOSER_LIMITS.maxQuestions;

  function toggleCategory(c: Category) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }
  function toggleDifficulty(d: Difficulty) {
    setActiveDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <FilterRow
          label={t("category_label")}
          options={ALL_CATEGORIES}
          activeSet={activeCategories}
          onToggle={(c) => toggleCategory(c as Category)}
          getLabel={(c) => categoryLabel(c as Category)}
        />
        <FilterRow
          label={t("difficulty_label")}
          options={ALL_DIFFICULTIES}
          activeSet={activeDifficulties}
          onToggle={(d) => toggleDifficulty(d as Difficulty)}
          getLabel={(d) => difficultyLabel(d as Difficulty)}
        />
        <div>
          <label htmlFor="picker-search" className="sr-only">
            {t("search_aria")}
          </label>
          <input
            id="picker-search"
            data-testid="composer-picker-search"
            type="search"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p
          aria-live="polite"
          data-testid="composer-picker-selected-count"
          className={`font-semibold ${atMax ? "text-amber-500" : "text-foreground"}`}
        >
          {t("selected_count", { count: selectedIds.size, max: COMPOSER_LIMITS.maxQuestions })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("filter_count", { shown: filtered.length, total: questions.length })}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card/50 p-4 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {filtered.map((q) => {
            const selected = selectedIds.has(q.id);
            const disabled = !selected && atMax;
            return (
              // AC-10 native virtualization: content-visibility:auto skips
              // paint + layout for off-screen items; contain-intrinsic-size
              // gives the browser a height hint so the scrollbar stays
              // accurate. Zero JS overhead vs react-window. Graceful fallback
              // on older browsers — they just paint everything.
              <li key={q.id} className="[content-visibility:auto] [contain-intrinsic-size:0_88px]">
                <label
                  htmlFor={`pick-${q.id}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    selected
                      ? "border-primary/60 bg-primary/5"
                      : disabled
                        ? "cursor-not-allowed border-border/40 bg-card/30 opacity-60"
                        : "border-border bg-card/70 hover:border-primary/30"
                  }`}
                >
                  <input
                    id={`pick-${q.id}`}
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onToggle(q.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-border bg-background"
                  />
                  <div className="flex-1 space-y-1 text-sm">
                    <p className="font-medium text-foreground">{q.prompt}</p>
                    <p className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        {categoryLabel(q.category)}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        {difficultyLabel(q.difficulty)}
                      </span>
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface FilterRowProps<T extends string> {
  label: string;
  options: readonly T[];
  activeSet: ReadonlySet<T>;
  onToggle: (option: T) => void;
  getLabel: (option: T) => string;
}

function FilterRow<T extends string>({
  label,
  options,
  activeSet,
  onToggle,
  getLabel,
}: FilterRowProps<T>) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((opt) => {
          const active = activeSet.has(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {getLabel(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
