const FOOTER_HTML = `
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
<p style="color:#64748b;font-size:12px;line-height:1.5">
  am.bonum s. r. o., IČO 55 055 290, Škultétyho 1560/3, 052 01 Spišská Nová Ves.
  Tento e-mail je transakčný — nie marketingový. Posielame ho len v reakcii na konkrétnu akciu
  (platba, žiadosť o magic link, vytvorenie žiadosti o podporu, refund).
  Otázky alebo doplnenie? Napíšte nám na <a href="mailto:podpora@subenai.sk" style="color:#64748b;text-decoration:underline">podpora@subenai.sk</a>.
</p>
`;

function wrap(content: string): string {
  return `<!DOCTYPE html><html lang="sk"><head><meta charset="utf-8" /><title>subenai</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1020;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;color:#0f172a">
    <h1 style="margin:0 0 16px 0;font-size:20px;color:#0f172a">subenai</h1>
    ${content}
    ${FOOTER_HTML}
  </div>
</body></html>`;
}

export function magicLinkPortalEmail(portalUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Spravovať podporu projektu subenai";
  const html = wrap(`
    <p style="font-size:15px;line-height:1.6">
      Niekto požiadal o odkaz na správu tvojej podpory projektu subenai. Ak si to bol/a ty,
      klikni na tlačidlo nižšie. Otvorí sa Stripe Customer Portal, kde si môžeš pozrieť faktúry,
      zmeniť kartu alebo <strong>zrušiť mesačný odber jedným klikom</strong>.
    </p>
    <p style="margin:24px 0">
      <a href="${sanitizeUrl(portalUrl)}"
         style="display:inline-block;background:linear-gradient(135deg,#bef264,#16a34a);color:#0f172a;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px">
        Otvoriť portál
      </a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#475569">
      Odkaz platí 1 hodinu. Ak si o neho nepožiadal/a, ignoruj tento e-mail — nikto sa s tvojou
      podporou nemôže manipulovať bez tohto linku.
    </p>
  `);
  const text = `Spravovať podporu projektu subenai\n\nOtvor portál: ${portalUrl}\n\nOdkaz platí 1 hodinu. Ak si o neho nepožiadal/a, ignoruj tento e-mail.`;
  return { subject, html, text };
}

export function dpaDeliveryEmail(input: {
  schoolName: string;
  contactName: string;
  requestId: string;
}): { subject: string; html: string; text: string } {
  const subject = `subenai — DPA pre ${input.schoolName}`;
  const html = wrap(`
    <p style="font-size:15px;line-height:1.6">
      ${escapeText(input.contactName)}, posielame ti DPA pre školu
      <strong>${escapeText(input.schoolName)}</strong> ako prílohu (PDF, ${" "}Art. 28 GDPR).
    </p>
    <p style="font-size:14px;line-height:1.6">
      Zmluvu si prečítajte, vytlačte alebo podpíšte elektronicky a sken nám pošlite späť
      na tento e-mail. Po podpise zmluvu archivujeme v zmysle účtovných predpisov; do
      podpisu môžete žiadosť kedykoľvek zrušiť odpoveďou na tento e-mail.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#475569">
      Žiadosť ID: <code>${escapeText(input.requestId)}</code><br />
      Verzia šablóny a dátum vyhotovenia sú uvedené v päte PDF prílohy.
    </p>
  `);
  const text = [
    `${input.contactName}, posielame ti DPA pre školu ${input.schoolName} v prílohe (PDF, Art. 28 GDPR).`,
    "",
    "Prečítaj si zmluvu, podpíš ju štatutárom školy a sken nám pošli späť na tento e-mail.",
    "",
    `Žiadosť ID: ${input.requestId}`,
  ].join("\n");
  return { subject, html, text };
}

export function refundAlertEmail(input: {
  paymentIntentId: string;
  refundedEur: number;
  sponsorId: string;
  currency: string;
}): { subject: string; html: string; text: string } {
  const subject = `Refund ${input.refundedEur.toFixed(2)} ${input.currency} — sponsor ${input.sponsorId}`;
  const html = wrap(`
    <p style="font-size:15px;line-height:1.6">
      Stripe oznámil refund. Odporúčam manuálne overiť záznam a (ak to bolo top-tier sponzorstvo)
      aktualizovať footer / <code>/sponsors</code> per E11.5 SOP.
    </p>
    <ul style="font-size:14px;line-height:1.6">
      <li><strong>Suma:</strong> ${input.refundedEur.toFixed(2)} ${input.currency}</li>
      <li><strong>Pôvodný PaymentIntent:</strong> <code>${escapeText(input.paymentIntentId)}</code></li>
      <li><strong>Sponsor ID:</strong> <code>${escapeText(input.sponsorId)}</code></li>
    </ul>
    <p style="font-size:13px;line-height:1.6;color:#475569">
      Detail v Stripe Dashboard → Payments → vyhľadaj <code>${escapeText(input.paymentIntentId)}</code>.
    </p>
  `);
  const text = `Refund ${input.refundedEur.toFixed(2)} ${input.currency}\nPaymentIntent: ${input.paymentIntentId}\nSponsor: ${input.sponsorId}`;
  return { subject, html, text };
}

