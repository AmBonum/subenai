// E49 Phase 1 — side-sheet presentation for a single respondent session.
// Pure component; the parent route owns open-state via URL match. Reads
// session + answers + test via existing user queries; all access control
// is RLS.

import { Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { tFor } from "@/i18n/tests";
import { useTestSessionAnswers, useUserSession } from "@/lib/platform/queries";
import type { Session, SessionAnswerWithQuestion } from "@/lib/platform/types";

interface Props {
  testId: string;
  sessionId: string;
  onClose: () => void;
  onCloseHref: string;
}

function respondentLabel(s: Session | null, anonLabel: string): string {
  if (!s) return anonLabel;
  const data = (s.intake_data ?? {}) as Record<string, string>;
  const name = (data.name ?? "").trim();
  if (name.length > 0) return name;
  const email = (data.email ?? "").trim();
  if (email.length > 0) return email;
  return anonLabel;
}

function formatTime(ms: number): string {
  if (!ms || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "—";
  try {
    const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return "—";
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${min}m ${rem}s`;
  } catch {
    return "—";
  }
}

function truncateIpRef(hash: string | null | undefined): string {
  if (!hash) return "—";
  if (hash.length <= 6) return hash;
  return `…${hash.slice(-6)}`;
}

function AnswerRow({
  answer,
  index,
  correctLabel,
  wrongLabel,
  answerLabel,
  expectedLabel,
  timeLabel,
}: {
  answer: SessionAnswerWithQuestion;
  index: number;
  correctLabel: string;
  wrongLabel: string;
  answerLabel: string;
  expectedLabel: string;
  timeLabel: string;
}) {
  const isWrong = answer.is_correct === false;
  const isCorrect = answer.is_correct === true;
  const valueClass = isWrong ? "text-destructive" : isCorrect ? "text-success" : "text-foreground";
  const hasQuestion = answer.question != null;
  // Stale-question fallback: the originating question row may have been
  // deleted after the respondent answered. Render a friendly placeholder
  // instead of the bare UUID so the side-sheet doesn't crash and the
  // author sees the answer survived the deletion.
  const prompt = hasQuestion ? (answer.question?.prompt ?? answer.question_id) : "—";
  // The `questions.correct` column is jsonb — stringify defensively so any
  // shape (array of indices, single string, etc.) renders safely.
  const expectedRaw = answer.question?.correct;
  const expected =
    expectedRaw == null
      ? ""
      : typeof expectedRaw === "string"
        ? expectedRaw
        : JSON.stringify(expectedRaw);
  return (
    <li
      className="rounded-lg border p-3"
      data-testid={`session-detail-answer-row-${answer.question_id}`}
      data-stale-question={hasQuestion ? "false" : "true"}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {index + 1}.{" "}
          <span
            data-testid={
              hasQuestion
                ? `session-detail-answer-row-${answer.question_id}-prompt`
                : `session-detail-stale-question`
            }
          >
            {prompt}
          </span>
        </p>
        <span
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
          data-testid={`session-detail-answer-row-${answer.question_id}-time`}
        >
          {timeLabel}: {formatTime(answer.time_ms)}
        </span>
      </div>
      <div className="mt-2 grid gap-1 text-xs">
        <div className="flex items-center gap-2">
          {isCorrect ? (
            <CheckCircle2 className="h-3 w-3 text-success" aria-hidden />
          ) : isWrong ? (
            <XCircle className="h-3 w-3 text-destructive" aria-hidden />
          ) : null}
          <span className="text-muted-foreground">{answerLabel}:</span>
          <span
            className={valueClass}
            data-testid={`session-detail-answer-row-${answer.question_id}-value`}
            data-correct={isCorrect ? "true" : isWrong ? "false" : "null"}
          >
            {answer.value || "—"}
          </span>
        </div>
        {expected && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{expectedLabel}:</span>
            <span
              className="text-foreground"
              data-testid={`session-detail-answer-row-${answer.question_id}-expected`}
            >
              {expected}
            </span>
          </div>
        )}
        {(isCorrect || isWrong) && (
          <span
            className="sr-only"
            data-testid={`session-detail-answer-row-${answer.question_id}-correctness`}
          >
            {isWrong ? wrongLabel : correctLabel}
          </span>
        )}
      </div>
    </li>
  );
}

export function SessionDetailSheet({ testId, sessionId, onClose, onCloseHref }: Props) {
  const t = tFor("session_detail");
  const sessionQ = useUserSession(sessionId);
  const answersQ = useTestSessionAnswers(sessionId);
  const session = sessionQ.data ?? null;
  // Guard against stale cache when the URL points at a session belonging to
  // a different test (deep-link with mistyped IDs) — RLS would still gate
  // the read, but the UI should show not-found rather than mixed context.
  const sessionBelongsToTest = session ? session.test_id === testId : true;

  const isLoading = sessionQ.isLoading || answersQ.isLoading;
  const isMissing = !isLoading && (!session || !sessionBelongsToTest);

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
        data-testid="session-detail-root"
        closeTestId="session-detail-close"
      >
        <SheetHeader>
          <SheetTitle data-testid="session-detail-title">{t("title")}</SheetTitle>
          {session && !isMissing && (
            <SheetDescription data-testid="session-detail-respondent-identity">
              {respondentLabel(session, t("anonymous"))}
            </SheetDescription>
          )}
        </SheetHeader>

        {isLoading ? (
          <div className="mt-6 space-y-3" data-testid="session-detail-loading">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isMissing ? (
          <div
            className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
            data-testid="session-detail-not-found"
          >
            <p>{t("not_found")}</p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to={onCloseHref} data-testid="session-detail-not-found-close">
                {t("close")}
              </Link>
            </Button>
          </div>
        ) : session ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span data-testid="session-detail-status-badge">
                <StatusBadge status={session.status} />
              </span>
              <span className="text-sm font-medium tabular-nums" data-testid="session-detail-score">
                {t("score")}:{" "}
                <span data-testid="session-detail-score-formatted">
                  {session.score == null ? "—" : `${session.score}%`}
                </span>
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
              <div>
                <dt className="text-muted-foreground">{t("started_at")}</dt>
                <dd className="font-medium text-foreground" data-testid="session-detail-started-at">
                  {formatDateTime(session.started_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("finished_at")}</dt>
                <dd
                  className="font-medium text-foreground"
                  data-testid="session-detail-finished-at"
                >
                  {formatDateTime(session.finished_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("duration")}</dt>
                <dd className="font-medium text-foreground" data-testid="session-detail-duration">
                  {formatDuration(session.started_at, session.finished_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("audit_ref")}</dt>
                <dd
                  className="font-mono text-[11px] text-foreground"
                  data-testid="session-detail-audit-ref"
                >
                  {truncateIpRef(session.ip_hash)}
                </dd>
              </div>
            </dl>

            {answersQ.data && answersQ.data.length > 0 ? (
              <ul className="space-y-2" data-testid="session-detail-answers-list">
                {answersQ.data.map((a, i) => (
                  <AnswerRow
                    key={a.question_id}
                    answer={a}
                    index={i}
                    correctLabel={t("answer_correct")}
                    wrongLabel={t("answer_wrong")}
                    answerLabel={t("answer_value")}
                    expectedLabel={t("expected_value")}
                    timeLabel={t("time_per_question")}
                  />
                ))}
              </ul>
            ) : (
              <div
                className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"
                data-testid="session-detail-empty-in-progress"
              >
                {t("empty_answers_in_progress")}
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
