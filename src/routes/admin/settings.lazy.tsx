import { createLazyFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  AlertTriangle,
  FileWarning,
  Calendar,
  ExternalLink,
  BellRing,
  ChevronRight,
} from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IS_DPA_FLOW_ENABLED,
  IS_DPA_DRAFT_WATERMARK_ENABLED,
  DEFAULT_DPA_TEMPLATE_VERSION,
  DPA_RETENTION_MONTHS,
} from "@/lib/dpa/feature-flag";
import { SUB_PROCESSORS } from "@/lib/dpa/sub-processors";
import { tFor } from "@/i18n/admin";

export const Route = createLazyFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

// E40 close-out — the previous /admin/settings was a placeholder form
// that did nothing (a stub from AH-10 with a "deferred_notice" yellow
// card). Replaced with a real read-only GDPR/compliance dashboard.
//
// Why read-only and not a DB-backed config table:
//   The values surfaced here come from Vite build-time env vars
//   (`VITE_DPA_FLOW_ENABLED`, `VITE_DPA_TEMPLATE_DRAFT_WATERMARK`) plus
//   the migration that defines `anonymize_expired_dpa_requests()`.
//   Moving them to a DB table would let admins toggle without redeploy,
//   BUT the trade-off is real: env vars get audited as part of the
//   Cloudflare Pages deploy log, DB rows don't (the existing
//   `cms_audit_events` table covers CMS singletons but not platform
//   config). For the legal-sensitive watermark flag in particular,
//   the deploy-time audit trail is a feature, not a bug — flipping
//   it accidentally via a misclicked admin toggle would publish
//   unwatermarked draft DPAs.
//
// The page documents the current state + the runbook procedure for
// changing it (CF Pages env → redeploy). When a future iteration adds
// runtime toggles, swap the Badge for a Switch component and wire
// each row to its own mutation hook.
function AdminSettingsPage() {
  const t = tFor("settings");

  const flowState = IS_DPA_FLOW_ENABLED ? "enabled" : "disabled";
  const watermarkState = IS_DPA_DRAFT_WATERMARK_ENABLED ? "on" : "off";

  return (
    <div className="space-y-6" data-testid="admin-settings-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-settings-page-header"
      />

      <AdminPageExplainer pageKey="settings" />

      <Card className="border-warning/40 bg-warning/5" data-testid="admin-settings-readonly-notice">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" aria-hidden="true" />
          <p className="text-sm text-warning-foreground">{t("readonly_notice")}</p>
        </CardContent>
      </Card>

      <Card className="border-border/60" data-testid="admin-settings-dpa-section">
        <CardContent className="space-y-5 p-6">
          <header className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">{t("dpa_section_title")}</h2>
          </header>

          <dl className="space-y-4">
            <SettingRow
              testId="admin-settings-dpa-flow"
              label={t("dpa_flow_label")}
              hint={t("dpa_flow_hint")}
              value={
                <Badge
                  variant="outline"
                  data-state={flowState}
                  className={
                    IS_DPA_FLOW_ENABLED
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                      : "border-muted/40 bg-muted/10 text-muted-foreground"
                  }
                >
                  {t(`dpa_flow_state_${flowState}`)}
                </Badge>
              }
              envVar="VITE_DPA_FLOW_ENABLED"
            />

            <SettingRow
              testId="admin-settings-dpa-watermark"
              label={t("dpa_watermark_label")}
              hint={
                IS_DPA_DRAFT_WATERMARK_ENABLED
                  ? t("dpa_watermark_hint_on")
                  : t("dpa_watermark_hint_off")
              }
              value={
                <Badge
                  variant="outline"
                  data-state={watermarkState}
                  className={
                    IS_DPA_DRAFT_WATERMARK_ENABLED
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                  }
                >
                  {t(`dpa_watermark_state_${watermarkState}`)}
                </Badge>
              }
              envVar="VITE_DPA_TEMPLATE_DRAFT_WATERMARK"
              warn={!IS_DPA_DRAFT_WATERMARK_ENABLED}
            />

            <SettingRow
              testId="admin-settings-dpa-version"
              label={t("dpa_version_label")}
              hint={t("dpa_version_hint")}
              value={
                <Badge variant="outline" className="font-mono">
                  {DEFAULT_DPA_TEMPLATE_VERSION}
                </Badge>
              }
              envVar="src/lib/dpa/feature-flag.ts → DEFAULT_DPA_TEMPLATE_VERSION"
            />

            <SettingRow
              testId="admin-settings-dpa-retention"
              label={t("dpa_retention_label")}
              hint={t("dpa_retention_hint")}
              value={
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {t("dpa_retention_value", { months: DPA_RETENTION_MONTHS })}
                </Badge>
              }
              envVar="supabase/migrations/…_dpa_requests.sql → anonymize_expired_dpa_requests()"
            />
          </dl>
        </CardContent>
      </Card>

      <Card className="border-border/60" data-testid="admin-settings-subprocessors-section">
        <CardContent className="space-y-4 p-6">
          <header className="flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("subprocessors_section_title")}
            </h2>
          </header>
          <p className="text-sm text-muted-foreground">{t("subprocessors_section_description")}</p>
          <ul className="space-y-3" data-testid="admin-settings-subprocessors-list">
            {SUB_PROCESSORS.map((sp) => (
              <li
                key={sp.name}
                className="rounded-md border border-border/60 bg-card/40 p-3 text-sm"
                data-testid={`admin-settings-subprocessor-${sp.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "")}`}
              >
                <p className="font-semibold text-foreground">{sp.name}</p>
                <p className="text-muted-foreground">{sp.purpose}</p>
                <p className="text-xs text-muted-foreground">{sp.location}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/60" data-testid="admin-settings-notifications-section">
        <CardContent className="space-y-3 p-6">
          <header className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Upozornenia z podpory</h2>
          </header>
          <p className="text-sm text-muted-foreground">
            Hlavný prepínač, e-mailové vs. interné kanály, frekvencia a kategórie žiadostí.
            Nastavenie platí iba pre váš účet.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            data-testid="admin-settings-notifications-link"
          >
            <Link to="/admin/settings/notifications">
              Otvoriť nastavenia upozornení
              <ChevronRight className="ml-1 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60" data-testid="admin-settings-runbook-section">
        <CardContent className="space-y-3 p-6">
          <h2 className="text-sm font-semibold text-foreground">{t("runbook_section_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("runbook_section_description")}</p>
          <Button variant="outline" size="sm" asChild data-testid="admin-settings-runbook-link">
            <a
              href="https://github.com/AmBonum/subenai/blob/main/tasks/E40-runbook.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1.5 size-4" aria-hidden="true" />
              {t("runbook_link_label")}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface SettingRowProps {
  testId: string;
  label: string;
  hint: string;
  value: React.ReactNode;
  envVar: string;
  warn?: boolean;
}

function SettingRow({ testId, label, hint, value, envVar, warn }: SettingRowProps) {
  return (
    <div
      className="grid gap-2 border-b border-border/40 pb-4 last:border-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
      data-testid={testId}
    >
      <div className="space-y-1">
        <dt className="text-sm font-medium text-foreground">{label}</dt>
        <dd className={`text-xs ${warn ? "text-destructive" : "text-muted-foreground"}`}>{hint}</dd>
        <code className="block break-all text-[10px] font-mono text-muted-foreground/70">
          {envVar}
        </code>
      </div>
      <div className="justify-self-start sm:justify-self-end">{value}</div>
    </div>
  );
}
