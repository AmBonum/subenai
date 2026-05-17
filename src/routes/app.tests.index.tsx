import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Lock, Send, Archive, FileEdit, Share2, ExternalLink } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useTests, currentUserId } from "@/lib/platform/mock-store";
import { tFor } from "@/i18n/tests";

export const Route = createFileRoute("/app/tests/")({
  head: () => ({
    meta: [{ title: "Moje testy · SubenAI" }, { name: "robots", content: "noindex" }],
  }),
  component: TestsList,
});

type StatusFilter = "all" | "published" | "draft" | "archived";

function TestsList() {
  const t = tFor("list");
  const all = useTests();
  const owned = useMemo(() => all.filter((x) => x.owner_id === currentUserId()), [all]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [branch, setBranch] = useState<string>("all");

  const branches = useMemo(
    () => Array.from(new Set(owned.flatMap((x) => x.segmentation))).sort(),
    [owned],
  );

  const filtered = useMemo(
    () =>
      owned.filter(
        (x) =>
          (status === "all" || x.status === status) &&
          (branch === "all" || x.segmentation.includes(branch)) &&
          (!search || x.title.toLowerCase().includes(search.toLowerCase())),
      ),
    [owned, status, branch, search],
  );

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setBranch("all");
  };

  return (
    <div className="space-y-6" data-testid="tests-list-root">
      <PageHeader
        eyebrow={t("page_eyebrow")}
        title={t("page_title")}
        accentWords={1}
        subtitle={t("page_subtitle")}
        actions={
          <Button
            size="sm"
            asChild
            className="btn-primary"
            data-testid="tests-list-new-test-button"
          >
            <Link to="/app/tests/new">
              <Plus className="mr-2 h-3 w-3" />
              {t("new_test_button")}
            </Link>
          </Button>
        }
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
              data-testid="tests-list-search-input"
            />
          </div>
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <TabsList data-testid="tests-list-status-filter">
              <TabsTrigger value="all">
                {t("status_all")} ({owned.length})
              </TabsTrigger>
              <TabsTrigger value="published">
                <Send className="mr-1 h-3 w-3" />
                {t("status_published")}
              </TabsTrigger>
              <TabsTrigger value="draft">
                <FileEdit className="mr-1 h-3 w-3" />
                {t("status_draft")}
              </TabsTrigger>
              <TabsTrigger value="archived">
                <Archive className="mr-1 h-3 w-3" />
                {t("status_archived")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-44" data-testid="tests-list-branch-filter">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            data-testid="tests-list-clear-filters-button"
          >
            {t("clear_filters")}
          </Button>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card data-testid="tests-list-empty-state">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("empty_state")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((x) => (
            <Card
              key={x.id}
              data-testid={`tests-list-row-${x.id}`}
              className="border-border/60 transition hover:border-primary/60"
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{x.title}</div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{x.description}</p>
                  </div>
                  <StatusBadge status={x.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{t("version_label", { version: x.version })}</span>
                  <span>·</span>
                  <span>{t("questions_count", { count: x.question_ids.length })}</span>
                  {x.password && (
                    <>
                      <span>·</span>
                      <Lock className="h-3 w-3" />
                      {t("password_label")}
                    </>
                  )}
                  {x.segmentation.map((s) => (
                    <Badge key={s} variant="secondary" className="font-normal text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    data-testid={`tests-list-row-open-${x.id}`}
                  >
                    <Link to="/app/tests/$testId" params={{ testId: x.id }}>
                      <ExternalLink className="mr-1 h-3 w-3" />
                      {t("row_open")}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    data-testid={`tests-list-row-share-${x.id}`}
                  >
                    <Link to="/app/tests/$testId" params={{ testId: x.id }} search={{ share: "1" }}>
                      <Share2 className="mr-1 h-3 w-3" />
                      {t("row_share")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
