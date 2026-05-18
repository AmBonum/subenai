import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CmsFooter, CmsFooterColumn } from "@/lib/admin/cms-types";
import { useCmsFooter, useUpdateCmsFooter } from "@/lib/admin/queries";
import { tFor } from "@/i18n/cms";

const newId = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 8)}`;

export const Route = createFileRoute("/admin/footer")({
  component: AdminFooterPage,
});

function AdminFooterPage() {
  const t = tFor("footerAdmin");
  const qc = useQueryClient();
  const footerQuery = useCmsFooter();
  const updateFooter = useUpdateCmsFooter();
  const footer = footerQuery.data;

  const setFooter = (updater: (prev: CmsFooter) => CmsFooter) => {
    const next = updater(footer);
    qc.setQueryData<CmsFooter>(["admin", "cms", "footer"], next);
    updateFooter.mutate(next, {
      onError: (e) => toast.error((e as Error).message),
    });
  };

  const addColumn = () =>
    setFooter((prev) => ({
      ...prev,
      columns: [...prev.columns, { id: newId("col"), title: "", links: [] }],
    }));

  const removeColumn = (id: string) =>
    setFooter((prev) => ({ ...prev, columns: prev.columns.filter((c) => c.id !== id) }));

  const patchColumn = (id: string, patch: Partial<CmsFooterColumn>) =>
    setFooter((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const addLink = (colId: string) =>
    setFooter((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.id === colId
          ? { ...c, links: [...c.links, { id: newId("lnk"), label: "", url: "" }] }
          : c,
      ),
    }));

  const patchLink = (
    colId: string,
    linkId: string,
    patch: Partial<{ label: string; url: string }>,
  ) =>
    setFooter((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.id === colId
          ? { ...c, links: c.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) }
          : c,
      ),
    }));

  const removeLink = (colId: string, linkId: string) =>
    setFooter((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.id === colId ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c,
      ),
    }));

  const addSocial = () =>
    setFooter((prev) => ({
      ...prev,
      socials: [...prev.socials, { id: newId("soc"), platform: "", url: "" }],
    }));

  const patchSocial = (id: string, patch: Partial<{ platform: string; url: string }>) =>
    setFooter((prev) => ({
      ...prev,
      socials: prev.socials.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const removeSocial = (id: string) =>
    setFooter((prev) => ({ ...prev, socials: prev.socials.filter((s) => s.id !== id) }));

  const onSave = () => toast.success(t("saved"));

  return (
    <div className="space-y-6" data-testid="cms-footer-form-root">
      <PageHeader title={t("title")} description={t("description")} />

      <form
        data-testid="cms-footer-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        className="space-y-6"
      >
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={addColumn}
            data-testid="cms-footer-form-add-column"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("add_column")}
          </Button>
        </div>

        {footer.columns.length === 0 ? (
          <Card>
            <CardContent
              className="py-10 text-center text-sm text-muted-foreground"
              data-testid="cms-footer-form-empty"
            >
              {t("add_column")}
            </CardContent>
          </Card>
        ) : (
          footer.columns.map((col, idx) => (
            <Card key={col.id} data-testid={`cms-footer-column-${idx}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">#{idx + 1}</CardTitle>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeColumn(col.id)}
                  data-testid={`cms-footer-column-${idx}-remove`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  <Label>{t("column_title_label")}</Label>
                  <Input
                    value={col.title}
                    onChange={(e) => patchColumn(col.id, { title: e.target.value })}
                    data-testid={`cms-footer-column-${idx}-title`}
                  />
                </div>
                <div className="space-y-2">
                  {col.links.map((link, linkIdx) => (
                    <div
                      key={link.id}
                      className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_auto]"
                      data-testid={`cms-footer-column-link-${idx}-${linkIdx}`}
                    >
                      <Input
                        placeholder={t("link_label")}
                        value={link.label}
                        onChange={(e) => patchLink(col.id, link.id, { label: e.target.value })}
                        data-testid={`cms-footer-column-link-${idx}-${linkIdx}-label`}
                      />
                      <Input
                        placeholder={t("link_url")}
                        value={link.url}
                        onChange={(e) => patchLink(col.id, link.id, { url: e.target.value })}
                        data-testid={`cms-footer-column-link-${idx}-${linkIdx}-url`}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeLink(col.id, link.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`cms-footer-column-link-${idx}-${linkIdx}-remove`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addLink(col.id)}
                    data-testid={`cms-footer-column-${idx}-add-link`}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("add_link")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("social_heading")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {footer.socials.map((soc, idx) => (
              <div
                key={soc.id}
                className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_auto]"
                data-testid={`cms-footer-social-${idx}`}
              >
                <Input
                  placeholder={t("social_platform")}
                  value={soc.platform}
                  onChange={(e) => patchSocial(soc.id, { platform: e.target.value })}
                  data-testid={`cms-footer-social-${idx}-platform`}
                />
                <Input
                  placeholder={t("social_url")}
                  value={soc.url}
                  onChange={(e) => patchSocial(soc.id, { url: e.target.value })}
                  data-testid={`cms-footer-social-${idx}-url`}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeSocial(soc.id)}
                  className="text-destructive hover:text-destructive"
                  data-testid={`cms-footer-social-${idx}-remove`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSocial}
              data-testid="cms-footer-form-add-social"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t("add_social")}
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" data-testid="cms-footer-form-save">
          {t("save")}
        </Button>
      </form>
    </div>
  );
}
