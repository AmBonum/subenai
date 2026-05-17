import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { tFor } from "@/i18n/admin";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

const FEATURE_FLAGS = [
  { key: "ai_generator", default: true },
  { key: "audit_exports", default: false },
  { key: "trap_popup", default: true },
] as const;

function AdminSettingsPage() {
  const t = tFor("settings");
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FEATURE_FLAGS.map((f) => [f.key, f.default])),
  );
  const [retention, setRetention] = useState(180);
  const [primaryColor, setPrimaryColor] = useState("#5b53f5");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info(t("submit_info"), { id: "admin-settings-toast-info" });
  };

  return (
    <div className="space-y-6" data-testid="admin-settings-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-settings-page-header"
      />

      <Card className="border-warning/40 bg-warning/5" data-testid="admin-settings-deferred-notice">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-4 w-4 text-warning" />
          <p className="text-sm text-warning-foreground">{t("deferred_notice")}</p>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-6">
          <form
            className="space-y-6"
            onSubmit={onSubmit}
            data-testid="admin-settings-form"
            noValidate
          >
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{t("feature_flags_title")}</h2>
              {FEATURE_FLAGS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{f.key}</span>
                  <Switch
                    checked={flags[f.key]}
                    onCheckedChange={(v) => setFlags({ ...flags, [f.key]: v })}
                    data-testid={`admin-settings-feature-flag-${f.key}`}
                  />
                </label>
              ))}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">{t("retention_title")}</h2>
              <Label htmlFor="settings-retention">{t("retention_label")}</Label>
              <Input
                id="settings-retention"
                type="number"
                min={1}
                value={retention}
                onChange={(e) => setRetention(Number(e.target.value))}
                data-testid="admin-settings-retention-default-input"
                className="max-w-[160px]"
              />
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">{t("branding_title")}</h2>
              <Label htmlFor="settings-primary-color">{t("primary_color_label")}</Label>
              <Input
                id="settings-primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                data-testid="admin-settings-branding-primary-color"
                className="h-10 w-[120px] p-1"
              />
            </section>

            <div>
              <Button type="submit" data-testid="admin-settings-submit">
                {t("submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
