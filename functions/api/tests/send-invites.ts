// E45 Phase 3 — send test-invite emails via Resend, audit each recipient.
//
// Spec: tasks/E45-appendix-A.md § 5.3 (audit row schema), Appendix B
// (rate-limit matrix revised for Resend free tier — see Phase 3 caps
// below). One recipient = one Resend call = one audit row written AFTER
// Resend returns 2xx (R6 — no orphan audit on send failure).
//
// Authenticated endpoint. The CF function requires a Supabase user JWT
// in the Authorization header so we can identify the owner. Ownership
// of the target test is re-checked in the DB lookup (owner_id = user.id)
// — RLS + body check, defense in depth.
//
// Pipeline (drop on first failure):
//
//   1. Auth header → resolve user via supabase.auth.getUser()
//   2. Body shape — { test_id, recipients[], include_password }
//   3. recipients deduped + lowercased, max 50 per single send (Q3)
//   4. Per-IP per-hour limit (50)
//   5. Per-author per-day limit (50, revised B2)
//   6. Per-test per-day limit  (50, revised B2)
//   7. Global per-hour limit   (500 — anti-abuse ceiling)
//   8. Resolve test (id-or-share, owner-scoped) + author profile
//   9. (Optional) RPC verify the password if include_password=true so we
//      don't ship a stale plaintext if the author rotated it elsewhere
//  10. Loop recipients: Resend send → on 2xx write audit row, on error
//      tally a failure but DON'T halt the batch (partial success allowed
//      since recipients are independent)
//  11. Return { sent: int, failed: int, errors: [] }

import { createClient } from "@supabase/supabase-js";

import { sendEmail } from "../../_lib/email";
import { testInviteEmail } from "../../_lib/email-templates";
import {
  ipRateLimit,
  readClientIp,
  consumeDailyQuota,
  parsePositiveInt,
} from "../../_lib/security";
import { PROD_SUPABASE_URL } from "../../_lib/supabase-url";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
  /** Optional override env vars — defaults match Appendix B §7.1 (revised B2). */
  E45_INVITES_PER_AUTHOR_PER_DAY?: string;
  E45_INVITES_PER_TEST_PER_DAY?: string;
  E45_INVITES_PER_IP_PER_HOUR?: string;
  E45_INVITES_GLOBAL_PER_HOUR?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface SendInvitesBody {
  test_id?: unknown;
  recipients?: unknown;
  include_password?: unknown;
}

interface InviteFailure {
  recipient_hash: string;
  error: string;
}

interface SendInvitesResponse {
  ok?: true;
  sent?: number;
  failed?: number;
  errors?: InviteFailure[];
  error?: string;
  retry_after?: number;
}

// Resend free tier is 100/day across the account; we cap per-author + per-test
// at 50 each so two authors can saturate their day without colliding with
// transactional sends (magic links, DPA delivery). Bumping past 50 requires
// Resend Pro ($20/mo) — see Appendix B §7.1.
const DEFAULT_PER_AUTHOR_PER_DAY = 50;
const DEFAULT_PER_TEST_PER_DAY = 50;
const DEFAULT_PER_IP_PER_HOUR = 50;
const DEFAULT_GLOBAL_PER_HOUR = 500;

const PER_IP_WINDOW_S = 60 * 60;
const GLOBAL_WINDOW_S = 60 * 60;
const MAX_RECIPIENTS_PER_SEND = 50; // Q3
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status: number, body: SendInvitesResponse, retryAfter?: number): Response {
  const headers: HeadersInit = {
    "content-type": "application/json",
    "cache-control": "no-store",
  };
  if (retryAfter !== undefined) headers["retry-after"] = String(retryAfter);
  return new Response(JSON.stringify(body), { status, headers });
}

