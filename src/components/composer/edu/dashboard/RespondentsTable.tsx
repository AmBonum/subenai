import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { RespondentRow } from "@/lib/edu/types";
import { tFor } from "@/i18n/quiz";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

type SortKey = "name" | "score" | "created_at";
type SortDir = "asc" | "desc";

interface Props {
  rows: RespondentRow[];
  passingThreshold: number;
  onDelete: (attemptId: string) => Promise<boolean>;
}

export function RespondentsTable({ rows, passingThreshold, onDelete }: Props) {
  const t = tFor("respondents");
  const tCommon = tFor("common");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // Designed AlertDialog replaces window.confirm. Two-state machine:
  // the row holds the person's name/email to render in the body; null
  // = dialog closed. The actual destructive call runs on confirm.
  const [confirmTarget, setConfirmTarget] = useState<RespondentRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.respondent_name.toLowerCase().includes(q) || r.respondent_email.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return a.respondent_name.localeCompare(b.respondent_name, "sk") * dir;
        case "score":
          return (a.final_score - b.final_score) * dir;
        case "created_at":
        default:
          return a.created_at.localeCompare(b.created_at) * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    if (sortKey !== key) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  async function performDelete(row: RespondentRow): Promise<void> {
    setPendingDelete(row.id);
    try {
      await onDelete(row.id);
    } finally {
      setPendingDelete(null);
    }
  }

  const captionKey =
    sortKey === "name"
      ? "caption_by_name"
      : sortKey === "score"
        ? "caption_by_score"
        : "caption_by_date";

  return (
    <section data-testid="resp-table-root" aria-labelledby="resp-h" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="resp-h" className="text-lg font-semibold text-foreground">
            {t("title", { count: filtered.length })}
          </h2>
          <p className="text-sm text-muted-foreground">{t("hint")}</p>
        </div>
        <input
          type="search"
          data-testid="resp-table-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search_placeholder")}
          aria-label={t("search_aria")}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      {sorted.length === 0 ? (
        <p
          data-testid="resp-table-empty"
          className="rounded-xl border border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground"
        >
          {rows.length === 0 ? t("empty_no_rows") : t("empty_filter")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table data-testid="resp-table-table" className="w-full text-sm">
            <caption className="sr-only">{t(captionKey)}</caption>
            <thead className="bg-muted/30 text-left">
              <tr>
                <SortableTh ariaSort={ariaSort("name")} onClick={() => toggleSort("name")}>
                  {t("th_name")}
                </SortableTh>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {t("th_email")}
                </th>
                <SortableTh ariaSort={ariaSort("score")} onClick={() => toggleSort("score")}>
                  {t("th_score")}
                </SortableTh>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {t("th_passed")}
                </th>
                <SortableTh
                  ariaSort={ariaSort("created_at")}
                  onClick={() => toggleSort("created_at")}
                >
                  {t("th_date")}
                </SortableTh>
                <th scope="col" className="px-3 py-2 font-semibold">
                  <span className="sr-only">{t("th_actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const passed = r.final_score >= passingThreshold;
                return (
                  <tr
                    key={r.id}
                    data-testid={`resp-table-row-${r.id}`}
                    className="border-t border-border/40"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">{r.respondent_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.respondent_email}</td>
                    <td className="px-3 py-2 font-bold tabular-nums text-foreground">
                      {r.final_score}%
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          passed
                            ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500"
                            : "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-500"
                        }
                      >
                        {passed ? tCommon("yes") : tCommon("no")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("sk-SK")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        data-testid={`resp-table-delete-btn-${r.id}`}
                        onClick={() => setConfirmTarget(r)}
                        disabled={pendingDelete === r.id}
                        aria-label={t("delete_aria", { name: r.respondent_name })}
                        className="inline-flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
        title={t("delete_confirm_title")}
        description={
          confirmTarget
            ? t("delete_confirm_body", {
                name: confirmTarget.respondent_name,
                email: confirmTarget.respondent_email,
              })
            : ""
        }
        confirmLabel={t("delete_confirm_action")}
        cancelLabel={t("delete_confirm_cancel")}
        destructive
        onConfirm={() => {
          if (confirmTarget) {
            void performDelete(confirmTarget);
          }
        }}
      />
    </section>
  );
}

function SortableTh({
  children,
  ariaSort,
  onClick,
}: {
  children: React.ReactNode;
  ariaSort: "ascending" | "descending" | "none";
  onClick: () => void;
}) {
  return (
    <th scope="col" aria-sort={ariaSort} className="px-3 py-2 font-semibold">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 hover:text-primary"
      >
        {children}
        <span aria-hidden className="text-xs">
          {ariaSort === "ascending" ? "↑" : ariaSort === "descending" ? "↓" : "↕"}
        </span>
      </button>
    </th>
  );
}
