import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Layers, Search, Sparkles } from "lucide-react";

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
import { useTemplates } from "@/lib/platform/mock-store";
import { tFor } from "@/i18n/tests";

export const Route = createFileRoute("/app/templates")({
  head: () => ({
    meta: [{ title: "Šablóny · SubenAI" }, { name: "robots", content: "noindex" }],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const t = tFor("templates");
  const templates = useTemplates();
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

      {filtered.length === 0 ? (
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
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`templates-row-preview-${tpl.id}`}
                      onClick={() => {
                        // Preview is a no-op placeholder for the read-only browser.
                      }}
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      {t("row_preview")}
                    </Button>
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
