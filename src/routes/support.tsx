import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { CONTACT_EMAIL, SITE_ORIGIN } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

const ONEOFF_AMOUNTS = [5, 10, 25, 50, 100] as const;
const MONTHLY_TIERS = [5, 10, 25] as const;
const MIN_ONEOFF = 5;
const MAX_ONEOFF = 500;
const FOOTER_THRESHOLD_ONEOFF = 50;
const FOOTER_THRESHOLD_MONTHLY = 25;
const DISPLAY_MESSAGE_MAX = 80;

interface PodporaSearch {
  cancelled?: 1;
}

export const Route = createFileRoute("/support")({
  validateSearch: (search: Record<string, unknown>): PodporaSearch => ({
    cancelled: search.cancelled === "1" || search.cancelled === 1 ? 1 : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Podpora projektu — subenai" },
      {
        name: "description",
        content:
          "Podpor bezplatný vzdelávací projekt o digitálnej bezpečnosti — jednorazovo alebo mesačne. Faktúra na vyžiadanie.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Podpora projektu — subenai" },
      {
        property: "og:description",
        content:
          "Podpor bezplatný vzdelávací projekt o digitálnej bezpečnosti — jednorazovo alebo mesačne.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_ORIGIN}/support` },
      { property: "og:locale", content: "sk_SK" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE_ORIGIN}/support` }],
  }),
  component: PodporaPage,
});

type Mode = "oneoff" | "monthly";
type CustomState = "preset" | "custom";

export function PodporaPage() {
  const search = useSearch({ from: "/support" });
  return <DonateForm cancelled={search.cancelled === 1} />;
}

interface DonateFormProps {
  cancelled?: boolean;
}

export function DonateForm({ cancelled = false }: DonateFormProps) {
  const t = tFor("podpora");
  const [mode, setMode] = useState<Mode>("oneoff");
  const [presetAmount, setPresetAmount] = useState<number | null>(null);
  const [customState, setCustomState] = useState<CustomState>("preset");
  const [customAmountText, setCustomAmountText] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [showInList, setShowInList] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [displayLink, setDisplayLink] = useState("");
  const [displayMessage, setDisplayMessage] = useState("");
  const [showInFooter, setShowInFooter] = useState(false);
  const [consentImmediate, setConsentImmediate] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountEur = useMemo<number | null>(() => {
    if (mode === "monthly") return presetAmount;
    if (customState === "custom") {
      const parsed = Number(customAmountText.replace(",", "."));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    return presetAmount;
  }, [mode, presetAmount, customState, customAmountText]);

  const qualifiesForFooter = useMemo(() => {
    if (amountEur == null) return false;
    return mode === "oneoff"
      ? amountEur >= FOOTER_THRESHOLD_ONEOFF
      : amountEur >= FOOTER_THRESHOLD_MONTHLY;
  }, [amountEur, mode]);

  const amountValid = useMemo(() => {
    if (amountEur == null) return false;
    if (mode === "oneoff") return amountEur >= MIN_ONEOFF && amountEur <= MAX_ONEOFF;
    return MONTHLY_TIERS.includes(amountEur as (typeof MONTHLY_TIERS)[number]);
  }, [amountEur, mode]);

  const displayValid = !showInList || displayName.trim().length > 0;
  const linkValid = !showInList || !displayLink.trim() || displayLink.trim().startsWith("https://");
  const messageValid = displayMessage.length <= DISPLAY_MESSAGE_MAX;
  const consentsValid = consentImmediate && consentData;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nameValid = name.trim().length > 0;

  const canSubmit =
    amountValid &&
    emailValid &&
    nameValid &&
    displayValid &&
    linkValid &&
    messageValid &&
    consentsValid &&
    !submitting;

  function handleModeChange(next: Mode) {
    setMode(next);
    setPresetAmount(null);
    setCustomState("preset");
    setCustomAmountText("");
  }

  function handlePresetClick(value: number) {
    setPresetAmount(value);
    setCustomState("preset");
  }

  function handleCustomClick() {
    setCustomState("custom");
    setPresetAmount(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || amountEur == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          amount_eur: amountEur,
          email: email.trim(),
          name: name.trim(),
          tax_id: taxId.trim() || undefined,
          show_in_list: showInList,
          display_name: showInList ? displayName.trim() : undefined,
          display_link: showInList ? displayLink.trim() : undefined,
          display_message: showInList ? displayMessage.trim() : undefined,
          show_in_footer: showInFooter && qualifiesForFooter,
          consent_immediate_start: consentImmediate,
          consent_data_processing: consentData,
        }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "checkout_failed");
        setSubmitting(false);
        return;
      }
      window.location.href = payload.url;
    } catch {
      setError("network_error");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-8">
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            {t("back_home")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            {t("hero")}{" "}
            <Link
              to={ROUTES.oProjecte}
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {t("hero_link_about")}
            </Link>
            .
          </p>
        </header>

        {cancelled ? (
          <div
            role="status"
            data-testid="podpora-cancelled-banner"
            className="mb-6 rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground"
          >
            {t("cancelled_banner")}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          data-testid="podpora-form"
          className="space-y-8 rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
          aria-labelledby="podpora-h1"
        >
          <h2 id="podpora-h1" className="sr-only">
            {t("form_aria")}
          </h2>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">
              {t("section_frequency")}
            </legend>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label={t("section_frequency")}
            >
              {(["oneoff", "monthly"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  data-testid={`podpora-mode-${m}`}
                  onClick={() => handleModeChange(m)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    mode === m
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "oneoff" ? t("mode_oneoff") : t("mode_monthly")}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">
              {mode === "monthly" ? t("section_amount_monthly") : t("section_amount_oneoff")}
            </legend>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={t("section_amount_aria")}
            >
              {(mode === "oneoff" ? ONEOFF_AMOUNTS : MONTHLY_TIERS).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={presetAmount === value && customState === "preset"}
                  data-testid={`podpora-amount-${value}`}
                  onClick={() => handlePresetClick(value)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    presetAmount === value && customState === "preset"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {value} €
                </button>
              ))}
              {mode === "oneoff" ? (
                <button
                  type="button"
                  role="radio"
                  aria-checked={customState === "custom"}
                  data-testid="podpora-amount-custom"
                  onClick={handleCustomClick}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    customState === "custom"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("custom_amount")}
                </button>
              ) : null}
            </div>
            {mode === "oneoff" && customState === "custom" ? (
              <div className="pt-2">
                <label htmlFor="custom-amount" className="text-xs text-muted-foreground">
                  {t("custom_amount_label")}
                </label>
                <input
                  id="custom-amount"
                  data-testid="podpora-amount-custom-input"
                  type="number"
                  inputMode="decimal"
                  min={MIN_ONEOFF}
                  max={MAX_ONEOFF}
                  step="0.01"
                  value={customAmountText}
                  onChange={(e) => setCustomAmountText(e.target.value)}
                  placeholder={t("custom_amount_placeholder")}
                  className="mt-1 w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  aria-invalid={!amountValid && customAmountText.length > 0}
                />
              </div>
            ) : null}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">
              {t("section_invoice")}
            </legend>
            <div className="space-y-3">
              <Field
                id="email"
                label={t("field_email")}
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="email"
                required
                hint={t("field_email_hint")}
              />
              <Field
                id="name"
                label={t("field_name")}
                value={name}
                onChange={setName}
                autoComplete="name"
                required
                hint={t("field_name_hint")}
              />
              <Field
                id="tax-id"
                label={t("field_tax_id")}
                value={taxId}
                onChange={setTaxId}
                hint={t("field_tax_id_hint")}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">{t("section_public")}</legend>
            <CheckboxRow
              id="show-in-list"
              checked={showInList}
              onChange={setShowInList}
              label={t("show_in_list")}
            />
            {showInList ? (
              <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
                <Field
                  id="display-name"
                  label={t("display_name")}
                  value={displayName}
                  onChange={setDisplayName}
                  required
                />
                <Field
                  id="display-link"
                  label={t("display_link")}
                  value={displayLink}
                  onChange={setDisplayLink}
                  type="url"
                  hint={
                    !linkValid && displayLink.trim().length > 0
                      ? t("display_link_hint_invalid")
                      : undefined
                  }
                />
                <div>
                  <label htmlFor="display-message" className="text-sm font-medium text-foreground">
                    {t("display_message")}
                  </label>
                  <textarea
                    id="display-message"
                    data-testid="podpora-field-display-message"
                    value={displayMessage}
                    onChange={(e) =>
                      setDisplayMessage(e.target.value.slice(0, DISPLAY_MESSAGE_MAX))
                    }
                    maxLength={DISPLAY_MESSAGE_MAX}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("display_message_counter", {
                      remaining: DISPLAY_MESSAGE_MAX - displayMessage.length,
                    })}
                  </p>
                </div>
                <CheckboxRow
                  id="show-in-footer"
                  checked={showInFooter}
                  onChange={setShowInFooter}
                  disabled={!qualifiesForFooter}
                  label={
                    qualifiesForFooter
                      ? t("show_in_footer")
                      : t("show_in_footer_disabled", {
                          oneoff: FOOTER_THRESHOLD_ONEOFF,
                          monthly: FOOTER_THRESHOLD_MONTHLY,
                        })
                  }
                />
              </div>
            ) : null}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">
              {t("section_consents")}
            </legend>
            <CheckboxRow
              id="consent-immediate"
              checked={consentImmediate}
              onChange={setConsentImmediate}
              required
              label={<span>{t("consent_immediate")}</span>}
            />
            <CheckboxRow
              id="consent-data"
              checked={consentData}
              onChange={setConsentData}
              required
              label={
                <span>
                  {t("consent_data_prefix")}
                  <Link to={ROUTES.privacy} className="underline underline-offset-2">
                    {t("consent_data_link")}
                  </Link>
                  .
                </span>
              }
            />
          </fieldset>

          {error ? (
            <div
              role="alert"
              data-testid="podpora-error-banner"
              className="rounded-xl border border-destructive/60 bg-destructive/10 p-3 text-sm text-foreground"
            >
              {t("error_prefix")}
              <code>{error}</code>
              {t("error_suffix")}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </div>
          ) : null}

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              data-testid="podpora-submit-button"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting
                ? t("submit_redirecting")
                : amountEur != null
                  ? mode === "monthly"
                    ? t("submit_with_amount_monthly", { amount: amountEur })
                    : t("submit_with_amount_oneoff", { amount: amountEur })
                  : t("submit_default")}
              <span aria-hidden="true">→</span>
            </button>
            <p className="text-xs text-muted-foreground">
              {t("footer_legal")} <strong>{t("footer_legal_entity")}</strong>{" "}
              {t("footer_legal_country")} <strong>{t("footer_legal_cancel")}</strong>{" "}
              {t("footer_legal_end")}
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: "text" | "email" | "url";
  autoComplete?: string;
  required?: boolean;
  hint?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  hint,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label} {required ? <span aria-hidden="true">*</span> : null}
      </label>
      <input
        id={id}
        data-testid={`podpora-field-${id}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

interface CheckboxRowProps {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
}

function CheckboxRow({ id, checked, onChange, label, disabled, required }: CheckboxRowProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 text-sm leading-relaxed ${
        disabled ? "text-muted-foreground/60" : "text-foreground"
      }`}
    >
      <input
        id={id}
        data-testid={`podpora-checkbox-${id}`}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        required={required}
        className="mt-1 h-4 w-4 shrink-0 rounded border-border bg-background"
      />
      <span>{label}</span>
    </label>
  );
}
