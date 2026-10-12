import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { hasConsent, loadConsent } from "@/lib/consent";
import { CONTACT_EMAIL, SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/billing";
import { callBillingApi, orgBillingQueryKey } from "@/lib/billing/client";
import { renderEvidencePdfBlob } from "@/lib/billing/evidence-pdf.client";
import { formatSkDate, verifyUrl, type EvidenceReport } from "@/lib/billing/evidence-types";
import { useQueryClient } from "@tanstack/react-query";

const t = tFor("evidence");
const ORG_NAME_STORAGE_KEY = "subenai.evidence.orgName";

export const Route = createFileRoute("/app/tests/$testId_/doklad")({
  head: () => ({
    meta: [{ title: `${t("title")} | subenai` }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: EvidencePage,
});

type Outcome =
  | { kind: "idle" }
  | { kind: "issued"; report: EvidenceReport; cap: number; used: number }
  | { kind: "no_plan" }
  | { kind: "cap"; cap: number; used: number; requested: number }
  | { kind: "empty" }
  | { kind: "error"; message: string };

function readStoredOrgName(): string {
  try {
    return localStorage.getItem(ORG_NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeOrgName(value: string) {
  if (!hasConsent(loadConsent(), "preferences")) return;
  try {
    localStorage.setItem(ORG_NAME_STORAGE_KEY, value);
  } catch {
    // Private mode / blocked storage: the field simply won't be prefilled next time.
  }
}

function errorMessage(code: string): string {
  const key = `errors.${code}`;
  const msg = t(key, { email: CONTACT_EMAIL });
  return msg === key ? t("errors.default", { email: CONTACT_EMAIL }) : msg;
}

function EvidencePage() {
  const { testId } = Route.useParams();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState(readStoredOrgName);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const orgId = useId();
  const hintId = useId();

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await callBillingApi<{
      report: EvidenceReport;
      allowance: { cap: number; used: number };
    }>("/api/billing/evidence", { testId, orgName });
    setBusy(false);
    if (r.ok) {
      storeOrgName(orgName.trim());
      void queryClient.invalidateQueries({ queryKey: orgBillingQueryKey });
      setOutcome({ kind: "issued", report: r.data.report, ...r.data.allowance });
      return;
    }
    if (r.error === "no_plan") return setOutcome({ kind: "no_plan" });
    if (r.error === "cap_exceeded") {
      const d = r.data as { cap: number; used: number; requested: number };
      return setOutcome({ kind: "cap", cap: d.cap, used: d.used, requested: d.requested });
    }
    if (r.error === "no_finished_sessions") return setOutcome({ kind: "empty" });
    setOutcome({ kind: "error", message: errorMessage(r.error) });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6" data-testid="evidence-page">
      <Link
        to="/app/tests/$testId"
        params={{ testId }}
        className="text-sm text-muted-foreground hover:underline"
        data-testid="evidence-back-link"
      >
        ← {t("back")}
      </Link>
      <header>
        <h1 className="text-2xl font-bold" data-testid="evidence-title">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>

      <form
        onSubmit={generate}
        className="space-y-3 rounded-2xl border border-border p-6"
        data-testid="evidence-form"
      >
        <label htmlFor={orgId} className="text-sm font-medium">
          {t("org_label")}
        </label>
        <Input
          id={orgId}
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          maxLength={160}
          required
          aria-describedby={hintId}
          data-testid="evidence-org-input"
        />
        <p id={hintId} className="text-xs text-muted-foreground">
          {t("org_hint")}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          data-testid="evidence-generate-button"
        >
          {busy ? t("generating") : t("generate")}
        </button>
      </form>

      <div aria-live="polite" data-testid="evidence-outcome">
        <OutcomeView outcome={outcome} />
      </div>
    </div>
  );
}

function Notice(props: {
  testId: string;
  title: string;
  text: string;
  cta?: { href: string; label: string };
  tone?: "error";
}) {
  return (
    <section
      role={props.tone === "error" ? "alert" : undefined}
      className={
        props.tone === "error"
          ? "rounded-2xl border border-destructive/50 p-6 text-destructive"
          : "rounded-2xl border border-border bg-muted/40 p-6"
      }
      data-testid={props.testId}
    >
      {props.title && <h2 className="font-semibold">{props.title}</h2>}
      <p className="mt-1 text-sm">{props.text}</p>
      {props.cta && (
        <a
          href={props.cta.href}
          className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {props.cta.label}
        </a>
      )}
    </section>
  );
}

function OutcomeView({ outcome }: { outcome: Outcome }) {
  switch (outcome.kind) {
    case "idle":
      return null;
    case "no_plan":
      return (
        <Notice
          testId="evidence-no-plan"
          title={t("no_plan_title")}
          text={t("no_plan_text")}
          cta={{ href: "/cennik", label: t("no_plan_cta") }}
        />
      );
    case "cap":
      return (
        <Notice
          testId="evidence-cap-exceeded"
          title={t("cap_title")}
          text={t("cap_text", {
            requested: outcome.requested,
            used: outcome.used,
            cap: outcome.cap,
          })}
          cta={{ href: "/app/billing", label: t("cap_cta") }}
        />
      );
    case "empty":
      return <Notice testId="evidence-empty" title={t("empty_title")} text={t("empty_text")} />;
    case "error":
      return <Notice testId="evidence-error" title="" text={outcome.message} tone="error" />;
    case "issued":
      return <IssuedReport report={outcome.report} cap={outcome.cap} used={outcome.used} />;
  }
}

function IssuedReport({
  report,
  cap,
  used,
}: {
  report: EvidenceReport;
  cap: number;
  used: number;
}) {
  const [pdfState, setPdfState] = useState<"idle" | "busy" | "failed">("idle");
  const url = verifyUrl(SITE_ORIGIN, report.id);

  async function download() {
    setPdfState("busy");
    try {
      const blob = await renderEvidencePdfBlob(report, SITE_ORIGIN);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `doklad-o-preskoleni-${report.generatedAt.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(href);
      setPdfState("idle");
    } catch {
      setPdfState("failed");
    }
  }

  return (
    <section
      className="space-y-5 rounded-2xl border border-border p-6"
      data-testid="evidence-issued"
    >
      <p
        className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
        data-testid="evidence-issued-message"
      >
        {t("issued", { count: report.respondentCount, passed: report.passedCount, used, cap })}
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat
          value={String(report.respondentCount)}
          label={t("summary_respondents")}
          testId="evidence-stat-respondents"
        />
        <Stat
          value={String(report.passedCount)}
          label={t("summary_passed", { score: report.passScore })}
          testId="evidence-stat-passed"
        />
        <Stat
          value={`${report.averageScore} %`}
          label={t("summary_average")}
          testId="evidence-stat-average"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="evidence-table">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-2">{t("col_name")}</th>
              <th className="py-2 pr-2">{t("col_date")}</th>
              <th className="py-2 pr-2 text-right">{t("col_score")}</th>
              <th className="py-2 text-right">{t("col_result")}</th>
            </tr>
          </thead>
          <tbody>
            {report.respondents.map((r, i) => (
              <tr
                key={r.sessionId}
                className="border-b border-border/60"
                data-testid="evidence-table-row"
              >
                <td className="py-2 pr-2">{r.name || t("anonymous", { n: i + 1 })}</td>
                <td className="py-2 pr-2">{formatSkDate(r.finishedAt)}</td>
                <td className="py-2 pr-2 text-right">{r.score} %</td>
                <td
                  className={`py-2 text-right ${r.passed ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
                >
                  {r.passed ? t("passed") : t("failed")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t("certificates_note")}</p>
      <p className="break-all text-xs" data-testid="evidence-verify">
        {t("verify_label")}:{" "}
        <a href={url} className="underline" target="_blank" rel="noreferrer">
          {url}
        </a>{" "}
        · SHA-256 {report.sha256}
      </p>
      <button
        type="button"
        onClick={download}
        disabled={pdfState === "busy"}
        className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        data-testid="evidence-download-button"
      >
        {pdfState === "busy" ? t("downloading") : t("download")}
      </button>
      {pdfState === "failed" && (
        <p role="alert" className="text-sm text-destructive" data-testid="evidence-pdf-error">
          {t("errors.pdf_failed")}
        </p>
      )}
    </section>
  );
}

function Stat({ value, label, testId }: { value: string; label: string; testId: string }) {
  return (
    <div className="rounded-xl bg-muted p-3" data-testid={testId}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
