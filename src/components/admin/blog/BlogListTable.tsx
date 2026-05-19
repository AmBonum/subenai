import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { BlogRowActions } from "@/components/admin/blog/BlogRowActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminBlogPostListItem, BlogPostStatus } from "@/lib/blog/admin-queries";

// ----- Column / sort / filter model --------------------------------------

// The columns the user can show/hide + sort by. The order here is the
// initial column order in the rendered table.
export const COLUMN_KEYS = [
  "title",
  "category",
  "author",
  "status",
  "published_at",
  "updated_at",
  "actions",
] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

const COLUMN_LABEL: Record<ColumnKey, string> = {
  title: "Titulok",
  category: "Kategória",
  author: "Autor",
  status: "Stav",
  published_at: "Publikované",
  updated_at: "Aktualizované",
  actions: "Akcie",
};

// Columns that are NEVER hidden — the title carries the editor link,
// and Actions is the only way to delete/duplicate/restatus from the
// list (hiding it would force users to open every article to act).
const REQUIRED_COLUMNS: ReadonlySet<ColumnKey> = new Set(["title", "actions"]);

// Columns that are NOT sortable (no semantic ordering). Sort UI
// stays hidden on these headers.
const UNSORTABLE_COLUMNS: ReadonlySet<ColumnKey> = new Set(["actions"]);

type SortDirection = "asc" | "desc";

interface SortState {
  key: ColumnKey;
  direction: SortDirection;
}

