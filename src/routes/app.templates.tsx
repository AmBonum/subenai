import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Layers, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app/page-header";
import { TemplateCard } from "@/components/app/templates/TemplateCard";
import { TemplatesTabs, type TemplatesTab } from "@/components/app/templates/TemplatesTabs";
import { TemplateEditDialog } from "@/components/app/templates/TemplateEditDialog";
import { TemplateDuplicateDialog } from "@/components/app/templates/TemplateDuplicateDialog";
import { TemplateDeleteConfirm } from "@/components/app/templates/TemplateDeleteConfirm";
import { useCurrentProfile, useMyTemplates, usePublicTemplates } from "@/lib/platform/queries";
import type { GdprPurpose, Template } from "@/lib/platform/types";
import { tFor } from "@/i18n/tests";
import { tFor as tAppShell } from "@/i18n/app-shell";

const tRoutes = tAppShell("route_titles");

const searchSchema = z.object({
  tab: z.enum(["public", "mine"]).catch("public").optional(),
});

export const Route = createFileRoute("/app/templates")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: tRoutes("templates") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: TemplatesPage,
});

type DialogKind = "edit" | "duplicate" | "delete" | null;

function TemplatesPage() {
  const t = tFor("templates");
  const nav = useNavigate({ from: "/app/templates" });
  const routeSearch = useSearch({ from: "/app/templates" });
  const activeTab: TemplatesTab = routeSearch.tab ?? "public";

  const publicQ = usePublicTemplates();
  const mineQ = useMyTemplates();
  const profileQ = useCurrentProfile();
  const currentUserId = profileQ.data?.id ?? null;

  const publicTemplates = useMemo(() => publicQ.data ?? [], [publicQ.data]);
  const mineTemplates = useMemo(() => mineQ.data ?? [], [mineQ.data]);
  const activeQuery = activeTab === "public" ? publicQ : mineQ;
  const activeRows = activeTab === "public" ? publicTemplates : mineTemplates;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogTemplate, setDialogTemplate] = useState<Template | null>(null);

  const categories = useMemo<GdprPurpose[]>(() => {
    const set = new Set<string>();
    for (const r of publicTemplates) set.add(r.gdpr_purpose);
    for (const r of mineTemplates) set.add(r.gdpr_purpose);
    return Array.from(set).sort() as GdprPurpose[];
  }, [publicTemplates, mineTemplates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeRows.filter(
      (x) =>
        (category === "all" || x.gdpr_purpose === category) &&
        (!q || x.title.toLowerCase().includes(q)),
    );
  }, [activeRows, search, category]);

  const filterActive = search.trim() !== "" || category !== "all";

  const setTab = (next: TemplatesTab) => {
    void nav({ search: { tab: next }, replace: true });
  };

  const onUse = (tpl: Template) => {
    void nav({ to: "/app/tests/new", search: { step: 1, templateId: tpl.id } });
  };

  const openDialog = (kind: Exclude<DialogKind, null>, tpl: Template) => {
    setDialogTemplate(tpl);
    setDialog(kind);
  };

  const closeDialog = (open: boolean) => {
    if (!open) {
      setDialog(null);
    }
  };

  const onDuplicated = () => {
    setTab("mine");
  };

  const rootRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: J/K move focus between cards; Enter triggers Use on
  // focused card; D/E/Del open Duplicate/Edit/Delete for the focused card
  // when applicable. Shortcuts are suppressed when typing in an input.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const root = rootRef.current;
      if (!root) return;
      const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-template-card="root"]'));
      if (cards.length === 0) return;

      const findActiveIndex = () => {
        const active = document.activeElement as HTMLElement | null;
        if (!active) return -1;
        return cards.findIndex((c) => c === active || c.contains(active));
      };

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        const i = findActiveIndex();
        const next = i < 0 ? 0 : Math.min(cards.length - 1, i + 1);
        focusCardUseButton(cards[next]);
        return;
      }
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        const i = findActiveIndex();
        const prev = i < 0 ? 0 : Math.max(0, i - 1);
        focusCardUseButton(cards[prev]);
        return;
      }
      const i = findActiveIndex();
      if (i < 0) return;
      const focusedCard = cards[i];
      const cardId = focusedCard.dataset.testid?.replace(/^templates-card-/, "") ?? "";
      const tpl = activeRows.find((r) => r.id === cardId);
      if (!tpl) return;
      const isOwned = !!currentUserId && tpl.owner_id === currentUserId;

      if (e.key === "Enter") {
        // Already handled by the button's native Enter when focused; only
        // trigger when focus is on the card root itself.
        if (document.activeElement === focusedCard) {
          e.preventDefault();
          onUse(tpl);
        }
        return;
      }
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        openDialog("duplicate", tpl);
        return;
      }
      if ((e.key === "e" || e.key === "E") && isOwned) {
        e.preventDefault();
        openDialog("edit", tpl);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && isOwned) {
        e.preventDefault();
        openDialog("delete", tpl);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // `onUse` is defined inline above but reads stable state via closure;
    // include `activeRows` and `currentUserId` so the closure stays fresh.
  }, [activeRows, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = activeQuery.isLoading;

  return (
    <div className="space-y-6" data-testid="templates-root" ref={rootRef}>
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
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9 max-sm:h-11"
              placeholder={t("search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="templates-list-search-input"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className="w-48 max-sm:h-11"
              data-testid="templates-list-category-filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("category_all")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`purposes.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span
            data-testid="templates-list-result-count"
            className="text-xs text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {t("results_count", { count: filtered.length, total: activeRows.length })}
          </span>
        </CardContent>
      </Card>

      <TemplatesTabs
        value={activeTab}
        onChange={setTab}
        publicCount={publicTemplates.length}
        mineCount={mineTemplates.length}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        activeTab === "public" ? (
          <Card data-testid="templates-list-empty-state-public">
            <CardContent className="space-y-3 p-8 text-center">
              <p className="text-sm text-muted-foreground">{t("empty_state_public_filter")}</p>
            </CardContent>
          </Card>
        ) : (
          <Card data-testid="templates-list-empty-state-mine">
            <CardContent className="space-y-3 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {filterActive ? t("empty_state_mine_filter") : t("empty_state_mine_no_copies")}
              </p>
              {!filterActive && (
                <Button variant="outline" onClick={() => setTab("public")} className="max-sm:h-11">
                  {t("empty_state_mine_no_copies_cta")}
                </Button>
              )}
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              mode={activeTab}
              currentUserId={currentUserId}
              onUse={onUse}
              onDuplicate={(x) => openDialog("duplicate", x)}
              onEdit={(x) => openDialog("edit", x)}
              onDelete={(x) => openDialog("delete", x)}
            />
          ))}
        </div>
      )}

      <TemplateEditDialog
        template={dialogTemplate}
        open={dialog === "edit"}
        onOpenChange={closeDialog}
      />
      <TemplateDuplicateDialog
        template={dialogTemplate}
        open={dialog === "duplicate"}
        onOpenChange={closeDialog}
        onDuplicated={onDuplicated}
      />
      <TemplateDeleteConfirm
        template={dialogTemplate}
        open={dialog === "delete"}
        onOpenChange={closeDialog}
      />
    </div>
  );
}

function focusCardUseButton(card: HTMLElement) {
  const btn = card.querySelector<HTMLButtonElement>('[data-testid$="-use-button"]');
  if (btn) {
    btn.focus();
  } else {
    card.focus();
  }
}
