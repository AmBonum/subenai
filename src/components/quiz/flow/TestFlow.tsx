import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { type Question } from "@/lib/quiz/bank/questions";
import { mapDbRowsToQuestions } from "@/lib/quiz/from-db";
import { useQuickTestQuestions } from "@/lib/platform/queries";
import {
  buildAnswerRecord,
  computeScore,
  type AnswerRecord,
  type ScoreResult,
} from "@/lib/quiz/score/scoring";
import { QuestionCard } from "@/components/quiz/flow/QuestionCard";
import { ResultsView } from "@/components/quiz/results/ResultsView";
import { tFor } from "@/i18n/quiz";

const QUICK_TEST_SIZE = 10;

type Phase = "intro" | "playing" | "done";

/**
 * Unified config for TestFlow. The default flow uses the random
 * banked picker. Pack and composer flows pass a curated, ordered
 * list with custom passing threshold and a label rendered as the
 * „Vyhovuje pre {label}" badge in ResultsView.
 */
/**
 * Edu mode context — present iff respondent passed the intake form.
 * The token is the gate to /api/finish-edu-attempt; without it the
 * browser cannot persist the result (anon INSERT of PII rows is
 * blocked by RLS).
 */
export interface EduContext {
  token: string;
  respondentName: string;
  respondentEmail: string;
}

export type TestFlowConfig =
  | { kind: "default" }
  | {
      kind: "pack";
      questions: Question[];
      passingThreshold: number;
      label: string;
    }
  | {
      kind: "composer";
      questions: Question[];
      passingThreshold: number;
      label: string;
      testSetId: string;
      edu?: EduContext;
    };

const RESULT_STORAGE_KEY_PREFIX = "iiq_last_result_v1";

interface PersistedResult {
  result: ScoreResult;
  answers: AnswerRecord[];
}

function storageKeyFor(config: TestFlowConfig): string {
  if (config.kind === "default") return `${RESULT_STORAGE_KEY_PREFIX}:default`;
  if (config.kind === "pack") return `${RESULT_STORAGE_KEY_PREFIX}:pack:${config.label}`;
  return `${RESULT_STORAGE_KEY_PREFIX}:composer:${config.testSetId}`;
}

function isBackForwardNavigation(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const entry = window.performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return entry?.type === "back_forward";
  } catch {
    return false;
  }
}

function loadPersistedResult(key: string): PersistedResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedResult;
    if (!parsed.result || !Array.isArray(parsed.answers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedResult(key: string, payload: PersistedResult) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // sessionStorage can be disabled / quota-full; non-fatal.
  }
}

function clearPersistedResult(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // non-fatal
  }
}

export function TestFlow({ config = { kind: "default" } }: { config?: TestFlowConfig } = {}) {
  const t = tFor("take");
  const tCommon = tFor("common");
  const storageKey = storageKeyFor(config);
  // Restore prior completed test ONLY when the user used the browser's
  // back/forward button — fresh navigation (link click, address bar) must
  // start a clean test, even if a stale result lives in sessionStorage.
  // Drop any stale entry for this key on fresh navigation so it can't
  // resurface later in the same tab via cross-test contamination.
  const restored =
    typeof window !== "undefined" && isBackForwardNavigation()
      ? loadPersistedResult(storageKey)
      : (clearPersistedResult(storageKey), null);

  const [phase, setPhase] = useState<Phase>(restored ? "done" : "intro");
  const [questions, setQuestions] = useState<Question[]>(
    config.kind === "default" ? [] : config.questions,
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>(restored?.answers ?? []);
  const [result, setResult] = useState<ScoreResult | null>(restored?.result ?? null);

  // Default kind fetches the quick-test bank from Supabase via the
  // anon-safe `get_quick_test_questions` RPC. Pack / composer flows
  // pass pre-built question lists and never hit the network here.
  const quickTestQuery = useQuickTestQuestions(QUICK_TEST_SIZE);
  const dbQuestions = useMemo(
    () => mapDbRowsToQuestions(quickTestQuery.data ?? []),
    [quickTestQuery.data],
  );

  // Pick questions on mount — only when starting fresh. For pack /
  // composer flows we have the list synchronously; for default we wait
  // for the RPC response, then promote to `playing`.
  useEffect(() => {
    if (restored) return;
    if (config.kind === "default") {
      if (dbQuestions.length === 0) return;
      setQuestions(dbQuestions);
    } else {
      setQuestions(config.questions);
    }
    const t = setTimeout(() => setPhase("playing"), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.kind === "default" ? dbQuestions : null]);

  function handleAnswer(optionId: string | null, responseMs: number) {
    const q = questions[index];
    const record = buildAnswerRecord(q, optionId, responseMs);
    const next = [...answers, record];
    setAnswers(next);

    if (index + 1 >= questions.length) {
      const finalResult = computeScore(next);
      setResult(finalResult);
      setPhase("done");
      savePersistedResult(storageKey, { result: finalResult, answers: next });
    } else {
      setIndex(index + 1);
    }
  }

  function restart() {
    clearPersistedResult(storageKey);
    if (config.kind === "default") {
      // Refetch a fresh random batch from the DB. The query effect
      // above promotes the new questions and flips to "playing".
      setQuestions([]);
      void quickTestQuery.refetch();
    } else {
      setQuestions(config.questions);
    }
    setIndex(0);
    setAnswers([]);
    setResult(null);
    setPhase("intro");
    setTimeout(() => setPhase("playing"), 700);
  }

  const passingThreshold = config.kind === "default" ? undefined : config.passingThreshold;
  const passLabel = config.kind === "default" ? undefined : config.label;

  // Render done state FIRST — when restoring from sessionStorage we have
  // result but questions=[] (questions are reshuffled on restart, not
  // needed for the review screen which looks them up by id).
  if (phase === "done" && result) {
    return (
      <ResultsView
        result={result}
        answers={answers}
        onRestart={restart}
        passingThreshold={passingThreshold}
        passLabel={passLabel}
        edu={config.kind === "composer" ? config.edu : undefined}
      />
    );
  }

  // Default kind only: surface RPC failure so the user is not stuck on
  // the intro card forever. Pack / composer flows have synchronous
  // question lists and never hit this branch.
  if (config.kind === "default" && !restored && quickTestQuery.isError && questions.length === 0) {
    return (
      <div
        data-testid="test-error"
        className="flex min-h-[60vh] flex-col items-center justify-center text-center"
      >
        <div className="text-3xl font-bold">{t("load_error_title")}</div>
        <div className="mt-2 text-muted-foreground">{t("load_error_body")}</div>
      </div>
    );
  }

  if (phase === "intro" || questions.length === 0) {
    return (
      <div
        data-testid="test-loading"
        className="flex min-h-[60vh] flex-col items-center justify-center text-center"
      >
        <div className="text-3xl font-bold animate-fade-in-up">{t("ready_title")}</div>
        <div className="mt-2 text-muted-foreground animate-fade-in-up">{t("ready_body")}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {tCommon("back")}
        </Link>
      </div>
      <QuestionCard
        question={questions[index]}
        index={index}
        total={questions.length}
        onAnswer={handleAnswer}
      />
    </div>
  );
}
