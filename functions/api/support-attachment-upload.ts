// E48.2 — Attachment upload handler for the support ticketing console.
//
// POST /api/support-attachment-upload
//   multipart/form-data fields:
//     - file        binary (PNG / JPEG / PDF)
//     - ticket_id   UUID (the ticket this attachment belongs to)
//     - view_token  64-hex (anon path) — must match the ticket's
//                   view_token_hash. Authenticated submitters supply
//                   Authorization: Bearer <jwt> instead.
//
// Flow:
//   1. Parse multipart form data
//   2. Authenticate — anon via view_token RPC, authenticated via JWT
//   3. sanitiseAttachment() — magic byte verify + PDF strip + checksum
//   4. Upload sanitised bytes to private Storage bucket
//      `support-attachments` at path `{ticket_id}/{attachment_id}.{ext}`
//   5. INSERT row into support_ticket_attachments
//   6. Return { attachment_id, filename, mime, size_bytes, checksum }
//
// Why a separate endpoint (not inlined into ticket-create):
//   - Upload happens AFTER ticket exists so we have a stable ticket_id
//     to scope the Storage path + RLS lookup
//   - File sizes vary widely; treating attachments as separate POSTs
//     means a failed upload doesn't kill the whole ticket
//   - Concurrent uploads (up to 3 files) parallelise the slow network leg

import { createClient } from "@supabase/supabase-js";

import {
  sanitizeAttachment,
  MAX_ATTACHMENT_BYTES,
  type AllowedMime,
} from "../_lib/attachment-sanitize";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const STORAGE_BUCKET = "support-attachments";
const MAX_ATTACHMENTS_PER_TICKET = 3;

