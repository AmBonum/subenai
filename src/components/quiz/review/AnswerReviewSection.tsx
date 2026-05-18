import { getQuestionById } from "@/lib/quiz/bank/questions";
import type { AnswerRecordPersisted } from "@/lib/quiz/bank/schema";
import { AnswerReviewCard } from "@/components/quiz/review/AnswerReviewCard";
import { tFor } from "@/i18n/quiz";

interface Props {
  answers: AnswerRecordPersisted[];
}

/**
 * Lazy boundary for the post-test review. Imported via `React.lazy` from
 * `/r/$shareId` so the screenshot components (SMS, email, IG, listing,
 * call, URL) and Zod-parsed answer cards only ship when the user
 * actually expands the review section.
 */
export function AnswerReviewSection({ answers }: Props) {
  const t = tFor("review");
  if (answers.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {answers.map((answer, i) => (
        <AnswerReviewCard
          key={`${answer.questionId}-${i}`}
          answer={answer}
          question={getQuestionById(answer.questionId)}
          index={i + 1}
          total={answers.length}
        />
      ))}
    </div>
  );
}

export default AnswerReviewSection;
