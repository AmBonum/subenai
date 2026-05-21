// E40.2 — DPA flow feature flag.
//
// Phase A of E40 ships the route + form + server handler behind this
// flag (defaults OFF). Legacy /schools mailto CTA stays the live path
// until legal counsel signs off on the v0.1 DPA template (E40.3) and
// the operator flips VITE_DPA_FLOW_ENABLED=true in CF Pages production
// env (E40.6).
//
// Single source of truth — every flag check goes through this module
// so the swap to "always on" in E40.6 is a one-file delete.

export const IS_DPA_FLOW_ENABLED = import.meta.env.VITE_DPA_FLOW_ENABLED === "true";

export const DEFAULT_DPA_TEMPLATE_VERSION = "v0.1";

// Draft watermark on the rendered DPA PDF. ON by default — the
// 'DRAFT — NEZAVÄZUJÚCA UKÁŽKA · NEPODPISOVAŤ' diagonal stamp prevents
// schools from accidentally signing the unreviewed v0.1 template before
// legal counsel signs off. Operator flips
// VITE_DPA_TEMPLATE_DRAFT_WATERMARK=false in CF Pages env + bumps
// DEFAULT_DPA_TEMPLATE_VERSION to v1.0 in the SAME deploy after sign-off.
//
// Re-exported here (not only inside render.client.ts) so the
// /admin/settings dashboard can surface the current state to operators
// without dragging the react-pdf module into the admin chunk.
export const IS_DPA_DRAFT_WATERMARK_ENABLED =
  (import.meta.env.VITE_DPA_TEMPLATE_DRAFT_WATERMARK ?? "true") !== "false";

// Retention constants — these live in the SQL function
// `anonymize_expired_dpa_requests()` (see migration
// 20260521200000_dpa_requests.sql line 98). Mirrored here ONLY for
// display purposes; the source of truth stays the migration so
// changing the value never goes through the client bundle.
export const DPA_RETENTION_MONTHS = 12;
