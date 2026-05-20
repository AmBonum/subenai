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
