// AH-12 — MFA helpers wrapping supabase.auth.mfa.* + custom backup-code RPCs.
//
// Pure async functions. UI lives in src/routes/login.enroll-2fa.tsx,
// src/routes/login.verify-2fa.tsx, src/routes/app.account.security.tsx.
//
// Backup codes:
//   - generateBackupCodes() returns plaintext from the SECURITY DEFINER
//     RPC `generate_mfa_backup_codes`. The plaintext exists only in the
//     return value — display once, never persist client-side.
//   - consumeBackupCode(code) validates against the SHA-256 hash on the
//     server; on success the client must still call the AAL2 upgrade path
//     (a fresh signInWithPassword + a TOTP factor verify is impossible
//     without the authenticator, so the recovery flow uses backup code as
//     the AAL2 second factor: the server-side success implies the session
//     was created with a recovery secret known only to the legitimate
//     user). NOTE: Supabase MFA's true AAL2 requires `mfa.verify` against
//     a factor; we mirror that by treating a successful backup-code
//     consumption as the AAL2-equivalent and routing the user into the
//     admin area. The DB function is the gatekeeper.

import { supabase } from "@/integrations/supabase/client";
import type { Factor } from "@supabase/supabase-js";

export interface EnrollResult {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export interface AalStatus {
  currentLevel: "aal1" | "aal2" | null;
  nextLevel: "aal1" | "aal2" | null;
}

export interface FactorList {
  totp: Factor[];
}

/**
 * Begin TOTP enrollment. Returns the QR data URL (and raw secret) to
 * display to the user. The factor stays in `unverified` state until the
 * caller invokes `challengeAndVerify` with a code from the user's
 * authenticator app.
 *
 * `issuer` is encoded into the otpauth:// URI inside the QR. Authenticator
 * apps render it as the entry's account label (e.g. "subenai.sk admin:
 * user@example.com"). Without explicit issuer, Supabase falls back to the
 * project's Site URL — which often defaults to `http://localhost:3000` in
 * dev and leaks into production QRs. Passing an explicit issuer makes the
 * label stable regardless of dashboard config.
 *
 * Callers pass different issuers for different audiences so the user can
 * tell admin and user enrolments apart in their authenticator:
 *   - admin enrolment    → ISSUER_ADMIN (`subenai.sk admin`)
 *   - user-opt-in        → ISSUER_USER  (`subenai.sk`)
 */
export const ISSUER_ADMIN = "subenai.sk admin";
export const ISSUER_USER = "subenai.sk";

export interface EnrollTotpOptions {
  friendlyName?: string;
  issuer?: string;
}

export async function enrollTotp(opts: EnrollTotpOptions = {}): Promise<EnrollResult> {
  const { friendlyName = "SubenAI", issuer = ISSUER_USER } = opts;
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
    issuer,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "mfa_enroll_failed");
  }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/**
 * Issue a challenge for the given factor and immediately verify the
 * 6-digit code from the user. On success the session is upgraded to AAL2.
 */
export async function challengeAndVerify(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr || !challenge) {
    throw new Error(chErr?.message ?? "mfa_challenge_failed");
  }
  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (vErr) {
    throw new Error(vErr.message);
  }
}

export async function getAALStatus(): Promise<AalStatus> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const native: AalStatus["currentLevel"] = error || !data ? null : (data.currentLevel ?? null);
  const next: AalStatus["nextLevel"] = error || !data ? null : (data.nextLevel ?? null);

  // Native Supabase AAL2 wins — fastest path, no extra fetch.
  if (native === "aal2") {
    return { currentLevel: "aal2", nextLevel: next };
  }

  // Backup-code AAL2 fallback (AH-12.8): when an admin redeems a backup
  // code, the DB function stamps `app_metadata.aal2_via_backup_until`
  // with a 30-minute expiry. Treat that as AAL2 for `requireRole` /
  // route guard purposes. The client-side check is here because the
  // session JWT carries `app_metadata`, so a refreshSession() after
  // consume_mfa_backup_code() propagates the new timestamp.
  const { data: sessionData } = await supabase.auth.getSession();
  const meta = sessionData.session?.user.app_metadata as
    | { aal2_via_backup_until?: unknown }
    | undefined;
  const expiry = meta?.aal2_via_backup_until;
  if (typeof expiry === "string") {
    const expiryDate = new Date(expiry);
    if (!Number.isNaN(expiryDate.getTime()) && expiryDate > new Date()) {
      return { currentLevel: "aal2", nextLevel: "aal2" };
    }
  }

  return { currentLevel: native, nextLevel: next };
}

export async function listFactors(): Promise<FactorList> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) {
    return { totp: [] };
  }
  return { totp: data.totp ?? [] };
}

export async function unenrollFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Generate 8 single-use backup codes. Plaintext returned ONCE — show to
 * user, allow download, then drop from memory.
 */
export async function generateBackupCodes(): Promise<string[]> {
  const { data, error } = await supabase.rpc("generate_mfa_backup_codes");
  if (error || !data) {
    throw new Error(error?.message ?? "backup_codes_generate_failed");
  }
  return data as string[];
}

/**
 * Consume a backup code. Returns true if the code was valid and unused,
 * false otherwise. The DB function atomically flips used_at = now() AND
 * stamps app_metadata.aal2_via_backup_until = now() + 30min (AH-12.8).
 * On success we refresh the session so the new app_metadata reaches the
 * JWT and getAALStatus() will return "aal2" on the next call.
 */
export async function consumeBackupCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_mfa_backup_code", {
    p_code: code.trim(),
  });
  if (error || data !== true) {
    return false;
  }
  // Pull the updated user.app_metadata into the local session so the
  // downstream /admin guard's getAALStatus() sees the new timestamp.
  // refreshSession is idempotent and won't fail destructively if the
  // server rejects — we still return true so the UI continues.
  await supabase.auth.refreshSession().catch(() => undefined);
  return true;
}

/**
 * Count remaining (unused) backup codes for the current user. Used by
 * the security page to show "X codes left" and warn at zero.
 */
export async function remainingBackupCodes(): Promise<number> {
  const { count, error } = await supabase
    .from("mfa_backup_codes")
    .select("id", { count: "exact", head: true })
    .is("used_at", null);
  if (error || count === null) {
    return 0;
  }
  return count;
}
