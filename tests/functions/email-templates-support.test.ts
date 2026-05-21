import { describe, it, expect } from "vitest";

import {
  supportTicketReceivedEmail,
  supportTicketReplyEmail,
  supportTicketResolvedEmail,
} from "../../functions/_lib/email-templates";

// E48.5 — Slovak transactional email templates for the support pipeline.
// Snapshot-style assertions: every template must include (a) the ticket
// id, (b) the canonical company footer (from wrap()), (c) Slovak copy,
// and (d) plain-text fallback for deliverability.

describe("supportTicketReceivedEmail", () => {
  const base = {
    ticketId: "tkt-abc-123",
    subject: "Test sa nedá spustiť",
    category: "bug",
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
