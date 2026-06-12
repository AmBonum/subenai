import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createLazyFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { PackPreloadChips } from "@/components/composer/build/PackPreloadChips";
import { ComposerStep2Picker } from "@/components/composer/build/ComposerStep2Picker";
import { ComposerExplainer } from "@/components/composer/build/ComposerExplainer";
import { ComposerSettings } from "@/components/composer/build/ComposerSettings";
import { EduSettings, EDU_PASSWORD_MIN_LEN } from "@/components/composer/edu/intake/EduSettings";
import { EduSuccessDialog } from "@/components/composer/edu/intake/EduSuccessDialog";
import { TestFlow } from "@/components/quiz/flow/TestFlow";
import { usePlatformPacks, usePlatformPackQuestionIds } from "@/lib/platform/pack-queries";
import { QUESTIONS, getQuestionById } from "@/lib/quiz/bank/questions";
import {
  COMPOSER_LIMITS,
  computeHoneypotRatio,
  decodeConfig,
  encodeConfig,
  resolveQuestions,
  shouldUseDbShare,
  type ComposerConfig,
} from "@/lib/quiz/composer";
import { ROUTES } from "@/config/routes";
import { copyToClipboard } from "@/lib/browser/clipboard";
import { tFor } from "@/i18n/quiz";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/**
 * Decode an incoming `?config=` URL into a usable composer config,
 * tolerating drift: if some IDs were renamed in the bank since the URL
 * was minted, drop them silently and surface the count separately.
 *
 * Senior note — `validateComposerConfig` rejects unknown IDs with a
 * hard error which is correct for endpoint validation, but the URL
 * share flow needs a softer reading: the composer should still render
 * with whatever survived. We only bail when fewer than the 5-question
 * minimum survives — there's nothing useful to pre-fill at that point.
 */
interface InitialLoad {
  config: ComposerConfig;
  drift: number;
}

function loadInitialFromConfig(encoded: string | undefined): InitialLoad | null {
  if (!encoded) return null;
  const decoded = decodeConfig(encoded);
  if (!decoded) return null;
  const known = decoded.questionIds.filter((id) => getQuestionById(id) !== null);
  const drift = decoded.questionIds.length - known.length;
  if (known.length < COMPOSER_LIMITS.minQuestions) return null;
  return {
    drift,
    config: {
      ...decoded,
      questionIds: known,
      maxQuestions: known.length,
    },
  };
}

export const Route = createLazyFileRoute("/test/builder/")({
  component: ComposerPage,
});

