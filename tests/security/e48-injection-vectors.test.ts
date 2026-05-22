// E48-v2 PR-C — Security regression suite: XSS + CSV injection payload battery.
//
// PR-A coupling note: supportTicketReceivedEmail currently accepts
// { ticketId, subject, category, viewUrl? }. The suite below tests the fields
// that exist today. The name/body/attachments fields land in PR-A; the
// corresponding describe blocks are marked it.skip so they:
//   - compile cleanly against the current signature, and
//   - remind the reviewer exactly what to un-skip once PR-A merges.
//
// Assertion semantics:
//   Text fields (subject, ticketId) go through escapeText() which converts
//   &, <, > to HTML entities. The payload `<img src=x onerror=alert(1)>` safely
//   becomes `&lt;img src=x onerror=alert(1)&gt;` — the literal string "onerror="
//   is present in the HTML source as inert display text (inside an entity-escaped
//   sequence), NOT as an executable attribute. We therefore check the HTML
//   AFTER stripping entity-escaped segments to avoid false positives.
//
//   viewUrl fields go through escapeAttr() which escapes &, <, >, " but does NOT
//   strip the javascript: protocol. A bare `javascript:alert(1)` viewUrl still
//   produces href="javascript:alert(1)" — a genuine exposure. Those failures are
//   INTENTIONAL regression markers for the URL sanitisation fix.

import { describe, expect, it } from "vitest";

import { supportTicketReceivedEmail } from "../../functions/_lib/email-templates";
import { XSS_PAYLOADS, CSV_INJECTION_PAYLOADS } from "./e48-payloads";

// --- helpers -----------------------------------------------------------------

/**
 * Strip entity-escaped tag sequences (&lt;...&gt;) before checking for
 * dangerous tokens. This prevents false positives where the payload's raw
 * text (e.g. `onerror=`) appears inside a properly-escaped segment that is
 * rendered as display text, not as executable markup.
 */
function stripEscapedTags(html: string): string {
  return html.replace(/&lt;[^&]*&gt;/gi, "");
}

/**
 * Assert no executable markup survived into rendered HTML.
 * Only checks patterns that would be dangerous if unescaped.
 */
function noExecutableMarkup(html: string): void {
  const stripped = stripEscapedTags(html);
  const lower = stripped.toLowerCase();
  expect(stripped).not.toContain("<script");
  expect(lower).not.toMatch(/onerror\s*=/);
  expect(lower).not.toMatch(/onload\s*=/);
  expect(lower).not.toMatch(/ontoggle\s*=/);
  expect(lower).not.toMatch(/onfocus\s*=/);
  expect(lower).not.toMatch(/onstart\s*=/);
}

/**
 * Assert no unescaped javascript: URL reached an href/src/action attribute.
 * The pattern href="javascript: (or single-quote variant) would be executable
 * in an email client that renders raw HTML.
 */
function noJavascriptHref(html: string): void {
  const lower = html.toLowerCase();
  expect(lower).not.toMatch(/href\s*=\s*["']javascript:/);
  expect(lower).not.toMatch(/src\s*=\s*["']javascript:/);
  expect(lower).not.toMatch(/action\s*=\s*["']javascript:/);
}

// --- XSS: subject (text field via escapeText) --------------------------------

describe("E48 XSS resistance — supportTicketReceivedEmail (subject)", () => {
  it.each(XSS_PAYLOADS)("escapes executable markup in subject: %s", (payload) => {
    const result = supportTicketReceivedEmail({
      ticketId: "test-id",
      subject: payload,
      category: "question",
    });
    noExecutableMarkup(result.html);
  });
});

// --- XSS: ticketId (text field via escapeText) --------------------------------

describe("E48 XSS resistance — supportTicketReceivedEmail (ticketId)", () => {
  it.each(XSS_PAYLOADS)("escapes executable markup in ticketId: %s", (payload) => {
    const result = supportTicketReceivedEmail({
      ticketId: payload,
      subject: "Legitimate subject",
      category: "question",
    });
    noExecutableMarkup(result.html);
  });
});

// --- XSS: viewUrl (URL field via escapeAttr — javascript: protocol check) ----
//
// escapeAttr() HTML-encodes &, <, >, " but does NOT strip the javascript:
// protocol from URLs. Payloads containing `javascript:` therefore produce
// href="javascript:alert(1)" — a real exposure in email clients that render
// raw HTML. These assertions document the current gap and should be unblocked
// by adding URL-protocol sanitisation to escapeAttr or the viewBlock template.

describe("E48 XSS resistance — supportTicketReceivedEmail (viewUrl)", () => {
  it.each(XSS_PAYLOADS)("escapes executable markup in viewUrl: %s", (payload) => {
    const result = supportTicketReceivedEmail({
      ticketId: "test-id",
      subject: "Legitimate subject",
      category: "question",
      viewUrl: payload,
    });
    noExecutableMarkup(result.html);
    noJavascriptHref(result.html);
  });
});

// --- XSS: PR-A fields (skip until PR-A merges) --------------------------------
//
// Once PR-A lands and adds name/body/attachments to supportTicketReceivedEmail,
// remove the .skip from all three blocks below and verify they pass.

describe("E48 XSS resistance — supportTicketReceivedEmail (name) [awaits PR-A]", () => {
  it.skip.each(XSS_PAYLOADS)("escapes payload in name field: %s", (_payload) => {
    // Un-skip and implement once PR-A adds `name` param.
  });
});

describe("E48 XSS resistance — supportTicketReceivedEmail (body) [awaits PR-A]", () => {
  it.skip.each(XSS_PAYLOADS)("escapes payload in body field: %s", (_payload) => {
    // Un-skip and implement once PR-A adds `body` param.
  });
});

describe("E48 XSS resistance — supportTicketReceivedEmail (attachment filename) [awaits PR-A]", () => {
  it.skip.each(XSS_PAYLOADS)("escapes payload in attachment filename: %s", (_payload) => {
    // Un-skip and implement once PR-A adds `attachments` param.
  });
});

// --- CSV injection: placeholder for future export helper ---------------------
//
// The CSV export helper lands in PR-E. This describe block is a stub
// that will be expanded once PR-E provides the csvEscapeCell helper.

describe("E48 CSV injection — placeholder for future CSV export helper", () => {
  it.skip.each(CSV_INJECTION_PAYLOADS)("escapes payload: %s", (_payload) => {
    // Will be filled in PR-E when csvEscapeCell is available.
  });
});
