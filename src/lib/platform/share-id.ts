// Share ids must match the respondent-side gate in
// src/lib/respondent/queries.ts (`/^[a-zA-Z0-9]{6,12}$/`) AND the SQL
// regex in supabase/migrations/20260425173314_*.sql. crypto.randomUUID()
// (36 chars, hyphens) fails both — hence this dedicated generator.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const SHARE_ID_LENGTH = 10;

export function generateShareId(length = SHARE_ID_LENGTH): string {
  let out = "";
  while (out.length < length) {
    const bytes = new Uint8Array(length * 2);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      // Rejection sampling: 248 = 4 * 62, so bytes < 248 map uniformly
      // onto the 62-char alphabet without modulo bias.
      if (b < 248) {
        out += ALPHABET[b % ALPHABET.length];
        if (out.length === length) break;
      }
    }
  }
  return out;
}
