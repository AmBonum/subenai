import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SITE_ORIGIN } from "@/config/site";
import { PERSONALITIES, pickPersonalityVariant, type ScoreResult } from "@/lib/quiz/score/scoring";
import { parseAnswers, type AnswerRecordPersisted } from "@/lib/quiz/bank/schema";
import { buildShareCaption } from "@/lib/share/intents";
import { SocialShareGrid } from "@/components/quiz/share/SocialShareGrid";
import { ManualShareCard } from "@/components/quiz/share/ManualShareCard";
import { tFor } from "@/i18n/quiz";

const AnswerReviewSection = lazy(() => import("@/components/quiz/review/AnswerReviewSection"));

export const Route = createFileRoute("/r/$shareId")({
  // E23 — share-page head() expanded for viral conversion. Specifically:
  //   - noindex: every share_id is a unique URL with personal-result
  //     content; we don't want Google indexing thousands of these and
  //     diluting domain authority. The viewer-facing SEO target is the
  //     OG/Twitter card render (link preview on social), not the
  //     organic-search position.
  //   - canonical → site root: a backlink from a shared result still
  //     credits the homepage in Google's link graph.
  //   - full OG + Twitter set so the link preview on FB, LinkedIn, X
  //     etc. shows our branding instead of a bare URL.
  head: ({ params }) => {
    const t = tFor("share");
    const url = `${SITE_ORIGIN}/r/${params.shareId}`;
    const ogImage = `${SITE_ORIGIN}/og-default.png`;
    return {
      meta: [
        { title: t("meta_title", { shareId: params.shareId }) },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "noindex, nofollow" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: t("og_title") },
        { property: "og:description", content: t("og_description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { property: "og:image:alt", content: t("og_image_alt") },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: t("og_title") },
        { name: "twitter:description", content: t("og_description") },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: SITE_ORIGIN + "/" }],
    };
  },
  component: SharePageRoute,
});

function SharePageRoute() {
  const { shareId } = Route.useParams();
  return <SharePage shareId={shareId} />;
}

interface AttemptRow {
  share_id: string;
  final_score: number;
  percentile: number;
  personality: string;
  breakdown: Record<"phishing" | "url" | "fake_vs_real" | "scenario", number>;
  insights: string[];
  stats: ScoreResult["stats"];
  answers: unknown;
  created_at: string;
}