// E45 Phase 3 — Test invite email. Sent from `pozvanky@subenai.sk`
// to recipient on behalf of the test author. Body always carries the
// share link; password is included verbatim ONLY if the author opts in
// via the per-send checkbox (D7 in the epic plan — defaults OFF so the
// password stays out-of-band).
//
// Two subject variants disambiguate filter-classification (Appendix B
// § 1): "(heslo v tomto e-maile)" suffix tells Gmail/Outlook this is a
// known transactional onboarding pattern, not credential phishing.
export function testInviteEmail(input: {
  testTitle: string;
  authorName: string;
  authorEmail: string;
  shareUrl: string;
  /** Plaintext password, included verbatim only when the author opted in. */
  password?: string;
}): { subject: string; html: string; text: string } {
  const includesPassword = typeof input.password === "string" && input.password.length > 0;

  const subject = includesPassword
    ? `Pozvánka na test: ${input.testTitle} (heslo v tomto e-maile)`
    : `Pozvánka na test: ${input.testTitle}`;

  const passwordBlockHtml = includesPassword
    ? `
    <p style="font-size:14px;line-height:1.6;margin-top:16px">
      <strong>Heslo k testu:</strong>
      <code style="display:inline-block;background:#f1f5f9;padding:4px 10px;border-radius:6px;margin-left:4px;font-size:14px">${escapeText(input.password!)}</code>
    </p>
    <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin-top:4px">
      Toto heslo zdieľame výnimočne v tomto e-maile na výslovnú žiadosť autora.
      Pre vyššiu bezpečnosť autori zvyčajne posielajú heslo samostatne (SMS, Signal, ústne).
    </p>`
    : `
    <p style="font-size:13px;line-height:1.6;color:#475569;margin-top:16px">
      Tento test je chránený heslom. Autor ti ho pošle samostatne (SMS, chat alebo ústne).
    </p>`;

  const passwordBlockText = includesPassword
    ? [
        "",
        `Heslo k testu: ${input.password}`,
        "(Autor zdieľal heslo v tomto e-maile výnimočne. Pre vyššiu bezpečnosť",
        " sa heslo zvyčajne posiela samostatne — SMS, Signal, ústne.)",
      ].join("\n")
    : "\nTest je chránený heslom. Autor ti ho pošle samostatne (SMS, chat alebo ústne).";

  const html = wrap(`
    <p style="font-size:15px;line-height:1.6">
      Ahoj, <strong>${escapeText(input.authorName)}</strong> ťa cez subenai.sk
      pozval/a vyplniť test <strong>${escapeText(input.testTitle)}</strong>.
    </p>
    <p style="margin:24px 0">
      <a href="${sanitizeUrl(input.shareUrl)}"
         style="display:inline-block;background:linear-gradient(135deg,#bef264,#16a34a);color:#0f172a;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px">
        Otvoriť test
      </a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#475569">
      Alebo skopíruj odkaz priamo: <br />
      <code style="word-break:break-all">${escapeText(input.shareUrl)}</code>
    </p>
    ${passwordBlockHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="font-size:13px;line-height:1.6;color:#475569">
      Pozvánku poslal/a:
      <strong>${escapeText(input.authorName)}</strong>
      &lt;<a href="${sanitizeUrl(`mailto:${input.authorEmail}`)}" style="color:#475569">${escapeText(input.authorEmail)}</a>&gt;.
      Otázky o teste smeruj naňho/ňu, nie na nás.
    </p>
    <p style="font-size:12px;line-height:1.5;color:#94a3b8">
      Ak si tento e-mail nečakal/a, ignoruj ho — autor zadal tvoju adresu manuálne
      a nikomu inému tvoju adresu neukazujeme. Žiadne marketing-listy ani opakované
      e-maily; toto je jednorazová pozvánka.
    </p>
  `);

  const text = [
    `${input.authorName} ťa cez subenai.sk pozval/a vyplniť test "${input.testTitle}".`,
    "",
    `Otvor test: ${input.shareUrl}`,
    passwordBlockText.trim() ? passwordBlockText : "",
    "",
    `Pozvánku poslal/a: ${input.authorName} <${input.authorEmail}>.`,
    "Otázky o teste smeruj naňho/ňu, nie na nás.",
    "",
    "Ak si tento e-mail nečakal/a, ignoruj ho. Žiadne ďalšie e-maily neprídu.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

// E48.5 — Support ticket transactional templates. Triggered by:
//   - supportTicketReceivedEmail: /functions/api/support-ticket-create.ts
//     immediately after submit_support_ticket() RPC returns. viewUrl is the
//     anonymous-thread URL (with HMAC view_token); for authenticated
//     submitters callers can pass undefined to suppress the link.
//   - supportTicketReplyEmail: /functions/api/support-ticket-reply.ts (E48.8)
//     when an admin replies. body is rendered with preserved line breaks,
//     no Markdown.
//   - supportTicketResolvedEmail: transition_ticket_status RPC consumer
//     in /admin/tickets detail page (E48.7) when status flips to 'resolved'.

// Mirrors SUPPORT_TICKET_CATEGORIES from src/components/support/support-form-config.ts.
// Not imported directly — CF Functions live in a separate bundle from src/*.
const CATEGORY_LABEL_SK: Record<string, string> = {
  bug: "Chyba alebo problém",
  question: "Otázka",
  feature_request: "Návrh na vylepšenie",
  abuse_report: "Nahlásenie nevhodného obsahu",
  billing: "Platby / sponzorstvo",
  gdpr: "Žiadosť o údaje (GDPR)",
  other: "Iné",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toLocaleString("sk-SK", { maximumFractionDigits: 1 })} kB`;
  return `${(kb / 1024).toLocaleString("sk-SK", { maximumFractionDigits: 1 })} MB`;
}

export const __internal = { formatBytes };

export function supportTicketReceivedEmail(input: {
  ticketId: string;
  subject: string;
  category: string;
  name: string | null;
  body: string;
  attachments: ReadonlyArray<{ filename: string; size_bytes: number }>;
  viewUrl?: string;
}): { subject: string; html: string; text: string } {
  const categoryLabel = CATEGORY_LABEL_SK[input.category] ?? input.category;
  const mailSubject = `Vašu žiadosť o podporu sme prijali — ${input.ticketId}`;

  const nameBlock = input.name ? `<p><strong>Meno:</strong> ${escapeText(input.name)}</p>` : "";

  const attachmentsBlock =
    input.attachments.length > 0
      ? `<p style="margin-top:12px"><strong>Prílohy (${input.attachments.length}):</strong></p>
    <ul style="margin:4px 0 0;padding-left:20px;font-size:14px;line-height:1.7">
      ${input.attachments
        .map(
          (a) =>
            `<li>${escapeText(a.filename)} <span style="color:#64748b">(${formatBytes(a.size_bytes)})</span></li>`,
        )
        .join("\n      ")}
    </ul>`
      : "";

  const viewBlock = input.viewUrl
    ? `
    <p style="margin:24px 0">
      <a href="${sanitizeUrl(input.viewUrl)}"
         style="display:inline-block;background:linear-gradient(135deg,#bef264,#16a34a);color:#0f172a;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px">
        Zobraziť vlákno
      </a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#475569">
      Odkaz na vlákno je platný 90 dní. Stačí naň kliknúť — žiadne prihlásenie.
    </p>`
    : `
    <p style="font-size:13px;line-height:1.6;color:#475569">
      Stav žiadosti uvidíte v sekcii <strong>Pomoc → Moje žiadosti</strong> po prihlásení.
    </p>`;

  const html = wrap(`
    <p style="font-size:15px;line-height:1.6">
      Ďakujeme, vašu žiadosť sme prijali. Odpovieme čo najskôr,
      <strong>najneskôr do dvoch pracovných dní</strong>.
    </p>
    <p style="font-size:14px;line-height:1.6"><strong>Tu je presná kópia vašej žiadosti</strong></p>
    <div style="background:#f8fafc;border-left:3px solid #cbd5e1;border-radius:8px;padding:16px 18px;margin:8px 0 24px">
      <p><strong>Téma:</strong> ${escapeText(input.subject)}</p>
      <p><strong>Kategória:</strong> ${escapeText(categoryLabel)}</p>
      ${nameBlock}
      <p style="margin-top:12px"><strong>Správa:</strong></p>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin-top:4px">${escapeText(input.body).replace(/\n/g, "<br />")}</div>
      ${attachmentsBlock}
    </div>
    <p style="font-size:14px;line-height:1.6">
      <strong>Číslo žiadosti:</strong> <code>${escapeText(input.ticketId)}</code>
    </p>
    ${viewBlock}
  `);

  const nameTextLine = input.name ? `Meno: ${input.name}\n` : "";
  const attachmentsTextBlock =
    input.attachments.length > 0
      ? `\nPrílohy (${input.attachments.length}):\n${input.attachments.map((a) => `  - ${a.filename} (${formatBytes(a.size_bytes)})`).join("\n")}`
      : "";

  const text = [
    "Ďakujeme, vašu žiadosť sme prijali.",
    "Odpovieme najneskôr do dvoch pracovných dní.",
    "",
    "Tu je presná kópia vašej žiadosti",
    "---",
    `Téma: ${input.subject}`,
    `Kategória: ${categoryLabel}`,
    nameTextLine.trimEnd(),
    `Správa:\n${input.body}`,
    attachmentsTextBlock.trimStart() ? attachmentsTextBlock.trimStart() : "",
    "---",
    `Číslo žiadosti: ${input.ticketId}`,
    input.viewUrl ? `\nZobraziť vlákno: ${input.viewUrl}\n(odkaz platí 90 dní)` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: mailSubject, html, text };
}

export function supportTicketReplyEmail(input: {
  ticketId: string;
  adminName: string;
  body: string;
  viewUrl?: string;
}): { subject: string; html: string; text: string } {
  const mailSubject = `Re: vaša žiadosť o podporu — ${input.ticketId}`;
  const bodyHtml = escapeText(input.body).replace(/\n/g, "<br />");
  const viewBlock = input.viewUrl
    ? `<p style="margin:20px 0"><a href="${sanitizeUrl(input.viewUrl)}" style="color:#16a34a;font-weight:600">Otvoriť celé vlákno →</a></p>`
    : "";

  const html = wrap(`
    <p style="font-size:14px;line-height:1.6;color:#475569;margin-bottom:4px">
      Odpoveď od <strong>${escapeText(input.adminName)}</strong> (subenai podpora)
    </p>
    <div style="background:#f8fafc;border-left:3px solid #16a34a;padding:16px 18px;border-radius:8px;font-size:15px;line-height:1.7;margin:16px 0">
      ${bodyHtml}
    </div>
    ${viewBlock}
    <p style="font-size:13px;line-height:1.6;color:#475569">
      Ak chcete odpovedať, jednoducho odpíšte na tento e-mail — vaša odpoveď sa pripojí
      ku žiadosti <code>${escapeText(input.ticketId)}</code>.
    </p>
  `);

  const text = [
    `Odpoveď od ${input.adminName} (subenai podpora):`,
    "",
    input.body,
    "",
    input.viewUrl ? `Celé vlákno: ${input.viewUrl}` : "",
    `Žiadosť: ${input.ticketId}. Odpovedať môžete priamo na tento e-mail.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: mailSubject, html, text };
}