async function hashEmail(email: string): Promise<string> {
  // sha256 hex — used as PII-stripped recipient fingerprint in audit_log
  // (Appendix A § 5.3). DPO can verify "did we ever email <e>" without
  // a stored list of plaintext addresses.
  const bytes = new TextEncoder().encode(email.toLowerCase().trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readAuthHeader(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/);
  return m ? m[1] : null;
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  // Env gates first — fail fast with a deterministic error key.
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    return json(500, { error: "supabase_not_configured" });
  }
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.EMAIL_REPLY_TO) {
    return json(500, { error: "email_not_configured" });
  }

  const userJwt = readAuthHeader(request);
  if (!userJwt) return json(401, { error: "unauthorized" });

  // Resolve the calling user via the anon-key + JWT pair. This is how
  // we identify auth.uid() server-side without trusting the client.
  const userClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "unauthorized" });
  const ownerId = userData.user.id;
  const ownerEmail = userData.user.email ?? "";

  let body: SendInvitesBody;
  try {
    body = (await request.json()) as SendInvitesBody;
  } catch {
    return json(400, { error: "invalid_json" });
  }

  if (typeof body.test_id !== "string" || !Array.isArray(body.recipients)) {
    return json(400, { error: "invalid_shape" });
  }
  const testId = body.test_id.trim();
  const includePassword = body.include_password === true;

  // De-dupe, lowercase, validate; cap to MAX_RECIPIENTS_PER_SEND.
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const raw of body.recipients) {
    if (typeof raw !== "string") continue;
    const email = raw.trim().toLowerCase();
    if (!EMAIL_RX.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    recipients.push(email);
    if (recipients.length >= MAX_RECIPIENTS_PER_SEND) break;
  }
  if (recipients.length === 0) {
    return json(400, { error: "no_valid_recipients" });
  }

  const ip = readClientIp(request);

  // Caps. Each layer is an independent check; all four must pass before
  // we attempt the batch. Failing any tier returns 429 with the layer-specific
  // error key for ops attribution.
  const perAuthorLimit = parsePositiveInt(
    env.E45_INVITES_PER_AUTHOR_PER_DAY,
    DEFAULT_PER_AUTHOR_PER_DAY,
  );
  const perTestLimit = parsePositiveInt(env.E45_INVITES_PER_TEST_PER_DAY, DEFAULT_PER_TEST_PER_DAY);
  const perIpLimit = parsePositiveInt(env.E45_INVITES_PER_IP_PER_HOUR, DEFAULT_PER_IP_PER_HOUR);
  const globalLimit = parsePositiveInt(env.E45_INVITES_GLOBAL_PER_HOUR, DEFAULT_GLOBAL_PER_HOUR);

  // Note: each layer counts ONE attempt, not `recipients.length`, because
  // the soft cap economics target the per-send burst, not the cumulative
  // recipient count. The MAX_RECIPIENTS_PER_SEND limit handles per-batch
  // size; these layers handle frequency.
  if (!ipRateLimit.consume(`invites:ip:${ip}`, perIpLimit, PER_IP_WINDOW_S)) {
    return json(429, { error: "rate_limited_ip" }, PER_IP_WINDOW_S);
  }
  if (!ipRateLimit.consume(`invites:global`, globalLimit, GLOBAL_WINDOW_S)) {
    return json(429, { error: "rate_limited_global" }, GLOBAL_WINDOW_S);
  }
  if (!consumeDailyQuota(`invites:author:${ownerId}`, perAuthorLimit)) {
    return json(429, { error: "author_daily_cap" });
  }
  if (!consumeDailyQuota(`invites:test:${testId}`, perTestLimit)) {
    return json(429, { error: "test_daily_cap" });
  }

  // Service-role lookup of the test row (RLS bypassed; we re-check
  // owner_id manually to enforce ownership).
  const serviceClient = createClient(PROD_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: testRow, error: testErr } = await serviceClient
    .from("tests")
    .select("id, share_id, title, owner_id, status, password_hash")
    .eq("id", testId)
    .maybeSingle();
  if (testErr) {
    console.error("send-invites tests lookup", { test_id: testId, message: testErr.message });
    return json(500, { error: "lookup_failed" });
  }
  if (!testRow) return json(404, { error: "test_not_found" });
  const test = testRow as {
    id: string;
    share_id: string;
    title: string;
    owner_id: string;
    status: string;
    password_hash: string | null;
  };
  if (test.owner_id !== ownerId) return json(403, { error: "not_owner" });
  if (test.status !== "published") return json(400, { error: "not_published" });

  // include_password=true is only meaningful when the test actually has one.
  const hasPassword = test.password_hash !== null;
  let plaintextPassword: string | undefined;
  if (includePassword) {
    if (!hasPassword) {
      return json(400, { error: "no_password_set" });
    }
    if (typeof (body as { password?: unknown }).password !== "string") {
      return json(400, { error: "password_required_for_inclusion" });
    }
    plaintextPassword = (body as { password: string }).password;
    if (plaintextPassword.length < 1 || plaintextPassword.length > 256) {
      return json(400, { error: "invalid_shape" });
    }
    // Verify the plaintext the UI provided is the CURRENT password.
    // Prevents shipping a stale password if the owner rotated it in
    // another tab between opening the dialog and clicking send.
    const { data: verifyRows, error: verifyErr } = await serviceClient.rpc("verify_test_password", {
      p_share_id: test.share_id,
      p_password: plaintextPassword,
    });
    if (verifyErr) {
      console.error("send-invites verify_test_password", {
        test_id: testId,
        message: verifyErr.message,
      });
      return json(500, { error: "verify_failed" });
    }
    const verified = (verifyRows as Array<{ verified: boolean }> | null)?.[0]?.verified === true;
    if (!verified) return json(400, { error: "wrong_password" });
  }

  // Resolve author display name from profile (fall back to email).
  const { data: profileRow } = await serviceClient
    .from("profiles")
    .select("display_name")
    .eq("id", ownerId)
    .maybeSingle();
  const authorName =
    (profileRow as { display_name: string } | null)?.display_name?.trim() ||
    (ownerEmail.split("@")[0] ?? "Autor");

  const origin = new URL(request.url).origin; // subenai.sk in prod
  const shareUrl = `${origin}/t/${test.share_id}`;

  // Send loop. We accumulate failures rather than aborting on the first
  // one — recipients are independent. Audit row is written ONLY after
  // Resend 2xx (R6 — no orphan audit on send failure).
  let sent = 0;
  const errors: InviteFailure[] = [];

  for (const recipient of recipients) {
    const recipientHash = await hashEmail(recipient);
    const template = testInviteEmail({
      testTitle: test.title,
      authorName,
      authorEmail: ownerEmail,
      shareUrl,
      password: plaintextPassword,
    });
    const resendRes = await sendEmail(
      {
        RESEND_API_KEY: env.RESEND_API_KEY,
        EMAIL_FROM: env.EMAIL_FROM,
        EMAIL_REPLY_TO: env.EMAIL_REPLY_TO,
      },
      {
        to: recipient,
        subject: template.subject,
        html: template.html,
        text: template.text,
        // Idempotency keyed by (test, recipient, day) so a retry from
        // the same author on the same day to the same recipient doesn't
        // double-send if Resend already accepted the first call.
        idempotencyKey: `test-invite:${testId}:${recipientHash.slice(0, 16)}:${new Date().toISOString().slice(0, 10)}`,
      },
    );

    if (!resendRes.ok) {
      errors.push({ recipient_hash: recipientHash, error: resendRes.error ?? "send_failed" });
      continue;
    }

    sent += 1;

    // Audit row — PII-stripped (only the hash). Written after Resend 2xx
    // so a Resend failure leaves no audit trace under this action (R6).
    // pii_access=true because the recipient email IS PII per E11, even
    // though we never store plaintext.
    const { error: auditErr } = await serviceClient.from("audit_log").insert({
      actor_id: ownerId,
      actor_name: null,
      action: "test_invite_sent",
      target_type: "test",
      target_id: test.id,
      pii_access: true,
      details: {
        recipient_email_hash: recipientHash,
        included_password: includePassword,
        resend_message_id: resendRes.id ?? null,
      },
    });
    if (auditErr) {
      console.error("send-invites audit_log insert", {
        test_id: testId,
        recipient_hash: recipientHash,
        message: auditErr.message,
      });
      // Don't fail the user-facing response — the email already went out.
    }
  }

  return new Response(
    JSON.stringify({
      ok: true as const,
      sent,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    },
  );
}

export const __test__ = {
  DEFAULT_PER_AUTHOR_PER_DAY,
  DEFAULT_PER_TEST_PER_DAY,
  DEFAULT_PER_IP_PER_HOUR,
  DEFAULT_GLOBAL_PER_HOUR,
  MAX_RECIPIENTS_PER_SEND,
  hashEmail,
};
