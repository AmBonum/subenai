import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";

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
import { AppPageExplainer } from "@/components/user/AppPageExplainer";
// `useQuestions` reads `Question` (with `type` + `category`). Production
// `questions` table only has `branch_slug` + `difficulty` (see
// `useLibraryQuestions` in queries.ts). Keep on mock-store until AH-12 schema
// enrichment adds the missing columns; otherwise the type badge + category
// chip would render blank.
import { useQuestions } from "@/lib/platform/mock-store";
import type { QuestionType } from "@/lib/platform/types";
import { tFor } from "@/i18n/questions";
import { tFor as tAppShell } from "@/i18n/app-shell";

const tRoutes = tAppShell("route_titles");

export const Route = createFileRoute("/app/library")({
  head: () => ({
    meta: [{ title: tRoutes("library") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: LibraryPage,
});

const TYPE_LABEL_KEY: Record<QuestionType, string> = {
  single: "type_single",
  multi: "type_multi",
  scale_1_5: "type_scale_1_5",
  scale_1_10: "type_scale_1_10",
  nps: "type_nps",
  matrix: "type_matrix",
  ranking: "type_ranking",
  slider: "type_slider",
  short_text: "type_short_text",
  long_text: "type_long_text",
  date: "type_date",
  time: "type_time",
  file_upload: "type_file_upload",
  image_choice: "type_image_choice",
  yes_no: "type_yes_no",
};

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function LibraryPage() {
  const t = tFor("user_library");
  const questions = useQuestions();
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");

  const branches = useMemo(
    () => Array.from(new Set(questions.map((x) => x.category))).sort(),
    [questions],
  );

  const filtered = useMemo(
    () =>
      questions.filter(
        (x) =>
          (branch === "all" || x.category === branch) &&
          (difficulty === "all" || x.difficulty === difficulty) &&
          (!q || x.prompt.toLowerCase().includes(q.toLowerCase())),
      ),
    [questions, branch, difficulty, q],
  );

  return (
    <div className="space-y-6" data-testid="library-root">
      <PageHeader
        eyebrow="Obsah"
        title={t("page_title")}
        accentWords={1}
        subtitle={t("page_subtitle", { count: questions.length })}
        testId="library-page-header"
      />
      <AppPageExplainer pageKey="library" />
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("search_placeholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              data-testid="library-search-input"
            />
          </div>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-40" data-testid="library-branch-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("branch_all")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-40" data-testid="library-difficulty-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("difficulty_all")}</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {t(`difficulty_${d}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card data-testid="library-empty-state">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("empty_state")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.slice(0, 60).map((qq) => (
            <Card key={qq.id} className="border-border/60" data-testid={`library-row-${qq.id}`}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{qq.prompt}</p>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px]"
                    data-testid={`library-row-preview-${qq.id}`}
                  >
                    {t(TYPE_LABEL_KEY[qq.type])}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">
                    {qq.category}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {t(`difficulty_${qq.difficulty}`)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {filtered.length > 60 && (
        <p
          className="text-center text-xs text-muted-foreground"
          data-testid="library-showing-capped"
        >
          {t("showing_capped", { count: filtered.length })}
        </p>
      )}
    </div>
  );
}
