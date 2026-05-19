import { getQuestionById, type Question } from "@/lib/quiz/bank/questions";
import type { AnswerRecordPersisted } from "@/lib/quiz/bank/schema";
import { AnswerReviewCard } from "@/components/quiz/review/AnswerReviewCard";
import { tFor } from "@/i18n/quiz";

interface Props {
  answers: AnswerRecordPersisted[];
  /**
   * Live questions from the just-finished attempt (for `/test` + composer
   * flows). When provided, lookup uses this array first — required because
   * DB-served questions (from `get_quick_test_questions` RPC, AH-11.5b.1)
   * have UUIDs that DON'T exist in the local `QUESTIONS` bundle, so the
   * bundle fallback returns null for every card → all cards rendered the
   * "missing_question" placeholder (2026-05-19 prod bug). For share URLs
   * (`/r/$shareId`) where the live array isn't available, the bundle
   * fallback still applies.
   */
  questions?: Question[];
}

/**
 * Lazy boundary for the post-test review. Imported via `React.lazy` from
 * `/r/$shareId` and `ResultsView` so the screenshot components (SMS,
 * email, IG, listing, call, URL) and Zod-parsed answer cards only ship
 * when the user actually expands the review section.
 */
export function AnswerReviewSection({ answers, questions }: Props) {
  const t = tFor("review");
  if (answers.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  // Build an id→question map from the live array (if provided) so each
  // card lookup is O(1). Falls back to the static bundle (`getQuestionById`)
  // for ids the array doesn't carry — covers share-URL viewing where the
  // questions weren't passed through.
  const byId = new Map<string, Question>();
  if (questions) {
    for (const q of questions) byId.set(q.id, q);
  }
  const lookup = (id: string): Question | null => byId.get(id) ?? getQuestionById(id);

  return (
    <div className="space-y-4">
      {answers.map((answer, i) => (
        <AnswerReviewCard
          key={`${answer.questionId}-${i}`}
          answer={answer}
          question={lookup(answer.questionId)}
          index={i + 1}
          total={answers.length}
        />
      ))}
    </div>
  );
}

export default AnswerReviewSection;
