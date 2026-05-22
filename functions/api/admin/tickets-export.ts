// E48-v2/admin — Server-side CSV export for the support tickets queue.
//
// POST /api/admin/tickets-export
//
// Security model:
//   1. Authorization: Bearer <jwt> required → 401 if absent.
//   2. auth.getUser() validates the JWT against Supabase → 401 if invalid.
//   3. has_role(uid, 'admin') RPC → 403 if not admin.
//   4. JWT payload aal claim must equal 'aal2' → 403 if not.
//   5. Rate limit: 1 export / 60s per admin sub (KV-backed in prod).
//
// After the query succeeds:
//   - Audit log row inserted fire-and-forget (never blocks the response).
//   - CSV streamed with UTF-8 BOM + RFC 4180 escaping + OWASP CSV-injection
//     mitigation (prefix dangerous-leading chars with a single quote).

import { createClient } from "@supabase/supabase-js";

import { consumeRateLimit, type SupportRateLimitKV } from "../../_lib/security";
import { PROD_SUPABASE_URL } from "../../_lib/supabase-url";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  SUPPORT_RATE_LIMIT_KV?: SupportRateLimitKV;
}

interface RequestContext {
  request: Request;
  env: Env;
}

type TicketStatus = "new" | "in_progress" | "waiting_user" | "resolved" | "reopened" | "archived";

type TicketCategory =
  | "bug"
  | "question"
  | "feature_request"
  | "abuse_report"
  | "billing"
  | "gdpr"
  | "other";

type ExportScope = "selected" | "filter" | "all";
type SortOrder = "recency-desc" | "recency-asc" | "status" | "category";

interface ExportFilters {
  status?: TicketStatus[];
  category?: TicketCategory[];
  assignedTo?: string | "me" | "unassigned" | null;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

interface ExportBody {
  filters?: ExportFilters;
  sort?: SortOrder;
  scope: ExportScope;
  selectedIds?: string[];
  includeArchived?: boolean;
}

const VALID_STATUSES = new Set<string>([
  "new",
  "in_progress",
  "waiting_user",
  "resolved",
  "reopened",
  "archived",
]);

const VALID_CATEGORIES = new Set<string>([
  "bug",
  "question",
  "feature_request",
  "abuse_report",
  "billing",
  "gdpr",
  "other",
]);

const VALID_SCOPES = new Set<string>(["selected", "filter", "all"]);
const VALID_SORTS = new Set<string>(["recency-desc", "recency-asc", "status", "category"]);

const STATUS_LABEL_SK: Record<TicketStatus, string> = {
  new: "Nová",
  in_progress: "V riešení",
  waiting_user: "Čakáme na odpoveď",
  resolved: "Vyriešená",
  reopened: "Znovu otvorená",
  archived: "Archivovaná",
};

const CATEGORY_LABEL_SK: Record<TicketCategory, string> = {
  bug: "Chyba alebo problém",
  question: "Otázka",
  feature_request: "Návrh na zlepšenie",
  abuse_report: "Nahlásenie nevhodného obsahu",
  billing: "Platba",
  gdpr: "GDPR a ochrana údajov",
  other: "Iné",
};

const MAX_BULK_SELECTED = 100;
const MAX_ROWS = 5000;
const CSV_BOM = "﻿";
const CSV_HEADERS =
  "id,vytvorené,aktualizované,stav,kategória,téma,správa (skrátená),meno odosielateľa,e-mail odosielateľa,pridelený admin,počet príloh";

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// RFC 4180 CSV cell escape with OWASP CSV-injection mitigation.
// Dangerous-leading chars (=, +, -, @, tab, CR, LF) are prefixed with '
// so spreadsheet apps don't evaluate them as formulas.
export function csvEscapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r\n]/.test(s)) {
    s = "'" + s;
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatBratislava(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Bratislava",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
    const timeStr = `${get("hour")}:${get("minute")}:${get("second")}`;

    // Compute the offset from UTC
    const utcMs = date.getTime();
    const localDate = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Bratislava" }));
    const offsetMs = localDate.getTime() - new Date(date.toLocaleString("en-US")).getTime();
    const offsetHours = Math.round(offsetMs / 3600000);
    const sign = offsetHours >= 0 ? "+" : "-";
    const absHours = Math.abs(offsetHours);
    const offsetStr = `${sign}${String(absHours).padStart(2, "0")}:00`;

    void utcMs;
    return `${dateStr}T${timeStr}${offsetStr}`;
  } catch {
    return isoString;
  }
}

