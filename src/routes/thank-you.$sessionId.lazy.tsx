import { useEffect, useRef, useState } from "react";
import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";
import { CONTACT_EMAIL } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 30000;

type Status = "loading" | "ready" | "pending" | "unpaid" | "not_found" | "timeout" | "error";

interface DonationDto {
  amount_eur: number;
  currency: string;
  kind: "oneoff" | "subscription_invoice";
  created_at: string;
  invoice_pdf_url: string | null;
}

interface DonationStatusResponse {
  status: "ready" | "pending" | "unpaid" | "not_found";
  is_subscription?: boolean;
  donation?: DonationDto;
  sponsor_display_name?: string | null;
  has_customer?: boolean;
}

export const Route = createLazyFileRoute("/thank-you/$sessionId")({
  component: PodakovaniePage,
});

function PodakovaniePage() {
  const { sessionId } = useParams({ from: "/thank-you/$sessionId" });
  return <ThankYouView sessionId={sessionId} />;
}

interface ThankYouViewProps {
  sessionId: string;
}

export function ThankYouView({ sessionId }: ThankYouViewProps) {
  const t = tFor("podakovanie");
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<DonationStatusResponse | null>(null);
  const [portalSubmitting, setPortalSubmitting] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const response = await fetch(
          `/api/donation-status?session_id=${encodeURIComponent(sessionId)}`,
          { headers: { accept: "application/json" } },
        );
        if (cancelled) return;

        if (response.status === 404) {
          setStatus("not_found");
          return;
        }
        if (!response.ok) {
          setStatus("error");
          return;
        }

        const payload = (await response.json()) as DonationStatusResponse;
        if (cancelled) return;
        setData(payload);

        if (payload.status === "ready") {
          setStatus("ready");
          return;
        }
        if (payload.status === "not_found") {
          setStatus("not_found");
          return;
        }
        if (payload.status === "unpaid") {
          setStatus("unpaid");
          return;
        }

        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed >= POLL_MAX_MS) {
          setStatus("timeout");
          return;
        }
        setStatus("pending");
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  async function openCustomerPortal() {
    setPortalSubmitting(true);
    setPortalError(null);
    try {
      const response = await fetch("/api/customer-portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setPortalError(payload.error ?? "portal_failed");
        setPortalSubmitting(false);
        return;
      }
      window.location.href = payload.url;
    } catch {
      setPortalError("network_error");
      setPortalSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-8">
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            {t("back_home")}
          </Link>
        </header>

        {status === "loading" || status === "pending" ? (
          <PendingState />
        ) : status === "ready" && data?.donation ? (
          <ReadyState
            donation={data.donation}
            sponsorDisplayName={data.sponsor_display_name ?? null}
            isSubscription={data.is_subscription === true}
            portalSubmitting={portalSubmitting}
            portalError={portalError}
            onOpenPortal={openCustomerPortal}
          />
        ) : status === "unpaid" ? (
          <UnpaidState />
        ) : status === "timeout" ? (
          <TimeoutState />
        ) : status === "not_found" ? (
          <NotFoundState />
        ) : (
          <ErrorState />
        )}
      </main>
    </div>
  );
}

function PendingState() {
  const t = tFor("podakovanie");
  return (
    <section
      role="status"
      aria-live="polite"
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-8 text-center"
    >
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pending_title")}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("pending_body")}</p>
      <div className="mx-auto h-2 w-32 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full w-1/3 animate-pulse bg-primary" />
      </div>
    </section>
  );
}

interface ReadyStateProps {
  donation: DonationDto;
  sponsorDisplayName: string | null;
  isSubscription: boolean;
  portalSubmitting: boolean;
  portalError: string | null;
  onOpenPortal: () => void;
}

function ReadyState({
  donation,
  sponsorDisplayName,
  isSubscription,
  portalSubmitting,
  portalError,
  onOpenPortal,
}: ReadyStateProps) {
  const t = tFor("podakovanie");
  const greeting = sponsorDisplayName
    ? t("ready_greeting_named", { name: sponsorDisplayName })
    : t("ready_greeting_default");
  const dateLabel = new Date(donation.created_at).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const kindLabel = isSubscription ? t("kind_subscription") : t("kind_oneoff");
  const amountLabel = `${donation.amount_eur.toFixed(2)} ${donation.currency.toUpperCase()}${
    isSubscription ? "/mes" : ""
  }`;

  return (
    <section className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-primary/40 bg-card p-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {greeting}
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          {kindLabel}: <strong className="text-foreground">{amountLabel}</strong>
        </p>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">{t("invoice_heading")}</h2>
        {donation.invoice_pdf_url ? (
          <a
            href={donation.invoice_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
          >
            {t("invoice_download")}
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{t("invoice_pending")}</p>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("invoice_issuer_prefix")} <strong>{t("invoice_issuer_entity")}</strong>
          {t("invoice_issuer_suffix")}
        </p>
      </div>

      {isSubscription ? (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">{t("subscription_heading")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("subscription_body_prefix")}
            <strong>{t("subscription_body_cancel")}</strong>
            {t("subscription_body_suffix")}
          </p>
          <button
            type="button"
            onClick={onOpenPortal}
            disabled={portalSubmitting}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40 disabled:opacity-50"
          >
            {portalSubmitting ? t("subscription_opening") : t("subscription_manage")}
            <span aria-hidden="true">→</span>
          </button>
          {portalError ? (
            <p role="alert" className="text-sm text-foreground">
              {t("subscription_error_prefix")}
              <code>{portalError}</code>
              {t("subscription_error_suffix")}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          {t("breakdown_prefix")}
          <Link
            to={ROUTES.oProjecte}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {t("breakdown_link_about")}
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function UnpaidState() {
  const t = tFor("podakovanie");
  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("unpaid_title")}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("unpaid_body")}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
      <Link
        to={ROUTES.podpora}
        className="inline-flex items-center gap-2 rounded-2xl bg-accent-gradient px-6 py-3 text-sm font-bold text-primary-foreground"
      >
        {t("unpaid_cta")}
      </Link>
    </section>
  );
}

function TimeoutState() {
  const t = tFor("podakovanie");
  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("timeout_title")}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("timeout_body_prefix")}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>
        {t("timeout_body_suffix")}
      </p>
    </section>
  );
}

function NotFoundState() {
  const t = tFor("podakovanie");
  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("not_found_title")}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("not_found_body")}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </section>
  );
}

function ErrorState() {
  const t = tFor("podakovanie");
  return (
    <section className="space-y-4 rounded-2xl border border-destructive/60 bg-card p-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("error_title")}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("error_body")}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </section>
  );
}
