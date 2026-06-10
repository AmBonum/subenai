// AH-11.3 Part 2 — Privileged admin mutations on users (role + ban).
//
// PATCH /api/admin/users/:id
//   Body: { role?: "admin" | "moderator" | "user", banned?: boolean }
//
// Auth:
//   - `Authorization: Bearer <jwt>` from the caller. The function verifies
//     the JWT via the anon Supabase client (getUser) and then checks the
//     `has_role(uid, 'admin')` RPC. The caller MUST be an admin at AAL2
//     (native MFA claim or a valid backup-code stamp — see _lib/aal.ts).
//   - Only after both checks pass does the function instantiate the
//     service-role client (SUPABASE_SERVICE_ROLE_KEY env) to perform the
//     mutation that the anon client cannot (user_roles writes + auth.admin
//     ban toggle bypass RLS / require service-role).
//
// Audit:
//   - Every successful action is logged via the SECURITY DEFINER RPC
//     `log_audit_event` (AH-11.3 Part 1). Failures before the mutation
//     are NOT logged — only the actual change is.
//
// Env vars (set in Cloudflare Pages → Settings → Environment variables):
//   - SUPABASE_URL
//   - SUPABASE_ANON_KEY        (for caller JWT verification)
//   - SUPABASE_SERVICE_ROLE_KEY (for privileged mutation, NEVER in repo)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isAal2 } from "../../../_lib/aal";
import { createAdminClient } from "../../../../src/integrations/supabase/admin";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface RequestContext {
  request: Request;
  env: Env;
  params: { id: string };
}

interface PatchBody {
  role?: unknown;
  banned?: unknown;
}

interface PatchResponse {
  ok?: true;
  user_id?: string;
  role?: string | null;
  banned?: boolean;
  error?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = ["admin", "moderator", "user"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function jsonResponse(status: number, body: PatchResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function readBearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function verifyAdminCaller(
  token: string,
  env: Env,
): Promise<
  | { ok: true; userId: string; client: SupabaseClient }
  | { ok: false; status: number; error: string }
> {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: "invalid_token" };
  }
  const { data: hasRole, error: roleError } = await client.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleError) {
    return { ok: false, status: 500, error: "role_check_failed" };
  }
  if (hasRole !== true) {
    return { ok: false, status: 403, error: "not_admin" };
  }
  // AAL2 gate — role grants + bans are privileged mutations. isAal2 reads
  // the locally-decoded payload of the same JWT string getUser() just
  // validated, plus the backup-code stamp on the verified user object.
  if (!isAal2(token, userData.user.app_metadata)) {
    return { ok: false, status: 403, error: "aal2_required" };
  }
  return { ok: true, userId: userData.user.id, client };
}

export async function onRequestPatch(ctx: RequestContext): Promise<Response> {
  const { request, env, params } = ctx;

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  const targetId = params.id;
  if (!targetId || !UUID_REGEX.test(targetId)) {
    return jsonResponse(400, { error: "invalid_user_id" });
  }

  const token = readBearer(request);
  if (!token) return jsonResponse(401, { error: "no_token" });

  const auth = await verifyAdminCaller(token, env);
  if (!auth.ok) return jsonResponse(auth.status, { error: auth.error });

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const hasRole = body.role !== undefined;
  const hasBanned = body.banned !== undefined;
  if (!hasRole && !hasBanned) {
    return jsonResponse(400, { error: "no_changes" });
  }
  if (hasRole && !ALLOWED_ROLES.includes(body.role as AllowedRole)) {
    return jsonResponse(400, { error: "invalid_role" });
  }
  if (hasBanned && typeof body.banned !== "boolean") {
    return jsonResponse(400, { error: "invalid_banned" });
  }

  // An admin cannot strip their own admin role or ban themselves — last-admin
  // lockout is a real failure mode, and self-ban locks the panel.
  if (auth.userId === targetId) {
    if (hasRole && (body.role as AllowedRole) !== "admin") {
      return jsonResponse(403, { error: "cannot_demote_self" });
    }
    if (hasBanned && body.banned === true) {
      return jsonResponse(403, { error: "cannot_ban_self" });
    }
  }

  const admin = createAdminClient(env);

  let newRole: string | null = null;
  if (hasRole) {
    const role = body.role as AllowedRole;
    const del = await admin.from("user_roles").delete().eq("user_id", targetId);
    if (del.error) {
      return jsonResponse(500, { error: "role_clear_failed" });
    }
    if (role !== "user") {
      const ins = await admin
        .from("user_roles")
        .insert({ user_id: targetId, role })
        .select("role")
        .maybeSingle();
      if (ins.error) {
        return jsonResponse(500, { error: "role_assign_failed" });
      }
      newRole = ins.data?.role ?? role;
    } else {
      newRole = "user";
    }
    const logged = await admin.rpc("log_audit_event", {
      p_action: "user_role_changed",
      p_target_type: "user",
      p_target_id: targetId,
      p_pii_access: false,
      p_details: { role, actor_id: auth.userId },
    });
    if (logged.error) {
      console.error("admin.users.PATCH audit_log role failed", logged.error.message);
    }
  }

  let banned: boolean | undefined;
  if (hasBanned) {
    const wantBanned = body.banned as boolean;
    const banDuration = wantBanned ? "876000h" : "none";
    const banRes = await admin.auth.admin.updateUserById(targetId, {
      ban_duration: banDuration,
    });
    if (banRes.error) {
      return jsonResponse(500, { error: "ban_update_failed" });
    }
    banned = wantBanned;
    const logged = await admin.rpc("log_audit_event", {
      p_action: wantBanned ? "user_banned" : "user_unbanned",
      p_target_type: "user",
      p_target_id: targetId,
      p_pii_access: false,
      p_details: { actor_id: auth.userId },
    });
    if (logged.error) {
      console.error("admin.users.PATCH audit_log ban failed", logged.error.message);
    }
  }

  return jsonResponse(200, {
    ok: true,
    user_id: targetId,
    ...(hasRole ? { role: newRole } : {}),
    ...(hasBanned ? { banned } : {}),
  });
}
