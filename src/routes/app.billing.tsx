import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";

import { PlanCards } from "@/components/billing/PlanCards";
import { Checkbox } from "@/components/ui/checkbox";
import { CONTACT_EMAIL } from "@/config/site";
import { tFor } from "@/i18n/billing";
import { callBillingApi, useOrgBilling } from "@/lib/billing/client";
import { formatSkDate } from "@/lib/billing/evidence-types";
import { getPlan, isActiveSubscription, PLANS, type PlanId } from "@/lib/billing/plans";

const t = tFor("billing");

interface Search {
  plan?: PlanId;
  checkout?: "success";
}

export const Route = createFileRoute("/app/billing")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    plan: PLANS.some((p) => p.id === search.plan) ? (search.plan as PlanId) : undefined,
    checkout: search.checkout === "success" ? "success" : undefined,
  }),
  head: () => ({
    meta: [{ title: `${t("title")} | subenai` }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: BillingPage,
});

function errorMessage(code: string): string {
  const key = `errors.${code}`;
  const msg = t(key, { email: CONTACT_EMAIL });
  return msg === key ? t("errors.default", { email: CONTACT_EMAIL }) : msg;
}

function BillingPage() {
  const search = Route.useSearch();
  const awaitingWebhook = search.checkout === "success";
  const billing = useOrgBilling({ pollUntilActive: awaitingWebhook });
  const sub = billing.data?.subscription ?? null;
  const active = isActiveSubscription(sub, new Date());

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6" data-testid="billing-page">
      <header>
        <h1 className="text-2xl font-bold" data-testid="billing-title">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>

      <div aria-live="polite" data-testid="billing-live-region">
        {awaitingWebhook && !active && (
          <p
            className="rounded-lg border border-border bg-muted px-4 py-3 text-sm"
            data-testid="billing-success-pending"
          >
            {t("success_pending")}
          </p>
        )}
        {awaitingWebhook && active && sub && (
          <p
            className="rounded-lg border border-emerald-600/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
            data-testid="billing-success-done"
          >
            {t("success_done", { plan: getPlan(sub.plan)?.name ?? sub.plan })}
          </p>
        )}
      </div>

      {billing.isPending ? (
        <div className="h-32 animate-pulse rounded-2xl bg-muted" data-testid="billing-loading" />
      ) : billing.isError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 px-4 py-3 text-sm text-destructive"
          data-testid="billing-load-error"
        >
          {t("load_error", { email: CONTACT_EMAIL })}
        </p>
      ) : active && sub ? (
        <ActivePlan
          planName={getPlan(sub.plan)?.name ?? sub.plan}
          periodEnd={sub.current_period_end}
          cancelAtPeriodEnd={sub.cancel_at_period_end}
          used={billing.data?.usedInPeriod ?? 0}
          cap={sub.respondent_cap}
        />
      ) : (
        <ChoosePlan initialPlan={search.plan ?? null} hasPastSubscription={sub !== null} />
      )}
    </div>
  );
}

function ManageButton() {
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  });
  async function open() {
    setState({ busy: true, error: null });
    const r = await callBillingApi<{ url: string }>("/api/billing/portal", {});
    if (r.ok) {
      window.location.assign(r.data.url);
      return;
    }
    setState({ busy: false, error: errorMessage(r.error) });
  }
  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={state.busy}
        className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-semibold hover:bg-accent disabled:opacity-60"
        data-testid="billing-manage-button"
      >
        {state.busy ? t("manage_loading") : t("manage")}
      </button>
      {state.error && (
        <p
          role="alert"
          className="mt-2 text-sm text-destructive"
          data-testid="billing-manage-error"
        >
          {state.error}
        </p>
      )}
    </div>
  );
}

function ActivePlan(props: {
  planName: string;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
  used: number;
  cap: number;
}) {
  const pct = Math.min(100, Math.round((props.used / props.cap) * 100));
  return (
    <section
      className="space-y-4 rounded-2xl border border-border p-6"
      data-testid="billing-active"
    >
      <h2 className="text-xl font-semibold" data-testid="billing-active-plan">
        {t("status_active", { plan: props.planName })}
      </h2>
      <p className="text-sm text-muted-foreground" data-testid="billing-active-period">
        {props.cancelAtPeriodEnd
          ? t("status_ends", { date: formatSkDate(props.periodEnd) })
          : t("status_renews", { date: formatSkDate(props.periodEnd) })}
      </p>
      <div>
        <p className="text-sm" data-testid="billing-active-usage">
          {t("usage", { used: props.used, cap: props.cap })}
        </p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={props.cap}
          aria-valuenow={props.used}
          data-testid="billing-active-usage-bar"
        >
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ManageButton />
      <p className="text-xs text-muted-foreground">{t("upgrade_hint", { email: CONTACT_EMAIL })}</p>
    </section>
  );
}

function ChoosePlan({
  initialPlan,
  hasPastSubscription,
}: {
  initialPlan: PlanId | null;
  hasPastSubscription: boolean;
}) {
  const [plan, setPlan] = useState<PlanId | null>(initialPlan);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentImmediate, setConsentImmediate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const termsId = useId();
  const immediateId = useId();
  const selected = plan ? getPlan(plan) : undefined;

  async function pay() {
    if (!selected) return;
    if (!consentTerms) return setError(errorMessage("missing_consent_terms"));
    if (!consentImmediate) return setError(errorMessage("missing_consent_immediate"));
    setBusy(true);
    setError(null);
    const r = await callBillingApi<{ url: string }>("/api/billing/checkout", {
      plan: selected.id,
      consent_terms: true,
      consent_immediate: true,
    });
    if (r.ok) {
      window.location.assign(r.data.url);
      return;
    }
    setBusy(false);
    setError(errorMessage(r.error));
  }

  return (
    <section className="space-y-6" data-testid="billing-choose">
      <div>
        <h2 className="text-xl font-semibold">{t("none_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("none_text")}</p>
      </div>
      {hasPastSubscription && <ManageButton />}
      <h3 className="font-semibold">{t("choose")}</h3>
      <PlanCards showFree={false} selected={plan} onSelectPlan={setPlan} />
      {selected && (
        <div
          className="space-y-4 rounded-2xl border border-border p-6"
          data-testid="billing-checkout-form"
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id={termsId}
              checked={consentTerms}
              onCheckedChange={(v) => setConsentTerms(v === true)}
              data-testid="billing-consent-terms"
            />
            <label htmlFor={termsId} className="text-sm leading-snug">
              {t("consent_terms")}{" "}
              <a
                href="/obchodne-podmienky"
                className="underline"
                target="_blank"
                rel="noreferrer"
                data-testid="billing-consent-terms-link"
              >
                {t("consent_terms_link")}
              </a>
              {" · "}
              <a
                href="/privacy"
                className="underline"
                target="_blank"
                rel="noreferrer"
                data-testid="billing-consent-privacy-link"
              >
                {t("consent_privacy_link")}
              </a>
            </label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id={immediateId}
              checked={consentImmediate}
              onCheckedChange={(v) => setConsentImmediate(v === true)}
              data-testid="billing-consent-immediate"
            />
            <label htmlFor={immediateId} className="text-sm leading-snug">
              {t("consent_immediate")}
            </label>
          </div>
          <button
            type="button"
            onClick={pay}
            disabled={busy}
            className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            data-testid="billing-pay-button"
          >
            {busy ? t("paying") : t("pay", { price: selected.priceEur })}
          </button>
          <div aria-live="assertive">
            {error && (
              <p
                role="alert"
                className="text-sm text-destructive"
                data-testid="billing-checkout-error"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
