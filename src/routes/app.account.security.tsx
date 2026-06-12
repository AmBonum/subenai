import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Shield, Key, Lock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { AccountTabs } from "@/components/user/AccountTabs";
import { BackupCodesManager } from "@/components/auth/BackupCodesManager";
import { supabase } from "@/integrations/supabase/client";
import { listFactors, unenrollFactor } from "@/lib/auth/mfa";
import { tFor } from "@/i18n/app-shell";
import { tFor as tSecurity } from "@/i18n/security";

const tRoutes = tFor("route_titles");

export const Route = createFileRoute("/app/account/security")({
  head: () => ({
    meta: [{ title: tRoutes("security") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: SecurityPage,
});

const score = (p: string) => {
  let s = 0;
  if (p.length >= 8) s += 25;
  if (p.length >= 12) s += 25;
  if (/[A-Z]/.test(p)) s += 15;
  if (/[0-9]/.test(p)) s += 15;
  if (/[^a-zA-Z0-9]/.test(p)) s += 20;
  return Math.min(100, s);
};

type PasswordError = "mismatch" | "min" | "same" | "weak" | "reauth" | "generic";

function mapUpdateUserError(error: { code?: string; message: string }): PasswordError {
  const code = error.code;
  const msg = error.message.toLowerCase();
  if (code === "same_password" || msg.includes("different from the old password")) return "same";
  if (code === "weak_password" || msg.includes("weak")) return "weak";
  if (
    code === "reauthentication_needed" ||
    msg.includes("reauthentication") ||
    msg.includes("session missing") ||
    msg.includes("not logged in")
  ) {
    return "reauth";
  }
  return "generic";
}

function SecurityPage() {
  const t = tFor("account.security");
  const ts = tSecurity("security_card");
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<PasswordError | null>(null);
  // null = identity check in flight; the form stays visible meanwhile so
  // password-account users (the common case) never see a layout jump.
  const [oauthOnly, setOauthOnly] = useState<boolean | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loadingFactor, setLoadingFactor] = useState(true);

  useEffect(() => {
    listFactors()
      .then((f) => {
        const verified = f.totp.find((x) => x.status === "verified");
        setFactorId(verified?.id ?? null);
      })
      .finally(() => setLoadingFactor(false));
  }, []);

  // OAuth-only accounts (signed up via "Pokračovať cez Google") have no
  // password to change — supabase.auth.updateUser({ password }) would set
  // a first password silently, which is NOT what the card advertises.
  // Detect via the providers list; only when the account demonstrably has
  // no "email" identity do we swap the form for an explanatory note.
  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled || !data.user) return;
        const providers = (data.user.app_metadata?.providers as string[] | undefined) ?? [];
        const identities = data.user.identities ?? [];
        const hasEmailIdentity =
          providers.includes("email") || identities.some((i) => i.provider === "email");
        setOauthOnly(providers.length + identities.length > 0 ? !hasEmailIdentity : false);
      })
      .catch(() => {
        if (!cancelled) setOauthOnly(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onDeactivate = async () => {
    if (!factorId) return;
    try {
      await unenrollFactor(factorId);
      setFactorId(null);
      toast.success(ts("toast_deactivated"));
    } catch {
      toast.error("Error");
    }
  };

  const onPasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwError(null);
    if (pw !== pw2) {
      setPwError("mismatch");
      return;
    }
    if (pw.length < 8) {
      setPwError("min");
      return;
    }
    setPwSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        setPwError(mapUpdateUserError(error));
        return;
      }
      toast.success(t("toast_password_changed"));
      setPw("");
      setPw2("");
    } catch {
      setPwError("generic");
    } finally {
      setPwSubmitting(false);
    }
  };

  const strength = score(pw);
  const strengthLabel =
    strength < 40
      ? t("strength_weak")
      : strength < 75
        ? t("strength_medium")
        : t("strength_strong");

  return (
    <div className="space-y-6" data-testid="app-account-security-root">
      <AccountTabs />
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("page_header_title")}
        accentWords={1}
        icon={Shield}
        subtitle={t("page_header_subtitle")}
        testId="app-account-security-page-header"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> {t("card_password_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {oauthOnly ? (
            <div className="space-y-1" data-testid="app-account-security-oauth-only">
              <p className="text-sm font-medium text-foreground">{t("oauth_only_title")}</p>
              <p className="text-sm text-muted-foreground">{t("oauth_only_body")}</p>
            </div>
          ) : (
            <form
              className="space-y-3"
              data-testid="app-account-security-password-form"
              onSubmit={onPasswordSubmit}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="pw-new">{t("label_new_password")}</Label>
                <Input
                  id="pw-new"
                  type="password"
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  data-testid="app-account-security-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw-confirm">{t("label_confirm")}</Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  data-testid="app-account-security-confirm-password"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{t("strength_label")}</span>
                  <span>{strengthLabel}</span>
                </div>
                <Progress value={strength} />
              </div>
              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{t("policy_title")}</p>
                <ul className="mt-1 list-disc pl-4">
                  <li>{t("policy_min")}</li>
                  <li>{t("policy_complexity")}</li>
                </ul>
              </div>
              {pwError && (
                <p
                  className="text-sm text-destructive"
                  role="alert"
                  data-testid="app-account-security-password-error"
                >
                  {pwError === "reauth" ? (
                    <>
                      {t("error_password_reauth_prefix")}
                      <Link
                        to="/forgot-password"
                        className="underline underline-offset-2"
                        data-testid="app-account-security-reauth-forgot-link"
                      >
                        {t("error_password_reauth_link")}
                      </Link>
                      {t("error_password_reauth_suffix")}
                    </>
                  ) : (
                    t(
                      pwError === "mismatch"
                        ? "error_password_mismatch"
                        : pwError === "min"
                          ? "error_password_min"
                          : pwError === "same"
                            ? "error_password_same"
                            : pwError === "weak"
                              ? "error_password_weak"
                              : "error_password_generic",
                    )
                  )}
                </p>
              )}
              <Button
                type="submit"
                disabled={!pw || !pw2 || pwSubmitting}
                data-testid="app-account-security-submit-password"
              >
                {pwSubmitting ? t("btn_changing_password") : t("btn_change_password")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("forgot_prefix")}
                <Link
                  to="/forgot-password"
                  className="underline underline-offset-2"
                  data-testid="app-account-security-forgot-link"
                >
                  {t("forgot_link")}
                </Link>
                {t("forgot_suffix")}
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> {ts("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingFactor ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="app-account-security-2fa-loading"
            >
              ...
            </p>
          ) : factorId ? (
            <>
              <div className="flex items-center gap-2">
                <Badge data-testid="app-account-security-2fa-active-badge">
                  {ts("badge_active")}
                </Badge>
                <span className="text-sm text-muted-foreground">{ts("desc_active")}</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="app-account-security-2fa-deactivate-button"
                  >
                    {ts("btn_deactivate")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-testid="app-account-security-2fa-deactivate-dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{ts("btn_deactivate")}</AlertDialogTitle>
                    <AlertDialogDescription>{ts("deactivate_confirm")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="app-account-security-2fa-deactivate-cancel">
                      {ts("deactivate_cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDeactivate}
                      data-testid="app-account-security-2fa-deactivate-confirm"
                    >
                      {ts("deactivate_yes")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <BackupCodesManager />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{ts("desc_inactive")}</p>
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/login/enroll-2fa" })}
                data-testid="app-account-security-2fa-activate-button"
              >
                {ts("btn_activate")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
