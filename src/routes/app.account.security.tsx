import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, Key, Lock, Monitor } from "lucide-react";
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
import { BackupCodesManager } from "@/components/auth/BackupCodesManager";
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

const SESSIONS = [
  {
    id: "s1",
    device: "MacBook Pro · Chrome 130",
    ip: "188.121.x.x",
    location: "Bratislava, SK",
    current: true,
    last: "teraz",
  },
  {
    id: "s2",
    device: "iPhone · Safari",
    ip: "188.121.x.x",
    location: "Bratislava, SK",
    current: false,
    last: "pred 2 hod.",
  },
  {
    id: "s3",
    device: "Windows · Firefox",
    ip: "212.5.x.x",
    location: "Žilina, SK",
    current: false,
    last: "pred 3 dňami",
  },
];

function SecurityPage() {
  const t = tFor("account.security");
  const ts = tSecurity("security_card");
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
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
  const strength = score(pw);
  const strengthLabel =
    strength < 40
      ? t("strength_weak")
      : strength < 75
        ? t("strength_medium")
        : t("strength_strong");

  // AH-11: wire real Supabase password change + TOTP enrollment. Both UI
  // controls stay no-op until the backend lands.

  return (
    <div className="space-y-6" data-testid="app-account-security-root">
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
          <form
            data-testid="app-account-security-password-form"
            onSubmit={(e) => {
              e.preventDefault();
              // AH-11 wires real password change. Until then it is a toast no-op.
              toast.info(t("toast_password_deferred"));
              setPw("");
              setPw2("");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="pw-current">{t("label_new_password")}</Label>
              <Input
                id="pw-current"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                data-testid="app-account-security-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">{t("label_confirm")}</Label>
              <Input
                id="pw-confirm"
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                data-testid="app-account-security-new-password"
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
                <li>{t("policy_hashing")}</li>
                <li>{t("policy_rate_limit")}</li>
              </ul>
            </div>
            <Button
              type="submit"
              disabled={!pw || pw !== pw2}
              data-testid="app-account-security-submit-password"
            >
              {t("btn_change_password")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" /> {t("card_sessions_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y" data-testid="app-account-security-sessions-list">
          {SESSIONS.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-3"
              data-testid={`app-account-security-session-row-${s.id}`}
            >
              <div>
                <p className="text-sm font-medium">
                  {s.device} {s.current && <Badge className="ml-2">{t("session_current")}</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.location} · {s.ip} · {s.last}
                </p>
              </div>
              {!s.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => toast.success(t("toast_session_revoked"))}
                  data-testid={`app-account-security-revoke-${s.id}`}
                >
                  {t("session_revoke")}
                </Button>
              )}
            </div>
          ))}
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
