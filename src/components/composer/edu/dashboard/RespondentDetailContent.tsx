import { useMemo } from "react";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

import type { RespondentRow } from "@/lib/edu/types";
import { parseAnswers, type AnswerRecordPersisted } from "@/lib/quiz/bank/schema";
import { getQuestionById } from "@/lib/quiz/bank/questions";
import { tFor } from "@/i18n/quiz";

interface Props {
  row: RespondentRow;
}

interface CategoryRollup {
  category: AnswerRecordPersisted["category"];
  correct: number;
  total: number;
}

function rollUpByCategory(answers: AnswerRecordPersisted[]): CategoryRollup[] {
  const map = new Map<AnswerRecordPersisted["category"], CategoryRollup>();
  for (const a of answers) {
    const cur = map.get(a.category) ?? { category: a.category, correct: 0, total: 0 };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    map.set(a.category, cur);
  }
  const order: AnswerRecordPersisted["category"][] = [
    "phishing",
    "url",
    "fake_vs_real",
    "scenario",
    "honeypot",
  ];
  return order.map((c) => map.get(c)).filter((x): x is CategoryRollup => Boolean(x));
}

/**
 * Body of a single respondent's drill-down. Owns the per-category rollup
 * + per-question rendering; the page chrome (heading, prev/next nav,
 * back-link) is the caller's concern so this component can be reused by
 * the route page and any future side-by-side comparison view.
 */
export function RespondentDetailContent({ row }: Props) {
  const t = tFor("respondent_detail");
  const tPicker = tFor("question_picker");

  const parsed = useMemo<AnswerRecordPersisted[]>(() => parseAnswers(row.answers), [row]);
  const categoryRollup = useMemo(() => rollUpByCategory(parsed), [parsed]);

  const hasAnswers = parsed.length > 0;

  if (!hasAnswers) {
    return (
      <p
        data-testid="respondent-detail-fallback"
        className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground"
      >
        {t("fallback_no_answers")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {categoryRollup.length > 1 ? (
        <section
          data-testid="respondent-detail-category-strip"
          aria-label={t("category_strip_heading")}
          className="space-y-2"
        >
          <h3 className="text-sm font-semibold text-foreground">{t("category_strip_heading")}</h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categoryRollup.map((c) => {
              const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
              const weak = pct < 50;
              return (
                <li
                  key={c.category}
                  data-testid={`respondent-detail-category-${c.category}`}
                  className={`rounded-lg border p-2 text-sm ${
                    weak ? "border-amber-500/40 bg-amber-500/10" : "border-border/60 bg-card/40"
                  }`}
                >
                  <div className="font-semibold text-foreground">
                    {tPicker(`categories.${c.category}`)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("category_correct_label", { correct: c.correct, total: c.total })}
                    {" · "}
                    <span className="tabular-nums">{pct} %</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section
        data-testid="respondent-detail-questions"
        aria-label={t("questions_heading")}
        className="space-y-2"
      >
        <h3 className="text-sm font-semibold text-foreground">{t("questions_heading")}</h3>
        <ol className="space-y-2">
          {parsed.map((a, i) => (
            <QuestionRow key={`${a.questionId}-${i}`} index={i + 1} answer={a} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function QuestionRow({ index, answer }: { index: number; answer: AnswerRecordPersisted }) {
  const t = tFor("respondent_detail");
  const tPicker = tFor("question_picker");
  const question = getQuestionById(answer.questionId);
  const responseSec = (answer.responseMs / 1000).toFixed(1);

  const picked = answer.optionId
    ? (question?.options.find((o) => o.id === answer.optionId) ?? null)
    : null;
  const correctOption = question?.options.find((o) => o.correct) ?? null;

  const status: "correct" | "wrong" | "skipped" =
    answer.optionId === null ? "skipped" : answer.correct ? "correct" : "wrong";

  return (
    <li
      data-testid={`respondent-detail-question-${answer.questionId}`}
      className={`rounded-lg border p-3 text-sm ${
        status === "correct"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : status === "wrong"
            ? "border-rose-500/30 bg-rose-500/5"
            : "border-border/60 bg-card/40"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("q_number", { n: index })}
          {" · "}
          {tPicker(`categories.${answer.category}`)}
        </span>
        <StatusBadge status={status} />
      </div>

      {question ? (
        <p className="mb-2 font-medium text-foreground">{question.prompt}</p>
      ) : (
        <p className="mb-2 italic text-muted-foreground">
          {t("q_question_missing", { id: answer.questionId })}
        </p>
      )}

      <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t("q_picked_prefix")}</dt>
          <dd
            className={
              status === "correct"
                ? "font-medium text-emerald-600 dark:text-emerald-400"
                : status === "wrong"
                  ? "font-medium text-rose-600 dark:text-rose-400"
                  : "italic text-muted-foreground"
            }
          >
            {picked?.label ?? t("q_no_pick")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("q_correct_prefix")}</dt>
          <dd className="font-medium text-foreground">{correctOption?.label ?? "—"}</dd>
        </div>
      </dl>

      <p className="mt-1 text-xs text-muted-foreground">
        {t("q_response_time", { sec: responseSec })}
      </p>
    </li>
  );
}

function StatusBadge({ status }: { status: "correct" | "wrong" | "skipped" }) {
  const t = tFor("respondent_detail");
  if (status === "correct") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3" aria-hidden />
        {t("q_correct_badge")}
      </span>
    );
  }
  if (status === "wrong") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
        <XCircle className="size-3" aria-hidden />
        {t("q_wrong_badge")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      <MinusCircle className="size-3" aria-hidden />
      {t("q_skipped_badge")}
    </span>
  );
}
