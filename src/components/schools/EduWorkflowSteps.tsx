import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

// E19.3 — 4-step edu-mode workflow visualization.
//
// Replaces the four prose <section> blocks with structured step cards.
// Each card has a lime step-number badge, the original Slovak copy
// (unchanged i18n keys), a one-line outcome statement (new
// step{n}_outcome key), and an inline abstract SVG illustration —
// no external assets, no <img>, aria-hidden so the SR experience is
// purely textual.
//
// The four SVGs are deliberately abstract geometric — quill +
// checkboxes (compose), lock + key (password), envelope + arrow
// (send), bar chart (results). They live as inline JSX so the
// build pipeline stays simple (no Vite SVG plugin needed) and so
// translation surface stays zero.

interface StepCardProps {
  num: number;
  heading: string;
  outcome: string;
  body: ReactNode;
  illustration: ReactNode;
}

function StepCard({ num, heading, outcome, body, illustration }: StepCardProps) {
  return (
    <li
      className="relative grid gap-5 rounded-2xl border border-border/60 bg-card/40 p-5 md:grid-cols-[120px_1fr_120px] md:items-center md:p-6"
      data-testid={`schools-workflow-step-${num}`}
    >
      <div className="flex items-center gap-3 md:flex-col md:items-start">
        <span
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-success/20 text-base font-black text-success ring-2 ring-success/40"
          data-testid={`schools-workflow-step-${num}-badge`}
          aria-label={`krok ${num}`}
        >
          {num}
        </span>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {num} / 4
        </p>
      </div>
      <div>
        <h3
          className="text-lg font-bold text-foreground md:text-xl"
          data-testid={`schools-workflow-step-${num}-heading`}
        >
          {heading}
        </h3>
        <div
          className="mt-2 text-sm leading-relaxed text-muted-foreground"
          data-testid={`schools-workflow-step-${num}-body`}
        >
          {body}
        </div>
        <p
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
          data-testid={`schools-workflow-step-${num}-outcome`}
        >
          → {outcome}
        </p>
      </div>
      <div
        className="flex justify-end opacity-90"
        data-testid={`schools-workflow-step-${num}-illustration`}
      >
        {illustration}
      </div>
    </li>
  );
}

// Inline SVG illustrations — no external assets, no text nodes.
// Width/height cap at 120×80 per the plan. All are aria-hidden.

function IllustrationCompose() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      <rect
        x="14"
        y="12"
        width="76"
        height="56"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-success/70"
      />
      <path
        d="M22 28h36M22 38h54M22 48h42M22 58h28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-foreground/40"
      />
      <rect
        x="76"
        y="32"
        width="32"
        height="32"
        rx="4"
        fill="currentColor"
        className="text-success/20"
      />
      <path
        d="M83 48l5 5 10-12"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-success"
      />
    </svg>
  );
}

function IllustrationLock() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      <rect
        x="34"
        y="36"
        width="52"
        height="34"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-success/70"
      />
      <path
        d="M44 36v-8a16 16 0 0132 0v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-success"
      />
      <circle cx="60" cy="50" r="4" fill="currentColor" className="text-success" />
      <path
        d="M60 54v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-success"
      />
      <circle cx="96" cy="22" r="3" fill="currentColor" className="text-success/50" />
      <circle cx="22" cy="58" r="2" fill="currentColor" className="text-success/30" />
    </svg>
  );
}

function IllustrationSend() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      <rect
        x="14"
        y="22"
        width="60"
        height="40"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-success/70"
      />
      <path
        d="M14 22l30 22 30-22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-success"
      />
      <path
        d="M82 42h28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-foreground/50"
      />
      <path
        d="M100 34l10 8-10 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground/50"
      />
    </svg>
  );
}

