// E40.4 — DPA e-mail delivery handler.
//
// POST /api/dpa-email-attach — follow-up call from SchoolsDpaForm after
// the browser has rendered the DPA PDF and triggered the local download.
// Accepts:
//   { requestId, pdfBase64, fileName }
// Validates that requestId exists in dpa_requests + email is still
// in-flight (email_status='pending'), sends the PDF as a Resend
// attachment to the contact_email stored on the row, then writes
// email_status='sent' (or 'failed' + email_error on failure).
//
// Failure does NOT roll back the download — that already happened. The
// user sees a downgraded "PDF stiahnuté, ale e-mailovú kópiu sa nepodarilo
// odoslať" toast and the admin panel (E40.5) can re-send manually.

import { createClient } from "@supabase/supabase-js";

import { sendEmail } from "../_lib/email";
import { dpaDeliveryEmail } from "../_lib/email-templates";
import { readClientIp, parsePositiveInt, ipRateLimit } from "../_lib/security";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
  DPA_EMAIL_PER_IP_PER_HOUR?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface Payload {
  requestId?: string;
  pdfBase64?: string;
  fileName?: string;
}

const MAX_PDF_BASE64_BYTES = 2 * 1024 * 1024; // 2 MB base64 ≈ 1.5 MB PDF — well above DPA's typical 24 KB

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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
  const ipLimit = parsePositiveInt(env.DPA_EMAIL_PER_IP_PER_HOUR, 6);
  if (!ipRateLimit.consume(`dpa-email:${ip}`, ipLimit, 3600)) {
    return jsonResponse(429, { error: "rate_limited" });
  }

  const requestId = (payload.requestId ?? "").trim();
  const pdfBase64 = payload.pdfBase64 ?? "";
  const fileName = (payload.fileName ?? "").trim();

  if (!isUuid(requestId)) {
    return jsonResponse(400, { error: "invalid_request_id" });
  }
  if (!pdfBase64 || pdfBase64.length > MAX_PDF_BASE64_BYTES) {
    return jsonResponse(400, { error: "pdf_invalid" });
  }
  if (!fileName || fileName.length > 200 || !fileName.toLowerCase().endsWith(".pdf")) {
    return jsonResponse(400, { error: "filename_invalid" });
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.EMAIL_REPLY_TO) {
    return jsonResponse(500, { error: "email_not_configured" });
  }

  // HARDCODED URL — see dpa-request.ts for the rationale (env.SUPABASE_URL
  // in CF Pages is stale, points to a retired project, causes CF error
  // 1016 when used). Until the operator cleans up the env var we must
  // always use PROD_SUPABASE_URL.
  const supabase = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: fetchError } = await supabase
    .from("dpa_requests")
    .select("id, contact_name, contact_email, school_name, email_status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !row) {
    console.error("dpa-email-attach lookup failed", {
      message: fetchError?.message,
    });
    return jsonResponse(404, { error: "request_not_found" });
  }

  if (row.email_status === "sent") {
    return jsonResponse(409, { error: "already_sent" });
  }

  if (!row.contact_email || !row.contact_name || !row.school_name) {
    return jsonResponse(410, { error: "anonymised" });
  }

  const { subject, html, text } = dpaDeliveryEmail({
    schoolName: row.school_name,
    contactName: row.contact_name,
    requestId: row.id,
  });

  const result = await sendEmail(
    {
      RESEND_API_KEY: env.RESEND_API_KEY,
      EMAIL_FROM: env.EMAIL_FROM,
      EMAIL_REPLY_TO: env.EMAIL_REPLY_TO,
    },
    {
      to: row.contact_email,
      subject,
      html,
      text,
      idempotencyKey: `dpa-${row.id}`,
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    },
  );

  if (!result.ok) {
    await supabase
      .from("dpa_requests")
      .update({ email_status: "failed", email_error: result.error?.slice(0, 500) ?? "unknown" })
      .eq("id", row.id);
    return jsonResponse(502, { error: "send_failed", reason: result.error });
  }

  await supabase
    .from("dpa_requests")
    .update({ email_status: "sent", email_error: null })
    .eq("id", row.id);

  return jsonResponse(200, { ok: true, messageId: result.id ?? null });
}
