-- AH-15.8 batch 1: cultural localization of first 40 scam scenarios
-- Idempotent — UPDATE statements are safe to re-run.
-- AH-15.7 schema is required (prompt_en/cs, options_en/cs, visual_en/cs).
--
-- Cultural substitutions:
--   EN (UK): Royal Mail, Barclays, Lloyds, HSBC, NatWest, BT, EE, HMRC,
--            £ + period decimal, +44, .co.uk, IBAN GB, English names.
--   CS (CZ): Česká pošta, Česká spořitelna, ČSOB, Komerční banka, Air Bank,
--            T-Mobile, Vodafone, Finanční úřad, Kč (~26 Kč/€), +420, .cz,
--            IBAN CZ, Czech names.

-- ============================================================================
-- Q1: SMS phishing — Slovenská pošta → Royal Mail (EN) / Česká pošta (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You received this text. Would you click?',
  options_en = '[{"id":"a","label":"Click and pay — just £2","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — Royal Mail doesn''t send links like this","correct":true,"severity":null},{"id":"c","label":"Reply to the number and ask","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"InfoSMS","body":"Royal Mail: Your parcel is awaiting redelivery. Pay £1.59 here:","link":"http://royal-mail-uk.delivery-pay.com/track"}'::jsonb
WHERE id = 'd0c42316-c2d2-532e-9cde-2814adaa1398';

UPDATE public.questions SET
  prompt_cs = 'Přišla vám tato SMS. Kliknete?',
  options_cs = '[{"id":"a","label":"Kliknu a zaplatím — jen 50 Kč","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — Česká pošta takhle odkazy neposílá","correct":true,"severity":null},{"id":"c","label":"Odpovím na číslo a zeptám se","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"InfoSMS","body":"Česká pošta: Vaše zásilka čeká. Doplaťte 49 Kč za doručení:","link":"http://ceska-posta.delivery-pay.com/track"}'::jsonb
WHERE id = 'd0c42316-c2d2-532e-9cde-2814adaa1398';

-- ============================================================================
-- Q2: DPD redelivery SMS (DPD operates in UK and CZ — keep brand)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'DPD texts you. What do you do?',
  options_en = '[{"id":"a","label":"Click — I want my parcel","correct":false,"severity":"critical"},{"id":"b","label":"Check status in the official DPD app / on dpd.co.uk","correct":true,"severity":null},{"id":"c","label":"Call the number","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"+44 7700 900121","body":"DPD: Your parcel could not be delivered, the driver is awaiting your address choice:","link":"https://dpd-uk.parcel-redirect.info"}'::jsonb
WHERE id = 'd1085207-921d-55e5-b796-ccc9a18f68e5';

UPDATE public.questions SET
  prompt_cs = 'DPD vám píše. Co s tím?',
  options_cs = '[{"id":"a","label":"Kliknu — chci balík","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji stav v oficiální DPD aplikaci / na dpd.cz","correct":true,"severity":null},{"id":"c","label":"Zavolám na to číslo","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"+420 720 555 121","body":"DPD: Balík nebylo možné doručit, kurýr čeká na vaši volbu adresy:","link":"https://dpd-cz.parcel-redirect.info"}'::jsonb
WHERE id = 'd1085207-921d-55e5-b796-ccc9a18f68e5';

-- ============================================================================
-- Q3: "Bank" SMS about login from foreign city — Tatra banka → Barclays / Č. spořitelna
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'SMS "from the bank". Do you react?',
  options_en = '[{"id":"a","label":"Click — my account is at risk","correct":false,"severity":"critical"},{"id":"b","label":"Open the Barclays app manually and check activity","correct":true,"severity":null},{"id":"c","label":"Reply STOP","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Barclays","body":"We detected a login from an unknown device (Berlin). If this wasn''t you, verify here:","link":"https://barclays-secure.co.uk/verify"}'::jsonb
WHERE id = 'ea5c587e-1163-512d-bb1d-4ac5839af252';

UPDATE public.questions SET
  prompt_cs = 'SMS „od banky". Reagujete?',
  options_cs = '[{"id":"a","label":"Kliknu — můj účet je v ohrožení","correct":false,"severity":"critical"},{"id":"b","label":"Otevřu aplikaci Česká spořitelna ručně a podívám se na aktivitu","correct":true,"severity":null},{"id":"c","label":"Odpovím STOP","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CSAS","body":"Zaznamenali jsme přihlášení z neznámého zařízení (Berlín). Pokud jste to nebyli vy, ověřte zde:","link":"https://csas-secure.cz/overit"}'::jsonb
WHERE id = 'ea5c587e-1163-512d-bb1d-4ac5839af252';

-- ============================================================================
-- Q4: SLSP card block SMS → Lloyds (EN) / ČSOB (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Lloyds texts you. Click?',
  options_en = '[{"id":"a","label":"Click — I need my card","correct":false,"severity":"critical"},{"id":"b","label":"Call the number on the back of the card","correct":true,"severity":null},{"id":"c","label":"Reply YES","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Lloyds-Info","body":"Your card has been temporarily blocked for security reasons. Unblock here:","link":"https://lloyds.co.uk-security.online"}'::jsonb
WHERE id = 'f1ac728e-8d6f-59a0-b44e-b2bd928d76da';

UPDATE public.questions SET
  prompt_cs = 'ČSOB vám píše. Kliknete?',
  options_cs = '[{"id":"a","label":"Kliknu — potřebuji kartu","correct":false,"severity":"critical"},{"id":"b","label":"Zavolám na číslo na zadní straně karty","correct":true,"severity":null},{"id":"c","label":"Odpovím ANO","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CSOB-Info","body":"Vaše karta byla dočasně zablokována z bezpečnostních důvodů. Odblokujte zde:","link":"https://csob.cz-bezpecnost.online"}'::jsonb
WHERE id = 'f1ac728e-8d6f-59a0-b44e-b2bd928d76da';

-- ============================================================================
-- Q5: ČSOB PSD2 update SMS → HSBC (EN) / Komerční banka (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'HSBC texts you about an update.',
  options_en = '[{"id":"a","label":"Update — due to regulation","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — the bank never asks for details this way","correct":true,"severity":null},{"id":"c","label":"Call the number from the SMS","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"HSBC","body":"Due to new PSD2 regulation, update your details within 24h, or the account will be suspended:","link":"https://hsbc-update.eu/auth"}'::jsonb
WHERE id = '9c71b5ce-cc71-5111-a7fb-8bef03776c94';

UPDATE public.questions SET
  prompt_cs = 'Komerční banka vám píše o aktualizaci.',
  options_cs = '[{"id":"a","label":"Aktualizuji — kvůli regulaci","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — banka takto údaje nikdy nežádá","correct":true,"severity":null},{"id":"c","label":"Zatelefonuji na číslo z SMS","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"KB","body":"Z důvodu nové regulace PSD2 aktualizujte své údaje do 24h, jinak bude účet pozastaven:","link":"https://kb-update.eu/auth"}'::jsonb
WHERE id = '9c71b5ce-cc71-5111-a7fb-8bef03776c94';

-- ============================================================================
-- Q6: Transaction confirmation SMS — TB → Barclays (EN) / Česká spořitelna (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You just entered your online banking password and received this SMS. Do you tap confirm?',
  options_en = '[{"id":"a","label":"Yes — I just logged in","correct":false,"severity":"critical"},{"id":"b","label":"No — I didn''t send any payment","correct":true,"severity":null},{"id":"c","label":"Just in case, I''ll enter the code in the app","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Barclays SecureCode","body":"Confirm transaction: £2,450 → IBAN GB29 NWBK 6016 1331 9268 19. Code: 884213"}'::jsonb
WHERE id = '23d550d2-5586-55fa-b7d4-2b4917c83fb2';

UPDATE public.questions SET
  prompt_cs = 'Právě jste zadali heslo do internetového bankovnictví a přišla vám tato SMS. Potvrdíte?',
  options_cs = '[{"id":"a","label":"Ano — právě jsem se přihlašoval","correct":false,"severity":"critical"},{"id":"b","label":"Ne — žádnou platbu jsem neposílal","correct":true,"severity":null},{"id":"c","label":"Pro jistotu zadám kód do aplikace","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CSAS SecureCode","body":"Potvrďte transakci: 63 700 Kč → IBAN CZ65 0800 0000 1920 0014 5399. Kód: 884213"}'::jsonb
WHERE id = '23d550d2-5586-55fa-b7d4-2b4917c83fb2';

-- ============================================================================
-- Q7: Tax refund SMS — Daňový úrad → HMRC (EN) / Finanční úřad (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'HMRC says you''re due a refund.',
  options_en = '[{"id":"a","label":"Enter my card — I want the money","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — HMRC never sends money via SMS links","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"HMRC","body":"You have been awarded a tax refund of £287.50. To receive it, enter your card details:","link":"https://hmrc-refunds.co.uk-claim.com"}'::jsonb
WHERE id = 'cc113595-caa2-5925-9e0f-7a1fe6ea53a7';

UPDATE public.questions SET
  prompt_cs = 'Finanční úřad vám prý vrací přeplatek.',
  options_cs = '[{"id":"a","label":"Zadám kartu — chci peníze","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — finančák neposílá peníze přes SMS link","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"FinUrad","body":"Byl vám přiznán přeplatek 7 480 Kč. Pro vyplacení zadejte údaje karty:","link":"https://financnisprava-vratky.cz"}'::jsonb
WHERE id = 'cc113595-caa2-5925-9e0f-7a1fe6ea53a7';

-- ============================================================================
-- Q8: Netflix phishing email (netfl1x typosquat) — global brand, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'This email — phishing or legit?',
  options_en = '[{"id":"a","label":"Legit — I''ll click update","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — `netfl1x` has a 1 instead of `i`","correct":true,"severity":null},{"id":"c","label":"Legit, but I''ll sign in via the app","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"Netflix Security","fromEmail":"security@netfl1x-account.com","subject":"Your subscription has been suspended","body":"We detected a problem with your payment. Update your billing details within 24h, or the account will be cancelled.","cta":"Update now"}'::jsonb
WHERE id = '69f19901-6291-5607-a7f7-108a384bec7d';

UPDATE public.questions SET
  prompt_cs = 'Tento email — phishing nebo legit?',
  options_cs = '[{"id":"a","label":"Legit — kliknu na aktualizovat","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — `netfl1x` má jedničku místo `i`","correct":true,"severity":null},{"id":"c","label":"Legit, ale přihlásím se přes aplikaci","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Netflix Security","fromEmail":"security@netfl1x-account.com","subject":"Vaše předplatné bylo pozastaveno","body":"Zjistili jsme problém s platbou. Aktualizujte fakturační údaje do 24h, jinak bude účet zrušen.","cta":"Aktualizovat nyní"}'::jsonb
WHERE id = '69f19901-6291-5607-a7f7-108a384bec7d';

-- ============================================================================
-- Q9: Microsoft "login from Russia" — global brand, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Microsoft flags a problem. What now?',
  options_en = '[{"id":"a","label":"Click — someone is hacking me","correct":false,"severity":"critical"},{"id":"b","label":"Open account.microsoft.com manually in the browser","correct":true,"severity":null},{"id":"c","label":"Forward to IT for review","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"Microsoft Account Team","fromEmail":"no-reply@microsoft-verify.com","subject":"Unusual activity on your account","body":"We detected a sign-in from Russia. If this wasn''t you, click to secure your account.","cta":"Secure account"}'::jsonb
WHERE id = '1327585e-05e8-50b7-9f83-40e2c6b957f6';

UPDATE public.questions SET
  prompt_cs = 'Microsoft hlásí problém. Reakce?',
  options_cs = '[{"id":"a","label":"Kliknu — někdo se hackuje","correct":false,"severity":"critical"},{"id":"b","label":"Otevřu account.microsoft.com ručně v prohlížeči","correct":true,"severity":null},{"id":"c","label":"Pošlu to IT oddělení ke kontrole","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Microsoft Account Team","fromEmail":"no-reply@microsoft-verify.com","subject":"Neobvyklá aktivita na vašem účtu","body":"Zjistili jsme přihlášení z Ruska. Pokud jste to nebyli vy, klikněte a zabezpečte účet.","cta":"Zabezpečit účet"}'::jsonb
WHERE id = '1327585e-05e8-50b7-9f83-40e2c6b957f6';

-- ============================================================================
-- Q10: Apple "Final Cut Pro purchase" — global brand, keep, convert currency
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Apple claims you bought an app.',
  options_en = '[{"id":"a","label":"Click — I didn''t buy anything","correct":false,"severity":"critical"},{"id":"b","label":"Check purchases in App Store / appleid.apple.com","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Apple Support","fromEmail":"billing@apple-receipts.co","subject":"Invoice: Final Cut Pro — £279.99","body":"Thank you for your purchase. If you did not authorise this transaction, click to cancel within 12 hours.","cta":"Cancel transaction"}'::jsonb
WHERE id = 'b3397560-b85e-511a-8369-a57318a3b3eb';

UPDATE public.questions SET
  prompt_cs = 'Apple tvrdí, že jste si koupili aplikaci.',
  options_cs = '[{"id":"a","label":"Kliknu — nic jsem nekupoval","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji nákupy v App Store / appleid.apple.com","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Apple Support","fromEmail":"billing@apple-receipts.co","subject":"Faktura: Final Cut Pro — 8 580 Kč","body":"Děkujeme za nákup. Pokud jste tuto transakci neautorizovali, klikněte na zrušení do 12 hodin.","cta":"Zrušit transakci"}'::jsonb
WHERE id = 'b3397560-b85e-511a-8369-a57318a3b3eb';

-- ============================================================================
-- Q11: Google Drive share with fake invoice — Slovak name → local name
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Google Drive sharing notification. Open it?',
  options_en = '[{"id":"a","label":"Open it — they know my address","correct":false,"severity":"medium"},{"id":"b","label":"Open Drive manually and check shared items","correct":true,"severity":null},{"id":"c","label":"Reply and ask who they are","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"James Walker (via Google Drive)","fromEmail":"drive-shares-noreply@google.com","subject":"James shared with you: Invoice_2024.pdf","body":"James Walker shared a document with you. Open it and sign in for access.","cta":"Open document"}'::jsonb
WHERE id = '87f64998-50db-5d6d-8845-659860851939';

UPDATE public.questions SET
  prompt_cs = 'Sdílení přes Google Drive. Otevřete?',
  options_cs = '[{"id":"a","label":"Otevřu — zná moji adresu","correct":false,"severity":"medium"},{"id":"b","label":"Otevřu Drive ručně a podívám se na sdílené položky","correct":true,"severity":null},{"id":"c","label":"Pošlu mu odpověď, kdo to je","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Tomáš Novák (přes Google Drive)","fromEmail":"drive-shares-noreply@google.com","subject":"Tomáš s vámi sdílel: Faktura_2024.pdf","body":"Tomáš Novák s vámi sdílel dokument. Otevřete jej a přihlaste se pro přístup.","cta":"Otevřít dokument"}'::jsonb
WHERE id = '87f64998-50db-5d6d-8845-659860851939';

-- ============================================================================
-- Q12: Fake job offer asking for ID + IBAN — currency + role conversion
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A LinkedIn-style job offer by email.',
  options_en = '[{"id":"a","label":"Send the details — sounds great","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — asking for ID + bank details before an interview = scam","correct":true,"severity":null},{"id":"c","label":"Ask for more details first","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"HR Recruiter","fromEmail":"recruiter@global-talent-hub.work","subject":"Job offer £3,800/month remote — for you","body":"We saw your profile. We can offer you a Marketing Assistant position, salary £3,800/month, fully remote. To get started, send a copy of your passport and your bank account number."}'::jsonb
WHERE id = 'e6875080-21f4-5c56-8f44-4b4f238aea14';

UPDATE public.questions SET
  prompt_cs = 'Nabídka práce z LinkedIn přes email.',
  options_cs = '[{"id":"a","label":"Pošlu — zní to skvěle","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — žádat OP+IBAN před pohovorem = scam","correct":true,"severity":null},{"id":"c","label":"Nejdřív si vyžádám víc detailů","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"HR Recruiter","fromEmail":"recruiter@global-talent-hub.work","subject":"Pracovní nabídka 115 000 Kč remote — pro vás","body":"Viděli jsme váš profil. Můžeme vám nabídnout pozici Marketing Assistant, plat 115 000 Kč/měsíc, plně remote. Pro start pošlete kopii OP a IBAN."}'::jsonb
WHERE id = 'e6875080-21f4-5c56-8f44-4b4f238aea14';

-- ============================================================================
-- Q13: CEO fraud "boss email" — Apple gift cards scam, swap names + currency
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from your boss. Do you act?',
  options_en = '[{"id":"a","label":"Buy and send the codes — it''s the boss","correct":false,"severity":"critical"},{"id":"b","label":"Call or message her directly first","correct":true,"severity":null},{"id":"c","label":"Reply to the email","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"email","from":"Sarah Mitchell","fromEmail":"sarah.mitchell@company.co.uk","subject":"Urgent help","body":"Hi, I''m in a meeting, can''t call. I urgently need to buy 5 Apple gift cards for a client. Send me the codes by text. We''ll reimburse you tomorrow."}'::jsonb
WHERE id = '68e42fdc-82a7-515d-8acb-2cab6ab5f2df';

UPDATE public.questions SET
  prompt_cs = 'Email od šéfové. Reagujete?',
  options_cs = '[{"id":"a","label":"Koupím a pošlu kódy — je to šéfová","correct":false,"severity":"critical"},{"id":"b","label":"Nejdřív jí zavolám nebo napíšu přímo","correct":true,"severity":null},{"id":"c","label":"Odpovím na ten email","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Jana Nováková","fromEmail":"jana.novakova@firma.cz","subject":"Rychlá pomoc","body":"Ahoj, jsem na meetingu, nemůžu volat. Potřebuju urgentně koupit 5 Apple gift karet pro klienta. Pošli mi kódy SMSkou. Nákup ti proplatíme zítra."}'::jsonb
WHERE id = '68e42fdc-82a7-515d-8acb-2cab6ab5f2df';

-- ============================================================================
-- Q14: PayPal typosquat (paypa1) — global, keep typo trick, convert currency
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'PayPal supposedly sent you money.',
  options_en = '[{"id":"a","label":"Accept — money is money","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — `paypa1` is a number, not the real PayPal","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"PayPal","fromEmail":"service@paypa1-secure.com","subject":"You received 850 USD — confirm receipt","body":"To accept the payment, sign in and confirm the transaction. Expires in 24h.","cta":"Accept payment"}'::jsonb
WHERE id = 'dc04128f-7d7f-5d11-8c7e-a0bf65ace3db';

UPDATE public.questions SET
  prompt_cs = 'PayPal vám prý posílá peníze.',
  options_cs = '[{"id":"a","label":"Přijmu — peníze jsou peníze","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — `paypa1` je číslo, ne pravý PayPal","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"PayPal","fromEmail":"service@paypa1-secure.com","subject":"Obdrželi jste 850 USD — potvrďte přijetí","body":"Pro přijetí platby se přihlaste a potvrďte transakci. Po 24h propadne.","cta":"Přijmout platbu"}'::jsonb
WHERE id = 'dc04128f-7d7f-5d11-8c7e-a0bf65ace3db';

-- ============================================================================
-- Q15: iCloud storage full — global brand, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'iCloud says your storage is full.',
  options_en = '[{"id":"a","label":"Upgrade — I don''t want to lose photos","correct":false,"severity":"critical"},{"id":"b","label":"Check in Settings > iCloud on the phone","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"iCloud","fromEmail":"support@icloud-storage-help.com","subject":"Your storage is full — photos will be deleted","body":"Upgrade your plan to keep your photos. Offer ends today.","cta":"Upgrade"}'::jsonb
WHERE id = '1e70576d-b484-57d5-9a6c-3fa2f8a4f7b2';

UPDATE public.questions SET
  prompt_cs = 'iCloud hlásí, že máte plné úložiště.',
  options_cs = '[{"id":"a","label":"Upgrade — nechci ztratit fotky","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji v Nastavení > iCloud na telefonu","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"iCloud","fromEmail":"support@icloud-storage-help.com","subject":"Vaše úložiště je plné — fotky budou smazány","body":"Aktualizujte plán pro zachování vašich fotografií. Akce končí dnes.","cta":"Upgrade"}'::jsonb
WHERE id = '1e70576d-b484-57d5-9a6c-3fa2f8a4f7b2';

-- ============================================================================
-- Q16: Which is the real Tatra banka? — swap to Barclays (EN) / Č. spořitelna (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real Barclays?',
  options_en = '[{"id":"a","label":"barclays.co.uk","correct":true,"severity":null},{"id":"b","label":"barclays-uk.co.uk","correct":false,"severity":"critical"},{"id":"c","label":"barclays.co.uk.secure-login.com","correct":false,"severity":"critical"},{"id":"d","label":"barclays.com.login.co","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = 'ee23fe54-923e-5f07-ab63-f6e18cd722c9';

UPDATE public.questions SET
  prompt_cs = 'Která je pravá Česká spořitelna?',
  options_cs = '[{"id":"a","label":"csas.cz","correct":true,"severity":null},{"id":"b","label":"ceska-sporitelna.cz","correct":false,"severity":"critical"},{"id":"c","label":"csas.cz.secure-login.cz","correct":false,"severity":"critical"},{"id":"d","label":"csas.cz.login.com","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'ee23fe54-923e-5f07-ab63-f6e18cd722c9';

-- ============================================================================
-- Q17: SLSP URL phishing → Lloyds (EN) / ČSOB (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You click on this URL. Do you sign in?',
  options_en = '[{"id":"a","label":"Yes","correct":false,"severity":"critical"},{"id":"b","label":"No — the real Lloyds is `lloydsbank.com`","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://lloyds-uk.online/auth/login"}'::jsonb
WHERE id = 'ca4a271f-5d44-50c2-9a3a-b65c4b6ebd03';

UPDATE public.questions SET
  prompt_cs = 'Kliknete na tuto URL. Přihlásíte se?',
  options_cs = '[{"id":"a","label":"Ano","correct":false,"severity":"critical"},{"id":"b","label":"Ne — pravý ČSOB je `csob.cz`","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://csob-cz.online/auth/login"}'::jsonb
WHERE id = 'ca4a271f-5d44-50c2-9a3a-b65c4b6ebd03';

-- ============================================================================
-- Q18: Google subdomain phishing — global brand, keep verbatim
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You''re on this address. Is it the real Google?',
  options_en = '[{"id":"a","label":"Yes — I see `google.com`","correct":false,"severity":"critical"},{"id":"b","label":"No — the actual domain is `signin-verify.app`","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://accounts.google.com.signin-verify.app"}'::jsonb
WHERE id = 'e847de09-5508-5d80-bdd0-45d212557449';

UPDATE public.questions SET
  prompt_cs = 'Jste na této adrese. Je to pravý Google?',
  options_cs = '[{"id":"a","label":"Ano — vidím `google.com`","correct":false,"severity":"critical"},{"id":"b","label":"Ne — skutečná doména je `signin-verify.app`","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://accounts.google.com.signin-verify.app"}'::jsonb
WHERE id = 'e847de09-5508-5d80-bdd0-45d212557449';

-- ============================================================================
-- Q19: Cyrillic homograph in Apple URL — universal
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Look carefully at the URL.',
  options_en = '[{"id":"a","label":"Real Apple","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — `а` is Cyrillic, not the Latin `a`","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.аpple.com/account"}'::jsonb
WHERE id = '2872ee01-06dd-5e9f-91e4-4fcb98882d75';

UPDATE public.questions SET
  prompt_cs = 'Podívejte se pozorně na URL.',
  options_cs = '[{"id":"a","label":"Pravý Apple","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — `а` je cyrilské, ne latinské `a`","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.аpple.com/account"}'::jsonb
WHERE id = '2872ee01-06dd-5e9f-91e4-4fcb98882d75';

-- ============================================================================
-- Q20: Real Slovenská pošta? → Royal Mail (EN) / Česká pošta (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real Royal Mail?',
  options_en = '[{"id":"a","label":"royalmail.com","correct":true,"severity":null},{"id":"b","label":"royalmail-online.co.uk","correct":false,"severity":"critical"},{"id":"c","label":"royalmail.com-parcels.com","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '2cf11779-9512-5f37-ae42-3c1eb344690d';

UPDATE public.questions SET
  prompt_cs = 'Která je pravá Česká pošta?',
  options_cs = '[{"id":"a","label":"ceskaposta.cz","correct":true,"severity":null},{"id":"b","label":"ceskaposta-online.cz","correct":false,"severity":"critical"},{"id":"c","label":"ceskaposta.cz-zasilky.com","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '2cf11779-9512-5f37-ae42-3c1eb344690d';

-- ============================================================================
-- Q21: Real ČSOB? → HSBC (EN) / Komerční banka (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real HSBC?',
  options_en = '[{"id":"a","label":"hsbc.co.uk","correct":true,"severity":null},{"id":"b","label":"hsbc-banking.co.uk","correct":false,"severity":"critical"},{"id":"c","label":"hsbc.secure.co.uk","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '4521257a-6444-54d4-8c11-0bc1698a099d';

UPDATE public.questions SET
  prompt_cs = 'Která je pravá Komerční banka?',
  options_cs = '[{"id":"a","label":"kb.cz","correct":true,"severity":null},{"id":"b","label":"kb-banking.cz","correct":false,"severity":"critical"},{"id":"c","label":"kb.secure.cz","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '4521257a-6444-54d4-8c11-0bc1698a099d';

-- ============================================================================
-- Q22: bit.ly shortened link — universal, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A shortened link arrived by SMS. Do you click?',
  options_en = '[{"id":"a","label":"Yes — bit.ly is reputable","correct":false,"severity":"medium"},{"id":"b","label":"No — I can''t see where it actually leads","correct":true,"severity":null},{"id":"c","label":"Yes, but only on mobile","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://bit.ly/3xQ7pK2"}'::jsonb
WHERE id = '39e73a9f-0f42-57f9-8666-0853565dfdfc';

UPDATE public.questions SET
  prompt_cs = 'V SMS přišel zkrácený odkaz. Kliknete?',
  options_cs = '[{"id":"a","label":"Ano — bit.ly je seriózní","correct":false,"severity":"medium"},{"id":"b","label":"Ne — nevím, kam ve skutečnosti vede","correct":true,"severity":null},{"id":"c","label":"Ano, ale jen přes mobil","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://bit.ly/3xQ7pK2"}'::jsonb
WHERE id = '39e73a9f-0f42-57f9-8666-0853565dfdfc';

-- ============================================================================
-- Q23: Real Allegro? → eBay (EN) / Alza (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real eBay?',
  options_en = '[{"id":"a","label":"ebay.co.uk","correct":true,"severity":null},{"id":"b","label":"ebay.uk","correct":false,"severity":"critical"},{"id":"c","label":"ebay-shop.co.uk","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '47c547ac-85ba-5b39-a9ce-b8706aec7fa6';

UPDATE public.questions SET
  prompt_cs = 'Která je pravá Alza?',
  options_cs = '[{"id":"a","label":"alza.cz","correct":true,"severity":null},{"id":"b","label":"alzza.cz","correct":false,"severity":"critical"},{"id":"c","label":"alza-shop.cz","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '47c547ac-85ba-5b39-a9ce-b8706aec7fa6';

-- ============================================================================
-- Q24: Orange invoice URL → EE (EN) / Vodafone (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You clicked the SMS link. Do you sign in?',
  options_en = '[{"id":"a","label":"Yes — I see ee.co.uk","correct":false,"severity":"critical"},{"id":"b","label":"No — the real domain is `invoice-pay.com`","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://ee.co.uk.invoice-pay.com"}'::jsonb
WHERE id = '091b5809-1fd4-5234-b0f3-94eb839a283d';

UPDATE public.questions SET
  prompt_cs = 'Kliknuli jste v SMS. Přihlásíte se?',
  options_cs = '[{"id":"a","label":"Ano — vidím vodafone.cz","correct":false,"severity":"critical"},{"id":"b","label":"Ne — skutečná doména je `faktura-zaplatit.com`","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://vodafone.cz.faktura-zaplatit.com"}'::jsonb
WHERE id = '091b5809-1fd4-5234-b0f3-94eb839a283d';

-- ============================================================================
-- Q25: HTTPS padlock — universal, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A site shows a green padlock 🔒. Is it therefore safe?',
  options_en = '[{"id":"a","label":"Yes — HTTPS = safe","correct":false,"severity":"medium"},{"id":"b","label":"No — HTTPS means encrypted, not non-phishing","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '891a3790-41ed-52ae-9551-d717b62b2bf4';

UPDATE public.questions SET
  prompt_cs = 'Stránka má zelený zámeček 🔒. Je tedy bezpečná?',
  options_cs = '[{"id":"a","label":"Ano — HTTPS = bezpečné","correct":false,"severity":"medium"},{"id":"b","label":"Ne — HTTPS znamená šifrované, ne že to není phishing","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '891a3790-41ed-52ae-9551-d717b62b2bf4';

-- ============================================================================
-- Q26: Real Booking.com? — global, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real Booking.com?',
  options_en = '[{"id":"a","label":"booking.com","correct":true,"severity":null},{"id":"b","label":"booking.com.reservation-confirm.net","correct":false,"severity":"critical"},{"id":"c","label":"secure-booking.com","correct":false,"severity":"critical"},{"id":"d","label":"booking-com.support","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = 'cb1f6559-8c6a-528d-b724-6f74bb87d50b';

UPDATE public.questions SET
  prompt_cs = 'Která je pravá Booking.com?',
  options_cs = '[{"id":"a","label":"booking.com","correct":true,"severity":null},{"id":"b","label":"booking.com.reservation-confirm.net","correct":false,"severity":"critical"},{"id":"c","label":"secure-booking.com","correct":false,"severity":"critical"},{"id":"d","label":"booking-com.support","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'cb1f6559-8c6a-528d-b724-6f74bb87d50b';

-- ============================================================================
-- Q27: Real Facebook login? — global, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real Facebook login?',
  options_en = '[{"id":"a","label":"facebook.com","correct":true,"severity":null},{"id":"b","label":"facebook-login.com","correct":false,"severity":"critical"},{"id":"c","label":"fb-secure.com","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = 'cbcf9c6b-861b-5f3a-9b25-08b058ddb95d';

UPDATE public.questions SET
  prompt_cs = 'Který je pravý Facebook login?',
  options_cs = '[{"id":"a","label":"facebook.com","correct":true,"severity":null},{"id":"b","label":"facebook-login.com","correct":false,"severity":"critical"},{"id":"c","label":"fb-secure.com","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'cbcf9c6b-861b-5f3a-9b25-08b058ddb95d';

-- ============================================================================
-- Q28: Bazoš iPhone listing → Gumtree (EN) / Bazoš.cz (CS), city swap
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A listing on Gumtree — would you buy?',
  options_en = '[{"id":"a","label":"Buy — great price","correct":false,"severity":"critical"},{"id":"b","label":"Scam — price too low + payment upfront","correct":true,"severity":null},{"id":"c","label":"Ask for more photos and then buy","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"listing","site":"Gumtree","title":"iPhone 15 Pro Max 256GB","price":"£249","location":"Manchester","description":"Brand new, unopened box. Selling because it was an unwanted gift. Posting after payment to bank account upfront.","imageEmoji":"📱"}'::jsonb
WHERE id = '76abca68-1a07-527b-ada2-835ee8b28e5e';

UPDATE public.questions SET
  prompt_cs = 'Inzerát na Bazoši — koupíte?',
  options_cs = '[{"id":"a","label":"Koupím — výhodná cena","correct":false,"severity":"critical"},{"id":"b","label":"Scam — cena příliš nízká + platba předem","correct":true,"severity":null},{"id":"c","label":"Vyžádám si víc fotek a koupím","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"listing","site":"Bazos.cz","title":"iPhone 15 Pro Max 256GB","price":"7 800 Kč","location":"Brno","description":"Úplně nový, neotevřená krabice. Prodávám kvůli dárku, který se nehodil. Posílám poštou po platbě předem na účet.","imageEmoji":"📱"}'::jsonb
WHERE id = '76abca68-1a07-527b-ada2-835ee8b28e5e';

-- ============================================================================
-- Q29: BMW from Netherlands + Western Union — substitute "import location" naturally
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A car listing. Will you go and inspect it?',
  options_en = '[{"id":"a","label":"Send the deposit — car is great","correct":false,"severity":"critical"},{"id":"b","label":"Scam — Western Union + car abroad = classic","correct":true,"severity":null},{"id":"c","label":"Ask for the VIN first","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"listing","site":"AutoTrader","title":"BMW 320d 2019, 45,000 mi","price":"£4,200","location":"Netherlands (will deliver to UK)","description":"Car is currently in the Netherlands. I''ll send photos and we can arrange transport. £500 deposit via Western Union to reserve.","imageEmoji":"🚗"}'::jsonb
WHERE id = '98eabcb5-cfbb-5f99-b4c6-473e98c5ad7d';

UPDATE public.questions SET
  prompt_cs = 'Inzerát na auto. Pojedete se podívat?',
  options_cs = '[{"id":"a","label":"Pošlu zálohu — auto je super","correct":false,"severity":"critical"},{"id":"b","label":"Scam — Western Union + auto v zahraničí = klasika","correct":true,"severity":null},{"id":"c","label":"Nejdřív si vyžádám VIN","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"listing","site":"Sauto","title":"BMW 320d 2019, 45000 km","price":"125 000 Kč","location":"Nizozemsko (přivezu do ČR)","description":"Auto je momentálně v Nizozemsku. Pošlu fotky, můžeme domluvit dovoz. Záloha 13 000 Kč přes Western Union pro rezervaci.","imageEmoji":"🚗"}'::jsonb
WHERE id = '98eabcb5-cfbb-5f99-b4c6-473e98c5ad7d';

-- ============================================================================
-- Q30: Fake eshop with -80% Nike — universal, convert currency
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An eshop with -80% sales on brands (Nike, Gucci). Air Jordans for £35. Real?',
  options_en = '[{"id":"a","label":"Yes — maybe a clearance","correct":false,"severity":"critical"},{"id":"b","label":"Fake shop — either nothing arrives, or a Chinese knock-off does","correct":true,"severity":null},{"id":"c","label":"Maybe grey import, I''ll buy","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = NULL
WHERE id = 'a37dca13-9544-55a7-ae60-732ebb588ec3';

UPDATE public.questions SET
  prompt_cs = 'Eshop s -80% akcemi na značky (Nike, Gucci). Air Jordan za 900 Kč. Reálné?',
  options_cs = '[{"id":"a","label":"Ano — možná výprodej","correct":false,"severity":"critical"},{"id":"b","label":"Fake eshop — buď ti nepřijde nic, nebo čínská kopie","correct":true,"severity":null},{"id":"c","label":"Možná šedý dovoz, koupím","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'a37dca13-9544-55a7-ae60-732ebb588ec3';

-- ============================================================================
-- Q31: Deepfake celebrity weight-loss ad — adapt the celeb reference generically
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An Instagram ad uses a well-known UK TV presenter''s face. Buy the capsules?',
  options_en = '[{"id":"a","label":"Buy — she''s endorsing it","correct":false,"severity":"critical"},{"id":"b","label":"Scam — the face is stolen, capsules are placebo or harmful","correct":true,"severity":null},{"id":"c","label":"Check her profile first","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"instagram","account":"health_premium_uk","verified":false,"body":"\"I lost 2 stone in 21 days! Doctors want to sue me. Limited offer -70% today only.\"","imageEmoji":"💊","cta":"Find out more"}'::jsonb
WHERE id = 'db2cddf9-20da-5ff8-923b-b4f56218d8c4';

UPDATE public.questions SET
  prompt_cs = 'Reklama na IG s tváří známé české moderátorky. Koupíte kapsle?',
  options_cs = '[{"id":"a","label":"Koupím — doporučuje to ona","correct":false,"severity":"critical"},{"id":"b","label":"Scam — tvář je ukradená, kapsle jsou placebo/škodlivé","correct":true,"severity":null},{"id":"c","label":"Zkontroluji na jejím profilu","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"instagram","account":"zdravi_premium_cz","verified":false,"body":"„Zhubla jsem 14 kg za 21 dní! Lékaři mě chtějí zažalovat. Limitovaná akce -70% jen dnes.\"","imageEmoji":"💊","cta":"Zjistit více"}'::jsonb
WHERE id = 'db2cddf9-20da-5ff8-923b-b4f56218d8c4';

-- ============================================================================
-- Q32: Elon Musk Bitcoin giveaway — universal, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An Elon Musk live stream is giving away Bitcoin. Send 0.1 BTC, get 0.2 BTC back. Real?',
  options_en = '[{"id":"a","label":"I''ll try with a small amount","correct":false,"severity":"critical"},{"id":"b","label":"Scam — it''s a deepfake / old footage","correct":true,"severity":null},{"id":"c","label":"Yes if it''s the official live","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = 'b6307537-86ab-5e38-88e4-3f017e258423';

UPDATE public.questions SET
  prompt_cs = 'Elon Musk živě rozdává Bitcoin. Pošlete 0,1 BTC, dostanete zpět 0,2 BTC. Reálné?',
  options_cs = '[{"id":"a","label":"Zkusím s malou částkou","correct":false,"severity":"critical"},{"id":"b","label":"Scam — jde o deepfake / staré video","correct":true,"severity":null},{"id":"c","label":"Ano, pokud jde o oficiální live","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'b6307537-86ab-5e38-88e4-3f017e258423';

-- ============================================================================
-- Q33: Romance scam (doctor in Syria, 800€ for plane ticket) — currency only
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You''ve chatted for a month with a beautiful doctor in Syria. She asks for £700 for a plane ticket; she''ll pay it back. Send?',
  options_en = '[{"id":"a","label":"Yes — I love her","correct":false,"severity":"critical"},{"id":"b","label":"Romance scam — you''ll never meet her","correct":true,"severity":null},{"id":"c","label":"I''ll send £200 as a test","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '25029db2-2517-5c41-9083-52b4b2507e21';

UPDATE public.questions SET
  prompt_cs = 'Měsíc chatujete s krásnou doktorkou v Sýrii. Prosí o 20 000 Kč na letenku, vrátí to. Pošlete?',
  options_cs = '[{"id":"a","label":"Ano — miluji ji","correct":false,"severity":"critical"},{"id":"b","label":"Romance scam — nikdy ji nepotkáte","correct":true,"severity":null},{"id":"c","label":"Pošlu 5 000 Kč jako test","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '25029db2-2517-5c41-9083-52b4b2507e21';

-- ============================================================================
-- Q34: FB group concert tickets resale → swap official resale brands
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'In a Facebook group, someone is selling concert tickets below face value. Pay via Revolut?',
  options_en = '[{"id":"a","label":"Yes — a discount is a discount","correct":false,"severity":"critical"},{"id":"b","label":"No — I only buy via official resale (Twickets / Ticketmaster)","correct":true,"severity":null},{"id":"c","label":"Pay half upfront, half on delivery","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = NULL
WHERE id = 'cb600a25-4441-5a3c-a347-51c337890806';

UPDATE public.questions SET
  prompt_cs = 'Ve FB skupině někdo prodává lístky na koncert pod cenou. Pošlete peníze přes Revolut?',
  options_cs = '[{"id":"a","label":"Ano — sleva je sleva","correct":false,"severity":"critical"},{"id":"b","label":"Ne — kupuji jen přes oficiální resale (Ticketportal/Ticketmaster)","correct":true,"severity":null},{"id":"c","label":"Pošlu polovinu, druhou po doručení","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'cb600a25-4441-5a3c-a347-51c337890806';

-- ============================================================================
-- Q35: "Investment 250€ → 18,000€" AI trading scam — currency conversion
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An ad: "Invest £200 → £15,000 in 3 months via AI trading. Guaranteed." Try it?',
  options_en = '[{"id":"a","label":"I''ll try with £200","correct":false,"severity":"critical"},{"id":"b","label":"Scam — no investment is guaranteed","correct":true,"severity":null},{"id":"c","label":"I''ll try, but only via Revolut","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '2d5a2aa8-4ea5-5b54-bf0e-0f68d6efe160';

UPDATE public.questions SET
  prompt_cs = 'Reklama: „Investice 6 500 Kč → 470 000 Kč za 3 měsíce přes AI obchodování. Garantujeme." Zkusíte?',
  options_cs = '[{"id":"a","label":"Zkusím s 6 500 Kč","correct":false,"severity":"critical"},{"id":"b","label":"Scam — žádná garantovaná investice neexistuje","correct":true,"severity":null},{"id":"c","label":"Zkusím, ale jen přes Revolut","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '2d5a2aa8-4ea5-5b54-bf0e-0f68d6efe160';

-- ============================================================================
-- Q36: FB Marketplace fake "delivery link" — universal
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'On Facebook Marketplace a seller sends a "delivery link" to verify your address. Click?',
  options_en = '[{"id":"a","label":"Click — I want the item","correct":false,"severity":"critical"},{"id":"b","label":"No — Marketplace has no such feature","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '94a84bcd-673d-5404-ada0-478e9e2c88ab';

UPDATE public.questions SET
  prompt_cs = 'Na FB Marketplace vám prodejce pošle „doručovací odkaz" k ověření adresy. Kliknete?',
  options_cs = '[{"id":"a","label":"Kliknu — chci produkt","correct":false,"severity":"critical"},{"id":"b","label":"Ne — Marketplace takovou funkci nemá","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '94a84bcd-673d-5404-ada0-478e9e2c88ab';

-- ============================================================================
-- Q37: Fake-review eshop — universal
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An eshop has 4.9★ from 2000 reviews, but all are from the last 3 weeks and generic ("Great product!"). Buy?',
  options_en = '[{"id":"a","label":"Yes — the reviews look good","correct":false,"severity":"medium"},{"id":"b","label":"No — fake reviews, paid for","correct":true,"severity":null},{"id":"c","label":"Buy on cash on delivery","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = NULL
WHERE id = '811a44e6-111a-5c1e-996b-5aaeee3cf817';

UPDATE public.questions SET
  prompt_cs = 'Eshop má 4,9★ z 2000 recenzí, ale všechny jsou z posledních 3 týdnů a generické („Super produkt!"). Koupíte?',
  options_cs = '[{"id":"a","label":"Ano — recenze jsou dobré","correct":false,"severity":"medium"},{"id":"b","label":"Ne — fake recenze nakoupené","correct":true,"severity":null},{"id":"c","label":"Koupím na dobírku","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = NULL
WHERE id = '811a44e6-111a-5c1e-996b-5aaeee3cf817';

-- ============================================================================
-- Q38: Phone call "from bank" asking for SMS code — TB → Barclays / Č. sporitelna
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Someone from the bank calls you about a suspicious transaction and asks for the SMS code.',
  options_en = '[{"id":"a","label":"Read out the code — the bank is calling","correct":false,"severity":"critical"},{"id":"b","label":"Hang up and call back the number on my card","correct":true,"severity":null},{"id":"c","label":"Ask verification questions","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"call","caller":"Barclays — Security","number":"+44 345 734 5345","hint":"Shows as verified in contacts"}'::jsonb
WHERE id = 'c493ec4a-9b2f-524b-83c9-d807a8d223a4';

UPDATE public.questions SET
  prompt_cs = 'Volá vám někdo z banky o podezřelé transakci a žádá kód z SMS.',
  options_cs = '[{"id":"a","label":"Nadiktuji kód — banka volá","correct":false,"severity":"critical"},{"id":"b","label":"Zavěsím a zavolám sám na číslo z karty","correct":true,"severity":null},{"id":"c","label":"Položím ověřovací otázky","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"Česká spořitelna — Bezpečnost","number":"+420 956 777 956","hint":"Zobrazeno jako ověřené v kontaktech"}'::jsonb
WHERE id = 'c493ec4a-9b2f-524b-83c9-d807a8d223a4';

-- ============================================================================
-- Q39: Parking-meter QR code sticker — universal
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A parking meter has a sticker with a QR code "Pay quickly via QR". Your app isn''t working. Do you scan it?',
  options_en = '[{"id":"a","label":"Yes — I''ll scan and pay","correct":false,"severity":"critical"},{"id":"b","label":"No — I''ll pay via SMS to the number on the meter","correct":true,"severity":null},{"id":"c","label":"Scan, then check the URL","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = NULL
WHERE id = '4023b60e-aaa7-511d-aaf2-fcb418430dbb';

UPDATE public.questions SET
  prompt_cs = 'Na parkovacím automatu visí nálepka s QR kódem „Zaplatit rychle přes QR". Vaše aplikace nefunguje. Naskenujete?',
  options_cs = '[{"id":"a","label":"Ano — naskenuji a zaplatím","correct":false,"severity":"critical"},{"id":"b","label":"Ne — zaplatím přes SMS na číslo automatu","correct":true,"severity":null},{"id":"c","label":"Naskenuji, zkontroluji URL","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = NULL
WHERE id = '4023b60e-aaa7-511d-aaf2-fcb418430dbb';

-- ============================================================================
-- Q40: "Microsoft tech support" scam call with Indian accent — universal
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Someone with an Indian accent calls: "I''m from Microsoft, your computer is infected."',
  options_en = '[{"id":"a","label":"Cooperate, give them remote access","correct":false,"severity":"critical"},{"id":"b","label":"Hang up and block the number","correct":true,"severity":null},{"id":"c","label":"Ask for details","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = NULL
WHERE id = '6ed4c2ef-ebac-5600-b221-0352e6bd3f09';

UPDATE public.questions SET
  prompt_cs = 'Volá někdo s indickým přízvukem: „Jsem z Microsoftu, váš počítač je infikovaný."',
  options_cs = '[{"id":"a","label":"Spolupracuji, dám mu vzdálený přístup","correct":false,"severity":"critical"},{"id":"b","label":"Zavěsím a zablokuji číslo","correct":true,"severity":null},{"id":"c","label":"Ptám se na detaily","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = NULL
WHERE id = '6ed4c2ef-ebac-5600-b221-0352e6bd3f09';