function IllustrationChart() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      <path
        d="M14 70h92"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-foreground/40"
      />
      <rect
        x="22"
        y="48"
        width="14"
        height="22"
        rx="2"
        fill="currentColor"
        className="text-success/30"
      />
      <rect
        x="42"
        y="32"
        width="14"
        height="38"
        rx="2"
        fill="currentColor"
        className="text-success/60"
      />
      <rect
        x="62"
        y="40"
        width="14"
        height="30"
        rx="2"
        fill="currentColor"
        className="text-success/50"
      />
      <rect
        x="82"
        y="20"
        width="14"
        height="50"
        rx="2"
        fill="currentColor"
        className="text-success"
      />
      <circle cx="29" cy="14" r="3" fill="currentColor" className="text-success/40" />
      <circle cx="89" cy="10" r="3" fill="currentColor" className="text-success" />
      <path
        d="M29 14l60-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-success/50"
      />
    </svg>
  );
}

export function EduWorkflowSteps() {
  const t = tFor("marketing");

  return (
    <section
      className="mt-12"
      aria-labelledby="schools-workflow-heading"
      data-testid="schools-workflow"
    >
      <h2
        id="schools-workflow-heading"
        className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        data-testid="schools-workflow-heading"
      >
        {t("skoly.workflow_heading")}
      </h2>
      <p
        className="mt-2 max-w-2xl text-sm text-muted-foreground"
        data-testid="schools-workflow-subheading"
      >
        {t("skoly.workflow_subheading")}
      </p>

      <ol className="mt-6 grid gap-4" data-testid="schools-workflow-steps">
        <StepCard
          num={1}
          heading={t("skoly.step1_heading")}
          outcome={t("skoly.step1_outcome")}
          illustration={<IllustrationCompose />}
          body={
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                {t("skoly.step1_li1_prefix")}
                <Link to={ROUTES.zostav} className="underline underline-offset-2">
                  {t("skoly.step1_li1_link")}
                </Link>
                {t("skoly.step1_li1_suffix")}
              </li>
              <li>{t("skoly.step1_li2")}</li>
              <li>{t("skoly.step1_li3")}</li>
            </ol>
          }
        />
        <StepCard
          num={2}
          heading={t("skoly.step2_heading")}
          outcome={t("skoly.step2_outcome")}
          illustration={<IllustrationLock />}
          body={
            <>
              <p>
                {t("skoly.step2_p1_prefix")}
                <strong>{t("skoly.step2_p1_settings")}</strong>
                {t("skoly.step2_p1_middle")}
                <strong>{t("skoly.step2_p1_password")}</strong>
                {t("skoly.step2_p1_middle2")}
                <strong className="text-foreground">{t("skoly.step2_p1_emph")}</strong>
              </p>
              <p className="mt-2">
                {t("skoly.step2_p2_prefix")}
                <em>{t("skoly.step2_p2_button")}</em>
                {t("skoly.step2_p2_suffix")}
              </p>
            </>
          }
        />
        <StepCard
          num={3}
          heading={t("skoly.step3_heading")}
          outcome={t("skoly.step3_outcome")}
          illustration={<IllustrationSend />}
          body={
            <>
              <p>
                {t("skoly.step3_p_prefix")}
                <strong>{t("skoly.step3_p_emph")}</strong>
                {t("skoly.step3_p_suffix")}
              </p>
              <details className="mt-3 rounded-lg border border-border/60 bg-background/60 p-3">
                <summary
                  className="cursor-pointer font-semibold text-foreground"
                  data-testid="schools-workflow-step-3-email-summary"
                >
                  {t("skoly.step3_email_summary")}
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs text-foreground">
                  {t("skoly.step3_email_template")}
                </pre>
              </details>
            </>
          }
        />
        <StepCard
          num={4}
          heading={t("skoly.step4_heading")}
          outcome={t("skoly.step4_outcome")}
          illustration={<IllustrationChart />}
          body={
            <>
              <p>
                {t("skoly.step4_p_prefix")}
                <strong>{t("skoly.step4_p_emph")}</strong>
                {t("skoly.step4_p_suffix")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{t("skoly.step4_li1")}</li>
                <li>{t("skoly.step4_li2")}</li>
                <li>{t("skoly.step4_li3")}</li>
                <li>{t("skoly.step4_li4")}</li>
                <li>
                  <strong>{t("skoly.step4_li5_emph")}</strong>
                  {t("skoly.step4_li5_suffix")}
                </li>
              </ul>
              <p className="mt-2">{t("skoly.step4_session")}</p>
            </>
          }
        />
      </ol>
    </section>
  );
}
