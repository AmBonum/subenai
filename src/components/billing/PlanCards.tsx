import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { CONTACT_EMAIL } from "@/config/site";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { tFor } from "@/i18n/billing";
import { cn } from "@/lib/utils";

const t = tFor("pricing");
const tObj = tFor.object("pricing");

function pricePerPerson(priceEur: number, cap: number): string {
  return (priceEur / cap).toLocaleString("sk-SK", { maximumFractionDigits: 2 });
}

function Points({ items, testId }: { items: string[]; testId: string }) {
  return (
    <ul className="mt-4 space-y-2 text-sm" data-testid={testId}>
      {items.map((p) => (
        <li key={p} className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  /** Paid-plan CTA: a link target, or a handler when the card sits inside /app/billing. */
  planHref?: (id: PlanId) => string;
  onSelectPlan?: (id: PlanId) => void;
  selected?: PlanId | null;
  showFree?: boolean;
}

export function PlanCards({ planHref, onSelectPlan, selected = null, showFree = true }: Props) {
  const paidPoints = tObj<string[]>("paid_points") ?? [];
  return (
    <div
      className={cn("grid gap-4", showFree ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3")}
      data-testid="billing-plan-cards"
    >
      {showFree && (
        <article
          className="flex flex-col rounded-2xl border border-border bg-card p-6"
          data-testid="billing-plan-card-free"
        >
          <h3 className="text-lg font-semibold">{t("free_name")}</h3>
          <p className="text-sm text-muted-foreground">{t("free_tagline")}</p>
          <p className="mt-4 text-3xl font-bold">{t("free_price")}</p>
          <Points
            items={tObj<string[]>("free_points") ?? []}
            testId="billing-plan-card-free-points"
          />
          <Link
            to="/sablony"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent"
            data-testid="billing-plan-card-free-cta"
          >
            {t("free_cta")}
          </Link>
        </article>
      )}
      {PLANS.map((plan) => {
        const isSelected = selected === plan.id;
        const cta = t("buy");
        const ctaClass =
          "mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
        return (
          <article
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-6",
              plan.recommended ? "border-primary shadow-lg" : "border-border",
              isSelected && "ring-2 ring-primary",
            )}
            data-testid={`billing-plan-card-${plan.id}`}
            aria-current={isSelected ? "true" : undefined}
          >
            {plan.recommended && (
              <span
                className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground"
                data-testid={`billing-plan-card-${plan.id}-badge`}
              >
                {t("recommended")}
              </span>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="text-sm text-muted-foreground">{plan.tagline}</p>
            <p
              className="mt-4 text-3xl font-bold"
              data-testid={`billing-plan-card-${plan.id}-price`}
            >
              {plan.priceEur} €{" "}
              <span className="text-base font-normal text-muted-foreground">{t("per_year")}</span>
            </p>
            <p className="mt-1 text-sm" data-testid={`billing-plan-card-${plan.id}-cap`}>
              {t("respondents", { count: plan.respondentCap })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("per_person", { price: pricePerPerson(plan.priceEur, plan.respondentCap) })}
            </p>
            <Points items={paidPoints} testId={`billing-plan-card-${plan.id}-points`} />
            <div className="mt-auto" />
            {onSelectPlan ? (
              <button
                type="button"
                className={ctaClass}
                onClick={() => onSelectPlan(plan.id)}
                aria-pressed={isSelected}
                data-testid={`billing-plan-card-${plan.id}-cta`}
              >
                {cta}
              </button>
            ) : (
              <a
                href={planHref?.(plan.id) ?? `/app/billing?plan=${plan.id}`}
                className={ctaClass}
                data-testid={`billing-plan-card-${plan.id}-cta`}
              >
                {cta}
              </a>
            )}
          </article>
        );
      })}
      {showFree && (
        <article
          className="flex flex-col rounded-2xl border border-dashed border-border p-6 md:col-span-2 xl:col-span-4"
          data-testid="billing-plan-card-custom"
        >
          <h3 className="text-lg font-semibold">{t("custom_name")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("custom_text")}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("subenai pre organizáciu 250+")}`}
            className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            data-testid="billing-plan-card-custom-cta"
          >
            {t("custom_cta")}
          </a>
        </article>
      )}
    </div>
  );
}
