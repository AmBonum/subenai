// E40.2 / E40.3 — DPA request intake handler.
//
// POST /api/dpa-request — public form on /schools/dpa submits here.
// Validates Turnstile + rate limits + payload shape, inserts a row
// in dpa_requests via service-role, returns the request metadata.
//
// E40.3 — Render path moved CLIENT-SIDE. The PDF is built in the
// browser via lazy-imported @react-pdf/renderer (matches the E38
// results-PDF pattern). This handler returns only the metadata the
// client needs to render + download the PDF. Tradeoffs:
//   + No react-pdf in the CF Worker bundle (smaller cold start, no
//     PDFKit/Node-stream compatibility risk)
//   + Single render source (same code drives download + e-mail upload
//     in E40.4 — client renders once, server only stores)
//   - Client trusts server-returned templateVersion + requestId to
//     stamp them into the PDF (fine: tampering only affects the user's
//     own download)
//
// E-mail delivery (E40.4) will accept a follow-up POST with the
// client-rendered PDF blob + the requestId from this handler's
// response, then forward to Resend.
//
// Layered defence (mirrors functions/api/portal-magic-link.ts):
//   1. Turnstile siteverify
//   2. Per-IP rate limit (3 / 15 min)
//   3. Per-school cooldown (same school name can't spam itself)
//   4. Global daily cap (protects against floods even if 1-3 slip)

import { createClient } from "@supabase/supabase-js";

import {
  consumeDailyQuota,
  emailCooldown,
  ipRateLimit,
  parsePositiveInt,
  readClientIp,
  verifyTurnstile,
} from "../_lib/security";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  DPA_DAILY_CAP?: string;
  DPA_COOLDOWN_SECONDS?: string;
  DPA_PER_IP_PER_HOUR?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface Payload {
  contact_name?: string;
  contact_email?: string;
  school_name?: string;
  consent_dpa_processing?: boolean;
  turnstile_token?: string;
}

const DAILY_QUOTA_SCOPE = "dpa_request";
const TEMPLATE_VERSION = "v0.1";

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function slugifySchool(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "skola"
  );
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const ip = readClientIp(request);

  const ipLimit = parsePositiveInt(env.DPA_PER_IP_PER_HOUR, 3);
  if (!ipRateLimit.consume(`dpa:${ip}`, ipLimit, 900)) {
    return jsonResponse(429, { error: "rate_limited" });
  }

  const turnstileResult = await verifyTurnstile(
    env.TURNSTILE_SECRET_KEY,
    payload.turnstile_token ?? "",
    ip,
  );
  if (!turnstileResult.ok) {
    return jsonResponse(400, { error: "turnstile_failed", reason: turnstileResult.reason });
  }

  if (payload.consent_dpa_processing !== true) {
    return jsonResponse(400, { error: "consent_required" });
  }

  const contactName = (payload.contact_name ?? "").trim();
  const contactEmail = (payload.contact_email ?? "").trim().toLowerCase();
  const schoolName = (payload.school_name ?? "").trim();

  if (contactName.length < 2 || contactName.length > 120) {
    return jsonResponse(400, { error: "name_invalid" });
  }
  if (!isPlausibleEmail(contactEmail)) {
    return jsonResponse(400, { error: "email_invalid" });
  }
  if (schoolName.length < 2 || schoolName.length > 200) {
    return jsonResponse(400, { error: "school_invalid" });
  }

  const cooldownSeconds = parsePositiveInt(env.DPA_COOLDOWN_SECONDS, 600);
  if (!emailCooldown.consume(`dpa:${schoolName.toLowerCase()}`, cooldownSeconds)) {
    return jsonResponse(429, { error: "school_cooldown" });
  }

  const dailyCap = parsePositiveInt(env.DPA_DAILY_CAP, 50);
  if (!consumeDailyQuota(DAILY_QUOTA_SCOPE, dailyCap)) {
    console.warn("dpa-request daily cap reached", { ip });
    return jsonResponse(429, { error: "daily_cap_reached" });
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  const supabaseUrl = env.SUPABASE_URL || PROD_SUPABASE_URL;
  const supabase = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ipHash = await hashIp(ip, env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 8));

  const { data: inserted, error: insertError } = await supabase
    .from("dpa_requests")
    .insert({
      contact_name: contactName,
      contact_email: contactEmail,
      school_name: schoolName,
      dpa_version: TEMPLATE_VERSION,
      ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    // PostgrestError exposes `code` (5-char PG SQLSTATE like 42P01) and a
    // human-readable `message`. Log both server-side; surface ONLY the
    // sanitised code to the client so debugging the initial go-live
    // (table missing, wrong project, RLS misconfig) does not require
    // diving into Cloudflare Pages real-time logs. The message itself
    // can leak schema details so we never return it.
    type PostgrestError = { code?: string; message?: string; details?: string };
    const pgErr = insertError as PostgrestError | null;
    console.error("dpa-request insert failed", {
      code: pgErr?.code,
      message: pgErr?.message,
      details: pgErr?.details,
    });
    return jsonResponse(500, { error: "insert_failed", reason: pgErr?.code ?? "unknown" });
  }

  return jsonResponse(200, {
    ok: true,
    requestId: inserted.id,
    fileName: `DPA-subenai-${slugifySchool(schoolName)}-${TEMPLATE_VERSION}.pdf`,
    templateVersion: TEMPLATE_VERSION,
    generatedAt: new Date().toISOString(),
  });
}
