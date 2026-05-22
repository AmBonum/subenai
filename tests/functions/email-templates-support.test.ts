import { describe, it, expect } from "vitest";

import {
  supportTicketReceivedEmail,
  supportTicketReplyEmail,
  supportTicketResolvedEmail,
  __internal,
} from "../../functions/_lib/email-templates";

const { formatBytes } = __internal;

// E48.5 — Slovak transactional email templates for the support pipeline.
// Snapshot-style assertions: every template must include (a) the ticket
// id, (b) the canonical company footer (from wrap()), (c) Slovak copy,
// and (d) plain-text fallback for deliverability.

describe("supportTicketReceivedEmail", () => {
  const base = {
    ticketId: "tkt-abc-123",
    subject: "Test sa nedá spustiť",
    category: "bug",
    name: null,
    body: "Popis problému.",
    attachments: [] as ReadonlyArray<{ filename: string; size_bytes: number }>,
  };

  it("subject contains the ticketId", () => {
    const t = supportTicketReceivedEmail(base);
    expect(t.subject).toContain(base.ticketId);
    expect(t.subject).toMatch(/prijali/i);
  });

  it("HTML body contains the Slovak category label", () => {
    const t = supportTicketReceivedEmail(base);
    expect(t.html).toContain("Chyba alebo problém");
  });

  it("renders the view link when viewUrl is provided", () => {
    const t = supportTicketReceivedEmail({
      ...base,
      viewUrl: "https://subenai.sk/contact-form/ticket/tkt-abc-123?token=aaaa",
    });
    expect(t.html).toContain(
      'href="https://subenai.sk/contact-form/ticket/tkt-abc-123?token=aaaa"',
    );
    expect(t.html).toContain("Zobraziť vlákno");
    expect(t.html).toContain("90 dní");
  });

  it("does NOT render the view link when viewUrl is undefined (authenticated submitter)", () => {
    const t = supportTicketReceivedEmail(base);
    expect(t.html).not.toContain("Zobraziť vlákno");
    expect(t.html).toContain("Moje žiadosti");
  });

  it("plain-text fallback includes ticketId + subject + category label", () => {
    const t = supportTicketReceivedEmail({
      ...base,
      viewUrl: "https://subenai.sk/contact-form/ticket/x?token=y",
    });
    expect(t.text).toContain("tkt-abc-123");
    expect(t.text).toContain("Test sa nedá spustiť");
    expect(t.text).toContain("Chyba alebo problém");
    expect(t.text).toContain("https://subenai.sk/contact-form/ticket/x?token=y");
  });

  it("HTML carries the canonical company footer", () => {
    const t = supportTicketReceivedEmail(base);
    expect(t.html).toContain("am.bonum s. r. o.");
    expect(t.html).toContain("IČO 55 055 290");
  });

  it("escapes HTML entities in the subject", () => {
    const t = supportTicketReceivedEmail({
      ...base,
      subject: "<script>alert(1)</script>",
    });
    expect(t.html).not.toContain("<script>alert(1)</script>");
    expect(t.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  // TC-47 (specs/support/E48-security.md): XSS payload in subject reaches
  // the confirmation email as escaped text (HTML) or plain text (text).
  // The plain-text body is safe by definition — it carries the raw
  // characters because MUAs never interpret text/plain as markup.
  it("TC-47: XSS subject is escaped in html and preserved literally in text fallback", () => {
    const t = supportTicketReceivedEmail({
      ticketId: "x",
      subject: "<script>alert(1)</script>",
      category: "question",
      name: null,
      body: "Telo správy.",
      attachments: [],
      viewUrl: "https://subenai.sk/contact-form/ticket/x?token=y",
    });

    // HTML side: raw <script> must NOT appear as markup; escaped entity must.
    expect(t.html).not.toContain("<script>alert(1)</script>");
    expect(t.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");

    // Plain-text side: the literal characters are present — MUAs render
    // text/plain as glyphs, never as HTML, so this is safe.
    expect(t.text).toContain("<script>alert(1)</script>");
  });

  it("falls back to the raw category value when the key is unknown", () => {
    const t = supportTicketReceivedEmail({ ...base, category: "wildcard_value" });
    expect(t.html).toContain("wildcard_value");
  });
});

describe("supportTicketReplyEmail", () => {
  it("subject is Re-prefixed with the ticketId", () => {
    const t = supportTicketReplyEmail({
      ticketId: "tkt-abc-123",
      adminName: "Anna Admin",
      body: "Ďakujeme za nahlásenie, opravili sme.",
    });
    expect(t.subject).toMatch(/^Re:.*tkt-abc-123/);
  });

  it("preserves line breaks in the body via <br />", () => {
    const t = supportTicketReplyEmail({
      ticketId: "x",
      adminName: "Admin",
      body: "Prvý riadok\nDruhý riadok\nTretí riadok",
    });
    expect(t.html).toContain("Prvý riadok<br />Druhý riadok<br />Tretí riadok");
  });

  it("renders adminName + view URL when supplied", () => {
    const t = supportTicketReplyEmail({
      ticketId: "x",
      adminName: "Anna Admin",
      body: "Reply.",
      viewUrl: "https://subenai.sk/contact-form/ticket/x?token=y",
    });
    expect(t.html).toContain("Anna Admin");
    expect(t.html).toContain("https://subenai.sk/contact-form/ticket/x?token=y");
    expect(t.html).toContain("Otvoriť celé vlákno");
  });

  it("escapes HTML in the admin reply body to prevent stored XSS", () => {
    const t = supportTicketReplyEmail({
      ticketId: "x",
      adminName: "Admin",
      body: "Tu je odpoveď <script>alert(1)</script>",
    });
    expect(t.html).not.toContain("<script>alert(1)</script>");
    expect(t.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("supportTicketResolvedEmail", () => {
  it("subject mentions 'uzavretá' and the ticketId", () => {
    const t = supportTicketResolvedEmail({ ticketId: "tkt-r-999" });
    expect(t.subject).toMatch(/uzavretá/);
    expect(t.subject).toContain("tkt-r-999");
  });

  it("invites the user to re-open by replying", () => {
    const t = supportTicketResolvedEmail({ ticketId: "x" });
    // "znova otvoríme" (HTML, "otvor" + í + "me") and "znova otvoriť"
    // (plain text, "otvori" + ť). Match the shared "znova otvor" prefix.
    expect(t.text).toMatch(/znova otvor/iu);
    expect(t.html).toMatch(/znova otvor/iu);
  });
});

describe("supportTicketReceivedEmail (E48-v2)", () => {
  const base = {
    ticketId: "tkt-v2-001",
    subject: "test subject",
    category: "question",
    name: null as string | null,
    body: "Test body text.",
    attachments: [] as ReadonlyArray<{ filename: string; size_bytes: number }>,
  };

  it("renders subject in html and text", () => {
    const { html, text } = supportTicketReceivedEmail(base);
    expect(html).toContain("test subject");
    expect(text).toContain("Téma: test subject");
  });

  it("renders Slovak category label instead of raw key", () => {
    const { html, text } = supportTicketReceivedEmail(base);
    expect(html).toContain("Otázka");
    expect(html).not.toContain(">question<");
    expect(text).toContain("Otázka");
  });

  it("omits Meno block when name is null", () => {
    const { html, text } = supportTicketReceivedEmail({ ...base, name: null });
    expect(html).not.toContain("Meno:");
    expect(text).not.toContain("Meno:");
  });

  it("renders Meno block when name is provided", () => {
    const { html, text } = supportTicketReceivedEmail({ ...base, name: "Ján Novák" });
    expect(html).toContain("Meno:");
    expect(html).toContain("Ján Novák");
    expect(text).toContain("Meno: Ján Novák");
  });

  it("omits Prílohy block when attachments is empty", () => {
    const { html, text } = supportTicketReceivedEmail({ ...base, attachments: [] });
    expect(html).not.toContain("Prílohy");
    expect(text).not.toContain("Prílohy");
  });

  it("renders Prílohy block with Slovak-formatted size when attachments are present", () => {
    const { html, text } = supportTicketReceivedEmail({
      ...base,
      attachments: [{ filename: "a.png", size_bytes: 1234 }],
    });
    expect(html).toContain("a.png");
    expect(html).toContain("1,2 kB");
    expect(text).toContain("a.png");
  });

  it("preserves line breaks in body: html gets <br />, plain text keeps literal newline", () => {
    const { html, text } = supportTicketReceivedEmail({
      ...base,
      body: "line 1\nline 2",
    });
    expect(html).toContain("line 1<br />line 2");
    expect(text).toContain("line 1\nline 2");
  });

  it("footer contains podpora@subenai.sk and does not say 'odpovedz ... na tento'", () => {
    const { html } = supportTicketReceivedEmail(base);
    expect(html).toContain("podpora@subenai.sk");
    expect(html).not.toMatch(/odpovedz.*na.*tento/i);
  });

  it("escapes XSS in subject: raw <script> absent, &lt;script escaped present", () => {
    const { html } = supportTicketReceivedEmail({
      ...base,
      subject: "<script>alert(1)</script>",
    });
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("&lt;script");
  });

  it("escapes HTML tags in attachment filename", () => {
    const { html } = supportTicketReceivedEmail({
      ...base,
      attachments: [{ filename: "<b>a</b>.png", size_bytes: 100 }],
    });
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("renders ticketId inside a <code> element", () => {
    const { html } = supportTicketReceivedEmail(base);
    expect(html).toContain("<code>");
    expect(html).toContain("tkt-v2-001");
  });

  describe("formatBytes", () => {
    it("0 bytes", () => expect(formatBytes(0)).toBe("0 B"));
    it("1023 bytes", () => expect(formatBytes(1023)).toBe("1023 B"));
    it("1024 bytes → 1 kB", () => expect(formatBytes(1024)).toBe("1 kB"));
    it("1234 bytes → 1,2 kB (Slovak decimal)", () => expect(formatBytes(1234)).toBe("1,2 kB"));
    it("1048576 bytes → 1 MB", () => expect(formatBytes(1048576)).toBe("1 MB"));
    it("5242880 bytes → 5 MB", () => expect(formatBytes(5242880)).toBe("5 MB"));
  });
});
