import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CmsHeader } from "@/lib/admin/cms-types";
import { useCmsHeader, useUpdateCmsHeader } from "@/lib/admin/queries";
import { tFor } from "@/i18n/cms";

export const Route = createFileRoute("/admin/header")({
  component: AdminHeaderPage,
});

function AdminHeaderPage() {
  const t = tFor("headerAdmin");
  const qc = useQueryClient();
  const headerQuery = useCmsHeader();
  const updateHeader = useUpdateCmsHeader();
  const header = headerQuery.data;

  const patch = (p: Partial<CmsHeader>) => {
    // Optimistic cache update is synchronous so the controlled input reflects
    // the new value before the mutation's `onMutate` microtask fires.
    qc.setQueryData<CmsHeader>(
      ["admin", "cms", "header"],
      (prev) => ({ ...(prev ?? header), ...p }) as CmsHeader,
    );
    updateHeader.mutate(p, { onError: (e) => toast.error((e as Error).message) });
  };

  const onSave = () => {
    toast.success(t("saved"));
  };

  return (
    <div className="space-y-6" data-testid="cms-header-form-root">
      <PageHeader title={t("title")} description={t("description")} />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <form
            data-testid="cms-header-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
            className="space-y-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="cms-header-logo">{t("logo_label")}</Label>
              <Input
                id="cms-header-logo"
                value={header.logo_url}
                onChange={(e) => patch({ logo_url: e.target.value })}
                data-testid="cms-header-form-logo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cms-header-cta-label">{t("cta_label")}</Label>
              <Input
                id="cms-header-cta-label"
                value={header.cta_label}
                onChange={(e) => patch({ cta_label: e.target.value })}
                data-testid="cms-header-form-cta-label"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cms-header-cta-url">{t("cta_url")}</Label>
              <Input
                id="cms-header-cta-url"
                value={header.cta_url}
                onChange={(e) => patch({ cta_url: e.target.value })}
                data-testid="cms-header-form-cta-url"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cms-header-mobile">{t("mobile_trigger_label")}</Label>
              <Input
                id="cms-header-mobile"
                value={header.mobile_trigger_label}
                onChange={(e) => patch({ mobile_trigger_label: e.target.value })}
                data-testid="cms-header-form-mobile"
              />
            </div>
            <Button type="submit" data-testid="cms-header-form-save">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
