/**
 * E40.3 — Sub-processor registry.
 *
 * Single source of truth for Art. 28(3)(g) sub-processor disclosure.
 * Used by:
 *   - DPA template (src/lib/dpa/dpa-template.tsx) — Annex B.2 table
 *   - /privacy page sub-processors section
 *
 * When adding or removing a vendor, update this list and BOTH consumers
 * automatically reflect the change. Per Art. 28(2) the operator
 * commits to a 14-day pre-notification before activating any new
 * sub-processor — track that out-of-band (e.g. via /privacy changelog).
 */

export interface SubProcessor {
  name: string;
  purpose: string;
  location: string;
}

export const SUB_PROCESSORS: readonly SubProcessor[] = [
  {
    name: "Supabase Inc.",
    purpose: "Hosting databázy (Postgres) a autentifikácia",
    location: "EÚ región (eu-central-1)",
  },
  {
    name: "Cloudflare Inc.",
    purpose: "CDN, edge computing (Pages Functions), bot challenge (Turnstile)",
    location: "Globálny CDN, prevažne EÚ a US",
  },
  {
    name: "Resend Inc.",
    purpose: "Transakčný e-mail (DPA kópia, magic linky, notifikácie)",
    location: "EÚ región",
  },
];
