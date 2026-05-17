import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cmsShareCardStore, type CmsShareCard } from "@/lib/admin/cms-mock-store";
import { useCmsShareCard } from "@/lib/admin/cms-hooks";
import { tFor } from "@/i18n/cms";

export const Route = createFileRoute("/admin/share-card")({
  component: AdminShareCardPage,
});

function AdminShareCardPage() {
  const t = tFor("shareCard");
  const card = useCmsShareCard();

  const patch = (p: Partial<CmsShareCard>) => cmsShareCardStore.set((prev) => ({ ...prev, ...p }));

  const titleInvalid = card.title_fallback.trim().length === 0;

  const onSave = () => {
    if (titleInvalid) {
      toast.error(t("title_required"));
      return;
    }
    toast.success(t("saved"));
  };

  return (
    <div className="space-y-6" data-testid="share-card-config-root">
      <PageHeader title={t("title")} description={t("description")} />

      <form
        data-testid="share-card-config-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        className="space-y-6"
      >
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="sc-og">{t("og_template_label")}</Label>
              <Input
                id="sc-og"
                value={card.og_template_url}
                onChange={(e) => patch({ og_template_url: e.target.value })}
                data-testid="share-card-config-og-template-url"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sc-title">{t("title_fallback_label")}</Label>
              <Input
                id="sc-title"
                value={card.title_fallback}
                onChange={(e) => patch({ title_fallback: e.target.value })}
                data-testid="share-card-config-title-fallback"
              />
              {titleInvalid && (
                <p className="text-xs text-destructive" data-testid="share-card-config-title-error">
                  {t("title_required")}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sc-desc">{t("description_fallback_label")}</Label>
              <Textarea
                id="sc-desc"
                rows={3}
                value={card.description_fallback}
                onChange={(e) => patch({ description_fallback: e.target.value })}
                data-testid="share-card-config-description-fallback"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("preview_alt")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="space-y-2 rounded-md border bg-card p-4"
              data-testid="share-card-config-preview"
            >
              {card.og_template_url ? (
                <img
                  src={card.og_template_url}
                  alt={t("preview_alt")}
                  className="aspect-[1200/630] w-full rounded-md border bg-muted object-cover"
                />
              ) : (
                <div className="aspect-[1200/630] w-full rounded-md border border-dashed bg-muted" />
              )}
              <p className="text-sm font-medium">{card.title_fallback}</p>
              <p className="text-xs text-muted-foreground">{card.description_fallback}</p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" data-testid="share-card-config-form-save" disabled={titleInvalid}>
          {t("save")}
        </Button>
      </form>
    </div>
  );
}