function decodeJwtPayload(jwt: string): { aal?: string; sub?: string; email?: string } | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + padding);
    return JSON.parse(json) as { aal?: string; sub?: string; email?: string };
  } catch {
    return null;
  }
}

type TicketRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  category: string;
  subject: string;
  body: string;
  submitter_name: string | null;
  submitter_email: string;
  assigned_admin_name: string | null;
  attachment_count: number;
};

function ticketToCsvRow(row: TicketRow): string {
  const truncatedBody = row.body.length > 500 ? row.body.slice(0, 500) + "…" : row.body;
  const sanitizedBody = truncatedBody.replace(/\r\n|\r|\n/g, "\\n");

  const cells = [
    csvEscapeCell(row.id),
    csvEscapeCell(formatBratislava(row.created_at)),
    csvEscapeCell(formatBratislava(row.updated_at)),
    csvEscapeCell(STATUS_LABEL_SK[row.status as TicketStatus] ?? row.status),
    csvEscapeCell(CATEGORY_LABEL_SK[row.category as TicketCategory] ?? row.category),
    csvEscapeCell(row.subject),
    csvEscapeCell(sanitizedBody),
    csvEscapeCell(row.submitter_name ?? ""),
    csvEscapeCell(row.submitter_email),
    csvEscapeCell(row.assigned_admin_name ?? ""),
    csvEscapeCell(row.attachment_count ?? 0),
  ];
  return cells.join(",");
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  const authHeader = request.headers.get("authorization") ?? "";
  const jwt = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : "";
  if (!jwt) {
    return jsonResponse(401, { error: "not_authenticated" });
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  let body: ExportBody;
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  // Validate scope (required field)
  if (!body.scope || !VALID_SCOPES.has(body.scope)) {
    return jsonResponse(400, { error: "scope_required" });
  }

  // Validate selectedIds when scope=selected
  if (body.scope === "selected") {
    if (!Array.isArray(body.selectedIds) || body.selectedIds.length === 0) {
      return jsonResponse(400, { error: "selected_ids_required" });
    }
    if (body.selectedIds.length > MAX_BULK_SELECTED) {
      return jsonResponse(400, { error: "bulk_size_exceeded" });
    }
  }

  // Validate sort if provided
  if (body.sort !== undefined && !VALID_SORTS.has(body.sort)) {
    return jsonResponse(400, { error: "sort_invalid" });
  }

  // Validate filters if provided
  if (body.filters) {
    if (body.filters.status !== undefined) {
      if (!Array.isArray(body.filters.status)) {
        return jsonResponse(400, { error: "filters.status_invalid" });
      }
      for (const s of body.filters.status) {
        if (!VALID_STATUSES.has(s)) {
          return jsonResponse(400, { error: "filters.status_invalid" });
        }
      }
    }
    if (body.filters.category !== undefined) {
      if (!Array.isArray(body.filters.category)) {
        return jsonResponse(400, { error: "filters.category_invalid" });
      }
      for (const c of body.filters.category) {
        if (!VALID_CATEGORIES.has(c)) {
          return jsonResponse(400, { error: "filters.category_invalid" });
        }
      }
    }
  }

  // Verify JWT via anon client
  const userClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(401, { error: "not_authenticated" });
  }
  const adminUserId = userData.user.id;

  // Admin role check
  const { data: hasRole, error: roleError } = await userClient.rpc("has_role", {
    _user_id: adminUserId,
    _role: "admin",
  });
  if (roleError || hasRole !== true) {
    return jsonResponse(403, { error: "not_admin" });
  }

  // AAL2 check — defence-in-depth on the CF function side
  const jwtPayload = decodeJwtPayload(jwt);
  if (jwtPayload?.aal !== "aal2") {
    return jsonResponse(403, { error: "aal2_required" });
  }

  const adminEmail = jwtPayload?.email ?? userData.user.email ?? adminUserId;
  const adminSub = jwtPayload?.sub ?? adminUserId;

  // Rate limit: 1 export per 60s per admin
  const kv = env.SUPPORT_RATE_LIMIT_KV;
  const allowed = await consumeRateLimit(kv, "admin-tickets-export", adminSub, 1, 60);
  if (!allowed) {
    return jsonResponse(429, { error: "rate_limited" });
  }

  // Build service-role client for the query
  const adminClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Build PostgREST query
  let query = adminClient
    .from("support_tickets")
    .select(
      "id, created_at, updated_at, status, category, subject, body, submitter_name, submitter_email, assigned_admin_name, attachment_count",
    )
    .is("deleted_at", null)
    .limit(MAX_ROWS);

  const scope = body.scope as ExportScope;
  const filters = body.filters ?? {};

  if (scope === "selected" && body.selectedIds) {
    query = query.in("id", body.selectedIds);
  } else {
    // Apply filters for "filter" and "all" scopes
    if (filters.status && filters.status.length > 0) {
      query = query.in("status", filters.status);
    } else if (!body.includeArchived && scope !== "all") {
      // Exclude archived by default unless explicitly requested
      query = query.neq("status", "archived");
    }

    if (filters.category && filters.category.length > 0) {
      query = query.in("category", filters.category);
    }

    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    if (filters.assignedTo === "unassigned") {
      query = query.is("assigned_admin_id", null);
    } else if (filters.assignedTo === "me") {
      query = query.eq("assigned_admin_id", adminUserId);
    } else if (typeof filters.assignedTo === "string" && filters.assignedTo.length > 0) {
      query = query.eq("assigned_admin_id", filters.assignedTo);
    }

    if (filters.q && filters.q.trim().length > 0) {
      const escaped = filters.q.trim().replace(/[%_]/g, "\\$&");
      query = query.or(`subject.ilike.%${escaped}%,body.ilike.%${escaped}%`);
    }
  }

  // Apply sort
  const sort = body.sort ?? "recency-desc";
  switch (sort) {
    case "recency-asc":
      query = query.order("created_at", { ascending: true });
      break;
    case "status":
      query = query.order("status", { ascending: true }).order("created_at", { ascending: false });
      break;
    case "category":
      query = query
        .order("category", { ascending: true })
        .order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: rows, error: queryError } = await query;

  if (queryError) {
    console.error("tickets-export query failed", queryError.message);
    return jsonResponse(500, { error: "query_failed", reason: queryError.message });
  }

  const ticketRows = (rows ?? []) as TicketRow[];
  const actualRowCount = ticketRows.length;

  // Build CSV
  const csvLines = [CSV_HEADERS, ...ticketRows.map(ticketToCsvRow)];
  const csvBody = CSV_BOM + csvLines.join("\r\n");

  // Audit log — fire-and-forget, never blocks the response
  const today = new Date().toISOString().slice(0, 10);
  adminClient
    .from("audit_log")
    .insert({
      actor_id: adminUserId,
      actor_name: adminEmail,
      action: "support_tickets_csv_export",
      target_type: "support_tickets",
      target_id: scope === "selected" ? null : "(bulk)",
      pii_access: true,
      details: {
        scope,
        selected_count: body.selectedIds?.length ?? 0,
        filter: filters,
        sort,
        row_count: actualRowCount,
      },
    })
    .then(() => {})
    .catch((err: unknown) => {
      console.warn("tickets-export audit_log insert failed", err);
    });

  const filename = `ziadosti-podpory-${today}.csv`;

  return new Response(csvBody, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
