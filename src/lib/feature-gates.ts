// E45 follow-up — generalised feature-gate registry.
//
// Used by the UI to render a disabled-with-tooltip affordance for
// features that exist in the codebase but aren't user-available yet.
// Two gate kinds today:
//
//   * "coming_soon"  — manual launch flag. The team flips it to "live"
//                      (delete the entry) when ready. Never auto-unlocks.
//                      Used today for `email_invites` — the Resend
//                      pipeline + dialog are implemented and tested,
//                      but we haven't decided when to expose them yet
//                      (free? PRO? always-on for owners?).
//
//   * "pro"          — auto-unlocks when `userHasPro()` returns true.
//                      Today nobody has PRO so the badge always shows.
//                      Reserved for the day we ship a paid plan.
//
// Promoting a feature from "coming_soon" to "pro" is one entry edit;
// promoting from gated to fully-available is one entry deletion. The
// UI infra (badge, tooltip, disabled state) is consumer-agnostic.

export type FeatureGate = "coming_soon" | "pro";

export type FeatureId =
  // Resend-backed invite emails. Pipeline implemented in Phase 3
  // (functions/api/tests/send-invites). Currently "coming_soon" while
  // we figure out positioning (likely free for owners, but no
  // commitment yet). User-facing tooltip says
  // editor.invite_coming_soon_tooltip — the marketing copy mirrors that.
  "email_invites";

export const FEATURE_GATES: Partial<Record<FeatureId, FeatureGate>> = {
  email_invites: "coming_soon",
};

/**
 * Returns true iff the current user has an active PRO subscription.
 *
 * Today this is `false` for everyone — billing isn't shipped. When
 * billing arrives this reads from the auth/profile context. Helpers
 * below dispatch on the gate type, so the swap is a one-function-body
 * change and PRO-gated features unlock automatically; "coming_soon"
 * features stay gated regardless.
 */
export function userHasPro(): boolean {
  return false;
}

/**
 * Returns the active gate for a feature, or `null` if the feature is
 * available to the current user. Use this in UI to choose between
 * badge/tooltip flavours (`<ComingSoonBadge />` vs `<ProBadge />`).
 */
export function getFeatureGate(id: FeatureId): FeatureGate | null {
  const gate = FEATURE_GATES[id];
  if (!gate) return null;
  // "pro" auto-unlocks when the user has PRO; "coming_soon" never does.
  if (gate === "pro" && userHasPro()) return null;
  return gate;
}

/**
 * Marker for UI: should the entry point be rendered as disabled?
 * Mirrors `getFeatureGate(id) !== null` — kept as a separate name for
 * readability at the call site.
 */
export function isFeatureLocked(id: FeatureId): boolean {
  return getFeatureGate(id) !== null;
}
