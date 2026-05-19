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
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
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
  // Trigger-counter for the shake animation so re-firing the animation on
  // repeated wrong-code attempts actually plays (CSS resets on key change).
  const [shakeCount, setShakeCount] = useState(0);
  const [success, setSuccess] = useState(false);
  // Latest entered code captured in a ref so the auto-submit effect (which
  // runs on length-6) sees the freshest value without re-creating handlers.
  const codeRef = useRef(code);
  codeRef.current = code;

  const submitTotp = useCallback(
    async (value: string) => {
      if (value.length !== 6 || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const factors = await listFactors();
        const factor = factors.totp.find((f) => f.status === "verified");
        if (!factor) {
          throw new Error("no_factor");
        }
        await challengeAndVerify(factor.id, value);
        setSuccess(true);
        // Brief success pulse before navigating — feels less abrupt.
        setTimeout(() => navigate({ to: target }), 350);
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        setError(
          msg.includes("invalid") || msg.includes("code") ? t("error_invalid") : t("error_generic"),
        );
        setShakeCount((n) => n + 1);
        setCode("");
      } finally {
        setSubmitting(false);
      }
    },
    [navigate, submitting, t, target],
  );

  // Auto-submit the moment the 6th digit is entered. Users get instant
  // feedback (success pulse OR shake) without an extra click.
  useEffect(() => {
    if (code.length === 6) {
      void submitTotp(code);
    }
  }, [code, submitTotp]);

  const onTotpSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitTotp(codeRef.current);
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
      <Card className="w-full max-w-md" data-testid="verify-2fa-card">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-elegant)]">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle data-testid="verify-2fa-heading">{t("heading")}</CardTitle>
          <CardDescription data-testid="verify-2fa-subheading">{t("subheading")}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "totp" ? (
            <form
              onSubmit={onTotpSubmit}
              className="space-y-5"
              data-testid="verify-2fa-totp-form"
              noValidate
            >
              <div className="space-y-3">
                <Label htmlFor="verify-2fa-code" className="block text-center text-sm font-medium">
                  {t("code_label")}
                </Label>
                <div
                  key={shakeCount}
                  className={
                    "flex justify-center " +
                    (error ? "animate-otp-shake" : "") +
                    (success ? " animate-otp-success" : "")
                  }
                >
                  <InputOTP
                    id="verify-2fa-code"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoFocus
                    autoComplete="one-time-code"
                    value={code}
                    onChange={setCode}
                    disabled={submitting || success}
                    containerClassName="gap-2"
                    data-testid="verify-2fa-code-input"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={0}
                        className={
                          "h-14 w-12 text-xl font-semibold transition-colors " +
                          (success ? "border-success text-success" : "")
                        }
                      />
                      <InputOTPSlot
                        index={1}
                        className={
                          "h-14 w-12 text-xl font-semibold transition-colors " +
                          (success ? "border-success text-success" : "")
                        }
                      />
                      <InputOTPSlot
                        index={2}
                        className={
                          "h-14 w-12 text-xl font-semibold transition-colors " +
                          (success ? "border-success text-success" : "")
                        }
                      />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={3}
                        className={
                          "h-14 w-12 text-xl font-semibold transition-colors " +
                          (success ? "border-success text-success" : "")
                        }
                      />
                      <InputOTPSlot
                        index={4}
                        className={
                          "h-14 w-12 text-xl font-semibold transition-colors " +
                          (success ? "border-success text-success" : "")
                        }
                      />
                      <InputOTPSlot
                        index={5}
                        className={
                          "h-14 w-12 text-xl font-semibold transition-colors " +
                          (success ? "border-success text-success" : "")
                        }
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p
                  className="text-center text-xs text-muted-foreground"
                  data-testid="verify-2fa-hint"
                >
                  {t("hint")}
                </p>
              </div>
              {error && (
                <p
                  className="text-center text-sm text-destructive"
                  role="alert"
                  data-testid="verify-2fa-error"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || success || code.length !== 6}
                data-testid="verify-2fa-submit-button"
              >
                {success ? t("success") : submitting ? t("submitting") : t("submit")}
              </Button>
              <button
                type="button"
                className="block w-full text-center text-xs text-muted-foreground underline hover:text-foreground"
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
