/**
 * Pure response-shape helpers for the Playwright Supabase mock.
 *
 * Extracted from the route-handler so the envelope can be canary-tested
 * in Vitest without spinning up a browser. If Supabase ever changes the
 * PostgREST response shape (Content-Range header format, single-row 406
 * status, error envelope keys), the canary test in
 * `tests/lib/supabase/mock-envelope-conformance.test.ts` fails loudly.
 */

export interface FulfillResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface PostgrestArrayOptions {
  /** When set, emit `Content-Range: 0-(N-1)/total`. */
  withCount?: boolean;
  /** Override the computed `total` (defaults to `rows.length`). */
  total?: number;
  /** Override the start offset for Content-Range. Defaults to 0. */
  offset?: number;
  /** Status code. Defaults to 200. */
  status?: number;
}

export interface SupabaseErrorInput {
  status: number;
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export function buildPostgrestArrayResponse(
  rows: unknown[],
  opts: PostgrestArrayOptions = {},
): FulfillResponse {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.withCount) {
    const total = opts.total ?? rows.length;
    const start = opts.offset ?? 0;
    // `end` is the inclusive index of the last record represented by
    // this response — NOT the last record in the body. For HEAD
    // count=exact, the body is empty but `total` is the real row
    // count; real PostgREST emits `0-(total-1)/total`. Falling back
    // to `rows.length` here breaks `.select(col, { count: 'exact',
    // head: true })` reads (2026-05-19 finding from admin/index TC-02).
    // Paginated GET (body has rows.length < total) still uses
    // `rows.length` because the body IS the paginated slice.
    const represented = rows.length > 0 ? rows.length : total;
    const end = represented === 0 ? 0 : start + represented - 1;
    headers["Content-Range"] = `${start}-${end}/${total}`;
    // Cross-origin browser fetches only expose Content-Range to JS
    // when the response opts it in via Access-Control-Expose-Headers.
    // Supabase's edge gateway does this for real PostgREST; the mock
    // must mirror it or supabase-js sees `count: null` even though
    // the header is on the wire.
    headers["Access-Control-Expose-Headers"] = "content-range";
  }
  return {
    status: opts.status ?? 200,
    headers,
    body: JSON.stringify(rows),
  };
}

export function buildPostgrestSingleResponse(row: unknown | null): FulfillResponse {
  if (row === null || row === undefined) {
    return {
      status: 406,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "PGRST116",
        message: "JSON object requested, multiple (or no) rows returned",
        details: "Results contain 0 rows",
        hint: null,
      }),
    };
  }
  return {
    status: 200,
    headers: { "Content-Type": "application/vnd.pgrst.object+json" },
    body: JSON.stringify(row),
  };
}

export function buildSupabaseErrorResponse(input: SupabaseErrorInput): FulfillResponse {
  return {
    status: input.status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: input.code ?? null,
      message: input.message ?? "error",
      details: input.details ?? null,
      hint: input.hint ?? null,
    }),
  };
}

/** Predicate result returned by `parsePostgrestFilters`. */
export type Predicate = (row: Record<string, unknown>) => boolean;

export interface ParsedQuery {
  predicates: Predicate[];
  select: string | null;
  limit: number | null;
  offset: number | null;
  order: { column: string; ascending: boolean } | null;
}

/**
 * Parse a PostgREST query-string fragment into predicates + metadata.
 *
 * Supports the operators the mock currently needs:
 *   `column=eq.<value>`
 *   `column=in.(<a>,<b>)`
 *   `column=neq.<value>`
 *   `column=is.null` / `column=is.true` / `column=is.false`
 *   `column=gt.<n>` / `column=gte.<n>` / `column=lt.<n>` / `column=lte.<n>`
 * Plus the meta params `select`, `limit`, `offset`, `order`.
 *
 * Anything else is ignored (mock failures should surface in tests as a
 * row mismatch, not a parse crash). Add operators here as specs need
 * them — keep the parser small and predictable.
 */
export function parsePostgrestFilters(queryString: string): ParsedQuery {
  const result: ParsedQuery = {
    predicates: [],
    select: null,
    limit: null,
    offset: null,
    order: null,
  };
  if (!queryString) return result;
  const trimmed = queryString.startsWith("?") ? queryString.slice(1) : queryString;
  if (!trimmed) return result;

  const params = new URLSearchParams(trimmed);
  for (const [key, value] of params.entries()) {
    if (key === "select") {
      result.select = value;
      continue;
    }
    if (key === "limit") {
      const n = Number.parseInt(value, 10);
      if (Number.isFinite(n)) result.limit = n;
      continue;
    }
    if (key === "offset") {
      const n = Number.parseInt(value, 10);
      if (Number.isFinite(n)) result.offset = n;
      continue;
    }
    if (key === "order") {
      const [col, dir] = value.split(".");
      result.order = { column: col, ascending: dir !== "desc" };
      continue;
    }
    if (key === "or") {
      // `or=(col1.op.val,col2.op.val,...)` — disjunction of leaf
      // predicates. PostgREST also supports nested `and()`; we only
      // need flat ORs for E49 sessions search.
      const inner = value.startsWith("(") && value.endsWith(")") ? value.slice(1, -1) : value;
      const leaves = splitTopLevel(inner, ",");
      const leafPreds: Predicate[] = [];
      for (const leaf of leaves) {
        const first = leaf.indexOf(".");
        if (first < 0) continue;
        const col = leaf.slice(0, first);
        const rest = leaf.slice(first + 1);
        const m = /^(eq|neq|gt|gte|lt|lte|in|is|like|ilike)\.(.*)$/.exec(rest);
        if (!m) continue;
        leafPreds.push(makePredicate(col, m[1], m[2]));
      }
      if (leafPreds.length > 0) {
        result.predicates.push((row) => leafPreds.some((p) => p(row)));
      }
      continue;
    }
    const opMatch = /^(eq|neq|gt|gte|lt|lte|in|is|like|ilike)\.(.*)$/.exec(value);
    if (!opMatch) continue;
    const [, op, raw] = opMatch;
    result.predicates.push(makePredicate(key, op, raw));
  }
  return result;
}

