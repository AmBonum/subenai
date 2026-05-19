import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  PERSONALITIES,
  pickPersonalityVariant,
  type AnswerRecord,
  type ScoreResult,
} from "@/lib/quiz/score/scoring";
import type { Question } from "@/lib/quiz/bank/questions";
import { supabase } from "@/integrations/supabase/client";
import { buildShareCaption } from "@/lib/share/intents";
import { TRAP_SEEN_STORAGE_KEY } from "@/lib/data-trap/copy";
import { useConsent } from "@/hooks/useConsent";
import { track } from "@/lib/browser/tracking";
import { SurveyCard } from "@/components/quiz/survey/SurveyCard";
import { SocialShareGrid } from "@/components/quiz/share/SocialShareGrid";
import { ManualShareCard } from "@/components/quiz/share/ManualShareCard";
import { TrapDialog } from "@/components/quiz/results/TrapDialog";
import { WeakCategoryRecommendations } from "@/components/quiz/results/WeakCategoryRecommendations";
import { tFor } from "@/i18n/quiz";

const AnswerReviewSection = lazy(() => import("@/components/quiz/review/AnswerReviewSection"));

interface EduContextProp {
  token: string;
  respondentName: string;
  respondentEmail: string;
}

interface Props {
  result: ScoreResult;
  answers: AnswerRecord[];
  onRestart: () => void;
  /** Optional pack/composer context — when set, renders the
   *  „Vyhovuje pre {label}" badge if score crosses the threshold. */
  passingThreshold?: number;
  passLabel?: string;
  /** When present, persistResult routes through /api/finish-edu-attempt
   *  with the JWT instead of doing a direct anon Supabase INSERT
   *  (RLS blocks anon INSERT of respondent_* rows since E12.3). */
  edu?: EduContextProp;
  /** Live questions from the just-finished attempt. Passed down to
   *  AnswerReviewSection so each card can resolve its question by id
   *  against this array — required because DB-served questions
   *  (`get_quick_test_questions` RPC, AH-11.5b.1) have UUIDs that
   *  don't exist in the local QUESTIONS bundle. Without this, every
   *  review card rendered the "missing_question" placeholder
   *  (2026-05-19 prod bug). */
  questions?: Question[];
}

