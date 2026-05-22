// E49.4 — CSV serialization helper for `export-sessions` CF function.
//
// Two hardening rules layered on top of RFC-4180:
//
//   1. Formula-injection defense. Excel / Google Sheets / Numbers treat a
//      cell whose FIRST character is `=`, `+`, `-`, `@`, TAB or CR as a
//      formula. A crafted respondent name like `=HYPERLINK("...","...")`
//      becomes an active hyperlink the moment the author opens the export.
//      We prefix any such cell with a single quote (`'`), which Excel
//      interprets as "this is text". The quote becomes part of the
//      rendered cell content but is not interpreted as a formula trigger.
//      (See OWASP "CSV Injection" + tasks/PLAN-2026-05-22-E49 §D9.)
//
//   2. RFC-4180 quoting. Wrap any field containing `,`, `"`, `\n` or `\r`
//      in double quotes, and escape internal `"` by doubling it.
//
// Pure, deterministic, no I/O. Reused directly by the contract test in
// `tests/security/csv-export-injection.test.ts`.

const DANGEROUS_LEADING_CHARS = new Set(["=", "+", "-", "@", "\t", "\r"]);

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}

export function escapeCsvCell(value: unknown): string {
  let s = stringifyCell(value);
  // Injection defense BEFORE quoting — the leading-quote sentinel must
  // survive into the final cell content so the spreadsheet sees it.
  if (s.length > 0 && DANGEROUS_LEADING_CHARS.has(s.charAt(0))) {
    s = "'" + s;
  }
  const needsQuoting = /[",\r\n]/.test(s);
  if (!needsQuoting) return s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function serializeCsvRow(cells: readonly unknown[]): string {
  return cells.map(escapeCsvCell).join(",") + "\r\n";
}

export interface SerializeCsvOpts {
  /** Prepend the UTF-8 BOM (U+FEFF) so Excel auto-detects encoding. */
  bom?: boolean;
}

export function serializeCsv(
  rows: readonly (readonly unknown[])[],
  opts: SerializeCsvOpts = {},
): string {
  const body = rows.map(serializeCsvRow).join("");
  return opts.bom ? "﻿" + body : body;
}

export const __test__ = {
  DANGEROUS_LEADING_CHARS,
};
