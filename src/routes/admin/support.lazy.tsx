import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, Clock } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  readSupportChannelConfig,
  updateSupportChannelConfig,
  validateSupportChannelConfig,
  type SupportChannelConfig,
} from "@/lib/admin/support-config";
import { tFor } from "@/i18n/admin";

export const Route = createLazyFileRoute("/admin/support")({
  component: AdminSupportPage,
});

function AdminSupportPage() {
  const t = tFor("support");
  const seeded = readSupportChannelConfig();
  const [config, setConfig] = useState<SupportChannelConfig>(seeded);
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateSupportChannelConfig(config);
    if (!result.ok) {
      setErrors({
        email: result.errors.email ? t("invalid_email") : undefined,
        phone: result.errors.phone ? t("invalid_phone") : undefined,
      });
      return;
    }
    setErrors({});
    const next = updateSupportChannelConfig(config);
    setConfig(next);
    toast.success(t("submit_success"), { id: "admin-support-toast-success" });
  };

  return (
    <div className="space-y-6" data-testid="admin-support-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-support-page-header"
      />

      <AdminPageExplainer pageKey="support" />

      <Card className="border-border/60">
        <CardContent className="p-6">
          <form
            className="space-y-4"
            onSubmit={onSubmit}
            data-testid="admin-support-form"
            noValidate
          >
            <div className="space-y-1">
              <Label htmlFor="support-email">{t("email_label")}</Label>
              <Input
                id="support-email"
                type="email"
                value={config.email}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                data-testid="admin-support-email-input"
                aria-invalid={errors.email ? true : undefined}
              />
              {errors.email && (
                <p className="text-xs text-destructive" data-testid="admin-support-email-error">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="support-phone">{t("phone_label")}</Label>
              <Input
                id="support-phone"
                value={config.phone}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                data-testid="admin-support-phone-input"
                aria-invalid={errors.phone ? true : undefined}
              />
              {errors.phone && (
                <p className="text-xs text-destructive" data-testid="admin-support-phone-error">
                  {errors.phone}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="support-hours">{t("hours_label")}</Label>
              <Input
                id="support-hours"
                value={config.hours}
                onChange={(e) => setConfig({ ...config, hours: e.target.value })}
                data-testid="admin-support-hours-input"
              />
            </div>
            <div>
              <Button type="submit" data-testid="admin-support-submit">
                {t("submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground">{t("channel_list_title")}</h2>
          <ul className="mt-3 space-y-2 text-sm" data-testid="admin-support-channel-list">
            <li className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> {config.email}
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {config.phone}
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" /> {config.hours}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
