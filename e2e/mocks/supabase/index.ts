import type { Page, Request as PlaywrightRequest, Route } from "@playwright/test";

import {
  applyParsedQuery,
  buildPostgrestArrayResponse,
  buildPostgrestSingleResponse,
  buildSupabaseErrorResponse,
  parsePostgrestFilters,
  type FulfillResponse,
} from "./envelope";
import { primeAuthSession, type AuthFactor, type AuthSession } from "../../fixtures/auth";

export type {
  FulfillResponse,
  ParsedQuery,
  Predicate,
  PostgrestArrayOptions,
  SupabaseErrorInput,
} from "./envelope";
export {
  applyParsedQuery,
  buildPostgrestArrayResponse,
  buildPostgrestSingleResponse,
  buildSupabaseErrorResponse,
  parsePostgrestFilters,
} from "./envelope";

type Row = Record<string, unknown>;
type RpcResolver = unknown | ((body: unknown) => unknown);

export interface MockSupabaseAuthConfig {
  session?: AuthSession;
  aal?: "aal1" | "aal2";
  factors?: AuthFactor[];
}

export interface MockSupabaseErrorConfig {
  status: number;
  code?: string;
  message?: string;
  hint?: string | null;
  details?: string | null;
}

export interface MockSupabaseConfig {
  /** Per-table seed rows. Matched against `/rest/v1/<table>?...`. */
  tables?: Record<string, Row[]>;
  /** RPC mocks keyed by function name. Value can be constant or `(body) => result`. */
  rpcs?: Record<string, RpcResolver>;
  /** Per-table or per-rpc error simulation. Key is the table or rpc name. */
  errors?: Record<string, MockSupabaseErrorConfig>;
  /** Auth seed. When `session` is set, delegates to `primeAuthSession`. */
  auth?: MockSupabaseAuthConfig;
  /** Optional override for the Supabase project ref (storage key prefix). */
  projectRef?: string;
}

const PGRST_OBJECT_MIME = "application/vnd.pgrst.object+json";

function isCountRequested(request: PlaywrightRequest): boolean {
  const prefer = request.headers()["prefer"];
  if (!prefer) return false;
  return /count=exact|count=planned|count=estimated/.test(prefer);
}

function isSingleRowRequested(request: PlaywrightRequest): boolean {
  const accept = request.headers()["accept"];
  return typeof accept === "string" && accept.includes(PGRST_OBJECT_MIME);
}

