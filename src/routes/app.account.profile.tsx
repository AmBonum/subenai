import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { UserCog, Save, RotateCcw, Mail, User as UserIcon, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCurrentProfile, useUpdateProfile } from "@/lib/platform/queries";
import { PageHeader } from "@/components/app/page-header";
import { tFor } from "@/i18n/app-shell";

const tRoutes = tFor("route_titles");

export const Route = createFileRoute("/app/account/profile")({
  head: () => ({
    meta: [{ title: tRoutes("profile") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: ProfilePage,
});

function buildSchema(t: ReturnType<typeof tFor>) {
  return z.object({
    display_name: z.string().trim().min(2, t("error_name_min")).max(80, t("error_name_max")),
    email: z.string().trim().email(t("error_email")).max(255),
    avatar_initials: z
      .string()
      .trim()
      .min(1, t("error_initials_min"))
      .max(3, t("error_initials_max"))
      .regex(/^[A-Za-zÀ-ž0-9]+$/, t("error_initials_chars")),
  });
}

function ProfilePage() {
  const t = tFor("account.profile");
  const profileQ = useCurrentProfile();
  const updateMut = useUpdateProfile();
  const me = profileQ.data ?? {
    id: "",
    email: "",
    display_name: "",
    avatar_initials: "",
  };
  const [displayName, setDisplayName] = useState(me.display_name);
  const [email, setEmail] = useState(me.email);
  const [initials, setInitials] = useState(me.avatar_initials);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    setDisplayName(me.display_name);
    setEmail(me.email);
    setInitials(me.avatar_initials);
  }, [me.display_name, me.email, me.avatar_initials]);

  const dirty =
    displayName !== me.display_name || email !== me.email || initials !== me.avatar_initials;

  const handleSave = () => {
    const schema = buildSchema(t);
    const parsed = schema.safeParse({
      display_name: displayName,
      email,
      avatar_initials: initials.toUpperCase(),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setErrors(errs);
      toast.error(t("toast_validation"));
      return;
    }
    setErrors({});
    updateMut.mutate(parsed.data, {
      onSuccess: () => {
        setShowSavedToast(true);
        toast.success(t("toast_saved"));
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleReset = () => {
    setDisplayName(me.display_name);
    setEmail(me.email);
    setInitials(me.avatar_initials);
    setErrors({});
  };

  const autoInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-6" data-testid="app-account-profile-root">
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("page_header_title")}
        accentWords={1}
        icon={UserCog}
        testId="app-account-profile-page-header"
        subtitle={
          <>
            {t("page_header_subtitle_prefix")}
            <Link
              to="/app/account/security"
              className="underline"
              data-testid="app-account-profile-link-security"
            >
              {t("page_header_subtitle_link")}
            </Link>
            .
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" /> {t("card_personal_title")}
          </CardTitle>
          <CardDescription>{t("card_personal_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground"
              data-testid="app-account-profile-avatar-preview"
            >
              {(initials || autoInitials || "?").slice(0, 3)}
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{t("avatar_preview_title")}</p>
              <p className="text-xs text-muted-foreground">{t("avatar_preview_desc")}</p>
            </div>
          </div>

          <Separator />

          <form
            className="grid gap-4 sm:grid-cols-2"
            data-testid="app-account-profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="display_name">{t("label_display_name")}</Label>
              <Input
                id="display_name"
                value={displayName}
                maxLength={80}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  const next = e.target.value
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .join("");
                  if (next && initials === me.avatar_initials) setInitials(next);
                }}
                aria-invalid={!!errors.display_name}
                data-testid="app-account-profile-name-input"
              />
              {errors.display_name && (
                <p
                  className="text-xs text-destructive"
                  data-testid="app-account-profile-name-error"
                >
                  {errors.display_name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> {t("label_email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                data-testid="app-account-profile-email-input"
              />
              {errors.email && (
                <p
                  className="text-xs text-destructive"
                  data-testid="app-account-profile-email-error"
                >
                  {errors.email}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{t("email_change_hint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initials">{t("label_initials")}</Label>
              <Input
                id="initials"
                value={initials}
                maxLength={3}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                aria-invalid={!!errors.avatar_initials}
                data-testid="app-account-profile-avatar-url-input"
              />
              {errors.avatar_initials && (
                <p
                  className="text-xs text-destructive"
                  data-testid="app-account-profile-initials-error"
                >
                  {errors.avatar_initials}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("label_id")}</Label>
              <Input value={me.id} readOnly disabled data-testid="app-account-profile-id-input" />
              <p className="text-xs text-muted-foreground">{t("id_hint")}</p>
            </div>

            {/* Locale select stub — full locale selection wires in AH-11 when i18n lands */}
            <input type="hidden" data-testid="app-account-profile-locale-select" value="sk" />

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {dirty ? (
                  <Badge variant="secondary" data-testid="app-account-profile-badge-dirty">
                    {t("badge_dirty")}
                  </Badge>
                ) : (
                  <Badge variant="outline" data-testid="app-account-profile-badge-saved">
                    {t("badge_saved")}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleReset}
                  disabled={!dirty}
                  data-testid="app-account-profile-reset"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> {t("btn_reset")}
                </Button>
                <Button
                  type="submit"
                  disabled={!dirty || updateMut.isPending}
                  data-testid="app-account-profile-submit"
                >
                  <Save className="mr-2 h-4 w-4" /> {t("btn_save")}
                </Button>
              </div>
            </div>
          </form>

          {showSavedToast && (
            <p className="sr-only" role="status" data-testid="app-account-profile-toast-success">
              {t("toast_saved")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> {t("card_password_title")}
          </CardTitle>
          <CardDescription>{t("card_password_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/app/account/security" data-testid="app-account-profile-goto-security">
              {t("btn_goto_security")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
