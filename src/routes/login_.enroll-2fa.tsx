// AH-12.2 — TOTP enrollment wizard.
//
// Reachable only by signed-in (AAL1) users without an existing factor.
// The route relies on the parent /login* tree NOT being globally gated
// (login itself is public), so we do an inline auth probe in beforeLoad:
// if not signed in -> /login; if already AAL2 -> /admin (already done).
// The "has factor but AAL1" case is handled by /login/verify-2fa, not
// here.

import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  enrollTotp,
  challengeAndVerify,
  generateBackupCodes,
  listFactors,
  getAALStatus,
  ISSUER_ADMIN,
  ISSUER_USER,
} from "@/lib/auth/mfa";
import { tFor } from "@/i18n/security";

export const Route = createFileRoute("/login_/enroll-2fa")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
    const aal = await getAALStatus();
    if (aal.currentLevel === "aal2") {
      // Already fully authenticated — nothing to enroll.
      throw redirect({ to: "/app" });
    }
    const factors = await listFactors();
    if (factors.totp.some((f) => f.status === "verified")) {
      // User already has a verified factor — they should verify, not re-enroll.
      throw redirect({ to: "/login/verify-2fa" });
    }
  },
  head: () => ({
    meta: [
      { title: "Dvojfaktorové overenie · SubenAI" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EnrollTwoFactorPage,
});

type Step = 1 | 2 | 3 | 4;

function EnrollTwoFactorPage() {
  const t = tFor("enroll");
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  // Kick off enrollment as soon as the user advances to step 2 so the QR
  // is ready by the time the step renders. Issuer is decided by the
  // current user's admin role so the authenticator app shows
  // "subenai.sk admin" for admins vs plain "subenai.sk" for users —
  // helps when one person has both kinds of accounts.
  useEffect(() => {
    if (step === 2 && !qrCode) {
      (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          let issuer = ISSUER_USER;
          if (session?.user) {
            const { data: isAdmin } = await supabase.rpc("has_role", {
              _user_id: session.user.id,
              _role: "admin",
            });
            if (isAdmin === true) issuer = ISSUER_ADMIN;
          }
          const res = await enrollTotp({ issuer });
          setFactorId(res.factorId);
          setQrCode(res.qrCode);
          setSecret(res.secret);
        } catch {
          setError(t("step3_error_generic"));
        }
      })();
    }
  }, [step, qrCode, t]);

  const onVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!factorId) return;
    setSubmitting(true);
    setError(null);
    try {
      await challengeAndVerify(factorId, code);
      const codes = await generateBackupCodes();
      setBackupCodes(codes);
      setStep(4);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      setError(
        msg.includes("invalid") || msg.includes("code")
          ? t("step3_error_invalid")
          : t("step3_error_generic"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyCodes = async () => {
    if (!backupCodes) return;
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can still use the download button */
    }
  };

  const downloadCodes = () => {
    if (!backupCodes) return;
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subenai-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md" data-testid="enroll-2fa-card">
        <CardHeader>
          <CardTitle data-testid="enroll-2fa-heading">{t("heading")}</CardTitle>
          <CardDescription data-testid="enroll-2fa-subheading">{t("subheading")}</CardDescription>
          <p className="mt-2 text-xs text-muted-foreground" data-testid="enroll-2fa-step-indicator">
            {t("step_indicator", { current: step, total: 4 })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div data-testid="enroll-2fa-step-1">
              <h2 className="mb-2 font-medium" data-testid="enroll-2fa-step-1-title">
                {t("step1_title")}
              </h2>
              <p
                className="mb-4 text-sm text-muted-foreground"
                data-testid="enroll-2fa-step-1-body"
              >
                {t("step1_body")}
              </p>
              <Button
                className="w-full"
                onClick={() => setStep(2)}
                data-testid="enroll-2fa-step-1-continue"
              >
                {t("step1_continue")}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div data-testid="enroll-2fa-step-2">
              <h2 className="mb-2 font-medium" data-testid="enroll-2fa-step-2-title">
                {t("step2_title")}
              </h2>
              <p
                className="mb-4 text-sm text-muted-foreground"
                data-testid="enroll-2fa-step-2-body"
              >
                {t("step2_body")}
              </p>
              {qrCode ? (
                // Bigger render (288px desktop, full-width on phones) + a
                // white frame + a quiet zone of pure white background.
                // TOTP QR encodes a long otpauth:// URI with high entropy
                // → many small modules. Phone cameras need both contrast
                // (white background, not theme-dark) and pixel area to
                // resolve each module. 192px wasn't enough on a Pixel.
                <div
                  className="mx-auto w-full max-w-xs rounded-lg bg-white p-4"
                  data-testid="enroll-2fa-qr-frame"
                >
                  <img
                    src={qrCode}
                    alt="QR"
                    className="block h-auto w-full"
                    style={{ imageRendering: "pixelated" }}
                    data-testid="enroll-2fa-qr-image"
                  />
                </div>
              ) : (
                <p
                  className="text-center text-sm text-muted-foreground"
                  data-testid="enroll-2fa-qr-loading"
                >
                  ...
                </p>
              )}
              {secret && (
                <div className="mt-3 rounded bg-muted p-2 text-xs">
                  <span className="text-muted-foreground">{t("step2_manual_label")} </span>
                  <code className="font-mono break-all" data-testid="enroll-2fa-manual-secret">
                    {secret}
                  </code>
                </div>
              )}
              <Button
                className="mt-4 w-full"
                onClick={() => setStep(3)}
                disabled={!qrCode}
                data-testid="enroll-2fa-step-2-continue"
              >
                {t("step2_continue")}
              </Button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={onVerify} data-testid="enroll-2fa-step-3" noValidate>
              <h2 className="mb-2 font-medium" data-testid="enroll-2fa-step-3-title">
                {t("step3_title")}
              </h2>
              <p
                className="mb-4 text-sm text-muted-foreground"
                data-testid="enroll-2fa-step-3-body"
              >
                {t("step3_body")}
              </p>
              <div className="space-y-3">
                <Label htmlFor="enroll-2fa-code" className="block text-center text-sm font-medium">
                  {t("step3_code_label")}
                </Label>
                <div className={"flex justify-center " + (error ? "animate-otp-shake" : "")}>
                  <InputOTP
                    id="enroll-2fa-code"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoFocus
                    autoComplete="one-time-code"
                    value={code}
                    onChange={setCode}
                    containerClassName="gap-2"
                    data-testid="enroll-2fa-code-input"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-14 w-12 text-xl font-semibold" />
                      <InputOTPSlot index={1} className="h-14 w-12 text-xl font-semibold" />
                      <InputOTPSlot index={2} className="h-14 w-12 text-xl font-semibold" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="h-14 w-12 text-xl font-semibold" />
                      <InputOTPSlot index={4} className="h-14 w-12 text-xl font-semibold" />
                      <InputOTPSlot index={5} className="h-14 w-12 text-xl font-semibold" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              {error && (
                <p
                  className="mt-2 text-sm text-destructive"
                  role="alert"
                  data-testid="enroll-2fa-error"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="mt-4 w-full"
                disabled={submitting || code.length !== 6}
                data-testid="enroll-2fa-verify-button"
              >
                {submitting ? t("step3_verifying") : t("step3_verify")}
              </Button>
            </form>
          )}

          {step === 4 && backupCodes && (
            <div data-testid="enroll-2fa-step-4">
              <h2 className="mb-2 font-medium" data-testid="enroll-2fa-step-4-title">
                {t("step4_title")}
              </h2>
              <p
                className="mb-4 text-sm text-muted-foreground"
                data-testid="enroll-2fa-step-4-body"
              >
                {t("step4_body")}
              </p>
              <ul
                className="grid grid-cols-2 gap-2 rounded bg-muted p-3 font-mono text-sm"
                data-testid="enroll-2fa-backup-codes-list"
              >
                {backupCodes.map((c) => (
                  <li key={c} data-testid={`enroll-2fa-backup-code-${c}`}>
                    {c}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyCodes}
                  data-testid="enroll-2fa-backup-copy-button"
                >
                  {copied ? t("step4_copied") : t("step4_copy")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCodes}
                  data-testid="enroll-2fa-backup-download-button"
                >
                  {t("step4_download")}
                </Button>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => navigate({ to: "/app" })}
                data-testid="enroll-2fa-step-4-continue"
              >
                {t("step4_continue_admin")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
