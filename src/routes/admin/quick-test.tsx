import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuickTestConfig } from "@/lib/admin/cms-types";
import { useCmsQuickTestConfig, useUpdateCmsQuickTestConfig } from "@/lib/admin/queries";
import { tFor } from "@/i18n/cms";

export const Route = createFileRoute("/admin/quick-test")({
  component: AdminQuickTestPage,
});

function AdminQuickTestPage() {
  const t = tFor("quickTest");
  const qc = useQueryClient();
  const cfgQuery = useCmsQuickTestConfig();
  const updateCfg = useUpdateCmsQuickTestConfig();
  const cfg = cfgQuery.data;

  const patch = (p: Partial<QuickTestConfig>) => {
    qc.setQueryData<QuickTestConfig>(
      ["admin", "cms", "quick_test"],
      (prev) => ({ ...(prev ?? cfg), ...p }) as QuickTestConfig,
    );
    updateCfg.mutate(p, { onError: (e) => toast.error((e as Error).message) });
  };

  const onSave = () => {
    toast.success(t("saved"));
  };

  return (
    <div className="space-y-6" data-testid="quick-test-config-root">
      <PageHeader title={t("title")} description={t("description")} />

      <form
        data-testid="quick-test-config-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        className="space-y-6"
      >
        <Card>
          <CardContent className="space-y-4 pt-6">
            <label className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">{t("visibility_label")}</span>
              <Switch
                checked={cfg.visible}
                onCheckedChange={(v) => patch({ visible: v })}
                data-testid="quick-test-visibility-toggle"
              />
            </label>

            <div className="grid gap-2">
              <Label htmlFor="qt-title">{t("title_label")}</Label>
              <Input
                id="qt-title"
                value={cfg.title}
                onChange={(e) => patch({ title: e.target.value })}
                data-testid="quick-test-title-input"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qt-desc">{t("description_label")}</Label>
              <Textarea
                id="qt-desc"
                rows={3}
                value={cfg.description}
                onChange={(e) => patch({ description: e.target.value })}
                data-testid="quick-test-description-input"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qt-branza">{t("branza_label")}</Label>
              <Select value={cfg.branza} onValueChange={(v) => patch({ branza: v })}>
                <SelectTrigger id="qt-branza" data-testid="quick-test-branza-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Všeobecný test">{t("branza_option_general")}</SelectItem>
                  <SelectItem value="Senior">{t("branza_option_senior")}</SelectItem>
                  <SelectItem value="Mládež">{t("branza_option_youth")}</SelectItem>
                  <SelectItem value="Firma">{t("branza_option_firma")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="qt-time">{t("time_label")}</Label>
                <Input
                  id="qt-time"
                  type="number"
                  min={30}
                  max={3600}
                  value={cfg.time_seconds}
                  onChange={(e) => patch({ time_seconds: Number(e.target.value) })}
                  data-testid="quick-test-time-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qt-pass">{t("pass_label")}</Label>
                <Input
                  id="qt-pass"
                  type="number"
                  min={0}
                  max={100}
                  value={cfg.pass_percentage}
                  onChange={(e) => patch({ pass_percentage: Number(e.target.value) })}
                  data-testid="quick-test-pass-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qt-difficulty">{t("difficulty_label")}</Label>
                <Select
                  value={cfg.difficulty}
                  onValueChange={(v) => patch({ difficulty: v as QuickTestConfig["difficulty"] })}
                >
                  <SelectTrigger id="qt-difficulty" data-testid="quick-test-difficulty-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ľahká">{t("difficulty_option_easy")}</SelectItem>
                    <SelectItem value="Stredná">{t("difficulty_option_medium")}</SelectItem>
                    <SelectItem value="Ťažká">{t("difficulty_option_hard")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("questions_heading")}</CardTitle>
          </CardHeader>
          <CardContent>
            {cfg.question_ids.length === 0 ? (
              <p
                className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground"
                data-testid="quick-test-question-list-empty"
              >
                {t("questions_heading")}
              </p>
            ) : (
              <ul className="space-y-2">
                {cfg.question_ids.map((id, idx) => (
                  <li
                    key={id}
                    className="rounded-md border bg-card px-3 py-2 font-mono text-xs"
                    data-testid={`quick-test-question-list-item-${id}`}
                  >
                    #{idx + 1} · {id}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Button type="submit" data-testid="quick-test-save-button">
          {t("save")}
        </Button>
      </form>
    </div>
  );
}
