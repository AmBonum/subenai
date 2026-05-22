// E48.8 — Admin reply handler for the support ticketing console.
//
// POST /api/support-ticket-reply
//   Headers: Authorization: Bearer <admin JWT (AAL2)>
//   Body: { ticket_id, body }
//
// Flow:
//   1. Validate JWT and admin role via the user's own client (RPC bypasses RLS
//      but auth checks are performed inside the function).
//   2. Insert into support_ticket_messages with author_kind='admin'.
//   3. Flip support_tickets.status to 'waiting_user'
//      (via transition_ticket_status RPC, which audit-logs the transition).
//   4. Send Resend email via supportTicketReplyEmail template (non-blocking).
//
// Email failure is non-fatal: the message row + status flip are already
// persisted. If Resend is down, the operator sees the warning in CF logs
// and can manually re-send from the Resend dashboard (runbook §7).

import { createClient } from "@supabase/supabase-js";

import { sendEmail } from "../_lib/email";
import { supportTicketReplyEmail } from "../_lib/email-templates";
import { PROD_SUPABASE_URL } from "../_lib/supabase-url";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  SITE_ORIGIN?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface Payload {
  ticket_id?: string;
  body?: string;
}

const DEFAULT_SITE_ORIGIN = "https://subenai.sk";

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
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

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const ticketId = (payload.ticket_id ?? "").trim();
  const body = (payload.body ?? "").trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(ticketId)) {
    return jsonResponse(400, { error: "ticket_id_invalid" });
  }
  if (body.length < 1 || body.length > 10000) {
    return jsonResponse(400, { error: "body_invalid" });
  }

  // User-bound client — auth.uid() resolves to the admin so has_role()
  // checks inside the RPC + RLS work correctly.
  const userClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  // Resolve admin user info + admin role + AAL2 check via auth.getUser().
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(401, { error: "not_authenticated" });
  }
  const adminId = userData.user.id;

  // Verify admin role via the security-definer has_role RPC (matches the
  // role-middleware.ts pattern used by /admin/* guards).
  const { data: hasRole, error: roleError } = await userClient.rpc("has_role", {
    _user_id: adminId,
    _role: "admin",
  });
  if (roleError || hasRole !== true) {
    return jsonResponse(403, { error: "not_admin" });
  }

  // AAL2 check — the auth.jwt() ->> 'aal' claim. We parse it client-side
  // because supabase-js doesn't surface aal directly; decode the JWT payload.
  // (Inside the SECURITY DEFINER RPC the same claim is read server-side, so
  // this is a defence-in-depth check on the CF function side.)
  const jwtPayload = decodeJwtPayload(jwt);
  if (jwtPayload?.aal !== "aal2") {
    return jsonResponse(403, { error: "aal2_required" });
  }

  // Resolve admin display name + ticket submitter info (service-role client
  // bypasses RLS for the joined lookups we need cleanly).
  const adminClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: adminProfile } = await adminClient
    .from("profiles")
    .select("display_name, email")
    .eq("id", adminId)
    .maybeSingle();
  const adminName: string =
    (adminProfile?.display_name as string | undefined) ??
    (adminProfile?.email as string | undefined) ??
    "Tím podpory";

  const { data: ticketRow, error: ticketErr } = await adminClient
    .from("support_tickets")
    .select(
      "id, subject, status, submitter_email, view_token_hash, view_token_expires_at, view_token_invalidated_at",
    )
    .eq("id", ticketId)
    .is("deleted_at", null)
    .maybeSingle();

  if (ticketErr || !ticketRow) {
    return jsonResponse(404, { error: "ticket_not_found" });
  }

  const { data: messageRow, error: insertErr } = await adminClient
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticketId,
      author_kind: "admin",
      author_user_id: adminId,
      author_name: adminName,
      body,
    })
    .select("id")
    .single();

  if (insertErr || !messageRow) {
    const message = (insertErr as { message?: string } | null)?.message ?? "unknown";
    const code = (insertErr as { code?: string } | null)?.code ?? "";
    console.error("support-ticket-reply insert failed", { code, message });
    return jsonResponse(500, { error: "insert_failed", reason: code || "opaque" });
  }

  // Flip status to waiting_user when current status allows it.
  if (
    ticketRow.status === "new" ||
    ticketRow.status === "in_progress" ||
    ticketRow.status === "waiting_user"
  ) {
    // Some transitions require a hop: new → in_progress is what we want here,
    // then in_progress → waiting_user. transition_ticket_status enforces the
    // state machine, so call it twice when needed.
    if (ticketRow.status === "new") {
      await userClient.rpc("transition_ticket_status", {
        p_ticket_id: ticketId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p_new_status: "in_progress" as any,
        p_note: "Auto via admin reply",
      });
    }
    if (ticketRow.status === "new" || ticketRow.status === "in_progress") {
      await userClient.rpc("transition_ticket_status", {
        p_ticket_id: ticketId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p_new_status: "waiting_user" as any,
        p_note: "Auto via admin reply",
      });
    }
  }

  // Regenerate the view token so the email link carries a fresh ?token= param.
  // The RPC mints a new plaintext token, updates the hash in DB, and returns
  // the plaintext.  Non-fatal: if regen fails the reply is already persisted
  // and the email still sends — just without the view link.
  const { data: freshToken, error: tokenErr } = await adminClient.rpc(
    "regenerate_support_ticket_view_token",
    { p_ticket_id: ticketId },
  );
  if (tokenErr) {
    console.warn("support-ticket-reply view_token regen failed (non-fatal)", {
      ticket_id: ticketId,
      error: (tokenErr as { message?: string }).message ?? String(tokenErr),
    });
  }

  // Send email (non-fatal).
  if (env.RESEND_API_KEY && env.EMAIL_FROM && env.EMAIL_REPLY_TO) {
    const origin = env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN;
    const viewUrl = freshToken
      ? `${origin}/contact-form/ticket/${encodeURIComponent(ticketId)}?token=${encodeURIComponent(freshToken as string)}`
      : undefined;

    const template = supportTicketReplyEmail({
      ticketId,
      adminName,
      body,
      viewUrl,
    });

    const replyTo = `ticket+${ticketId}@${env.EMAIL_FROM.split("@")[1] ?? "subenai.sk"}`;
    const mailResult = await sendEmail(
      {
        RESEND_API_KEY: env.RESEND_API_KEY,
        EMAIL_FROM: env.EMAIL_FROM,
        EMAIL_REPLY_TO: replyTo,
      },
      {
        to: ticketRow.submitter_email as string,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: `support-ticket-reply-${messageRow.id}`,
      },
    );
    if (!mailResult.ok) {
      console.warn("support-ticket-reply email failed (message already saved)", {
        ticket_id: ticketId,
        message_id: messageRow.id,
        error: mailResult.error,
      });
    }
  }

  return jsonResponse(200, {
    ok: true,
    message_id: messageRow.id,
  });
}

function decodeJwtPayload(jwt: string): { aal?: string; sub?: string } | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + padding);
    return JSON.parse(json) as { aal?: string; sub?: string };
  } catch {
    return null;
  }
}
