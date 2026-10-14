// Per-field detectors that decide whether a typed value looks like a real
// instance of the sensitive field. Pure functions — no DOM, no network.
// Spec: tasks/E4-data-trap-copy.md (E4.1).

import { isValidLuhn } from "./luhn";

export type TrapFieldId =
  "birth_number" | "card_number" | "card_cvv" | "iban" | "password" | "otp_code";

export type TrapMatcher = (value: string) => boolean;

/**
 * 6-field matcher set — see tasks/E4-data-trap-copy.md for rationale,
 * patterns and 3+3 negative tests per field.
 *
 * Address and email+password dual fields from the spec are intentionally
 * left for a follow-up (require multi-field state) — the 6 below cover the
 * highest-impact teaching moments and ship as a self-contained unit.
 */
export const matchers: Record<TrapFieldId, TrapMatcher> = {
  birth_number: (raw) => {
    const v = raw.trim();
    return /^\d{6}\s*\/?\s*\d{3,4}$/.test(v);
  },

  card_number: (raw) => isValidLuhn(raw),

  card_cvv: (raw) => /^\d{3,4}$/.test(raw.trim()),

  iban: (raw) => {
    // Accept common EU IBAN shapes after normalising whitespace.
    const v = raw.replace(/\s/g, "").toUpperCase();
    return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v) && v.length >= 15 && v.length <= 34;
  },

  password: (raw) => raw.length > 0,

  otp_code: (raw) => /^\d{4,8}$/.test(raw.trim()),
};
