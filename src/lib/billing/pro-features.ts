// E45 Phase 3 — PRO plan feature gates.
//
// This module centralises the "is this feature gated behind the PRO
// plan, and does the current user have access?" question. Today nobody
// has PRO (the billing plan doesn't exist yet); every gated feature is
// rendered as a disabled affordance with a Slovak tooltip explaining
// why. The implementation IS shipped — only the UI entry point is
// behind the gate, so when billing launches we just flip
// `userHasPro()` to read from the billing state.
//
// Adding a new PRO feature = one entry in `PRO_FEATURES` + the UI uses
// the helper. No `if (env.X === "pro")` sprinkled across components.

export type ProFeatureId =
  // The first PRO-only capability: send invite emails from a dedicated
  // platform address (pozvanky@subenai.sk) via Resend. Free authors
  // share the link manually — this saves them the copy/paste round-trip
  // and tracks send/bounce events in their audit log.
  "email_invites";

/**
 * Static catalogue of features that today require a PRO plan. Each
 * entry maps to an i18n tooltip key (`billing.pro_tooltip.<id>`).
 *
 * When billing launches and we want to enable a feature for free users,
 * remove the entry here — UI gates become no-ops automatically.
 */
export const PRO_FEATURES: Record<ProFeatureId, { tooltipKey: string }> = {
  email_invites: { tooltipKey: "email_invites" },
};

/**
 * Returns true iff the current user has an active PRO subscription.
 *
 * Today this is `false` for everyone — billing isn't shipped. When
 * billing arrives, this reads from the auth/profile context (e.g.
 * `useCurrentProfile().data?.pro_until > now`). All call sites already
 * use the helper, so the swap is a one-function-body change.
 */
export function userHasPro(): boolean {
  return false;
}

/**
 * Helper for UI: should the call-site treat the feature as available?
 *
 * Returns `true` when the feature is NOT in `PRO_FEATURES` (free for
 * everyone) OR when the current user has PRO.
 */
export function isProFeatureAvailable(feature: ProFeatureId): boolean {
  if (!(feature in PRO_FEATURES)) return true;
  return userHasPro();
}

/**
 * Marker for UI: should the call-site render the "PRO" badge / lock
 * icon? Returns `true` only when the feature is gated AND the user
 * doesn't have PRO — so once a user upgrades, the badge disappears
 * automatically.
 */
export function isProFeatureLocked(feature: ProFeatureId): boolean {
  if (!(feature in PRO_FEATURES)) return false;
  return !userHasPro();
}
