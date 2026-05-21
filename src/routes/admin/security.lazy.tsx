// AH-12.8 — Admin self-service 2FA management.
//
// Lives under /admin so requireRole("admin") + AAL2 gating from
// src/routes/admin.tsx applies automatically. The page calls the real
// MFA helpers in src/lib/auth/mfa.ts — no mocks, no proxies.

import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { Factor } from "@supabase/supabase-js";
import { ShieldCheck, KeyRound, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listFactors,
  unenrollFactor,
  generateBackupCodes,
  remainingBackupCodes,
} from "@/lib/auth/mfa";
import { tFor } from "@/i18n/admin";

export const Route = createLazyFileRoute("/admin/security")({
  component: AdminSecurityPage,
});

const LOW_BACKUP_THRESHOLD = 3;

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("sk-SK");
  } catch {
    return iso;
  }
}

function AdminSecurityPage() {
  const t = tFor("security");
  const navigate = useNavigate();

  const [factor, setFactor] = useState<Factor | null>(null);
  const [backupCount, setBackupCount] = useState<number>(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshBackupCount = useCallback(async () => {
    const n = await remainingBackupCodes();
    setBackupCount(n);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const factors = await listFactors();
      if (cancelled) return;
      setFactor(factors.totp[0] ?? null);
      const n = await remainingBackupCodes();
      if (cancelled) return;
      setBackupCount(n);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onConfirmReset = async () => {
    if (!factor) return;
    try {
      await unenrollFactor(factor.id);
      navigate({ to: "/login/enroll-2fa" });
    } catch {
      toast.error(t("factor_reset_error"), { id: "admin-security-reset-error" });
    }
  };

  const onConfirmRegen = async () => {
    try {
      const codes = await generateBackupCodes();
      setNewCodes(codes);
    } catch {
      toast.error(t("backup_regen_error"), { id: "admin-security-regen-error" });
    }
  };

  const dismissNewCodes = async () => {
    setNewCodes(null);
    setCopied(false);
    await refreshBackupCount();
  };

  const copyCodes = async () => {
    if (!newCodes) return;
    try {
      await navigator.clipboard.writeText(newCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — download still works */
    }
  };

  const downloadCodes = () => {
    if (!newCodes) return;
    const blob = new Blob([newCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subenai-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const factorVerified = factor?.status === "verified";
  const lowBackup = backupCount < LOW_BACKUP_THRESHOLD;

  return (
    <div className="space-y-6" data-testid="admin-security-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-security-page-header"
      />

      <AdminPageExplainer pageKey="security" />

      <Card className="border-border/60" data-testid="admin-security-factor-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2
              className="text-sm font-semibold text-foreground"
              data-testid="admin-security-factor-title"
            >
              {t("factor_section_title")}
            </h2>
          </div>

          {factor ? (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">{t("factor_friendly_label")}</dt>
                <dd
                  className="font-medium text-foreground"
                  data-testid="admin-security-factor-friendly-name"
                >
                  {factor.friendly_name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("factor_created_label")}</dt>
                <dd
                  className="font-medium text-foreground"
                  data-testid="admin-security-factor-created"
                >
                  {formatDate(factor.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("factor_section_title")}</dt>
                <dd>
                  <Badge
                    variant={factorVerified ? "default" : "secondary"}
                    data-testid="admin-security-factor-status"
                  >
                    {factorVerified ? t("factor_active") : t("factor_pending")}
                  </Badge>
                </dd>
              </div>
            </dl>
          ) : (
            <div
              className="flex items-center justify-between gap-3 rounded border border-warning/40 bg-warning/5 p-3 text-sm"
              data-testid="admin-security-factor-none"
            >
              <span className="text-warning-foreground">{t("factor_none")}</span>
              <Button asChild size="sm" variant="outline">
                <Link to="/login/enroll-2fa" data-testid="admin-security-factor-none-cta">
                  {t("factor_none_cta")}
                </Link>
              </Button>
            </div>
          )}

          {factor && (
            <Button
              variant="outline"
              onClick={() => setResetOpen(true)}
              data-testid="admin-security-factor-reset-button"
            >
              {t("factor_reset_button")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60" data-testid="admin-security-backup-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2
              className="text-sm font-semibold text-foreground"
              data-testid="admin-security-backup-title"
            >
              {t("backup_section_title")}
            </h2>
          </div>

          <p
            className={
              lowBackup ? "text-sm font-medium text-destructive" : "text-sm text-foreground"
            }
            data-testid="admin-security-backup-count"
          >
            {t("backup_count", { count: backupCount })}
          </p>

          {lowBackup && (
            <p
              className="flex items-start gap-2 text-xs text-destructive"
              data-testid="admin-security-backup-warning"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
              <span>{t("backup_warning_low")}</span>
            </p>
          )}

          <Button
            variant="outline"
            onClick={() => setRegenOpen(true)}
            data-testid="admin-security-backup-regen-button"
          >
            {t("backup_regen_button")}
          </Button>

          {newCodes && (
            <div
              className="space-y-3 rounded border border-border bg-muted/50 p-4"
              data-testid="admin-security-new-codes-panel"
            >
              <h3 className="text-sm font-semibold" data-testid="admin-security-new-codes-heading">
                {t("backup_codes_heading")}
              </h3>
              <p
                className="text-xs text-muted-foreground"
                data-testid="admin-security-new-codes-body"
              >
                {t("backup_codes_body")}
              </p>
              <ul
                className="grid grid-cols-2 gap-2 rounded bg-background p-3 font-mono text-sm"
                data-testid="admin-security-new-codes-list"
              >
                {newCodes.map((c) => (
                  <li key={c} data-testid={`admin-security-new-code-${c}`}>
                    {c}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyCodes}
                  data-testid="admin-security-new-codes-copy"
                >
                  {copied ? t("backup_copied") : t("backup_copy")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCodes}
                  data-testid="admin-security-new-codes-download"
                >
                  {t("backup_download")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    void dismissNewCodes();
                  }}
                  data-testid="admin-security-new-codes-dismiss"
                >
                  {t("backup_dismiss")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60" data-testid="admin-security-info-card">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-foreground" data-testid="admin-security-info-title">
              {t("info_section_title")}
            </h2>
            <p className="mt-1 text-muted-foreground" data-testid="admin-security-info-body">
              {t("info_body")}
            </p>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t("factor_reset_confirm_title")}
        description={t("factor_reset_confirm_body")}
        destructive
        onConfirm={() => {
          void onConfirmReset();
        }}
      />

      <ConfirmDialog
        open={regenOpen}
        onOpenChange={setRegenOpen}
        title={t("backup_regen_confirm_title")}
        description={t("backup_regen_confirm_body")}
        destructive
        onConfirm={() => {
          void onConfirmRegen();
        }}
      />
    </div>
  );
}