function genShareId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export function ResultsView({
  result,
  answers,
  onRestart,
  passingThreshold,
  passLabel,
  edu,
  questions,
}: Props) {
  const t = tFor("results");
  const tCommon = tFor("common");
  const passes =
    typeof passingThreshold === "number" && !!passLabel && result.finalScore >= passingThreshold;
  const { record } = useConsent();
  const personality = PERSONALITIES[result.personality];
  // Deterministic variant per result (so refresh shows same copy)
  const variant = useMemo(
    () =>
      pickPersonalityVariant(
        personality,
        result.finalScore + result.stats.criticalMistakes,
        result.finalScore,
      ),
    [personality, result.finalScore, result.stats.criticalMistakes],
  );

  const [animatedScore, setAnimatedScore] = useState(0);
  const [showRest, setShowRest] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [savingShare, setSavingShare] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [trapOpen, setTrapOpen] = useState(false);
  const [trapSeen, setTrapSeen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TRAP_SEEN_STORAGE_KEY) === "1";
  });
  const persistAttempted = useRef(false);
  const reviewRef = useRef<HTMLDivElement | null>(null);
  const trapTimerRef = useRef<number | null>(null);
  const trapSourceRef = useRef<"auto_timer" | "manual_button">("auto_timer");

  const reviewCount = answers.length;
  const reviewSectionId = "results-review-section";

  function toggleReview() {
    setReviewOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => {
          reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
      return next;
    });
  }

  // Score count-up
  useEffect(() => {
    const target = result.finalScore;
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const reveal = window.setTimeout(() => setShowRest(true), duration + 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(reveal);
    };
  }, [result.finalScore]);

  // Persist result to Cloud once for share link
  useEffect(() => {
    if (persistAttempted.current) return;
    persistAttempted.current = true;
    void persistResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TrapDialog auto-open timer (5s after results shown, if not previously seen)
  useEffect(() => {
    if (trapSeen || !showRest) return;

    trapTimerRef.current = window.setTimeout(() => {
      setTrapOpen(true);
      trapSourceRef.current = "auto_timer";
      track(record, {
        name: "data_trap.shown",
        category: "analytics",
        properties: { source: "auto_timer" },
      });
    }, 5000);

    return () => {
      if (trapTimerRef.current !== null) {
        clearTimeout(trapTimerRef.current);
      }
    };
  }, [trapSeen, showRest, record]);

  async function persistResult() {
    setSavingShare(true);
    const id = genShareId();
    try {
      if (edu) {
        // Edu mode — route through CF Function so the JWT validates the
        // respondent fields server-side and the row gets INSERTed via
        // service role (anon INSERT of respondent_* is blocked by RLS).
        const response = await fetch("/api/finish-edu-attempt", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token: edu.token,
            share_id: id,
            final_score: result.finalScore,
            base_score: result.baseScore,
            total_penalty: result.totalPenalty,
            percentile: result.percentile,
            personality: result.personality,
            breakdown: result.breakdown,
            insights: result.insights,
            stats: result.stats,
            flags: result.flags,
            answers,
            total_time_ms: result.stats.totalTimeMs,
          }),
        });
        if (!response.ok) {
          if (import.meta.env.DEV) {
            const text = await response.text();
            console.error("finish-edu-attempt failed", response.status, text);
          }
          return;
        }
        setShareId(id);
        setShareUrl(`${window.location.origin}/r/${id}`);
        return;
      }

      const { error } = await supabase.from("attempts").insert({
        share_id: id,
        nickname: null,
        final_score: result.finalScore,
        base_score: result.baseScore,
        total_penalty: result.totalPenalty,
        percentile: result.percentile,
        personality: result.personality,
        breakdown: result.breakdown,
        insights: result.insights,
        stats: result.stats,
        flags: result.flags,
        answers: answers as unknown as import("@/integrations/supabase/types").Json,
        total_time_ms: result.stats.totalTimeMs,
      });
      if (error) {
        // Avoid leaking constraint names / SQL hints to the browser console.
        if (import.meta.env.DEV) console.error("Failed to save attempt:", error);
        return;
      }
      setShareId(id);
      setShareUrl(`${window.location.origin}/r/${id}`);
    } finally {
      setSavingShare(false);
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const shareCaption = buildShareCaption({
    score: result.finalScore,
    personalityName: variant.name,
  });

  async function handleNativeShare() {
    const text = shareCaption;
    const url = shareUrl ?? window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: t("share_app_title"), text, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  async function handleDownloadStory() {
    setDownloadingImg(true);
    try {
      const { drawIgStoryToCanvas } = await import("@/lib/quiz/og-image/index");
      const blob = await drawIgStoryToCanvas({
        score: result.finalScore,
        percentile: result.percentile,
        personalityEmoji: variant.emoji,
        personalityName: variant.name,
        tagline: variant.tagline,
        breakdown: result.breakdown,
        url: shareUrl ?? window.location.origin,
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `subenai-${result.finalScore}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    } finally {
      setDownloadingImg(false);
    }
  }

  function handleOpenTrapDialog() {
    setTrapOpen(true);
    trapSourceRef.current = "manual_button";
    track(record, {
      name: "data_trap.shown",
      category: "analytics",
      properties: { source: "manual_button" },
    });
  }

  function handleTrapAcknowledged() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TRAP_SEEN_STORAGE_KEY, "1");
        setTrapSeen(true);
      }
    } catch {
      // Storage unavailable (private mode, quota) — non-essential, swallow.
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Score reveal */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("score_label")}
        </div>
        <div className="mt-2 inline-flex items-baseline gap-2 font-display">
          <span
            data-testid="quiz-results-score-value"
            className="text-7xl font-black sm:text-8xl tabular-nums"
          >
            {animatedScore}
          </span>
          <span className="text-2xl text-muted-foreground">/ 100</span>
        </div>
        {showRest && (
          <div className="mt-2 animate-fade-in-up text-base text-muted-foreground">
            {t("percentile.prefix")}
            <span className="font-bold text-primary">
              {result.percentile}
              {t("percentile.value_suffix")}
            </span>
            {t("percentile.suffix")}
          </div>
        )}
        {showRest && passes && (
          <div
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-4 py-2 text-sm font-semibold text-success animate-fade-in-up"
            role="status"
          >
            <span aria-hidden="true">✅</span>
            <span>{t("pass_badge", { label: passLabel ?? "" })}</span>
          </div>
        )}
        {showRest && !passes && typeof passingThreshold === "number" && passLabel && (
          <div
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning animate-fade-in-up"
            role="status"
          >
            <span>{t("fail_badge", { threshold: passingThreshold, label: passLabel })}</span>
          </div>
        )}
      </div>

      {showRest && (
        <>
          {/* Personality card */}
          <div className="mt-8 animate-fade-in-up rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="text-5xl">{variant.emoji}</div>
            <h2 className="mt-3 text-2xl font-bold">{variant.name}</h2>
            <p className="mt-1 text-sm font-medium text-primary">„{variant.tagline}"</p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/80">{variant.description}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {variant.advice.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">→</span>
                  <span className="text-foreground/85">{a}</span>
                </li>
              ))}
            </ul>
            {variant.relatedCourses && variant.relatedCourses.length > 0 && (
              <div className="mt-4 space-y-1 border-t border-border/60 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("recommended_courses")}
                </p>
                {variant.relatedCourses.map(({ label, slug }) => (
                  <Link
                    key={slug}
                    to="/courses/$slug"
                    params={{ slug }}
                    className="block text-sm text-primary underline-offset-2 hover:underline"
                  >
                    → {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Breakdown */}
          <div
            data-testid="quiz-results-breakdown"
            className="mt-6 animate-fade-in-up rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="text-base font-bold">{t("breakdown_title")}</h3>
            <div className="mt-4 space-y-3">
              {(Object.keys(result.breakdown) as (keyof typeof result.breakdown)[]).map((k) => (
                <div key={k}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-foreground/85">{t(`categories.${k}`)}</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {result.breakdown[k]} %
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        result.breakdown[k] >= 70
                          ? "bg-success"
                          : result.breakdown[k] >= 40
                            ? "bg-warning"
                            : "bg-destructive"
                      }`}
                      style={{ width: `${result.breakdown[k]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* E17.4 — weak-category recommendations (course + article per
              weak category). Renders only when ≥1 category < 50 %. */}
          <WeakCategoryRecommendations breakdown={result.breakdown} />

          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="mt-6 animate-fade-in-up rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-base font-bold">{t("insights_title")}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {result.insights.map((ins, i) => (
                  <li key={i} className="flex gap-2 text-foreground/85">
                    <span className="text-destructive">•</span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>

              {/* Stats moved here for context */}
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
                <Stat
                  label={t("stat_critical")}
                  value={result.stats.criticalMistakes}
                  tone="danger"
                />
                <Stat label={t("stat_medium")} value={result.stats.mediumMistakes} tone="warn" />
                <Stat label={t("stat_minor")} value={result.stats.minorMistakes} tone="muted" />
                <Stat
                  label={t("stat_time")}
                  value={`${(result.stats.avgResponseMs / 1000).toFixed(1)}s`}
                  tone="muted"
                />
              </div>
            </div>
          )}

          {/* Optional survey */}
          {shareId && <SurveyCard shareId={shareId} />}

          {/* Share section */}
          <div
            data-testid="quiz-results-share-section"
            className="mt-8 animate-fade-in-up rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="text-base font-bold">{t("share_title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("share_body")}</p>

            {/* Share link */}
            <div className="mt-4">
              {savingShare && !shareUrl && (
                <div className="text-xs text-muted-foreground">{t("generating_share")}</div>
              )}
              {shareUrl && (
                <div className="flex gap-2">
                  <input
                    data-testid="quiz-results-share-url"
                    readOnly
                    value={shareUrl}
                    onClick={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="rounded-lg border-2 border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:border-primary/60"
                  >
                    {copied ? t("copy_copied") : t("copy_link")}
                  </button>
                </div>
              )}
              {!savingShare && !shareUrl && (
                <div className="text-xs text-destructive">{t("share_failed")}</div>
              )}
            </div>

            <div className="mt-4">
              <button
                onClick={handleNativeShare}
                className="w-full rounded-xl border-2 border-border bg-card px-5 py-3 text-base font-semibold transition-colors hover:border-primary/60"
              >
                {t("share_link_button")}
              </button>
            </div>

            {shareUrl && <SocialShareGrid url={shareUrl} text={shareCaption} />}
          </div>

          {shareUrl && (
            <ManualShareCard
              url={shareUrl}
              text={shareCaption}
              onDownloadStory={handleDownloadStory}
              downloading={downloadingImg}
            />
          )}

          {/* Trap dialog manual trigger */}
          {shareUrl && (
            <div className="mt-6 animate-fade-in-up">
              <button
                type="button"
                onClick={handleOpenTrapDialog}
                className="w-full rounded-xl border-2 border-border bg-card px-5 py-3 text-base font-semibold transition-colors hover:border-primary/60"
              >
                {t("trap_open_button")}
              </button>
            </div>
          )}

          {/* Review own answers (inline, decoupled from Supabase persist) */}
          {reviewCount > 0 && (
            <div className="mt-6 animate-fade-in-up">
              <button
                type="button"
                onClick={toggleReview}
                aria-expanded={reviewOpen}
                aria-controls={reviewSectionId}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-border bg-card px-5 py-4 text-left text-base font-semibold transition-colors hover:border-primary/60"
              >
                <span>{t("see_my_answers", { n: reviewCount })}</span>
                <span aria-hidden className="ml-3 text-xl">
                  {reviewOpen ? "▴" : "▾"}
                </span>
              </button>

              <div
                id={reviewSectionId}
                ref={reviewRef}
                role="region"
                aria-label={t("answers_region_aria", { n: reviewCount })}
                hidden={!reviewOpen}
                className={reviewOpen ? "mt-4" : undefined}
              >
                {reviewOpen && (
                  <Suspense
                    fallback={
                      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-card">
                        {t("answers_loading")}
                      </div>
                    }
                  >
                    <AnswerReviewSection answers={answers} questions={questions} />
                  </Suspense>
                )}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 animate-fade-in-up">
            <button
              data-testid="quiz-results-restart"
              onClick={onRestart}
              className="rounded-xl border-2 border-border bg-card px-6 py-3 font-semibold transition-colors hover:border-primary/60"
            >
              {t("restart")}
            </button>
            <Link
              to="/"
              className="text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {tCommon("back_to_start")}
            </Link>
          </div>
        </>
      )}

      {/* Trap dialog */}
      <TrapDialog
        open={trapOpen}
        onOpenChange={setTrapOpen}
        onAcknowledged={handleTrapAcknowledged}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "danger" | "warn" | "muted";
}) {
  const toneCls =
    tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="text-center">
      <div className={`font-display text-2xl font-black tabular-nums ${toneCls}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
