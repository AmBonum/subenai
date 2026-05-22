// E48-v2 PR-C — Security regression suite: XSS + CSV injection payload battery.
//
// PR-A coupling note: supportTicketReceivedEmail now accepts
// { ticketId, subject, category, name, body, attachments, viewUrl? }. The suite
// below tests all fields. The name/body/attachments describe blocks previously
// marked it.skip have been un-skipped and now test these fields.
//
// Assertion semantics:
//   Text fields (subject, ticketId) go through escapeText() which converts
//   &, <, > to HTML entities. The payload `<img src=x onerror=alert(1)>` safely
//   becomes `&lt;img src=x onerror=alert(1)&gt;` — the literal string "onerror="
//   is present in the HTML source as inert display text (inside an entity-escaped
//   sequence), NOT as an executable attribute. We therefore check the HTML
//   AFTER stripping entity-escaped segments to avoid false positives.
//
//   viewUrl fields go through sanitizeUrl() which only permits https:// and
//   http:// schemes. Any other scheme (javascript:, data:, vbscript:, etc.)
//   is replaced with "#". The noJavascriptHref assertions below verify this.

import { describe, expect, it } from "vitest";

import {
  supportTicketReceivedEmail,
  supportTicketReplyEmail,
  supportTicketResolvedEmail,
} from "../../functions/_lib/email-templates";
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
      name: null,
      body: "Test body",
      attachments: [],
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
      name: null,
      body: "Test body",
      attachments: [],
    });
    noExecutableMarkup(result.html);
  });
});

// --- XSS: viewUrl (URL field via sanitizeUrl — allow-list scheme check) ------

describe("E48 XSS resistance — supportTicketReceivedEmail (viewUrl)", () => {
  it.each(XSS_PAYLOADS)("escapes executable markup in viewUrl: %s", (payload) => {
    const result = supportTicketReceivedEmail({
      ticketId: "test-id",
      subject: "Legitimate subject",
      category: "question",
      name: null,
      body: "Test body",
      attachments: [],
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

describe("E48 XSS resistance — supportTicketReceivedEmail (name)", () => {
  it.each(XSS_PAYLOADS)("escapes payload in name field: %s", (payload) => {
    const result = supportTicketReceivedEmail({
      ticketId: "test-id",
      subject: "Legitimate subject",
      category: "question",
      name: payload,
      body: "Test body",
      attachments: [],
    });
    noExecutableMarkup(result.html);
  });
});

describe("E48 XSS resistance — supportTicketReceivedEmail (body)", () => {
  it.each(XSS_PAYLOADS)("escapes payload in body field: %s", (payload) => {
    const result = supportTicketReceivedEmail({
      ticketId: "test-id",
      subject: "Legitimate subject",
      category: "question",
      name: null,
      body: payload,
      attachments: [],
    });
    noExecutableMarkup(result.html);
  });
});

describe("E48 XSS resistance — supportTicketReceivedEmail (attachment filename)", () => {
  it.each(XSS_PAYLOADS)("escapes payload in attachment filename: %s", (payload) => {
    const result = supportTicketReceivedEmail({
      ticketId: "test-id",
      subject: "Legitimate subject",
      category: "question",
      name: null,
      body: "Test body",
      attachments: [{ filename: payload, size_bytes: 1024 }],
    });
    noExecutableMarkup(result.html);
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

// --- E48 XSS defense-in-depth: Reply + Resolved templates -------------------
//
// sanitizeUrl() replaces any href that isn't https:// or http:// with "#",
// preventing javascript:/data:/vbscript: execution in email clients that
// render HTML. These tests lock that contract for every template that
// interpolates a user-supplied viewUrl into an href attribute.

const XSS_URL_PAYLOADS = [
  "javascript:alert(1)",
  "JAVASCRIPT:alert(1)",
  "javascript\t:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "vbscript:msgbox(1)",
  "VBSCRIPT:msgbox(1)",
  " javascript:alert(1)",
  "\tjavascript:alert(1)",
];

const SAFE_URL = "https://subenai.sk/contact-form/ticket/abc?token=tok123";

describe("supportTicketReplyEmail — href XSS defense", () => {
  it("renders the view-thread link with a safe https:// viewUrl", () => {
    const { html } = supportTicketReplyEmail({
      ticketId: "tkt-1",
      adminName: "Admin",
      body: "Reply.",
      viewUrl: SAFE_URL,
    });
    expect(html).toContain(`href="${SAFE_URL}"`);
    expect(html).toContain("Otvoriť celé vlákno");
  });

  it("replaces javascript: viewUrl with # in the rendered href", () => {
    const { html } = supportTicketReplyEmail({
      ticketId: "tkt-1",
      adminName: "Admin",
      body: "Reply.",
      viewUrl: "javascript:alert(1)",
    });
    expect(html).toContain('href="#"');
    expect(html).not.toContain("javascript:");
  });

  it.each(XSS_URL_PAYLOADS)("blocks dangerous scheme %s → href becomes #", (viewUrl) => {
    const { html } = supportTicketReplyEmail({
      ticketId: "tkt-xss",
      adminName: "Admin",
      body: "Reply.",
      viewUrl,
    });
    const lower = html.toLowerCase();
    expect(lower).not.toContain("javascript:");
    expect(lower).not.toContain("vbscript:");
    expect(lower).not.toContain("data:text/html");
    expect(html).toContain('href="#"');
  });

  it("omits the view block entirely when viewUrl is undefined", () => {
    const { html } = supportTicketReplyEmail({
      ticketId: "tkt-1",
      adminName: "Admin",
      body: "Reply.",
    });
    expect(html).not.toContain("Otvoriť celé vlákno");
    expect(html).not.toContain("contact-form/ticket");
  });
});

describe("supportTicketResolvedEmail — href XSS defense", () => {
  it("renders the view-record link with a safe https:// viewUrl", () => {
    const { html } = supportTicketResolvedEmail({
      ticketId: "tkt-2",
      viewUrl: SAFE_URL,
    });
    expect(html).toContain(`href="${SAFE_URL}"`);
    expect(html).toContain("Pozrieť záznam");
  });

  it("replaces javascript: viewUrl with # in the rendered href", () => {
    const { html } = supportTicketResolvedEmail({
      ticketId: "tkt-2",
      viewUrl: "javascript:alert(1)",
    });
    expect(html).toContain('href="#"');
    expect(html).not.toContain("javascript:");
  });

  it.each(XSS_URL_PAYLOADS)("blocks dangerous scheme %s → href becomes #", (viewUrl) => {
    const { html } = supportTicketResolvedEmail({ ticketId: "tkt-xss", viewUrl });
    const lower = html.toLowerCase();
    expect(lower).not.toContain("javascript:");
    expect(lower).not.toContain("vbscript:");
    expect(lower).not.toContain("data:text/html");
    expect(html).toContain('href="#"');
  });

  it("omits the view block entirely when viewUrl is undefined", () => {
    const { html } = supportTicketResolvedEmail({ ticketId: "tkt-2" });
    expect(html).not.toContain("Pozrieť záznam");
    expect(html).not.toContain("contact-form/ticket");
  });
});
