// AH-12.3 — AAL1 -> AAL2 challenge surface.
//
// Reachable by signed-in (AAL1) users who already have a verified TOTP
// factor. Default flow: prompt for 6-digit TOTP code, call mfa.challenge
// + verify, redirect to `?redirect=<path>` or /admin on success.
//
// Recovery flow: the user clicks "use backup code" and submits one of
// the 8 single-use codes. The DB function consume_mfa_backup_code()
// validates and marks the row used. On success we route the user to
// the original target (typically /admin). Note: Supabase MFA's true
// AAL2 upgrade requires a factor verify; the backup-code path here is
// a recovery escape hatch documented in src/lib/auth/mfa.ts.

import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { challengeAndVerify, consumeBackupCode, getAALStatus, listFactors } from "@/lib/auth/mfa";
import { tFor } from "@/i18n/security";

interface VerifySearch {
  redirect?: string;
}

export const Route = createFileRoute("/login_/verify-2fa")({
  validateSearch: (raw: Record<string, unknown>): VerifySearch => ({
    redirect: typeof raw.redirect === "string" ? raw.redirect : undefined,
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
    const aal = await getAALStatus();
    if (aal.currentLevel === "aal2") {
      throw redirect({ to: "/app" });
    }
    const factors = await listFactors();
    if (!factors.totp.some((f) => f.status === "verified")) {
      throw redirect({ to: "/login/enroll-2fa" });
    }
  },
  head: () => ({
    meta: [{ title: "Overenie · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: VerifyTwoFactorPage,
});

function VerifyTwoFactorPage() {
  const t = tFor("verify");
  const navigate = useNavigate();
  const search = useSearch({ from: "/login_/verify-2fa" });
  const target = search.redirect ?? "/admin";

  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onTotpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const factors = await listFactors();
      const factor = factors.totp.find((f) => f.status === "verified");
      if (!factor) {
        throw new Error("no_factor");
      }
      await challengeAndVerify(factor.id, code);
      navigate({ to: target });
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      setError(
        msg.includes("invalid") || msg.includes("code") ? t("error_invalid") : t("error_generic"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onBackupSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ok = await consumeBackupCode(backup);
      if (!ok) {
        setError(t("backup_error_invalid"));
        return;
      }
      navigate({ to: target });
    } catch {
      setError(t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm" data-testid="verify-2fa-card">
        <CardHeader>
          <CardTitle data-testid="verify-2fa-heading">{t("heading")}</CardTitle>
          <CardDescription data-testid="verify-2fa-subheading">{t("subheading")}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "totp" ? (
            <form
              onSubmit={onTotpSubmit}
              className="space-y-4"
              data-testid="verify-2fa-totp-form"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="verify-2fa-code">{t("code_label")}</Label>
                <Input
                  id="verify-2fa-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  data-testid="verify-2fa-code-input"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert" data-testid="verify-2fa-error">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || code.length !== 6}
                data-testid="verify-2fa-submit-button"
              >
                {submitting ? t("submitting") : t("submit")}
              </Button>
              <button
                type="button"
                className="block w-full text-center text-xs text-muted-foreground underline"
                onClick={() => {
                  setMode("backup");
                  setError(null);
                }}
                data-testid="verify-2fa-use-backup-link"
              >
                {t("use_backup")}
              </button>
            </form>
          ) : (
            <form
              onSubmit={onBackupSubmit}
              className="space-y-4"
              data-testid="verify-2fa-backup-form"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="verify-2fa-backup">{t("backup_label")}</Label>
                <Input
                  id="verify-2fa-backup"
                  required
                  autoComplete="off"
                  value={backup}
                  onChange={(e) => setBackup(e.target.value.toUpperCase())}
                  data-testid="verify-2fa-backup-input"
                />
              </div>
              {error && (
                <p
                  className="text-sm text-destructive"
                  role="alert"
                  data-testid="verify-2fa-backup-error"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || backup.length === 0}
                data-testid="verify-2fa-backup-submit-button"
              >
                {submitting ? t("submitting") : t("backup_submit")}
              </Button>
              <button
                type="button"
                className="block w-full text-center text-xs text-muted-foreground underline"
                onClick={() => {
                  setMode("totp");
                  setError(null);
                }}
                data-testid="verify-2fa-use-totp-link"
              >
                {t("use_totp")}
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
