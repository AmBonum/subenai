// E40.2 — DPA request intake handler.
//
// POST /api/dpa-request — public form on /schools/dpa submits here.
// Validates Turnstile + rate limits + payload shape, inserts a row
// in dpa_requests via service-role, returns the rendered PDF (E40.2:
// minimal stub; E40.3 replaces with the real Slovak Art. 28 template).
//
// E-mail delivery (Resend) is wired in E40.4 — this handler returns
// the PDF for instant download regardless.
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

// E40.2 STUB — minimal valid 1-page PDF announcing the placeholder. The
// real Slovak Art. 28 DPA template ships in E40.3 and replaces this
// branch. The bytes below are a hand-built A4 PDF with no fonts so we
// don't need react-pdf at build time. Renders "DPA placeholder" in
// browsers; legal copy comes with E40.3.
function buildStubPdf(): Uint8Array {
  const pdf = `%PDF-1.4
1 0 obj
<</Type /Catalog /Pages 2 0 R>>
endobj
2 0 obj
<</Type /Pages /Kids [3 0 R] /Count 1>>
endobj
3 0 obj
<</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>>
endobj
4 0 obj
<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>
endobj
5 0 obj
<</Length 130>>
stream
BT /F1 18 Tf 60 760 Td (DPA placeholder - E40.2 stub) Tj ET
BT /F1 12 Tf 60 720 Td (Real Slovak Art. 28 template ships in E40.3) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000105 00000 n
0000000221 00000 n
0000000279 00000 n
trailer
<</Size 6 /Root 1 0 R>>
startxref
460
%%EOF`;
  return new TextEncoder().encode(pdf);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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
    console.error("dpa-request insert failed", { message: insertError?.message });
    return jsonResponse(500, { error: "insert_failed" });
  }

  const pdfBytes = buildStubPdf();
  const pdfBase64 = uint8ToBase64(pdfBytes);

  await supabase
    .from("dpa_requests")
    .update({ downloaded_at: new Date().toISOString() })
    .eq("id", inserted.id);

  return jsonResponse(200, {
    ok: true,
    requestId: inserted.id,
    pdfBase64,
    fileName: `DPA-subenai-${slugifySchool(schoolName)}-${TEMPLATE_VERSION}.pdf`,
    templateVersion: TEMPLATE_VERSION,
  });
}