const STATUS_OPTIONS: ReadonlyArray<{ value: BlogPostStatus | "all"; label: string }> = [
  { value: "all", label: "Všetky stavy" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Publikované" },
  { value: "archived", label: "Archivované" },
];

// ----- Component ---------------------------------------------------------

interface BlogListTableProps {
  posts: AdminBlogPostListItem[];
}

export function BlogListTable({ posts }: BlogListTableProps) {
  // Search + filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BlogPostStatus | "all">("all");
  const [category, setCategory] = useState<string>("__all__");

  // Sort
  const [sort, setSort] = useState<SortState>({ key: "updated_at", direction: "desc" });

  // Column visibility — every column visible by default
  const [visibleColumns, setVisibleColumns] = useState<ReadonlySet<ColumnKey>>(
    () => new Set(COLUMN_KEYS),
  );

  // Build the category options from the rendered posts so the filter
  // never offers a category that has zero matching rows.
  const categoryOptions = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    for (const p of posts) {
      const existing = map.get(p.category.slug);
      if (existing) existing.count += 1;
      else map.set(p.category.slug, { slug: p.category.slug, name: p.category.name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "sk"));
  }, [posts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = posts;
    if (status !== "all") rows = rows.filter((p) => p.status === status);
    if (category !== "__all__") rows = rows.filter((p) => p.category.slug === category);
    if (q.length >= 2) {
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.category.name.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [posts, status, category, search]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    const { key, direction } = sort;
    const cmp = direction === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av < bv) return -1 * cmp;
      if (av > bv) return 1 * cmp;
      return 0;
    });
    return out;
  }, [filtered, sort]);

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setCategory("__all__");
  };

  const onHeaderClick = (key: ColumnKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const toggleColumn = (key: ColumnKey) => {
    if (REQUIRED_COLUMNS.has(key)) return;
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const exportFilteredAsJson = () => {
    const blob = new Blob([JSON.stringify(sorted, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    downloadBlob(blob, `subenai-blog-${dateStamp()}.json`);
  };

  const exportFilteredAsCsv = () => {
    // Flat row-per-post CSV: each row is one article (different from
    // single-article export which is wide-form). Quote per RFC 4180.
    const header = [
      "id",
      "slug",
      "title",
      "status",
      "category_slug",
      "category_name",
      "author_slug",
      "author_display_name",
      "published_at",
      "updated_at",
    ].join(",");
    const lines = sorted.map((p) =>
      [
        p.id,
        p.slug,
        p.title,
        p.status,
        p.category.slug,
        p.category.name,
        p.author.slug,
        p.author.display_name,
        p.published_at ?? "",
        p.updated_at,
      ]
        .map((v) => `"${String(v).replace(/"/gu, '""')}"`)
        .join(","),
    );
    const csv = [header, ...lines].join("\n") + "\n";
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `subenai-blog-${dateStamp()}.csv`,
    );
  };

  return (
    <div className="space-y-4" data-testid="admin-blog-table-root">
      {/* Toolbar — search + filters + bulk export + column toggle */}
      <div className="flex flex-wrap items-center gap-2" data-testid="admin-blog-toolbar">
        <SearchField value={search} onChange={setSearch} />
        <StatusSelect value={status} onChange={setStatus} />
        <CategorySelect value={category} onChange={setCategory} options={categoryOptions} />
        {(search || status !== "all" || category !== "__all__") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            data-testid="admin-blog-filters-reset"
          >
            <X className="mr-1.5 size-3.5" />
            zrušiť filtre
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ColumnsMenu
            visible={visibleColumns}
            onToggle={toggleColumn}
            requiredKeys={REQUIRED_COLUMNS}
          />
          <BulkExportMenu
            onJson={exportFilteredAsJson}
            onCsv={exportFilteredAsCsv}
            disabled={sorted.length === 0}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="admin-blog-result-count">
        {sorted.length === posts.length
          ? `Zobrazených ${sorted.length} článkov`
          : `Zobrazených ${sorted.length} z ${posts.length} článkov`}
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border" data-testid="admin-blog-list-table">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMN_KEYS.filter((key) => visibleColumns.has(key)).map((key) => (
                <TableHead key={key} className={key === "actions" ? "w-[170px] text-right" : ""}>
                  {UNSORTABLE_COLUMNS.has(key) ? (
                    <span className="font-medium" data-testid={`admin-blog-header-${key}`}>
                      {COLUMN_LABEL[key]}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onHeaderClick(key)}
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      data-testid={`admin-blog-sort-${key}`}
                    >
                      {COLUMN_LABEL[key]}
                      <SortIcon active={sort.key === key} direction={sort.direction} />
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.size}
                  className="text-center text-sm text-muted-foreground"
                  data-testid="admin-blog-no-results"
                >
                  Žiadne články nezodpovedajú filtrom.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((post) => (
                <TableRow key={post.id} data-testid={`admin-blog-list-row-${post.slug}`}>
                  {visibleColumns.has("title") && (
                    <TableCell>
                      <Link
                        to="/admin/blog/$id"
                        params={{ id: post.id }}
                        className="font-medium underline-offset-2 hover:underline"
                        data-testid={`admin-blog-list-row-link-${post.slug}`}
                      >
                        {post.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">{post.slug}</p>
                    </TableCell>
                  )}
                  {visibleColumns.has("category") && (
                    <TableCell data-testid={`admin-blog-list-row-category-${post.slug}`}>
                      {post.category.name}
                    </TableCell>
                  )}
                  {visibleColumns.has("author") && (
                    <TableCell data-testid={`admin-blog-list-row-author-${post.slug}`}>
                      {post.author.display_name}
                    </TableCell>
                  )}
                  {visibleColumns.has("status") && (
                    <TableCell>
                      <StatusBadge status={post.status} />
                    </TableCell>
                  )}
                  {visibleColumns.has("published_at") && (
                    <TableCell className="text-sm text-muted-foreground">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString("sk-SK")
                        : "—"}
                    </TableCell>
                  )}
                  {visibleColumns.has("updated_at") && (
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(post.updated_at).toLocaleDateString("sk-SK")}
                    </TableCell>
                  )}
                  {visibleColumns.has("actions") && (
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <BlogRowActions post={post} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ----- Sub-components ----------------------------------------------------

function SearchField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const id = useId();
  return (
    <div className="relative w-full max-w-xs">
      <label htmlFor={id} className="sr-only">
        Hľadať
      </label>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="hľadať podľa názvu, slug, kategórie…"
        className="pl-8"
        data-testid="admin-blog-search-input"
      />
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: BlogPostStatus | "all";
  onChange: (next: BlogPostStatus | "all") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as BlogPostStatus | "all")}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      aria-label="Filter podľa stavu"
      data-testid="admin-blog-filter-status"
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function CategorySelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: ReadonlyArray<{ slug: string; name: string; count: number }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      aria-label="Filter podľa kategórie"
      data-testid="admin-blog-filter-category"
    >
      <option value="__all__">Všetky kategórie</option>
      {options.map((o) => (
        <option key={o.slug} value={o.slug}>
          {o.name} ({o.count})
        </option>
      ))}
    </select>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />;
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden="true" />
  );
}

function ColumnsMenu({
  visible,
  onToggle,
  requiredKeys,
}: {
  visible: ReadonlySet<ColumnKey>;
  onToggle: (key: ColumnKey) => void;
  requiredKeys: ReadonlySet<ColumnKey>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        data-testid="admin-blog-columns-trigger"
        aria-expanded={open}
      >
        Stĺpce
      </Button>
      {open && (
        <>
          {/* Click-outside catcher */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-popover p-1 shadow-md"
            role="menu"
            data-testid="admin-blog-columns-menu"
          >
            {COLUMN_KEYS.map((key) => {
              const isOn = visible.has(key);
              const isLocked = requiredKeys.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isOn}
                  disabled={isLocked}
                  onClick={() => onToggle(key)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid={`admin-blog-columns-toggle-${key}`}
                >
                  <span>{COLUMN_LABEL[key]}</span>
                  <span className="text-xs text-muted-foreground">
                    {isLocked ? "vždy" : isOn ? "zap." : "vyp."}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function BulkExportMenu({
  onJson,
  onCsv,
  disabled,
}: {
  onJson: () => void;
  onCsv: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        data-testid="admin-blog-bulk-export-trigger"
      >
        Exportovať
      </Button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 z-20 mt-2 w-44 rounded-md border border-border bg-popover p-1 shadow-md"
            role="menu"
            data-testid="admin-blog-bulk-export-menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onJson();
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              data-testid="admin-blog-bulk-export-json"
            >
              JSON (zoznam)
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onCsv();
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              data-testid="admin-blog-bulk-export-csv"
            >
              CSV (zoznam)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ----- Helpers -----------------------------------------------------------

function sortValue(post: AdminBlogPostListItem, key: ColumnKey): string | number {
  switch (key) {
    case "title":
      return post.title.toLowerCase();
    case "category":
      return post.category.name.toLowerCase();
    case "author":
      return post.author.display_name.toLowerCase();
    case "status":
      return post.status;
    case "published_at":
      return post.published_at ?? "";
    case "updated_at":
      return post.updated_at;
    case "actions":
      return "";
  }
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