function splitTopLevel(input: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (ch === sep && depth === 0) {
      out.push(input.slice(start, i));
      start = i + 1;
    }
  }
  out.push(input.slice(start));
  return out;
}

/**
 * Resolve `intake_data->>name` style accessors against a row. Supports
 * `col->>key` (text) and the plain `col` form. Used by E49's sessions
 * search which queries `intake_data->>name.ilike.%foo%`.
 */
function readColumn(row: Record<string, unknown>, accessor: string): unknown {
  const arrow = accessor.indexOf("->>");
  if (arrow < 0) return row[accessor];
  const base = accessor.slice(0, arrow);
  const key = accessor.slice(arrow + 3);
  const obj = row[base];
  if (obj && typeof obj === "object") {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
}

// Numeric when both sides parse as numbers; otherwise lexicographic, which
// is correct for ISO-8601 timestamps (`published_at=lte.<ISO>` filters were
// silently dropping every row under the previous Number() coercion).
function compare(value: unknown, raw: string): number {
  const a = Number(value);
  const b = Number(raw);
  if (!Number.isNaN(a) && !Number.isNaN(b) && String(value).trim() !== "" && raw.trim() !== "") {
    return a === b ? 0 : a > b ? 1 : -1;
  }
  const s = String(value);
  return s === raw ? 0 : s > raw ? 1 : -1;
}

function makePredicate(column: string, op: string, raw: string): Predicate {
  switch (op) {
    case "eq":
      return (row) => String(readColumn(row, column)) === raw;
    case "neq":
      return (row) => String(readColumn(row, column)) !== raw;
    case "gt":
      return (row) => compare(readColumn(row, column), raw) > 0;
    case "gte":
      return (row) => compare(readColumn(row, column), raw) >= 0;
    case "lt":
      return (row) => compare(readColumn(row, column), raw) < 0;
    case "lte":
      return (row) => compare(readColumn(row, column), raw) <= 0;
    case "in": {
      const inner = raw.startsWith("(") && raw.endsWith(")") ? raw.slice(1, -1) : raw;
      const values = inner.split(",").map((v) => v.trim());
      return (row) => values.includes(String(readColumn(row, column)));
    }
    case "is":
      if (raw === "null")
        return (row) => {
          const v = readColumn(row, column);
          return v === null || v === undefined;
        };
      if (raw === "true") return (row) => readColumn(row, column) === true;
      if (raw === "false") return (row) => readColumn(row, column) === false;
      return () => false;
    case "like":
    case "ilike": {
      const pattern = raw.replace(/%/g, ".*").replace(/_/g, ".");
      const re = new RegExp(`^${pattern}$`, op === "ilike" ? "i" : "");
      return (row) => re.test(String(readColumn(row, column) ?? ""));
    }
    default:
      return () => true;
  }
}

export function applyParsedQuery(
  rows: Record<string, unknown>[],
  parsed: ParsedQuery,
): Record<string, unknown>[] {
  return applyParsedQueryWithTotal(rows, parsed).rows;
}

/**
 * Variant of `applyParsedQuery` that also returns the pre-slice count.
 * `useTestSessions` (and friends) call PostgREST with `range(...)` +
 * `count=exact` — the real server returns the slice's body but a total
 * count reflecting ALL matching rows. Without this split, the mock
 * reports `total = body.length`, which breaks KPI cards that read
 * `count` directly off `useTestSessions({ pageSize: 1 })`.
 */
export function applyParsedQueryWithTotal(
  rows: Record<string, unknown>[],
  parsed: ParsedQuery,
): { rows: Record<string, unknown>[]; total: number } {
  let out = rows.filter((row) => parsed.predicates.every((p) => p(row)));
  if (parsed.order) {
    const { column, ascending } = parsed.order;
    out = [...out].sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      if (av === bv) return 0;
      if (av === null || av === undefined) return ascending ? -1 : 1;
      if (bv === null || bv === undefined) return ascending ? 1 : -1;
      if (av < bv) return ascending ? -1 : 1;
      return ascending ? 1 : -1;
    });
  }
  const total = out.length;
  const start = parsed.offset ?? 0;
  const end = parsed.limit !== null ? start + parsed.limit : undefined;
  if (start || end !== undefined) {
    out = out.slice(start, end);
  }
  return { rows: out, total };
}