export function ComposerPage() {
  const t = useMemo(() => tFor("composer"), []);
  const search = useSearch({ from: "/test/builder/" });
  const navigate = useNavigate();

  const initial = useMemo(() => loadInitialFromConfig(search.config), [search.config]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initial?.config.questionIds ?? []),
  );
  const [selectedPackSlugs, setSelectedPackSlugs] = useState<Set<string>>(
    () => new Set(initial?.config.sourcePackSlugs ?? []),
  );
  const [passingThreshold, setPassingThreshold] = useState(
    initial?.config.passingThreshold ?? COMPOSER_LIMITS.defaultThreshold,
  );
  const [maxQuestions, setMaxQuestions] = useState(
    initial?.config.maxQuestions ?? COMPOSER_LIMITS.defaultMax,
  );
  const [creatorLabel, setCreatorLabel] = useState(initial?.config.creatorLabel ?? "");
  const [collectsResponses, setCollectsResponses] = useState(false);
  const [authorPassword, setAuthorPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const [selfRunning, setSelfRunning] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [eduSuccess, setEduSuccess] = useState<{
    publicUrl: string;
    resultsUrl: string;
    password: string;
  } | null>(null);
  // Designed AlertDialog replaces window.confirm for the destructive
  // "clear all selections" action. Only opens at ≥10 selected items
  // (smaller selections are cheap to redo, no prompt warranted).
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const { data: packs, isLoading: packsLoading } = usePlatformPacks();
  const { data: packQuestionIds, isLoading: questionIdsLoading } = usePlatformPackQuestionIds();
  const honeypotRatio = useMemo(() => computeHoneypotRatio(Array.from(selectedIds)), [selectedIds]);

  // Surface a transient share-toast for ~3s, then auto-dismiss.
  useEffect(() => {
    if (!shareToast) return;
    const t = window.setTimeout(() => setShareToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [shareToast]);

  // If the URL ?config= referenced IDs that have since been renamed, the
  // loader silently dropped them and counted the drift. Surface that to
  // the user once on first render so they know the pre-fill is partial.
  useEffect(() => {
    if (!initial || initial.drift <= 0) return;
    const n = initial.drift;
    setStaleNotice(t(n === 1 ? "stale_drift_singular" : "stale_drift_plural", { n }));
  }, [initial, t]);

  const togglePack = useCallback(
    (slug: string) => {
      if (!packs || !packQuestionIds) return;
      const pack = packs.find((p) => p.slug === slug);
      const packIds = packQuestionIds.get(slug);
      if (!pack || !packIds) return;
      // Next sets are computed synchronously from current state — NOT via
      // nested functional updaters. The previous shape read drift/cap
      // counters captured inside a setSelectedIds updater nested in the
      // setSelectedPackSlugs updater; React only evaluates those eagerly
      // on the first state transition after mount, so the notice silently
      // stopped firing on every subsequent toggle.
      setStaleNotice(null);
      const nextSlugs = new Set(selectedPackSlugs);
      let nextIds: Set<string>;
      if (nextSlugs.has(slug)) {
        nextSlugs.delete(slug);
        // Removing pack: drop its IDs but keep IDs still referenced by
        // another active pack OR added manually (manual = present in
        // selectedIds but never in any pack's questionIds list).
        const stillReferenced = new Set<string>();
        for (const otherSlug of nextSlugs) {
          packQuestionIds.get(otherSlug)?.forEach((id) => stillReferenced.add(id));
        }
        const removed = new Set(packIds);
        nextIds = new Set<string>();
        for (const id of selectedIds) {
          if (!removed.has(id) || stillReferenced.has(id)) nextIds.add(id);
        }
      } else {
        nextSlugs.add(slug);
        // Adding pack: count drift (IDs from DB no longer in the bank)
        // and enforce the 50-cap. Anything we couldn't fit due to cap
        // is surfaced separately so the user understands why.
        let drifted = 0;
        let capped = 0;
        nextIds = new Set(selectedIds);
        for (const id of packIds) {
          if (!getQuestionById(id)) {
            drifted += 1;
            continue;
          }
          if (nextIds.size >= COMPOSER_LIMITS.maxQuestions) {
            capped += 1;
            continue;
          }
          nextIds.add(id);
        }
        if (drifted > 0 || capped > 0) {
          const parts: string[] = [];
          if (drifted > 0) {
            parts.push(
              t(drifted === 1 ? "pack_drift_singular" : "pack_drift_plural", { n: drifted }),
            );
          }
          if (capped > 0) {
            parts.push(
              t(capped === 1 ? "pack_cap_singular" : "pack_cap_plural", {
                n: capped,
                max: COMPOSER_LIMITS.maxQuestions,
              }),
            );
          }
          setStaleNotice(t("stale_pack_prefix", { title: pack.title, details: parts.join("; ") }));
        }
      }
      setSelectedPackSlugs(nextSlugs);
      setSelectedIds(nextIds);
    },
    [packs, packQuestionIds, selectedPackSlugs, selectedIds, t],
  );

  const toggleQuestion = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < COMPOSER_LIMITS.maxQuestions) next.add(id);
      return next;
    });
  }, []);

  // Actual clear operation — pulled out so both the confirm-dialog
  // "confirm" callback AND the short-circuit (<10 selections, no
  // prompt) path can share it.
  const performClear = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedPackSlugs(new Set());
    setError(null);
    setStaleNotice(null);
  }, []);

  const clearAll = useCallback(() => {
    if (selectedIds.size >= 10) {
      setClearConfirmOpen(true);
      return;
    }
    performClear();
  }, [selectedIds.size, performClear]);

  // Slovak grammar picks the right pluralised body sentence for the
  // confirmation dialog. 1 = "vybranú otázku", 2-4 = "vybrané otázky",
  // 5+ / 0 = "vybraných otázok". Computed at use-site to avoid stale
  // string refs inside the dialog when the count updates mid-open.
  const clearConfirmBodyKey =
    selectedIds.size === 1
      ? "clear_confirm_body_one"
      : selectedIds.size >= 2 && selectedIds.size <= 4
        ? "clear_confirm_body_few"
        : "clear_confirm_body_many";

  const selectedCount = selectedIds.size;
  const meetsMin = selectedCount >= COMPOSER_LIMITS.minQuestions;
  const meetsMax = selectedCount <= COMPOSER_LIMITS.maxQuestions && selectedCount <= maxQuestions;
  const eduPasswordOk = !collectsResponses || authorPassword.length >= EDU_PASSWORD_MIN_LEN;
  const canRun = meetsMin && meetsMax && eduPasswordOk && !submitting;
  // Edu mode forces DB save (no URL share for password-protected sets) and
  // strictly disables the "spustiť pre seba" preview (would skip the
  // intake form and create an attempt without consent).
  const canShareUrl = canRun && !collectsResponses && !shouldUseDbShare(selectedCount);
  const canSelfRun = canRun && !collectsResponses;

  const runForSelf = useCallback(() => {
    if (!canRun) return;
    setError(null);
    setSelfRunning(true);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [canRun]);

  const copyShareUrl = useCallback(async () => {
    if (!canShareUrl || typeof window === "undefined") return;
    const ids = Array.from(selectedIds);
    const encoded = encodeConfig({
      questionIds: ids,
      passingThreshold,
      maxQuestions: ids.length,
      creatorLabel: creatorLabel.trim() || undefined,
      sourcePackSlugs: selectedPackSlugs.size > 0 ? Array.from(selectedPackSlugs) : undefined,
    });
    const url = `${window.location.origin}${ROUTES.builder}?config=${encoded}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setShareToast(t("share_toast"));
    } else {
      setError("clipboard_failed");
    }
  }, [canShareUrl, selectedIds, passingThreshold, creatorLabel, selectedPackSlugs, t]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canRun) return;
    setSubmitting(true);
    setError(null);
    try {
      const ids = Array.from(selectedIds);
      const response = await fetch("/api/test-sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question_ids: ids,
          passing_threshold: passingThreshold,
          max_questions: ids.length,
          creator_label: creatorLabel.trim() || undefined,
          source_pack_slugs: selectedPackSlugs.size > 0 ? Array.from(selectedPackSlugs) : undefined,
          collects_responses: collectsResponses || undefined,
          author_password: collectsResponses ? authorPassword : undefined,
        }),
      });
      const payload = (await response.json()) as {
        id?: string;
        url?: string;
        results_url?: string;
        error?: string;
      };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? "submit_failed");
        setSubmitting(false);
        return;
      }
      // Edu mode: open the success dialog so the author copies BOTH links
      // and the password before navigating away. Plain navigate() would lose
      // the password the moment the dialog disappears.
      if (collectsResponses) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const publicUrl = `${origin}${payload.url ?? `/test/builder/${payload.id}`}`;
        const resultsUrl = `${origin}${payload.results_url ?? `${payload.url}/results`}`;
        setEduSuccess({ publicUrl, resultsUrl, password: authorPassword });
        setSubmitting(false);
        return;
      }
      navigate({ to: ROUTES.builderSet, params: { id: payload.id } });
    } catch {
      setError("network_error");
      setSubmitting(false);
    }
  }

  if (packsLoading || questionIdsLoading || !packs || !packQuestionIds) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <p data-testid="composer-loading" className="text-sm text-muted-foreground">
            {t("loading_packs")}
          </p>
        </main>
      </div>
    );
  }

  // Inline self-run mode (AC-12): the user clicked "Spustiť pre seba".
  // No DB write; the test runs on the in-memory selection. Browser
  // back returns to the same /test/builder URL — composer state lives
  // in component memory, so a hard reload would reset. Recommended UX
  // path for "I want to keep this draft" is the URL share-out below.
  if (selfRunning) {
    const ids = Array.from(selectedIds);
    const { questions } = resolveQuestions(ids);
    return (
      <div className="min-h-screen bg-hero">
        <TestFlow
          config={{
            kind: "composer",
            questions,
            passingThreshold,
            label: t("self_run_label"),
            testSetId: "self-run",
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-8 text-center md:text-left">
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            ← {tFor("common")("back_home")}
          </Link>
          <p
            data-testid="composer-page-eyebrow"
            className="mt-4 text-xs font-bold uppercase tracking-widest text-primary"
          >
            {t("eyebrow")}
          </p>
          <h1
            data-testid="composer-page-heading"
            className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {t("page_heading")}
          </h1>
          <p
            data-testid="composer-page-intro"
            className="mt-3 text-base text-muted-foreground sm:text-lg"
          >
            {t("intro_v2_prefix")}
            <strong className="text-foreground">
              {t("intro_v2_count", { count: QUESTIONS.length })}
            </strong>
            {t("intro_v2_suffix")}
          </p>
        </header>

        <ComposerExplainer />

        {staleNotice ? (
          <div
            role="status"
            data-testid="composer-stale-notice"
            className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground"
          >
            <p className="leading-relaxed">{staleNotice}</p>
            <button
              type="button"
              data-testid="composer-stale-dismiss"
              onClick={() => setStaleNotice(null)}
              aria-label={t("dismiss_notice_aria")}
              className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-12" aria-labelledby="composer-h">
          <h2 id="composer-h" className="sr-only">
            {t("form_aria_heading")}
          </h2>

          <section
            aria-labelledby="step-1-h"
            data-testid="composer-pack-chips"
            className="space-y-3"
          >
            <h3 id="step-1-h" className="text-lg font-semibold text-foreground">
              <span className="text-primary">1.</span> {t("step_1_heading")}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {t("step_1_optional")}
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">{t("step_1_body")}</p>
            <PackPreloadChips
              packs={packs}
              selectedSlugs={selectedPackSlugs}
              onToggle={togglePack}
            />
          </section>

          <section
            aria-labelledby="step-2-h"
            data-testid="composer-question-picker"
            className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6"
          >
            <h3 id="step-2-h" className="text-lg font-semibold text-foreground">
              <span className="text-primary">2.</span> {t("step_2_heading")}
            </h3>
            <ComposerStep2Picker
              questions={QUESTIONS}
              selectedIds={selectedIds}
              onToggle={toggleQuestion}
            />
          </section>

          <section
            aria-labelledby="step-3-h"
            data-testid="composer-settings"
            className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6"
          >
            <h3 id="step-3-h" className="text-lg font-semibold text-foreground">
              <span className="text-primary">3.</span> {t("step_3_heading")}
            </h3>
            <ComposerSettings
              passingThreshold={passingThreshold}
              onThresholdChange={setPassingThreshold}
              maxQuestions={maxQuestions}
              onMaxQuestionsChange={setMaxQuestions}
              selectedCount={selectedCount}
              honeypotRatio={honeypotRatio}
              creatorLabel={creatorLabel}
              onCreatorLabelChange={setCreatorLabel}
            />
            <section data-testid="composer-edu-settings-section">
              <EduSettings
                collectsResponses={collectsResponses}
                onToggle={setCollectsResponses}
                authorPassword={authorPassword}
                onPasswordChange={setAuthorPassword}
              />
            </section>
          </section>

          {error ? (
            <div
              role="alert"
              data-testid="composer-error-alert"
              className="rounded-xl border border-destructive/60 bg-destructive/10 p-3 text-sm text-foreground"
            >
              {t("error_block_prefix")} <code>{error}</code>
              {t("error_block_suffix")}
            </div>
          ) : null}
        </form>
      </main>

      {shareToast ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="composer-share-toast"
          className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-[90vw] rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-lg"
        >
          {shareToast}
        </div>
      ) : null}

      <div
        role="region"
        aria-label={t("actions_region_aria")}
        data-testid="composer-actions-region"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:px-6"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p
              aria-live="polite"
              data-testid="composer-selection-summary"
              className={`text-sm font-semibold ${canRun ? "text-foreground" : "text-muted-foreground"}`}
            >
              {!meetsMin
                ? t("min_remaining", {
                    min: COMPOSER_LIMITS.minQuestions,
                    remaining: COMPOSER_LIMITS.minQuestions - selectedCount,
                  })
                : !eduPasswordOk
                  ? t("password_min_len", { min: EDU_PASSWORD_MIN_LEN })
                  : t(collectsResponses ? "selected_summary_edu" : "selected_summary", {
                      count: selectedCount,
                      threshold: passingThreshold,
                    })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="composer-clear-button"
                onClick={clearAll}
                disabled={selectedCount === 0 || submitting}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("clear")}
              </button>
              <button
                type="button"
                data-testid="composer-run-self-button"
                onClick={runForSelf}
                disabled={!canSelfRun}
                title={collectsResponses ? t("run_self_disabled_title") : undefined}
                className="rounded-xl border border-primary/40 bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("run_self")}
              </button>
              <button
                type="button"
                data-testid="composer-submit-button"
                onClick={() => {
                  const form = document.querySelector("form") as HTMLFormElement | null;
                  form?.requestSubmit();
                }}
                disabled={!canRun}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-gradient px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {submitting
                  ? tFor("common")("saving")
                  : collectsResponses
                    ? t("submit_creating_edu")
                    : t("submit_share")}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          {canShareUrl ? (
            <p className="text-right text-xs text-muted-foreground">
              <button
                type="button"
                data-testid="composer-url-copy-button"
                onClick={copyShareUrl}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {t("url_share_button")}
              </button>{" "}
              {t("url_share_hint", { max: COMPOSER_LIMITS.urlShareMaxQuestions })}
            </p>
          ) : null}
        </div>
      </div>

      {eduSuccess ? (
        <EduSuccessDialog
          publicUrl={eduSuccess.publicUrl}
          resultsUrl={eduSuccess.resultsUrl}
          password={eduSuccess.password}
          onClose={() => {
            setEduSuccess(null);
            // Wipe edu state so next test in this session starts clean.
            setCollectsResponses(false);
            setAuthorPassword("");
          }}
        />
      ) : null}

      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title={t("clear_confirm_title")}
        description={t(clearConfirmBodyKey, { n: String(selectedIds.size) })}
        confirmLabel={t("clear_confirm_action")}
        cancelLabel={t("clear_confirm_cancel")}
        destructive
        onConfirm={performClear}
      />
    </div>
  );
}