const MIME_EXT: Record<AllowedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/pdf": "pdf",
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  // Multipart form parse via the standard FormData API. CF Workers
  // implement it natively.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse(400, { error: "invalid_multipart" });
  }

  const file = form.get("file");
  const ticketId = (form.get("ticket_id") ?? "").toString().trim();
  const viewToken = (form.get("view_token") ?? "").toString().trim();

  // Duck-type the file field instead of `instanceof File`. jsdom (vitest)
  // and CF Workers + undici (Node) each ship their own File class; an
  // instanceof check on the cross-realm value returns false. We only
  // need name + type + arrayBuffer() — Blob + File both provide them.
  if (
    !file ||
    typeof file === "string" ||
    typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== "function" ||
    typeof (file as { name?: unknown }).name !== "string"
  ) {
    return jsonResponse(400, { error: "file_missing" });
  }
  const fileEntry = file as {
    name: string;
    type: string;
    size: number;
    arrayBuffer(): Promise<ArrayBuffer>;
  };
  if (!/^[0-9a-fA-F-]{36}$/.test(ticketId)) {
    return jsonResponse(400, { error: "ticket_id_invalid" });
  }
  if (fileEntry.size > MAX_ATTACHMENT_BYTES) {
    // Early reject before we read the buffer into memory.
    return jsonResponse(400, { error: "attachment_too_large" });
  }

  // Authenticate the upload — must prove ownership of the ticket.
  // Either a valid view_token (anon path) OR a Bearer JWT whose user
  // owns the ticket (authenticated path).
  const authHeader = request.headers.get("authorization") ?? "";
  const jwt = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : "";

  const adminClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Look up the ticket up-front so we can:
  //   (a) confirm caller is allowed to attach to it
  //   (b) count existing attachments against MAX_ATTACHMENTS_PER_TICKET
  const { data: ticketRow, error: ticketErr } = await adminClient
    .from("support_tickets")
    .select(
      "id, submitter_user_id, view_token_hash, view_token_expires_at, view_token_invalidated_at",
    )
    .eq("id", ticketId)
    .is("deleted_at", null)
    .maybeSingle();

  if (ticketErr || !ticketRow) {
    // Audit A8 — uniform 403 response. The earlier 404 leaked whether
    // a ticket UUID existed (auth check ran AFTER), letting an
    // unauthenticated attacker enumerate valid IDs by probing. Match
    // the no-auth-token failure response exactly: same status, same
    // body. We still bail out early to save the auth round-trip.
    return jsonResponse(403, { error: "not_authorized" });
  }

  let authorised = false;

  // Path A — view_token (anon submitters before they leave /kontakt).
  if (viewToken && /^[0-9a-f]{64}$/.test(viewToken)) {
    const tokenHash = await sha256Hex(viewToken);
    const expires = ticketRow.view_token_expires_at as string | null;
    const invalidated = ticketRow.view_token_invalidated_at as string | null;
    const tokenValid =
      tokenHash === ticketRow.view_token_hash &&
      !invalidated &&
      expires &&
      new Date(expires).getTime() > Date.now();
    if (tokenValid) authorised = true;
  }

  // Path B — JWT-bound user must own the ticket.
  if (!authorised && jwt) {
    const userClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (uid && uid === ticketRow.submitter_user_id) {
      authorised = true;
    }
  }

  if (!authorised) {
    return jsonResponse(403, { error: "not_authorized" });
  }

  // Per-ticket attachment count cap.
  const { count: existingCount, error: countErr } = await adminClient
    .from("support_ticket_attachments")
    .select("id", { count: "exact", head: true })
    .eq("ticket_id", ticketId);
  if (countErr) {
    return jsonResponse(500, { error: "attachment_count_failed" });
  }
  if ((existingCount ?? 0) >= MAX_ATTACHMENTS_PER_TICKET) {
    return jsonResponse(400, { error: "attachment_limit_reached" });
  }

  // Read the file body into memory + run the sanitisation pipeline.
  const bytes = new Uint8Array(await fileEntry.arrayBuffer());
  const result = await sanitizeAttachment({
    bytes,
    declaredMime: fileEntry.type,
    declaredFilename: fileEntry.name,
  });

  if (!result.ok || !result.bytes || !result.filename || !result.checksum || !result.mime) {
    const code = result.error ? `attachment_${result.error}` : "attachment_sanitize_failed";
    return jsonResponse(400, { error: code });
  }

  // Storage upload. Path is `{ticket_id}/{attachment_id}.{ext}` where
  // attachment_id is the row UUID generated below. We pre-generate the
  // ID so the Storage path is known before the DB insert, avoiding a
  // race where the row exists but the file failed to upload.
  const attachmentId = crypto.randomUUID();
  const ext = MIME_EXT[result.mime];
  const storagePath = `${ticketId}/${attachmentId}.${ext}`;

  const uploadResult = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, result.bytes, {
      contentType: result.mime,
      cacheControl: "private, max-age=0",
      upsert: false,
    });

  if (uploadResult.error) {
    console.error("support-attachment-upload storage upload failed", {
      ticket_id: ticketId,
      error: uploadResult.error.message,
    });
    return jsonResponse(500, { error: "storage_upload_failed" });
  }

  // Insert metadata row. The matching support_ticket_attachments
  // CHECK constraints (filename pattern, size bound, mime whitelist,
  // checksum format) are all satisfied by the sanitizer's output, but
  // the DB is still the source of truth.
  const { error: insertErr } = await adminClient.from("support_ticket_attachments").insert({
    id: attachmentId,
    ticket_id: ticketId,
    message_id: null, // attached at submit-time, no message row yet
    filename: result.filename,
    mime_type: result.mime,
    size_bytes: result.bytes.byteLength,
    storage_path: storagePath,
    scan_status: "clean", // deterministic-only sanitisation per D-1
    checksum_sha256: result.checksum,
  });

  if (insertErr) {
    // Storage upload succeeded but DB insert failed — orphan in
    // Storage. Best-effort cleanup, but don't block the response on it.
    await adminClient.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath])
      .catch(() => {
        /* swallow */
      });
    console.error("support-attachment-upload db insert failed", {
      ticket_id: ticketId,
      code: insertErr.code,
      message: insertErr.message,
    });
    // The BEFORE INSERT trigger enforce_attachment_cap_per_ticket_trg
    // closes the TOCTOU race between the pre-check above and this
    // INSERT — concurrent uploads that all pass the pre-check still
    // get serialised and the 4th hits this branch.
    if (insertErr.message?.includes("attachment_limit_reached")) {
      return jsonResponse(400, { error: "attachment_limit_reached" });
    }
    return jsonResponse(500, { error: "attachment_insert_failed" });
  }

  return jsonResponse(200, {
    ok: true,
    attachment_id: attachmentId,
    filename: result.filename,
    mime: result.mime,
    size_bytes: result.bytes.byteLength,
    checksum_sha256: result.checksum,
  });
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
