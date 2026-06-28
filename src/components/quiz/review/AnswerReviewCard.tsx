import { Link } from "@tanstack/react-router";
import { getQuestionTimeLimit, type Question, type Category } from "@/lib/quiz/bank/questions";
import type { AnswerRecordPersisted } from "@/lib/quiz/bank/schema";
import { getRelatedCourseForCategory } from "@/lib/quiz/score/category-course-map";
import { AnswerFeedback } from "@/components/quiz/review/AnswerFeedback";
import { VisualBlock } from "@/components/quiz/flow/VisualBlock";
import { tFor } from "@/i18n/quiz";

function RelatedCourseCta({ category }: { category: Category }) {
  const t = tFor("review");
  const course = getRelatedCourseForCategory(category);
  if (!course) return null;
  return (
    <Link
      to="/academy/$slug"
      params={{ slug: course.slug }}
      className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-border bg-card/50 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:bg-card"
    >
      <span aria-hidden="true">📚</span>
      <span>
        {t("course_cta_prefix")} <span className="text-primary">{course.title}</span>
      </span>
    </Link>
  );
}

interface Props {
  answer: AnswerRecordPersisted;
  question: Question | null;
  /** 1-based index for "Otázka N / total" header. */
  index: number;
  total: number;
}

/**
 * Read-only render of a single answered question on the post-test review
 * page. If the question's id no longer exists in the bank (the bank moved
 * since the attempt was saved), renders a friendly placeholder for that
 * one card instead of crashing.
 */
export function AnswerReviewCard({ answer, question, index, total }: Props) {
  const t = tFor("review");
  if (!question) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("question_progress", { n: index, total })}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("missing_question")}</p>
      </div>
    );
  }

  const timeLimitSec = getQuestionTimeLimit(question);
  const responseSec = answer.responseMs / 1000;
  const slow = responseSec >= timeLimitSec * 0.9;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>{t("question_progress", { n: index, total })}</span>
        <span className="text-primary">{question.category}</span>
      </div>

      <h3 className="text-balance text-lg font-bold leading-tight sm:text-xl">{question.prompt}</h3>

      {question.visual && (
        <div className="mt-4">
          <VisualBlock visual={question.visual} />
        </div>
      )}

      <ul className="mt-5 grid gap-2">
        {question.options.map((opt) => {
          const wasPicked = opt.id === answer.optionId;
          const isCorrect = opt.correct;
          const cls = isCorrect
            ? "border-success bg-success/15 text-foreground"
            : wasPicked
              ? "border-destructive bg-destructive/15 text-foreground"
              : "border-border bg-card/40 text-foreground/80";
          return (
            <li
              key={opt.id}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-medium ${cls}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/60 text-xs font-bold uppercase text-muted-foreground">
                {opt.id}
              </span>
              <span className="flex-1">{opt.label}</span>
              {isCorrect && <span aria-label={t("correct_aria")}>✅</span>}
              {wasPicked && !isCorrect && <span aria-label={t("your_answer_aria")}>❌</span>}
              {wasPicked && isCorrect && (
                <span className="ml-1 text-xs text-success/80">{t("your_answer_tag")}</span>
              )}
            </li>
          );
        })}
      </ul>

      <AnswerFeedback question={question} selectedId={answer.optionId} mode="review" />

      <RelatedCourseCta category={question.category} />

      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs">
        <span className="text-muted-foreground">{t("your_time")}</span>
        <span
          className={`font-mono font-semibold tabular-nums ${
            slow ? "text-warning" : "text-foreground"
          }`}
        >
          {responseSec.toFixed(1)}s
        </span>
        <span className="text-muted-foreground">/ {timeLimitSec}s</span>
      </div>
    </div>
  );
}

export default AnswerReviewCard;
