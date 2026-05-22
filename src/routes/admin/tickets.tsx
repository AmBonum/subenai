import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// E48-v2 PR-D — typed search params for the admin tickets queue. All
// fields are optional and defensively coerced via `.catch(undefined)`
// so a malformed URL never crashes the route; invalid values are
// silently dropped (e.g. `?status=foo` → status undefined).
//
// Schema lives inline (rather than in a sibling .ts) because TanStack
// Router's codegen reads it from this exact file; eslint's
// react-refresh rule flags the non-component export — that's fine here
// since fast-refresh isn't needed for route config.

const STATUS_VALUES = [
  "new",
  "in_progress",
  "waiting_user",
  "resolved",
  "reopened",
  "archived",
] as const;

const CATEGORY_VALUES = [
  "bug",
  "question",
  "feature_request",
  "abuse_report",
  "billing",
  "gdpr",
  "other",
] as const;

// Legacy single-key sort (kept for back-compat with bookmarked URLs;
// translated to the new per-column shape at the orchestrator level).
const LEGACY_SORT_VALUES = ["recency-desc", "recency-asc", "status", "category"] as const;

// E48-v3 per-column sort: `?sort=col:dir` where col is one of the
// SORT_COLUMNS and dir is `asc` or `desc`. Anything else falls back
// to the default (newest first).
const SORT_REGEX = /^(status|category|subject|submitter|assigned|created_at):(asc|desc)$/;

// Comma-separated multi-select → string[] coercion.
function parseCsv<T extends string>(allowed: readonly T[]) {
  return z
    .union([z.string(), z.array(z.string())])
    .transform((raw): T[] | undefined => {
      const items = Array.isArray(raw) ? raw : raw.split(",");
      const filtered = items
        .map((s) => s.trim())
        .filter((s): s is T => (allowed as readonly string[]).includes(s));
      return filtered.length === 0 ? undefined : filtered;
    })
    .catch(undefined)
    .optional();
}

const isoDateString = z
  .string()
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "invalid date")
  .catch("")
  .optional()
  .transform((s) => (s && s.length > 0 ? s : undefined));

const ticketsSearchSchema = z.object({
  status: parseCsv(STATUS_VALUES),
  category: parseCsv(CATEGORY_VALUES),
  assignedTo: z
    .string()
    .max(64)
    .catch("")
    .optional()
    .transform((s) => (s && s.length > 0 ? s : undefined)),
  dateFrom: isoDateString,
  dateTo: isoDateString,
  q: z
    .string()
    .max(200)
    .catch("")
    .optional()
    .transform((s) => (s && s.length > 0 ? s : undefined)),
  sort: z
    .string()
    .refine((s) => SORT_REGEX.test(s), "invalid sort key")
    .catch("")
    .optional()
    .transform((s) => (s && s.length > 0 ? s : undefined)),
  // Legacy dropdown-style sort param. The orchestrator translates it to
  // the new `sort` shape on mount so old bookmarks keep working.
  sortDropdown: z.enum(LEGACY_SORT_VALUES).catch("recency-desc").optional(),
  page: z.coerce.number().int().min(1).catch(1).optional(),
});

export const Route = createFileRoute("/admin/tickets")({
  validateSearch: ticketsSearchSchema,
  head: () => ({
    meta: [{ title: "Žiadosti podpory · Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
