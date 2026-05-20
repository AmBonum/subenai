import { Link } from "@tanstack/react-router";
import { FileSignature, ShieldCheck } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { CONTACT_EMAIL } from "@/config/site";
import { IS_DPA_FLOW_ENABLED } from "@/lib/dpa/feature-flag";
import { tFor } from "@/i18n/marketing";

// E19.6 — GDPR card with explicit DPA callout.
//
// Replaces the prose GDPR block. Visual treatment: lime accent
// (consistent with hero) and a clearly-labelled DPA callout box that
// surfaces what was previously buried in a mailto deep inside a
// bullet point. Decision-makers see the DPA path immediately.

export function SchoolsGdprCard() {
  const t = tFor("marketing");

  return (
    <section
      className="mt-12 overflow-hidden rounded-2xl border border-success/40 bg-card/50 p-6 md:p-8"
      aria-labelledby="schools-gdpr-heading"
      data-testid="schools-gdpr-card"
    >
      <div className="flex items-center gap-2 text-success">
        <ShieldCheck className="size-5" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-widest">gdpr</p>
      </div>
      <h2
        id="schools-gdpr-heading"
        className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        data-testid="schools-gdpr-heading"
      >
        {t("skoly.gdpr_heading")}
      </h2>

      <p
        className="mt-4 text-sm leading-relaxed text-muted-foreground"
        data-testid="schools-gdpr-intro"
      >
        {t("skoly.gdpr_p_prefix")}
        <strong className="text-foreground">{t("skoly.gdpr_p_controller")}</strong>
        {t("skoly.gdpr_p_middle")}
        <strong>{t("skoly.gdpr_p_entity")}</strong>
        {t("skoly.gdpr_p_middle2")}
        <strong className="text-foreground">{t("skoly.gdpr_p_processor")}</strong>
        {t("skoly.gdpr_p_suffix")}
      </p>

      <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
        <li>
          <strong>{t("skoly.gdpr_li1_emph")}</strong>
          {t("skoly.gdpr_li1_suffix")}
        </li>
        <li>
          <strong>{t("skoly.gdpr_li2_emph")}</strong>
          {t("skoly.gdpr_li2_suffix")}
        </li>
        <li>
          <strong>{t("skoly.gdpr_li4_emph")}</strong>
          {t("skoly.gdpr_li4_prefix")}
          <Link to={ROUTES.privacy} className="underline underline-offset-2">
            {t("skoly.gdpr_li4_link")}
          </Link>
          {t("skoly.gdpr_li4_suffix")}
        </li>
      </ul>

      <div
        className="mt-6 rounded-xl border-2 border-success/60 bg-success/5 p-5"
        data-testid="schools-gdpr-dpa-box"
      >
        <div className="flex items-center gap-2 text-success">
          <FileSignature className="size-4" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-widest">dpa</p>
        </div>
        <h3
          className="mt-1 text-base font-bold text-foreground"
          data-testid="schools-gdpr-dpa-heading"
        >
          {t("skoly.gdpr_dpa_heading")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="schools-gdpr-dpa-body">
          {t("skoly.gdpr_dpa_body")}
        </p>
        {IS_DPA_FLOW_ENABLED ? (
          <Link
            to="/schools/dpa"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground transition-transform hover:-translate-y-0.5"
            data-testid="schools-gdpr-dpa-link"
          >
            {t("skoly.gdpr_dpa_cta")}
          </Link>
        ) : (
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("subenai — DPA pre školu")}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground transition-transform hover:-translate-y-0.5"
            data-testid="schools-gdpr-dpa-link"
          >
            {t("skoly.gdpr_dpa_cta")}
          </a>
        )}
      </div>
    </section>
  );
}
