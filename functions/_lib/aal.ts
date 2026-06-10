// Unified AAL2 gate for privileged CF functions. Mirrors the client-side
// semantic in src/lib/auth/mfa.ts getAALStatus() and the SQL helper
// public.is_aal2(): native `aal === "aal2"` OR a future
// `app_metadata.aal2_via_backup_until` stamp (backup-code recovery,
// AH-12.8) both count as AAL2.
//
// Trusting the locally-decoded payload is sound here: callers only invoke
// this AFTER supabase.auth.getUser() validated the exact same JWT string
// against the auth server, so the payload cannot have been forged.

export function decodeJwtPayload(
  jwt: string,
): { aal?: string; sub?: string; email?: string } | null {
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

export function isAal2(jwt: string, appMetadata: Record<string, unknown> | undefined): boolean {
  if (decodeJwtPayload(jwt)?.aal === "aal2") return true;
  const expiry = appMetadata?.aal2_via_backup_until;
  if (typeof expiry !== "string") return false;
  const expiryDate = new Date(expiry);
  return !Number.isNaN(expiryDate.getTime()) && expiryDate > new Date();
}
