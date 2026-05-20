const FOOTER_HTML = `
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
<p style="color:#64748b;font-size:12px;line-height:1.5">
  am.bonum s. r. o., IČO 55 055 290, Škultétyho 1560/3, 052 01 Spišská Nová Ves.
  Tento e-mail je transakčný — nie marketingový. Posielame ho len v reakcii na konkrétnu akciu
  (platba, žiadosť o magic link, refund). Otázky? Odpovedz priamo na tento e-mail.
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
      <a href="${escapeAttr(portalUrl)}"
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