export function supportTicketResolvedEmail(input: { ticketId: string; viewUrl?: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const mailSubject = `Vaša žiadosť o podporu bola uzavretá — ${input.ticketId}`;
  const viewBlock = input.viewUrl
    ? `<p style="margin:16px 0"><a href="${sanitizeUrl(input.viewUrl)}" style="color:#16a34a;font-weight:600">Pozrieť záznam →</a></p>`
    : "";

  const html = wrap(`
    <p style="font-size:15px;line-height:1.6">
      Vaša žiadosť <code>${escapeText(input.ticketId)}</code> bola uzavretá ako vyriešená.
      Ďakujeme za spätnú väzbu.
    </p>
    ${viewBlock}
    <p style="font-size:13px;line-height:1.6;color:#475569">
      Ak ste neboli s riešením spokojní alebo sa problém vrátil, odpíšte na tento e-mail
      a žiadosť znova otvoríme.
    </p>
  `);

  const text = [
    `Vaša žiadosť ${input.ticketId} bola uzavretá ako vyriešená.`,
    "Ďakujeme za spätnú väzbu.",
    input.viewUrl ? `\nPozrieť záznam: ${input.viewUrl}` : "",
    "",
    "Ak potrebujete znova otvoriť, jednoducho odpovedzte na tento e-mail.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: mailSubject, html, text };
}

function escapeText(value: string): string {
  return value.replace(/[&<>]/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    return "&gt;";
  });
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

function sanitizeUrl(value: string): string {
  if (!value || typeof value !== "string" || !value.trim()) {
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("<") || trimmed.startsWith(">")) {
    return "";
  }
  const lowerUrl = trimmed.toLowerCase();
  if (
    lowerUrl.startsWith("javascript:") ||
    lowerUrl.startsWith("data:") ||
    lowerUrl.startsWith("vbscript:") ||
    lowerUrl.startsWith("file:")
  ) {
    return "";
  }
  return escapeAttr(trimmed);
}

export const __internal = { sanitizeUrl };
