-- AH-15.8 batch 3: cultural localization of scam scenarios 81-120
-- Idempotent — safe to re-run.
-- AH-15.7 schema required.

-- ============================================================================
-- Q81: Real Alza? → eBay (EN) / Alza (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real eBay?',
  options_en = '[{"id":"a","label":"ebay.co.uk","correct":true,"severity":null},{"id":"b","label":"ebay-shop.co.uk","correct":false,"severity":"critical"},{"id":"c","label":"ebay.co.uk.deal-zone.com","correct":false,"severity":"critical"},{"id":"d","label":"eb4y.co.uk","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '8d0caaa0-2f0f-5284-b21f-b05d66e5491a';

UPDATE public.questions SET
  prompt_cs = 'Která je pravá Alza?',
  options_cs = '[{"id":"a","label":"alza.cz","correct":true,"severity":null},{"id":"b","label":"alza-eshop.cz","correct":false,"severity":"critical"},{"id":"c","label":"alza.cz.deal-zone.com","correct":false,"severity":"critical"},{"id":"d","label":"a1za.cz","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '8d0caaa0-2f0f-5284-b21f-b05d66e5491a';

-- ============================================================================
-- Q82: LinkedIn fake job offers — global, keep brand
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'LinkedIn notifies you about new connections.',
  options_en = '[{"id":"a","label":"Click — a job is tempting","correct":false,"severity":"critical"},{"id":"b","label":"Open linkedin.com manually","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"LinkedIn","fromEmail":"no-reply@linkedin-jobs.career","subject":"You have 3 new job offers — click here","body":"Headhunters are searching for you. Activate your profile to see the offers.","cta":"View offers"}'::jsonb
WHERE id = 'ef80e646-2411-5a23-98ab-166acd611195';

UPDATE public.questions SET
  prompt_cs = 'LinkedIn hlásí nová propojení.',
  options_cs = '[{"id":"a","label":"Kliknu — práce láká","correct":false,"severity":"critical"},{"id":"b","label":"Otevřu linkedin.com ručně","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"LinkedIn","fromEmail":"no-reply@linkedin-jobs.career","subject":"Máte 3 nové pracovní nabídky — klikněte","body":"Headhunteři vás hledají. Aktivujte profil pro zobrazení nabídek.","cta":"Zobrazit nabídky"}'::jsonb
WHERE id = 'ef80e646-2411-5a23-98ab-166acd611195';

-- ============================================================================
-- Q83: Fake Chrome update popup — universal
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'While browsing, a popup appears: "Your Chrome is out of date. Download update.exe."',
  options_en = '[{"id":"a","label":"Download the update","correct":false,"severity":"critical"},{"id":"b","label":"I update Chrome via its menu (Help → About Chrome)","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '80d0323b-69bd-5518-bf6d-8a37bd17798d';

UPDATE public.questions SET
  prompt_cs = 'Při surfování vyskočí: „Váš Chrome je zastaralý. Stáhněte update.exe."',
  options_cs = '[{"id":"a","label":"Stáhnu update","correct":false,"severity":"critical"},{"id":"b","label":"Updaty dělám přes Chrome menu (Nápověda → O Chrome)","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '80d0323b-69bd-5518-bf6d-8a37bd17798d';

-- ============================================================================
-- Q84: Fake Rolex for £199/5 000 Kč — universal scam
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An eshop sells Rolexes for £199. "Original, Swiss, last piece."',
  options_en = '[{"id":"a","label":"Buy — a bargain","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — a Rolex for £199 is sci-fi","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '16996d4a-6bc7-58a4-a289-28c39c161881';

UPDATE public.questions SET
  prompt_cs = 'Eshop prodává Rolexy za 5 000 Kč. „Originál, švýcarský, poslední kus."',
  options_cs = '[{"id":"a","label":"Koupím — výhodné","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — Rolex za 5 000 Kč je sci-fi","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '16996d4a-6bc7-58a4-a289-28c39c161881';

-- ============================================================================
-- Q85: URL phishing — SLSP → Lloyds (EN) / ČSOB (CS), deceptive subdomain
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You land on this address after clicking a link in an email.',
  options_en = '[{"id":"a","label":"Real Lloyds — I see lloydsbank.com","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — the real domain is `user-portal.io`","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://login.lloydsbank.com.user-portal.io"}'::jsonb
WHERE id = '7d98e002-a223-5fac-af69-88e89f037718';

UPDATE public.questions SET
  prompt_cs = 'Po kliknutí v emailu jste na této adrese.',
  options_cs = '[{"id":"a","label":"Pravý ČSOB — vidím csob.cz","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — skutečná doména je `user-portal.io`","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://login.csob.cz.user-portal.io"}'::jsonb
WHERE id = '7d98e002-a223-5fac-af69-88e89f037718';

-- ============================================================================
-- Q86: Google password reset — universal, honeypot
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email arrives: "Someone requested a password reset on your Google account. If it wasn''t you, ignore this." You weren''t the one. Action?',
  options_en = '[{"id":"a","label":"Click the \"it wasn''t me\" link","correct":false,"severity":"medium"},{"id":"b","label":"Ignore — a real Google warning works even when ignored","correct":true,"severity":null},{"id":"c","label":"Reset the password to be safe via the link in the email","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = 'e3b9c8e4-061b-58dc-828f-77722f6743b4';

UPDATE public.questions SET
  prompt_cs = 'Přijde email: „Někdo zažádal o reset hesla na vašem Google. Pokud jste to nebyli vy, ignorujte." Vy jste to nebyli. Akce?',
  options_cs = '[{"id":"a","label":"Kliknu na \"to jsem nebyl já\" link","correct":false,"severity":"medium"},{"id":"b","label":"Ignoruji — varování od pravého Google funguje i když ignoruji","correct":true,"severity":null},{"id":"c","label":"Resetuji heslo pro jistotu přes link v emailu","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'e3b9c8e4-061b-58dc-828f-77722f6743b4';

-- ============================================================================
-- Q87: Suspicious eshop with company ID — adapt heureka + ORSR
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An eshop looks professional: UK address, company number, contact. Reviews 5★, but not on Trustpilot. Social media empty. Do you buy?',
  options_en = '[{"id":"a","label":"Yes — it has a company number","correct":false,"severity":"medium"},{"id":"b","label":"Check the domain registration (whois) + the company on Companies House","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '5f06e6e2-7574-504e-b228-d25d454ae853';

UPDATE public.questions SET
  prompt_cs = 'Eshop vypadá profesionálně: CZ, IČO, kontakt. Recenze 5★, ale na Heureka.cz není. Sociální sítě prázdné. Koupíte?',
  options_cs = '[{"id":"a","label":"Ano — má IČO","correct":false,"severity":"medium"},{"id":"b","label":"Zkontroluji registraci domény (whois) + firmu v obchodním rejstříku","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '5f06e6e2-7574-504e-b228-d25d454ae853';

-- ============================================================================
-- Q88: Overpayment scam (laptop sale) — currency conversion
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You''re selling a laptop for £500. The buyer sends £700 and asks you to refund £200 because it was „a mistake". Refund?',
  options_en = '[{"id":"a","label":"Refund — only polite","correct":false,"severity":"critical"},{"id":"b","label":"Wait 2 weeks to see if the original transfer doesn''t reverse","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'e1b3045c-2fd5-5b3f-80fa-6f8456ac826a';

UPDATE public.questions SET
  prompt_cs = 'Prodáváte notebook za 13 000 Kč. Kupec pošle 18 000 Kč a žádá vrátit 5 000 Kč zpět, protože „omylem". Vrátíte?',
  options_cs = '[{"id":"a","label":"Vrátím — slušné","correct":false,"severity":"critical"},{"id":"b","label":"Počkám 2 týdny, jestli se původní převod nestornuje","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'e1b3045c-2fd5-5b3f-80fa-6f8456ac826a';

-- ============================================================================
-- Q89: FedEx customs SMS — global brand, currency conversion
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'FedEx customs SMS.',
  options_en = '[{"id":"a","label":"Pay — only £4","correct":false,"severity":"critical"},{"id":"b","label":"Check via fedex.com with the tracking number","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"FedEx","body":"Your shipment is awaiting customs payment of £3.99:","link":"https://fedex-customs.click/pay"}'::jsonb
WHERE id = '558a78c5-f89d-5950-8681-e200ea08f0b3';

UPDATE public.questions SET
  prompt_cs = 'FedEx SMS o clu.',
  options_cs = '[{"id":"a","label":"Zaplatím — jen 100 Kč","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji přes fedex.com s tracking číslem","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"FedEx","body":"Vaše zásilka čeká na zaplacení cla 99 Kč:","link":"https://fedex-customs.click/pay"}'::jsonb
WHERE id = '558a78c5-f89d-5950-8681-e200ea08f0b3';

-- ============================================================================
-- Q90: TLD safety — adapt local TLD
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A domain with which TLD is safest?',
  options_en = '[{"id":"a","label":".click","correct":false,"severity":"medium"},{"id":"b","label":".zip","correct":false,"severity":"medium"},{"id":"c","label":".co.uk from a verified brand","correct":true,"severity":null},{"id":"d","label":".online","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = NULL
WHERE id = '02655814-5b40-5d45-b1d1-1484598d5439';

UPDATE public.questions SET
  prompt_cs = 'Doména s jakou TLD je nejbezpečnější?',
  options_cs = '[{"id":"a","label":".click","correct":false,"severity":"medium"},{"id":"b","label":".zip","correct":false,"severity":"medium"},{"id":"c","label":".cz od ověřené značky","correct":true,"severity":null},{"id":"d","label":".online","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = NULL
WHERE id = '02655814-5b40-5d45-b1d1-1484598d5439';

-- ============================================================================
-- Q91: Crypto pyramid scheme — currency conversion
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A friend on FB recommends a platform „CryptoYieldPro" with 5% daily yield. Try with £200?',
  options_en = '[{"id":"a","label":"Try — a friend recommends it","correct":false,"severity":"critical"},{"id":"b","label":"No — your friend is probably the next victim (pyramid)","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'f938eec3-d425-5e9c-a285-6552cea0248c';

UPDATE public.questions SET
  prompt_cs = 'Známý z FB doporučuje platformu „CryptoYieldPro" s 5% denním ziskem. Zkusíte s 5 000 Kč?',
  options_cs = '[{"id":"a","label":"Zkusím — známý doporučuje","correct":false,"severity":"critical"},{"id":"b","label":"Ne — známý je pravděpodobně další oběť (pyramida)","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'f938eec3-d425-5e9c-a285-6552cea0248c';

-- ============================================================================
-- Q92: ČSOB security email → HSBC (EN) / Komerční banka (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A security email from your bank.',
  options_en = '[{"id":"a","label":"Click the link in the email","correct":false,"severity":"medium"},{"id":"b","label":"Open the HSBC app manually","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"HSBC Security","fromEmail":"no-reply@hsbc.co.uk","subject":"Security alert","body":"For security please change your password. If this wasn''t you, sign in to HSBC Mobile Banking and change the password."}'::jsonb
WHERE id = 'e7a99388-440e-5f89-8e5f-caba827b75f7';

UPDATE public.questions SET
  prompt_cs = 'Bezpečnostní email od banky.',
  options_cs = '[{"id":"a","label":"Kliknu v emailu na link","correct":false,"severity":"medium"},{"id":"b","label":"Otevřu Komerční banku ručně","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"KB Bezpečnost","fromEmail":"no-reply@kb.cz","subject":"Bezpečnostní upozornění","body":"Pro bezpečnost změňte heslo. Pokud jste to nebyli vy, přihlaste se do KB+ a změňte heslo."}'::jsonb
WHERE id = 'e7a99388-440e-5f89-8e5f-caba827b75f7';

-- ============================================================================
-- Q93: Parking fine letter — IBAN, currency, location
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'In your post you find a letter: „Parking fine payment £56, IBAN GB…, reference 2024-X." The letter looks official.',
  options_en = '[{"id":"a","label":"Pay — I want it out of the way","correct":false,"severity":"critical"},{"id":"b","label":"Check on the council / parking operator''s website","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '4dbbb1a3-00ca-57d1-ad4e-69f1adaa77eb';

UPDATE public.questions SET
  prompt_cs = 'V schránce máte dopis „Zaplacení pokuty za parkování 700 Kč, IBAN CZ…, variabilní 2024-X.". Dopis vypadá oficiálně.',
  options_cs = '[{"id":"a","label":"Zaplatím — chci to mít z krku","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji na stránce městské policie / parkovací společnosti","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '4dbbb1a3-00ca-57d1-ad4e-69f1adaa77eb';

-- ============================================================================
-- Q94: Real government portal — adapt to gov.uk / gov.cz
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Government site — which is real?',
  options_en = '[{"id":"a","label":"gov.uk","correct":true,"severity":null},{"id":"b","label":"gov-uk-portal.co.uk","correct":false,"severity":"critical"},{"id":"c","label":"gov.uk.online","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '5c7c47f3-bebe-5921-81ad-45e20f973865';

UPDATE public.questions SET
  prompt_cs = 'Státní stránka — pravá?',
  options_cs = '[{"id":"a","label":"gov.cz","correct":true,"severity":null},{"id":"b","label":"gov-cz-portal.cz","correct":false,"severity":"critical"},{"id":"c","label":"gov.cz.online","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '5c7c47f3-bebe-5921-81ad-45e20f973865';

-- ============================================================================
-- Q95: Crypto wallet drainer „CLAIM 5000$" — global pattern
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'In your crypto wallet you suddenly have a token „CLAIM $5,000". Click claim?',
  options_en = '[{"id":"a","label":"Click — free money","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — the claim function drains the whole wallet","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'e1b4b2c1-7f4d-54f7-8c28-ca5a8901d57a';

UPDATE public.questions SET
  prompt_cs = 'V crypto peněžence máte najednou token „CLAIM 5000$". Kliknete na claim?',
  options_cs = '[{"id":"a","label":"Kliknu — peníze zdarma","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — claim funkce vykrade celou peněženku","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'e1b4b2c1-7f4d-54f7-8c28-ca5a8901d57a';

-- ============================================================================
-- Q96: Police SMS — adapt police body
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'SMS from the police.',
  options_en = '[{"id":"a","label":"Click — I want to know","correct":false,"severity":"critical"},{"id":"b","label":"Police don''t send SMS — I ignore","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"UK POLICE","body":"A complaint has been filed against you. For details click:","link":"https://police-uk.info/case"}'::jsonb
WHERE id = '60638f52-27c8-58a6-ae7b-96668def55b2';

UPDATE public.questions SET
  prompt_cs = 'SMS od policie.',
  options_cs = '[{"id":"a","label":"Kliknu — chci vědět","correct":false,"severity":"critical"},{"id":"b","label":"Policie neposílá SMS — ignoruji","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"POLICIE CR","body":"Byla na vás podána stížnost. Pro detaily klikněte:","link":"https://policie-cr.info/spis"}'::jsonb
WHERE id = '60638f52-27c8-58a6-ae7b-96668def55b2';

-- ============================================================================
-- Q97: Influencer DM giveaway — generalize celebrity reference
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A well-known influencer DMs you: „You won my giveaway! Send your address via this link."',
  options_en = '[{"id":"a","label":"Send — a win is a win","correct":false,"severity":"critical"},{"id":"b","label":"Check the profile (verified ✓?) and contact via official channels","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'f6adaae5-c05a-5204-ae1a-8fdd201a228f';

UPDATE public.questions SET
  prompt_cs = 'Známý český influencer vám píše DM: „Vyhrála jste v mé soutěži! Pošlete adresu přes tento link."',
  options_cs = '[{"id":"a","label":"Pošlu — výhra je výhra","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji profil (verified ✓?) a kontaktuji přes oficiální kanály","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'f6adaae5-c05a-5204-ae1a-8fdd201a228f';

-- ============================================================================
-- Q98: Advance fee loan scam — currency conversion
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Ad: „Loan £5,000 with no credit check, approved for all. Just send a £49 fee."',
  options_en = '[{"id":"a","label":"Send £49 — I need the money","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — no legitimate loan asks for an upfront fee","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'f67b9dba-7a9a-58a7-8e7b-61abd26782cb';

UPDATE public.questions SET
  prompt_cs = 'Reklama: „Půjčka 130 000 Kč bez registru a banky, schválíme všem. Stačí poslat poplatek 1 200 Kč."',
  options_cs = '[{"id":"a","label":"Pošlu 1 200 Kč — potřebuji peníze","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — žádná seriózní půjčka nemá poplatek předem","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'f67b9dba-7a9a-58a7-8e7b-61abd26782cb';

-- ============================================================================
-- Q99: myshopify.com URL — global pattern
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An eshop URL is `myshop123.myshopify.com`. Is it trustworthy?',
  options_en = '[{"id":"a","label":"Yes — Shopify is a brand","correct":false,"severity":"medium"},{"id":"b","label":"Shopify hosts anyone — verify the seller separately","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '5dfc48cb-217a-5d07-b725-79f6d56beabf';

UPDATE public.questions SET
  prompt_cs = 'URL eshopu je `myshop123.myshopify.com`. Je důvěryhodné?',
  options_cs = '[{"id":"a","label":"Ano — Shopify je značka","correct":false,"severity":"medium"},{"id":"b","label":"Shopify hostuje kohokoli — prodejce ověřte zvlášť","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '5dfc48cb-217a-5d07-b725-79f6d56beabf';

-- ============================================================================
-- Q100: Sharepoint share from colleague — name swap
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A colleague shared a Sharepoint document.',
  options_en = '[{"id":"a","label":"Open — I want to see the bonus","correct":false,"severity":"critical"},{"id":"b","label":"Verify with James in person / on Teams","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"James (Sharepoint)","fromEmail":"no-reply@sharepoint-share.online","subject":"James shared with you: Q4_Bonus.xlsx","body":"Open the document and sign in via Microsoft.","cta":"Open"}'::jsonb
WHERE id = '83032416-9c7e-5a30-a4ae-a49e75907657';

UPDATE public.questions SET
  prompt_cs = 'Kolega vám nasdílel Sharepoint dokument.',
  options_cs = '[{"id":"a","label":"Otevřu — chci vidět bonus","correct":false,"severity":"critical"},{"id":"b","label":"Ověřím s Petrem osobně / na Teams","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Petr (Sharepoint)","fromEmail":"no-reply@sharepoint-share.online","subject":"Petr s vámi sdílel: Q4_Bonus.xlsx","body":"Otevřete dokument a přihlaste se přes Microsoft.","cta":"Otevřít"}'::jsonb
WHERE id = '83032416-9c7e-5a30-a4ae-a49e75907657';

-- ============================================================================
-- Q101: Survey-for-iPhone popup — universal
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Popup: „Fill in a 30s survey and win an iPhone 15."',
  options_en = '[{"id":"a","label":"Fill it in","correct":false,"severity":"critical"},{"id":"b","label":"Close — no iPhone for a 30s survey","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '996f45dc-d836-5fbb-9a1f-04ce99fb9502';

UPDATE public.questions SET
  prompt_cs = 'Pop-up: „Vyplňte 30s dotazník a vyhrajte iPhone 15."',
  options_cs = '[{"id":"a","label":"Vyplním","correct":false,"severity":"critical"},{"id":"b","label":"Zavřu — žádný iPhone za 30s dotazník","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '996f45dc-d836-5fbb-9a1f-04ce99fb9502';

-- ============================================================================
-- Q102: Bazoš payment-verify link → Gumtree (EN) / Bazos.cz (CS), currency
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You''re selling on Gumtree for £200. The buyer sends a link „to verify your Gumtree account". Click?',
  options_en = '[{"id":"a","label":"Yes — I want to sell","correct":false,"severity":"critical"},{"id":"b","label":"Gumtree doesn''t have verification links for payments","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://gumtree.com-verify-payment.com","secure":true}'::jsonb
WHERE id = '4fdacd73-cba6-5ea2-b24c-08601db5864e';

UPDATE public.questions SET
  prompt_cs = 'Prodáváte na Bazos.cz za 5 000 Kč. Kupec posílá link „pro ověření účtu Bazos". Kliknete?',
  options_cs = '[{"id":"a","label":"Ano — chci prodat","correct":false,"severity":"critical"},{"id":"b","label":"Bazos.cz nemá ověřovací linky pro platby","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://bazos.cz-overit-platbu.com","secure":true}'::jsonb
WHERE id = '4fdacd73-cba6-5ea2-b24c-08601db5864e';

-- ============================================================================
-- Q103: URL with port-like deception → Barclays / Česká spořitelna
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Address: `https://barclays.co.uk:8443.evil.com`. Safe?',
  options_en = '[{"id":"a","label":"Yes — I see barclays.co.uk","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — everything before `:` can be a subdomain on a foreign server","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'bac067ec-c743-5152-bbd6-248b7eaa1606';

UPDATE public.questions SET
  prompt_cs = 'Adresa: `https://csas.cz:8443.evil.com`. Bezpečné?',
  options_cs = '[{"id":"a","label":"Ano — vidím csas.cz","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — vše před `:` může být subdoména na cizím serveru","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'bac067ec-c743-5152-bbd6-248b7eaa1606';

-- ============================================================================
-- Q104: VÚB card block SMS → NatWest (EN) / Air Bank (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'SMS about a blocked card.',
  options_en = '[{"id":"a","label":"Unblock","correct":false,"severity":"critical"},{"id":"b","label":"I call the number on the back of the card","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"NatWest","body":"Your card has been blocked due to suspicious activity. Unblock here:","link":"https://natwest-unblock.co.uk"}'::jsonb
WHERE id = 'db0d5a01-bb36-5c58-8289-a215518bc80b';

UPDATE public.questions SET
  prompt_cs = 'SMS o blokaci karty.',
  options_cs = '[{"id":"a","label":"Odblokuji","correct":false,"severity":"critical"},{"id":"b","label":"Volám na číslo ze zadní strany karty","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"AirBank","body":"Vaše karta byla zablokována kvůli podezřelé aktivitě. Odblokujte zde:","link":"https://airbank-odblokovani.cz"}'::jsonb
WHERE id = 'db0d5a01-bb36-5c58-8289-a215518bc80b';

-- ============================================================================
-- Q105: MFA fatigue attack — global
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Your phone is being flooded with Microsoft Authenticator notifications (200×). Action?',
  options_en = '[{"id":"a","label":"Approve — make it stop","correct":false,"severity":"critical"},{"id":"b","label":"Turn off notifications and change the Microsoft account password","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '3e8d920c-1245-5c60-b81e-a67a0a7d0c92';

UPDATE public.questions SET
  prompt_cs = 'Telefon nepřetržitě zvoní notifikacemi z Microsoft Authenticator (200×). Akce?',
  options_cs = '[{"id":"a","label":"Schválím — ať to skončí","correct":false,"severity":"critical"},{"id":"b","label":"Vypnu notifikace a změním heslo Microsoft účtu","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '3e8d920c-1245-5c60-b81e-a67a0a7d0c92';

-- ============================================================================
-- Q106: In-game currency conversion scam — currency convert
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A phone game offers „for £10 get £100 in-game + £50 cash bonus".',
  options_en = '[{"id":"a","label":"Try it","correct":false,"severity":"medium"},{"id":"b","label":"Ignore — the game doesn''t pay money out into reality, it''s a scam or gambling trap","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '091c41ce-92a9-5d44-b36a-aee49f6f3115';

UPDATE public.questions SET
  prompt_cs = 'Hra v telefonu nabízí „za 250 Kč získej 2 500 Kč ve hře + 1 300 Kč bonusů v reálných penězích".',
  options_cs = '[{"id":"a","label":"Zkusím","correct":false,"severity":"medium"},{"id":"b","label":"Ignoruji — hra peníze do reality nevyplácí, je to scam nebo gambling past","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '091c41ce-92a9-5d44-b36a-aee49f6f3115';

-- ============================================================================
-- Q107: PDF statement attachment phishing → HSBC (EN) / Komerční banka (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'The bank sends a „statement" as a PDF attachment.',
  options_en = '[{"id":"a","label":"Open it and enter the password","correct":false,"severity":"critical"},{"id":"b","label":"HSBC only sends statements via online banking — I ignore","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"HSBC","fromEmail":"statements@hsbc-online.eu","subject":"Monthly statement no. 04/2024","body":"Your statement is attached. Password: last 4 digits of your date of birth."}'::jsonb
WHERE id = '2ef518a4-d93e-5172-908b-b2030d900782';

UPDATE public.questions SET
  prompt_cs = 'Banka pošle „výpis" v PDF příloze.',
  options_cs = '[{"id":"a","label":"Otevřu a zadám heslo","correct":false,"severity":"critical"},{"id":"b","label":"KB výpisy posílá jen v internetovém bankovnictví, ignoruji","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Komerční banka","fromEmail":"vypisy@kb-online.eu","subject":"Měsíční výpis č. 04/2024","body":"V příloze najdete váš výpis. Heslo: poslední 4 čísla rodného čísla."}'::jsonb
WHERE id = '2ef518a4-d93e-5172-908b-b2030d900782';

-- ============================================================================
-- Q108: Unicode π homograph → Barclays / Česká spořitelna
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Address in the browser:',
  options_en = '[{"id":"a","label":"Real Barclays","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — `π` (pi) instead of `n` (`barclays` becomes `barclπys`-like trick)","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.barclπys.co.uk/auth"}'::jsonb
WHERE id = 'c1680e23-5259-521a-b11a-995d83c9cad8';

UPDATE public.questions SET
  prompt_cs = 'Adresa v prohlížeči:',
  options_cs = '[{"id":"a","label":"Pravá Česká spořitelna","correct":false,"severity":"critical"},{"id":"b","label":"Phishing — `π` (pi) místo `n`","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.csπs.cz/auth"}'::jsonb
WHERE id = 'c1680e23-5259-521a-b11a-995d83c9cad8';

-- ============================================================================
-- Q109: WhatsApp task scam — currency conversion
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'WhatsApp from an unknown number: „Hi, I''m offering work from home, £200–500 a day for liking videos. Interested?"',
  options_en = '[{"id":"a","label":"Interested","correct":false,"severity":"critical"},{"id":"b","label":"Block — task scam","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'e6121f5d-0c35-5a57-920a-38cff631ddd1';

UPDATE public.questions SET
  prompt_cs = 'WhatsApp z neznámého čísla: „Ahoj, nabízím práci z domova, 5 000–13 000 Kč denně za lajkování videí. Zájem?"',
  options_cs = '[{"id":"a","label":"Zájem","correct":false,"severity":"critical"},{"id":"b","label":"Blokuji — task scam","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'e6121f5d-0c35-5a57-920a-38cff631ddd1';

-- ============================================================================
-- Q110: Marketplace „Stripe" IBAN scam — global
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You''re selling on FB Marketplace. The buyer sends a link „Stripe secure payment — confirm IBAN to receive."',
  options_en = '[{"id":"a","label":"Confirm IBAN","correct":false,"severity":"critical"},{"id":"b","label":"Stripe doesn''t ask for IBAN via a link, and Marketplace doesn''t use Stripe","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '99d211fa-63c9-57af-b41c-b94b597f550c';

UPDATE public.questions SET
  prompt_cs = 'Prodáváte na FB Marketplace. Kupec pošle link „Stripe bezpečná platba — potvrďte IBAN pro přijetí."',
  options_cs = '[{"id":"a","label":"Potvrdím IBAN","correct":false,"severity":"critical"},{"id":"b","label":"Stripe nežádá IBAN přes link, navíc Marketplace Stripe nepoužívá","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '99d211fa-63c9-57af-b41c-b94b597f550c';

-- ============================================================================
-- Q111: Fake tech support fullscreen popup — universal
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A page goes fullscreen, the PC beeps: „Call 0800-XXX-XXX, your PC is infected!"',
  options_en = '[{"id":"a","label":"Call the number","correct":false,"severity":"critical"},{"id":"b","label":"Close the tab via Esc / Task Manager","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'f6281bc6-5b23-5669-9847-e880fc185593';

UPDATE public.questions SET
  prompt_cs = 'Stránka přejde na celou obrazovku, počítač pípá: „Volejte 800-XXX-XXX, váš PC je infikován!"',
  options_cs = '[{"id":"a","label":"Volám číslo","correct":false,"severity":"critical"},{"id":"b","label":"Zavírám tab přes Esc / Správce úloh","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'f6281bc6-5b23-5669-9847-e880fc185593';

-- ============================================================================
-- Q112: Sideloaded banking APK — universal
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A link in an SMS wants to install an app `banking.apk` (outside App Store / Google Play). Install?',
  options_en = '[{"id":"a","label":"Yes — the bank is sending it to me","correct":false,"severity":"critical"},{"id":"b","label":"No — bank apps only come via Play Store / App Store","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '78342189-823a-5701-a0b2-d9d57ef1fda9';

UPDATE public.questions SET
  prompt_cs = 'V SMS link, který chce nainstalovat appku `bankovnictvi.apk` (mimo App Store / Google Play). Instalujete?',
  options_cs = '[{"id":"a","label":"Ano — banka mi to posílá","correct":false,"severity":"critical"},{"id":"b","label":"Ne — appky banky jdou jen přes Play Store / App Store","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '78342189-823a-5701-a0b2-d9d57ef1fda9';

-- ============================================================================
-- Q113: Honeypot — real bank subdomain → Lloyds (EN) / ČSOB (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Lloyds sends you a link to online banking. It looks like this. Do you open it?',
  options_en = '[{"id":"a","label":"Yes — online.lloydsbank.com is the official Lloyds domain","correct":true,"severity":null},{"id":"b","label":"No — the subdomain shape looks odd","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://online.lloydsbank.com/login","secure":true}'::jsonb
WHERE id = '91fea79f-6da0-591b-96e4-78cff269341e';

UPDATE public.questions SET
  prompt_cs = 'ČSOB vám pošle odkaz na internetové bankovnictví. Vypadá takto. Otevřete?',
  options_cs = '[{"id":"a","label":"Ano — `ib.csob.cz` je oficiální doména ČSOB","correct":true,"severity":null},{"id":"b","label":"Ne — divný subdoménový tvar","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://ib.csob.cz/login","secure":true}'::jsonb
WHERE id = '91fea79f-6da0-591b-96e4-78cff269341e';

-- ============================================================================
-- Q114: Honeypot — m. mobile subdomain → HSBC (EN) / Komerční banka (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'This also looks like HSBC online banking. Do you open it?',
  options_en = '[{"id":"a","label":"Yes — `m.` is the mobile version, hsbc.co.uk is legit","correct":true,"severity":null},{"id":"b","label":"No — `m.` is suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://m.hsbc.co.uk","secure":true}'::jsonb
WHERE id = '19047939-717b-5c2b-8125-02cb7f38e7e0';

UPDATE public.questions SET
  prompt_cs = 'Toto také vypadá jako internetové bankovnictví KB. Otevřete?',
  options_cs = '[{"id":"a","label":"Ano — `m.` je mobilní verze, doména kb.cz je legit","correct":true,"severity":null},{"id":"b","label":"Ne — `m.` je podezřelé","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://m.kb.cz","secure":true}'::jsonb
WHERE id = '19047939-717b-5c2b-8125-02cb7f38e7e0';

-- ============================================================================
-- Q115: Honeypot — B2B subdomain → Barclays (EN) / Česká spořitelna (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Barclays has a B2B portal. The URL looks like this.',
  options_en = '[{"id":"a","label":"Legit — `business.barclays.co.uk` is the official corporate area","correct":true,"severity":null},{"id":"b","label":"Looks almost like phishing, I don''t open it","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://business.barclays.co.uk/login","secure":true}'::jsonb
WHERE id = 'e2427b05-4dd1-5965-beca-b5e5de68f9e1';

UPDATE public.questions SET
  prompt_cs = 'Česká spořitelna má B2B portál. URL vypadá takto.',
  options_cs = '[{"id":"a","label":"Legit — `firmy.csas.cz` je oficiální firemní zóna","correct":true,"severity":null},{"id":"b","label":"Skoro phishing, neotevírám","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://firmy.csas.cz/login","secure":true}'::jsonb
WHERE id = 'e2427b05-4dd1-5965-beca-b5e5de68f9e1';

-- ============================================================================
-- Q116: Honeypot — .bank TLD → Monzo (EN) / Revolut (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A neobank rebranded. Clicking on monzo.com — risk?',
  options_en = '[{"id":"a","label":"Legit — monzo.com is the official Monzo bank domain","correct":true,"severity":null},{"id":"b","label":"Looks like a scam, I don''t click","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://monzo.com","secure":true}'::jsonb
WHERE id = '3f184c46-e05a-5188-b898-ff7045dcfb19';

UPDATE public.questions SET
  prompt_cs = 'Neobanka. Kliknutí na revolut.com — riziko?',
  options_cs = '[{"id":"a","label":"Legit — revolut.com je oficiální doména Revolutu","correct":true,"severity":null},{"id":"b","label":"Vypadá jako scam, neklikám","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://revolut.com","secure":true}'::jsonb
WHERE id = '3f184c46-e05a-5188-b898-ff7045dcfb19';

-- ============================================================================
-- Q117: Honeypot — internet banking short URL → NatWest (EN) / Air Bank (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'NatWest has online banking. You see this URL — safe?',
  options_en = '[{"id":"a","label":"Yes — `online.natwest.com` is official NatWest online banking","correct":true,"severity":null},{"id":"b","label":"A short URL is suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://online.natwest.com","secure":true}'::jsonb
WHERE id = '7ba8c165-f49b-5e49-9461-1356e87c6c96';

UPDATE public.questions SET
  prompt_cs = 'Air Bank má internetové bankovnictví. Vidíte tuto URL — bezpečné?',
  options_cs = '[{"id":"a","label":"Ano — `ib.airbank.cz` je oficiální internetové bankovnictví Air Bank","correct":true,"severity":null},{"id":"b","label":"Krátká URL je podezřelá","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://ib.airbank.cz","secure":true}'::jsonb
WHERE id = '7ba8c165-f49b-5e49-9461-1356e87c6c96';

-- ============================================================================
-- Q118: Honeypot — national regulator → BoE/FCA (EN) / ČNB (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'The Financial Conduct Authority — you''re looking at the list of regulated firms.',
  options_en = '[{"id":"a","label":"Legit — fca.org.uk is the FCA domain","correct":true,"severity":null},{"id":"b","label":"The URL is long, it looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.fca.org.uk/firms/financial-services-register","secure":true}'::jsonb
WHERE id = '176bd86d-ab7d-5cfd-9913-fdc0b3f93b3e';

UPDATE public.questions SET
  prompt_cs = 'Česká národní banka — díváte se na seznam regulovaných subjektů.',
  options_cs = '[{"id":"a","label":"Legit — cnb.cz je doména ČNB","correct":true,"severity":null},{"id":"b","label":"URL je dlouhá, vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.cnb.cz/cs/dohled-financni-trh/seznamy","secure":true}'::jsonb
WHERE id = '176bd86d-ab7d-5cfd-9913-fdc0b3f93b3e';

-- ============================================================================
-- Q119: Honeypot — banking platform → Barclays app (EN) / George (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Barclays Online Banking on the web. Real?',
  options_en = '[{"id":"a","label":"Yes — bank.barclays.co.uk is the official Barclays platform","correct":true,"severity":null},{"id":"b","label":"An unusual subdomain on a UK bank, I don''t trust it","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://bank.barclays.co.uk","secure":true}'::jsonb
WHERE id = '8c2f0a7c-d4dc-5d57-bfe1-5c65bb680476';

UPDATE public.questions SET
  prompt_cs = 'George (Erste / Česká spořitelna) na webu. Pravý?',
  options_cs = '[{"id":"a","label":"Ano — George je oficiální platforma Erste / Česká spořitelna","correct":true,"severity":null},{"id":"b","label":"Anglická doména na českou banku, nedůvěřuji","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://georgebanking.com","secure":true}'::jsonb
WHERE id = '8c2f0a7c-d4dc-5d57-bfe1-5c65bb680476';

-- ============================================================================
-- Q120: Honeypot — support subdomain → HSBC (EN) / Komerční banka (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'HSBC sends an email with a link to support. The URL looks like this.',
  options_en = '[{"id":"a","label":"Legit — the subdomain support.hsbc.co.uk is official","correct":true,"severity":null},{"id":"b","label":"Lots of subdomains = suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://support.hsbc.co.uk/contact","secure":true}'::jsonb
WHERE id = '3b490e46-9157-5a5e-ac90-290e0b010c99';

UPDATE public.questions SET
  prompt_cs = 'KB pošle e-mail s odkazem na podporu. URL je takováto.',
  options_cs = '[{"id":"a","label":"Legit — subdoména podpora.kb.cz je oficiální","correct":true,"severity":null},{"id":"b","label":"Hodně subdomén = podezřelé","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://podpora.kb.cz/kontakt","secure":true}'::jsonb
WHERE id = '3b490e46-9157-5a5e-ac90-290e0b010c99';
