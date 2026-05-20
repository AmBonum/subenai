import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layers, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app/page-header";
import { useTemplates } from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";
import { tFor as tAppShell } from "@/i18n/app-shell";

const tRoutes = tAppShell("route_titles");

export const Route = createFileRoute("/app/templates")({
  head: () => ({
    meta: [{ title: tRoutes("templates") }, { name: "robots", content: "noindex" }],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const t = tFor("templates");
  const templatesQ = useTemplates();
  const templates = useMemo(() => templatesQ.data ?? [], [templatesQ.data]);
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(
    () => Array.from(new Set(templates.map((x) => x.gdpr_purpose))).sort(),
    [templates],
  );

  const filtered = useMemo(
    () =>
      templates.filter(
        (x) =>
          (category === "all" || x.gdpr_purpose === category) &&
          (!search || x.title.toLowerCase().includes(search.toLowerCase())),
      ),
    [templates, search, category],
  );

  const onUse = (templateId: string) => {
    nav({ to: "/app/tests/new", search: { step: 1, templateId } });
  };

  return (
    <div className="space-y-6" data-testid="templates-root">
      <PageHeader
        eyebrow={t("page_eyebrow")}
        title={t("page_title")}
        accentWords={1}
        icon={Layers}
        subtitle={t("page_subtitle")}
        testId="templates-page-header"
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="templates-list-search-input"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48" data-testid="templates-list-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("category_all")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 && templates.length === 0 && !templatesQ.isLoading ? (
        // No rows in the templates table at all — a content/data state,
        // not a filter miss. The pre-2026-05-21 copy ("Pre tento filter
        // nemáme žiadne šablóny") confused users who landed here with
        // no filter active and an empty production DB (E36 hot-fix).
        <Card data-testid="templates-list-empty-state-no-templates">
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("empty_state_no_templates_title")}
            </p>
            <p className="text-sm text-muted-foreground">{t("empty_state_no_templates_body")}</p>
            <Button
              variant="default"
              onClick={() => nav({ to: "/app/tests/new", search: { step: 1 } })}
              data-testid="templates-list-empty-state-no-templates-cta"
              className="mt-2"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("empty_state_no_templates_cta")}
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        // Filter returned no matches but the table has rows — the
        // existing copy applies.
        <Card data-testid="templates-list-empty-state">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("empty_state")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((tpl) => (
            <Card
              key={tpl.id}
              data-testid={`templates-list-row-${tpl.id}`}
              className="border-border/60"
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Layers className="h-4 w-4 text-primary" />
                      {tpl.title}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {tpl.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {t("questions_count", { count: tpl.question_ids.length })}
                  </Badge>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <Badge variant="outline" className="font-normal text-[10px]">
                    {tpl.gdpr_purpose}
                  </Badge>
                  <div className="flex gap-2">
                    {/* Preview hidden until AH-12 schema enrichment lands the
                        read-only question viewer. Shipping a no-op button
                        violates the "no broken UI" rule. */}
                    <Button
                      size="sm"
                      onClick={() => onUse(tpl.id)}
                      data-testid={`templates-row-use-${tpl.id}`}
                    >
                      <Sparkles className="mr-2 h-3 w-3" />
                      {t("row_use")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
