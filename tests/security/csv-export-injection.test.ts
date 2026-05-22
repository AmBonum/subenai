// E49.4 — CSV export injection contract.
//
// Pure unit-level assertions against `escapeCsvCell` / `serializeCsvRow`.
// Imports the existing `XSS_PAYLOADS` + `CSV_INJECTION_PAYLOADS` batteries
// so any new payload added there is automatically covered.

import { describe, expect, it } from "vitest";

import { escapeCsvCell, serializeCsvRow, serializeCsv } from "../../functions/_lib/csv";
import { XSS_PAYLOADS, CSV_INJECTION_PAYLOADS } from "./e48-payloads";

const DANGEROUS_LEADING = new Set(["=", "+", "-", "@", "\t", "\r"]);

/**
 * Minimal RFC-4180 parser sufficient for round-trip assertions in this
 * suite. Handles quoted fields, escaped `""`, embedded `\n`/`\r\n`. No
 * external dep so the contract test stays standalone.
 */
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  while (i < input.length) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (c === "\r" && input[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 2;
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    cell += c;
    i += 1;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

describe("CSV injection defense — escapeCsvCell", () => {
  it.each(CSV_INJECTION_PAYLOADS.map((p) => [p]))(
    "prefixes a single quote when payload starts with a dangerous char: %p",
    (raw: string) => {
      const escaped = escapeCsvCell(raw);
      const firstRaw = raw.charAt(0);
      if (DANGEROUS_LEADING.has(firstRaw)) {
        // Either bare or wrapped in quotes — but the leading char of the
        // CONTENT (after stripping outer quoting) must be the sentinel `'`.
        const inner = escaped.startsWith('"') ? escaped.slice(1, -1).replace(/""/g, '"') : escaped;
        expect(inner.charAt(0)).toBe("'");
      } else {
        // Payloads starting with `,` or `\n` don't trigger the sentinel
        // — RFC-4180 quoting still applies, but the leading char inside
        // the unquoted content stays as-is.
        const inner = escaped.startsWith('"') ? escaped.slice(1, -1).replace(/""/g, '"') : escaped;
        expect(inner.charAt(0)).toBe(firstRaw);
      }
    },
  );

  it("does NOT prefix safe payloads that happen to contain `=` later", () => {
    expect(escapeCsvCell("Anna = best")).toBe("Anna = best");
  });

  it("escapes inner double-quotes by doubling them inside a quoted field", () => {
    const v = 'He said "hi"';
    const escaped = escapeCsvCell(v);
    expect(escaped).toBe('"He said ""hi"""');
  });

  it("wraps any field containing comma/newline/CR/quote", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
    expect(escapeCsvCell("a\r\nb")).toBe('"a\r\nb"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
  });

  it("handles null/undefined/number/boolean/Date deterministically", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(true)).toBe("true");
    expect(escapeCsvCell(new Date("2026-05-22T10:00:00.000Z"))).toBe("2026-05-22T10:00:00.000Z");
  });
});

describe("CSV injection defense — XSS payload battery in cells", () => {
  it.each(XSS_PAYLOADS.map((p) => [p]))(
    "renders %p as inert text inside the CSV cell (no formula trigger)",
    (raw: string) => {
      const escaped = escapeCsvCell(raw);
      // Strip outer quoting + unescape doubled quotes -> the raw cell content.
      const inner = escaped.startsWith('"') ? escaped.slice(1, -1).replace(/""/g, '"') : escaped;
      // Either the payload starts with a dangerous char and we prefixed `'`
      // OR the payload does not start with one and inner === raw.
      const firstRaw = raw.charAt(0);
      if (DANGEROUS_LEADING.has(firstRaw)) {
        expect(inner.charAt(0)).toBe("'");
        expect(inner.slice(1)).toBe(raw);
      } else {
        expect(inner).toBe(raw);
      }
      // The cell content is a pure string — Excel cannot start formula
      // evaluation because the leading char is no longer one of =+-@\t\r.
      expect(DANGEROUS_LEADING.has(inner.charAt(0)) && inner.charAt(0) !== "'").toBe(false);
    },
  );
});

describe("CSV round-trip", () => {
  it("serializes + parses back to the original cell payloads", () => {
    const rows: string[][] = [
      ["session_id", "name", "score"],
      ["sess-1", '=HYPERLINK("evil","x")', "100"],
      ["sess-2", 'Jano "Comma, Inside" Vzor', "55"],
      ["sess-3", "multi\nline\nvalue", ""],
    ];
    const csv = serializeCsv(rows);
    const parsed = parseCsv(csv);
    expect(parsed).toHaveLength(rows.length);
    // Cell 0 column 1 of row 1: the formula payload survives but with a
    // leading `'` sentinel — this is the contract.
    expect(parsed[1][1]).toBe("'" + rows[1][1]);
    // Other cells round-trip verbatim.
    expect(parsed[0]).toEqual(rows[0]);
    expect(parsed[2]).toEqual(rows[2]);
    expect(parsed[3]).toEqual(rows[3]);
  });

  it("serializeCsvRow terminates with CRLF", () => {
    const r = serializeCsvRow(["a", "b"]);
    expect(r.endsWith("\r\n")).toBe(true);
  });
});