export function SharePage({ shareId }: { shareId: string }) {
  const t = tFor("share");
  const tCommon = tFor("common");
  const tResults = tFor("results");
  const [attempt, setAttempt] = useState<AttemptRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "deleting" | "deleted">(
    "idle",
  );
  const reviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("attempts")
        .select(
          "share_id, final_score, percentile, personality, breakdown, insights, stats, answers, created_at",
        )
        .eq("share_id", shareId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setAttempt(data as unknown as AttemptRow);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const answers: AnswerRecordPersisted[] = useMemo(
    () => (attempt ? parseAnswers(attempt.answers) : []),
    [attempt],
  );

  if (loading) {
    return (
      <div
        data-testid="share-result-loading"
        className="min-h-screen bg-hero flex items-center justify-center text-muted-foreground"
      >
        {t("loading")}
      </div>
    );
  }

  if (notFound || !attempt) {
    return (
      <div
        data-testid="share-result-not-found"
        className="min-h-screen bg-hero flex flex-col items-center justify-center px-4 text-center"
      >
        <div className="text-6xl">🕵️</div>
        <h1 className="mt-4 text-2xl font-bold">{t("not_found_title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("not_found_body")}</p>
        <Link
          to="/"
          data-testid="share-result-not-found-cta"
          className="mt-6 rounded-xl bg-accent-gradient px-6 py-3 font-bold text-primary-foreground shadow-glow"
        >
          {t("go_test")}
        </Link>
      </div>
    );
  }

  const personalityKey = (
    attempt.personality in PERSONALITIES ? attempt.personality : "cautious_but_vulnerable"
  ) as keyof typeof PERSONALITIES;
  const personality = PERSONALITIES[personalityKey];
  const variant = pickPersonalityVariant(
    personality,
    attempt.final_score + (attempt.stats?.criticalMistakes ?? 0),
    attempt.final_score,
  );

  const reviewCount = answers.length;
  const reviewSectionId = "review-section";

  function toggleReview() {
    setReviewOpen((prev) => {
      const next = !prev;
      if (next) {
        // Smooth-scroll the section into view after the next paint.
        window.setTimeout(() => {
          reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
      return next;
    });
  }

  const shareUrl =
    typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const shareCaption = buildShareCaption({
    score: attempt.final_score,
    personalityName: variant.name,
  });

  async function handleDelete() {
    setDeleteState("deleting");
    const { error } = await supabase.from("attempts").delete().eq("share_id", shareId);
    if (error) {
      if (import.meta.env.DEV) console.error("Delete failed:", error);
      setDeleteState("confirming");
      return;
    }
    setDeleteState("deleted");
  }

  async function handleDownloadStory() {
    if (!attempt) return;
    setDownloadingImg(true);
    try {
      const { drawIgStoryToCanvas } = await import("@/lib/quiz/og-image/index");
      const blob = await drawIgStoryToCanvas({
        score: attempt.final_score,
        percentile: attempt.percentile,
        personalityEmoji: variant.emoji,
        personalityName: variant.name,
        tagline: variant.tagline,
        breakdown: attempt.breakdown,
        url: shareUrl,
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `subenai-${attempt.final_score}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    } finally {
      setDownloadingImg(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero" data-testid="share-result-page">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("header_label")}
          </div>
          <div className="mt-2 inline-flex items-baseline gap-2 font-display">
            <span
              data-testid="share-result-score"
              className="text-7xl font-black sm:text-8xl tabular-nums"
            >
              {attempt.final_score}
            </span>
            <span className="text-2xl text-muted-foreground">/ 100</span>
          </div>
          <div className="mt-2 text-base text-muted-foreground">
            {t("percentile.prefix")}
            <span data-testid="share-result-percentile" className="font-bold text-primary">
              {attempt.percentile}
              {t("percentile.value_suffix")}
            </span>
            {t("percentile.suffix")}
          </div>
        </div>

        {/* E23 — primary conversion CTA elevated to top-of-page so a
            first-time viewer arriving from a social link doesn't have
            to scroll through the full result + share grid before seeing
            the "try it yourself" path. Competitive framing
            ("compare yourself") outperforms generic CTAs in viral
            surfaces — the viewer just saw a friend's score and the
            instinct is to find out where they stand. */}
        <div
          className="mt-8 overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-5 md:p-6"
          data-testid="share-compare-cta-card"
        >
          <p
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary"
            data-testid="share-context-kicker"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            {t("context_kicker")}
          </p>
          <p
            className="mt-2 text-sm leading-relaxed text-muted-foreground"
            data-testid="share-context-body"
          >
            {t("context_body")}
          </p>
          <Link
            to="/test"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-gradient px-5 py-3 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] sm:w-auto"
            data-testid="share-compare-cta"
          >
            {t("compare_cta")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <p className="mt-2 text-xs text-muted-foreground" data-testid="share-compare-cta-sub">
            {t("compare_cta_sub")}
          </p>
        </div>

        <div
          data-testid="share-result-personality-card"
          className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          <div className="text-5xl">{variant.emoji}</div>
          <h2 className="mt-3 text-2xl font-bold">{variant.name}</h2>
          <p className="mt-1 text-sm font-medium text-primary">„{variant.tagline}"</p>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">{variant.description}</p>
        </div>

        <div
          data-testid="share-result-breakdown-card"
          className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="text-base font-bold">{t("breakdown_title")}</h3>
          <div className="mt-4 space-y-3">
            {(Object.keys(attempt.breakdown) as Array<keyof typeof attempt.breakdown>).map((k) => (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-foreground/85">{tResults(`categories.${k}`)}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {attempt.breakdown[k]} %
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${
                      attempt.breakdown[k] >= 70
                        ? "bg-success"
                        : attempt.breakdown[k] >= 40
                          ? "bg-warning"
                          : "bg-destructive"
                    }`}
                    style={{ width: `${attempt.breakdown[k]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={toggleReview}
            aria-expanded={reviewOpen}
            aria-controls={reviewSectionId}
            data-testid="share-result-review-toggle"
            className="flex w-full items-center justify-between rounded-2xl border-2 border-border bg-card px-5 py-4 text-left text-base font-semibold transition-colors hover:border-primary/60"
          >
            <span>
              {reviewCount > 0
                ? t("see_my_answers_count", { n: reviewCount })
                : t("see_my_answers")}
            </span>
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
            data-testid="share-result-review-region"
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
                <AnswerReviewSection answers={answers} />
              </Suspense>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="text-base font-bold">{t("share_more_title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("share_more_body")}</p>
          <SocialShareGrid url={shareUrl} text={shareCaption} />
        </div>

        <ManualShareCard
          url={shareUrl}
          text={shareCaption}
          onDownloadStory={handleDownloadStory}
          downloading={downloadingImg}
        />

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/test"
            data-testid="share-result-cta-test"
            className="rounded-xl bg-accent-gradient px-6 py-4 text-center text-lg font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            {t("cta_test")}
          </Link>
          <Link to="/" className="text-center text-sm text-muted-foreground hover:text-foreground">
            {tCommon("back_to_start")}
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-border/60 bg-card/50 p-5">
          <h3 className="text-sm font-semibold text-foreground">{t("delete_title")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("delete_body")}</p>
          {deleteState === "deleted" ? (
            <p
              data-testid="share-result-delete-done"
              className="mt-3 text-sm font-semibold text-success"
            >
              {t("delete_done")}
            </p>
          ) : deleteState === "confirming" || deleteState === "deleting" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteState === "deleting"}
                data-testid="share-result-delete-confirm-button"
                className="rounded-lg border border-destructive bg-destructive/15 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/25 disabled:opacity-50"
              >
                {deleteState === "deleting" ? t("deleting") : t("delete_confirm")}
              </button>
              <button
                type="button"
                onClick={() => setDeleteState("idle")}
                disabled={deleteState === "deleting"}
                data-testid="share-result-delete-cancel-button"
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {tCommon("cancel")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteState("confirming")}
              data-testid="share-result-delete-button"
              className="mt-3 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:border-destructive/60 hover:text-destructive"
            >
              {t("delete_button")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
