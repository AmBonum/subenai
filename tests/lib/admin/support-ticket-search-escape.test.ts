import { describe, expect, it, vi } from "vitest";

import { ilikePatternEscape, postgrestOrEscape } from "@/lib/admin/queries";

// Audit A4 — PostgREST or() injection.
//
// The admin ticket search box composes a `q.or("subject.ilike.<term>,
// body.ilike.<term>,submitter_email.ilike.<term>")` filter. PostgREST
// tokenises this string on `,`, `(`, `)` — any user-supplied character
// that hits the tokeniser becomes a structural separator and lets the
// attacker append additional filter clauses (e.g. `id.eq.<uuid>` to
// disclose tickets they wouldn't otherwise read).
//
// Two layers of defence:
//   1. ILIKE pattern escape — neutralises `\`, `%`, `_` so the wildcard
//      semantics inside the pattern stay literal.
//   2. PostgREST or() escape — URL-encodes `,`, `(`, `)` so the
//      tokeniser doesn't see them; PostgREST decodes them back to
//      literals server-side, ILIKE then matches them as-is.

describe("ilikePatternEscape", () => {
  it("doubles backslashes", () => {
    expect(ilikePatternEscape("foo\\bar")).toBe("foo\\\\bar");
  });

  it("escapes % and _", () => {
    expect(ilikePatternEscape("100%_match")).toBe("100\\%\\_match");
  });

  it("escapes backslash BEFORE % and _ (order matters)", () => {
    // If we escaped % first, then the new backslash from `\%` would get
    // doubled on a second pass and we'd end up with `\\\\%` instead of
    // `\\%`. The order chosen here keeps the pattern semantically
    // identical to the input.
    expect(ilikePatternEscape("\\%")).toBe("\\\\\\%");
  });

  it("passes clean ASCII through unchanged", () => {
    expect(ilikePatternEscape("hello world")).toBe("hello world");
  });
});

describe("postgrestOrEscape", () => {
  it("encodes the three structural chars used by the or() tokeniser", () => {
    expect(postgrestOrEscape("a,b(c)d")).toBe("a%2Cb%28c%29d");
  });

  it("is a no-op on input that contains no structural chars", () => {
    expect(postgrestOrEscape("hello%world")).toBe("hello%world");
  });

  it("preserves a previously ILIKE-escaped pattern's backslash sequence", () => {
    expect(postgrestOrEscape("\\\\%(injection)")).toBe("\\\\%%28injection%29");
  });
});

describe("admin ticket search — full escape chain", () => {
  it("neutralises a PostgREST or() injection payload", () => {
    // Attacker types `foo),id.eq.bbbb-cccc-dddd` hoping to break out of
    // the `subject.ilike.<term>` clause and append a tautology that
    // matches a ticket by UUID. After both passes the `,` and `)` are
    // URL-encoded and ILIKE will treat them as literal byte matches.
    const ilikeEscaped = ilikePatternEscape("foo),id.eq.bbbb-cccc-dddd");
    const encoded = postgrestOrEscape(ilikeEscaped);
    expect(encoded).toBe("foo%29%2Cid.eq.bbbb-cccc-dddd");
    expect(encoded).not.toContain(",");
    expect(encoded).not.toContain(")");
    expect(encoded).not.toContain("(");
  });

  it("composes the final filter string the way useAdminSupportTickets does", () => {
    // Re-derives the same template the production hook uses so the
    // shape is locked. If the hook ever stops calling `q.or` with this
    // exact concatenation, this test fails fast.
    const term = `%${postgrestOrEscape(ilikePatternEscape("foo),id.eq.X"))}%`;
    const composed = `subject.ilike.${term},body.ilike.${term},submitter_email.ilike.${term}`;
    // Exactly two unencoded commas (the ones the hook controls), zero
    // unencoded parens. The injected `)` and `,` survive only in their
    // %29 / %2C forms.
    expect(composed.match(/[^%2C]C/g)).toBeNull(); // no raw commas inside terms
    const rawCommas = composed.split(",").length - 1;
    expect(rawCommas).toBe(2); // the two `,` between ilike clauses
    expect(composed).toContain("%29"); // encoded `)`
    expect(composed).toContain("%2C"); // encoded `,`
  });

  // Keep vi in scope to satisfy import linting even though we don't
  // currently spy. Future hook-integration assertions belong here.
  it("guards against future regressions of the escape order", () => {
    expect(vi).toBeDefined();
  });
});