function parseJsonBody(request: PlaywrightRequest): unknown {
  const raw = request.postData();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function fulfillRoute(route: Route, response: FulfillResponse): Promise<void> {
  await route.fulfill({
    status: response.status,
    headers: response.headers,
    body: response.body,
  });
}

/**
 * Configure `page` so every Supabase request resolves locally per
 * `config`. Idempotent: calling twice on the same page registers a new
 * layer of routes that take precedence (Playwright runs routes in
 * reverse registration order).
 *
 * Failure mode design: any RPC NOT declared in `config.rpcs` responds
 * 404 instead of 200/empty — silent passes hide test bugs.
 */
export async function mockSupabase(page: Page, config: MockSupabaseConfig): Promise<void> {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(config.tables ?? {})) {
    tables[name] = [...rows];
  }
  const rpcs = config.rpcs ?? {};
  const errors = config.errors ?? {};

  // ---- Auth ------------------------------------------------------------
  if (config.auth?.session) {
    await primeAuthSession(page.context(), page, config.auth.session, {
      projectRef: config.projectRef,
    });
  } else {
    // No session — respond unauthenticated to common auth endpoints.
    await page.route("**/auth/v1/user**", async (route) => {
      await fulfillRoute(
        route,
        buildSupabaseErrorResponse({ status: 401, message: "Auth session missing" }),
      );
    });
    await page.route("**/auth/v1/factors**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ all: [], totp: [] }),
      });
    });
    await page.route("**/auth/v1/token**", async (route) => {
      await fulfillRoute(
        route,
        buildSupabaseErrorResponse({ status: 400, code: "invalid_grant", message: "No session" }),
      );
    });
  }

  // ---- REST tables -----------------------------------------------------
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Path looks like /rest/v1/<table>  or  /rest/v1/rpc/<fn>
    const restIdx = pathParts.indexOf("v1");
    const segments = restIdx >= 0 ? pathParts.slice(restIdx + 1) : pathParts;
    if (segments.length === 0) {
      await route.fallback();
      return;
    }
    if (segments[0] === "rpc") {
      const fn = segments[1];
      const err = errors[fn];
      if (err) {
        await fulfillRoute(route, buildSupabaseErrorResponse(err));
        return;
      }
      if (!(fn in rpcs)) {
        await fulfillRoute(
          route,
          buildSupabaseErrorResponse({
            status: 404,
            code: "PGRST202",
            message: `RPC "${fn}" not mocked. Add it to mockSupabase({ rpcs: { ${fn}: ... } }).`,
          }),
        );
        return;
      }
      const resolver = rpcs[fn];
      const body = parseJsonBody(request);
      const value =
        typeof resolver === "function" ? (resolver as (b: unknown) => unknown)(body) : resolver;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(value ?? null),
      });
      return;
    }

    const table = segments[0];
    if (!(table in tables) && !(table in errors)) {
      // Unknown table — fail loudly so tests don't get silent empty arrays.
      await fulfillRoute(
        route,
        buildSupabaseErrorResponse({
          status: 404,
          code: "PGRST205",
          message: `Table "${table}" not mocked. Add it to mockSupabase({ tables: { ${table}: [...] } }).`,
        }),
      );
      return;
    }
    if (table in errors) {
      await fulfillRoute(route, buildSupabaseErrorResponse(errors[table]));
      return;
    }

    const method = request.method();
    const parsed = parsePostgrestFilters(url.search);
    const rows = tables[table];

    if (method === "GET" || method === "HEAD") {
      const filtered = applyParsedQuery(rows, parsed);
      if (isSingleRowRequested(request)) {
        await fulfillRoute(
          route,
          buildPostgrestSingleResponse(filtered.length === 1 ? filtered[0] : null),
        );
        return;
      }
      const withCount = isCountRequested(request);
      const response = buildPostgrestArrayResponse(method === "HEAD" ? [] : filtered, {
        withCount,
        total: filtered.length,
        offset: parsed.offset ?? 0,
      });
      // HEAD must return no body.
      if (method === "HEAD") {
        await route.fulfill({ status: response.status, headers: response.headers, body: "" });
        return;
      }
      await fulfillRoute(route, response);
      return;
    }

    if (method === "POST") {
      const body = parseJsonBody(request);
      const inserted = Array.isArray(body) ? body : [body];
      const newRows = inserted.filter((r): r is Row => typeof r === "object" && r !== null);
      const preferHeader = request.headers()["prefer"] ?? "";
      // Supabase JS `.upsert({...}, { onConflict: "col" })` sends
      // `Prefer: resolution=merge-duplicates` + `?on_conflict=col`.
      // Real PostgREST replaces the row matched by that column; without
      // emulating it here, POST always appended → subsequent
      // `.maybeSingle()` reads saw 2+ rows and returned null, breaking
      // any auth gate that reads back the same row (2026-05-19 finding).
      const isMergeUpsert = /resolution=merge-duplicates/.test(preferHeader);
      const onConflictCols = (url.searchParams.get("on_conflict") ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (isMergeUpsert && onConflictCols.length > 0) {
        const kept = rows.filter(
          (existing) =>
            !newRows.some((next) => onConflictCols.every((col) => existing[col] === next[col])),
        );
        tables[table] = [...kept, ...newRows];
      } else {
        tables[table] = [...rows, ...newRows];
      }
      const wantsRepresentation = preferHeader.includes("return=representation");
      if (!wantsRepresentation) {
        await route.fulfill({
          status: 201,
          headers: { "Content-Type": "application/json" },
          body: "",
        });
        return;
      }
      if (isSingleRowRequested(request)) {
        await fulfillRoute(route, buildPostgrestSingleResponse(newRows[0] ?? null));
        return;
      }
      await fulfillRoute(route, buildPostgrestArrayResponse(newRows, { status: 201 }));
      return;
    }

    if (method === "PATCH") {
      const body = parseJsonBody(request);
      if (!body || typeof body !== "object") {
        await fulfillRoute(route, buildPostgrestArrayResponse([]));
        return;
      }
      const updated: Row[] = [];
      tables[table] = rows.map((row) => {
        if (parsed.predicates.every((p) => p(row))) {
          const merged = { ...row, ...(body as Row) };
          updated.push(merged);
          return merged;
        }
        return row;
      });
      const preferHeader = request.headers()["prefer"] ?? "";
      if (!preferHeader.includes("return=representation")) {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      if (isSingleRowRequested(request)) {
        await fulfillRoute(
          route,
          buildPostgrestSingleResponse(updated.length === 1 ? updated[0] : null),
        );
        return;
      }
      await fulfillRoute(route, buildPostgrestArrayResponse(updated));
      return;
    }

    if (method === "DELETE") {
      tables[table] = rows.filter((row) => !parsed.predicates.every((p) => p(row)));
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.fallback();
  });
}
