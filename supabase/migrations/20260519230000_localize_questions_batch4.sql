-- AH-15.8 batch 4: cultural localization of scam scenarios 121-160 (40 questions)
-- Idempotent — UPDATE statements are safe to re-run.
-- AH-15.7 schema is required (prompt_en/cs, options_en/cs, visual_en/cs).
--
-- Cultural substitutions:
--   EN (UK): Royal Mail, Barclays, Lloyds, HSBC, NatWest, Santander UK, BT, EE,
--            HMRC, £ + period decimal, +44, .co.uk, IBAN GB, English names.
--   CS (CZ): Česká pošta, Česká spořitelna, ČSOB, Komerční banka, Raiffeisenbank,
--            T-Mobile, Vodafone, Finanční úřad, Kč (~26 Kč/€), +420, .cz,
--            IBAN CZ, Czech names.

-- ============================================================================
-- Q121: Prima banka honeypot URL → Santander UK (EN) / Raiffeisenbank (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Santander UK uses a short brand subdomain form. Sure?',
  options_en = '[{"id":"a","label":"Yes — `secure.santander.co.uk` is legitimate","correct":true,"severity":null},{"id":"b","label":"The `secure.` prefix sounds like a clone","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://secure.santander.co.uk","secure":true}'::jsonb
WHERE id = 'fe6cea6e-4354-56f9-a34f-f4926fcda071';

UPDATE public.questions SET
  prompt_cs = 'Raiffeisenbank má krátký brand-subdoménový tvar. Jste si jistí?',
  options_cs = '[{"id":"a","label":"Ano — `ib.rb.cz` je legitimní","correct":true,"severity":null},{"id":"b","label":"Krátká zkratka v doméně zní jako klon","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://ib.rb.cz","secure":true}'::jsonb
WHERE id = 'fe6cea6e-4354-56f9-a34f-f4926fcda071';

-- ============================================================================
-- Q122: ČSOB SMS tracking link → HSBC (EN) / Komerční banka (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'HSBC SMS confirmation — link with tracking ID. Open?',
  options_en = '[{"id":"a","label":"Yes — `hsbc.co.uk` + HTTPS + sensible path","correct":true,"severity":null},{"id":"b","label":"Random-looking ID in URL is suspect","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.hsbc.co.uk/transaction/0193af-confirm","secure":true}'::jsonb
WHERE id = 'a7778446-8dba-5598-8568-257cf1110d58';

UPDATE public.questions SET
  prompt_cs = 'Komerční banka potvrzuje SMS — odkaz s tracking ID. Otevřete?',
  options_cs = '[{"id":"a","label":"Ano — doména `kb.cz` + HTTPS + smysluplná cesta","correct":true,"severity":null},{"id":"b","label":"Náhodně vypadající ID v URL je podezřelé","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.kb.cz/transakce/0193af-confirm","secure":true}'::jsonb
WHERE id = 'a7778446-8dba-5598-8568-257cf1110d58';

-- ============================================================================
-- Q123: Alza order tracking → eBay (EN) / Alza (CS keeps brand)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'eBay order — tracking link. Real?',
  options_en = '[{"id":"a","label":"Yes — `ebay.co.uk` + path `/itm/` is legit","correct":true,"severity":null},{"id":"b","label":"Random code in URL sounds like a scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.ebay.co.uk/itm/AB12345678","secure":true}'::jsonb
WHERE id = '863c8d6b-c347-53cc-8f08-d344438bad08';

UPDATE public.questions SET
  prompt_cs = 'Alza objednávka — odkaz na sledování. Pravé?',
  options_cs = '[{"id":"a","label":"Ano — `alza.cz` + cesta `/objednavka/` je legitimní","correct":true,"severity":null},{"id":"b","label":"Náhodný kód v URL zní jako podvod","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.alza.cz/objednavka/AB12345678","secure":true}'::jsonb
WHERE id = '863c8d6b-c347-53cc-8f08-d344438bad08';

-- ============================================================================
-- Q124: Mobile Alza subdomain → eBay mobile (EN) / Alza mobile (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'eBay mobile version. Safe?',
  options_en = '[{"id":"a","label":"Yes — `m.` is eBay''s mobile subdomain","correct":true,"severity":null},{"id":"b","label":"The `m.` prefix sounds phishy","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://m.ebay.co.uk/deals","secure":true}'::jsonb
WHERE id = 'bf2fcdaa-b324-5422-8658-987ef724f78c';

UPDATE public.questions SET
  prompt_cs = 'Mobilní verze Alzy. Bezpečné?',
  options_cs = '[{"id":"a","label":"Ano — `m.` je mobilní subdoména Alzy","correct":true,"severity":null},{"id":"b","label":"Prefix `m.` zní phishingově","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://m.alza.cz/akce","secure":true}'::jsonb
WHERE id = 'bf2fcdaa-b324-5422-8658-987ef724f78c';

-- ============================================================================
-- Q125: Heureka price comparison → Trustpilot (EN) / Heureka.cz (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Trustpilot link for product reviews.',
  options_en = '[{"id":"a","label":"Legit — `trustpilot.com` is a review platform","correct":true,"severity":null},{"id":"b","label":"Review URL sounds spammy","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://uk.trustpilot.com/review/iphone-15-pro","secure":true}'::jsonb
WHERE id = '91cc7a44-d331-50bb-b67c-c007a9d27e09';

UPDATE public.questions SET
  prompt_cs = 'Heureka odkaz na porovnání cen.',
  options_cs = '[{"id":"a","label":"Legitimní — `heureka.cz` je porovnávač cen","correct":true,"severity":null},{"id":"b","label":"URL recenzí zní spamově","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.heureka.cz/iphone-15-pro/recenze/","secure":true}'::jsonb
WHERE id = '91cc7a44-d331-50bb-b67c-c007a9d27e09';

-- ============================================================================
-- Q126: Slovenská pošta tracking → Royal Mail (EN) / Česká pošta (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Royal Mail — parcel tracking via their site.',
  options_en = '[{"id":"a","label":"Yes — `track.royalmail.com` is official tracking","correct":true,"severity":null},{"id":"b","label":"`track` sounds like a random hack","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://track.royalmail.com/RR123456789GB","secure":true}'::jsonb
WHERE id = 'b0974b8f-c471-595c-ac36-a8e895f177b2';

UPDATE public.questions SET
  prompt_cs = 'Česká pošta — sledování zásilky přes jejich web.',
  options_cs = '[{"id":"a","label":"Ano — `www.postaonline.cz` je oficiální tracking","correct":true,"severity":null},{"id":"b","label":"`postaonline` zní jako náhodný hack","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=RR123456789CZ","secure":true}'::jsonb
WHERE id = 'b0974b8f-c471-595c-ac36-a8e895f177b2';

-- ============================================================================
-- Q127: Notino voucher redeem
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Notino voucher redemption — link from email.',
  options_en = '[{"id":"a","label":"Legit — `notino.co.uk` + path `voucher/redeem`","correct":true,"severity":null},{"id":"b","label":"Voucher code in URL sounds like a trap","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.notino.co.uk/voucher/redeem/X9K2-PMNT","secure":true}'::jsonb
WHERE id = '4fd5c4c1-f8ed-563d-bf28-08faa7cb498e';

UPDATE public.questions SET
  prompt_cs = 'Notino voucher uplatnění — odkaz z e-mailu.',
  options_cs = '[{"id":"a","label":"Legitimní — `notino.cz` + cesta `voucher/redeem`","correct":true,"severity":null},{"id":"b","label":"Voucher kód v URL zní jako past","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.notino.cz/voucher/redeem/X9K2-PMNT","secure":true}'::jsonb
WHERE id = '4fd5c4c1-f8ed-563d-bf28-08faa7cb498e';

-- ============================================================================
-- Q128: Mall.sk complaint → Amazon UK (EN) / Mall.cz (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Amazon UK sends a link after a return.',
  options_en = '[{"id":"a","label":"Yes — `account.amazon.co.uk` is a legit Amazon subdomain","correct":true,"severity":null},{"id":"b","label":"A returns URL should be on the main domain","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.amazon.co.uk/gp/returns/12345","secure":true}'::jsonb
WHERE id = 'c331bc83-fb2d-52e8-bf12-b5c81a352ed3';

UPDATE public.questions SET
  prompt_cs = 'Mall.cz pošle odkaz po reklamaci.',
  options_cs = '[{"id":"a","label":"Ano — `account.` je legitimní subdoména Mall.cz","correct":true,"severity":null},{"id":"b","label":"Reklamační URL by měla být na hlavní doméně","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://account.mall.cz/reklamace/12345","secure":true}'::jsonb
WHERE id = 'c331bc83-fb2d-52e8-bf12-b5c81a352ed3';

-- ============================================================================
-- Q129: Dr. Max pharmacy e-shop → Boots (EN) / Dr. Max (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Boots e-shop for online pharmacy sales.',
  options_en = '[{"id":"a","label":"Legit — `boots.com` belongs to Boots pharmacies","correct":true,"severity":null},{"id":"b","label":"Short domain for a healthcare firm sounds suspect","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.boots.com/offers","secure":true}'::jsonb
WHERE id = '0f6d47b6-670b-5adf-9458-f37f17857247';

UPDATE public.questions SET
  prompt_cs = 'Dr. Max e-shop pro online lékárenský prodej.',
  options_cs = '[{"id":"a","label":"Legitimní — `drmax.cz` patří lékárnám Dr. Max","correct":true,"severity":null},{"id":"b","label":"Krátká doména pro zdravotnickou firmu zní podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://eshop.drmax.cz/akce","secure":true}'::jsonb
WHERE id = '0f6d47b6-670b-5adf-9458-f37f17857247';

-- ============================================================================
-- Q130: Zalando tracking
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Zalando sends a tracking link after an order.',
  options_en = '[{"id":"a","label":"Yes — `zalando.co.uk` is legit, `myaccount` is the user area","correct":true,"severity":null},{"id":"b","label":"The English word `myaccount` in a UK domain is suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.zalando.co.uk/myaccount/orders/123456","secure":true}'::jsonb
WHERE id = 'd5fb3bda-1e3b-557d-9cfd-b6b0801c8f06';

UPDATE public.questions SET
  prompt_cs = 'Zalando pošle po objednávce tracking odkaz.',
  options_cs = '[{"id":"a","label":"Ano — `zalando.cz` je legitimní, `myaccount` je uživatelská sekce","correct":true,"severity":null},{"id":"b","label":"Anglické slovo `myaccount` v CZ doméně podezřelé","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.zalando.cz/myaccount/orders/123456","secure":true}'::jsonb
WHERE id = 'd5fb3bda-1e3b-557d-9cfd-b6b0801c8f06';

-- ============================================================================
-- Q131: Booking.com reservation confirmation
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Booking.com reservation confirmation — link.',
  options_en = '[{"id":"a","label":"Legit — `secure.booking.com` with UK localisation","correct":true,"severity":null},{"id":"b","label":"`?aid=123` query param sounds like a tracking scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://secure.booking.com/myreservations.en-gb.html?aid=123","secure":true}'::jsonb
WHERE id = 'd4955cfb-d34c-50ea-a845-689c76ea7570';

UPDATE public.questions SET
  prompt_cs = 'Booking.com potvrzení rezervace — odkaz.',
  options_cs = '[{"id":"a","label":"Legitimní — `secure.booking.com` s českou lokalizací","correct":true,"severity":null},{"id":"b","label":"`?aid=123` query parametr zní jako tracking podvod","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://secure.booking.com/myreservations.cs.html?aid=123","secure":true}'::jsonb
WHERE id = 'd4955cfb-d34c-50ea-a845-689c76ea7570';

-- ============================================================================
-- Q132: Heureka shop reviews → Trustpilot reviews of seller (EN) / Heureka.cz (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A Trustpilot link to a seller''s reviews.',
  options_en = '[{"id":"a","label":"Legit — Trustpilot has `/review/` paths for verified merchants","correct":true,"severity":null},{"id":"b","label":"Sub-path looks suspect","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://uk.trustpilot.com/review/ebay.co.uk","secure":true}'::jsonb
WHERE id = '66e0b679-af88-5c17-ba83-1adb6b3095ec';

UPDATE public.questions SET
  prompt_cs = 'Odkaz z Heureka.cz na recenze obchodu.',
  options_cs = '[{"id":"a","label":"Legitimní — Heureka má subdoménu `obchody.` pro ověřené prodejce","correct":true,"severity":null},{"id":"b","label":"Sub-subdoména je podezřelá","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://obchody.heureka.cz/alza-cz/recenze/","secure":true}'::jsonb
WHERE id = '66e0b679-af88-5c17-ba83-1adb6b3095ec';

-- ============================================================================
-- Q133: Slovensko.sk electronic mailbox → GOV.UK (EN) / Portál občana (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'GOV.UK notifies you about a document in your account.',
  options_en = '[{"id":"a","label":"Legit — `gov.uk` is the central UK government portal","correct":true,"severity":null},{"id":"b","label":"A state site should have a longer domain","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.gov.uk/sign-in-to-your-account","secure":true}'::jsonb
WHERE id = '3369e50f-a2f2-52cf-8c46-819a9038e32f';

UPDATE public.questions SET
  prompt_cs = 'Portál občana vám pošle notifikaci o doručence v elektronické schránce.',
  options_cs = '[{"id":"a","label":"Legitimní — `obcan.portal.gov.cz` je centrální portál veřejné správy","correct":true,"severity":null},{"id":"b","label":"Státní web by měl mít kratší doménu","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://obcan.portal.gov.cz/prihlaseni","secure":true}'::jsonb
WHERE id = '3369e50f-a2f2-52cf-8c46-819a9038e32f';

-- ============================================================================
-- Q134: Finančná správa tax portal → HMRC (EN) / Finanční správa ČR (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'HMRC — portal for filing tax returns.',
  options_en = '[{"id":"a","label":"Legit — `tax.service.gov.uk` is the official HMRC portal","correct":true,"severity":null},{"id":"b","label":"The domain is long and `service` looks odd","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.tax.service.gov.uk/personal-account","secure":true}'::jsonb
WHERE id = '6caed0cb-63e3-5983-93d6-8931d656a272';

UPDATE public.questions SET
  prompt_cs = 'Finanční správa ČR — portál pro podávání daňových přiznání.',
  options_cs = '[{"id":"a","label":"Legitimní — `adisspr.mfcr.cz` je oficiální portál Finanční správy","correct":true,"severity":null},{"id":"b","label":"Doména je dlouhá a chybí `.gov`","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://adisspr.mfcr.cz/pmd/home","secure":true}'::jsonb
WHERE id = '6caed0cb-63e3-5983-93d6-8931d656a272';

-- ============================================================================
-- Q135: Sociálna poisťovňa → DWP (EN) / ČSSZ (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'DWP — portal.',
  options_en = '[{"id":"a","label":"Legit — `gov.uk/dwp` is DWP","correct":true,"severity":null},{"id":"b","label":"Sub-path with `dwp` looks like a clone","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.gov.uk/government/organisations/department-for-work-pensions","secure":true}'::jsonb
WHERE id = 'e067c53c-1de3-5ef2-a403-5477f1cb05d2';

UPDATE public.questions SET
  prompt_cs = 'ČSSZ — portál.',
  options_cs = '[{"id":"a","label":"Legitimní — `cssz.cz` patří České správě sociálního zabezpečení","correct":true,"severity":null},{"id":"b","label":"Zkratka domény vypadá jako klon","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.cssz.cz/portal","secure":true}'::jsonb
WHERE id = 'e067c53c-1de3-5ef2-a403-5477f1cb05d2';

-- ============================================================================
-- Q136: MV SR — fines lookup → Home Office (EN) / MV ČR (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Home Office — check fines online.',
  options_en = '[{"id":"a","label":"Legit — `gov.uk/check-fine` is the Home Office service","correct":true,"severity":null},{"id":"b","label":"Query string about fines sounds like a trap","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.gov.uk/pay-court-fine-online","secure":true}'::jsonb
WHERE id = '3e6585ec-6be6-5fbb-82f8-44316adc5796';

UPDATE public.questions SET
  prompt_cs = 'MV ČR — kontrola pokut online.',
  options_cs = '[{"id":"a","label":"Legitimní — `mvcr.cz` je Ministerstvo vnitra ČR","correct":true,"severity":null},{"id":"b","label":"Query string s pokutami zní jako past","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.mvcr.cz/?platby-pokut","secure":true}'::jsonb
WHERE id = '3e6585ec-6be6-5fbb-82f8-44316adc5796';

-- ============================================================================
-- Q137: ÚVZ SR — public health announcement → UKHSA (EN) / SZÚ (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'UKHSA — public health, notice.',
  options_en = '[{"id":"a","label":"Legit — `gov.uk/ukhsa` belongs to the UK Health Security Agency","correct":true,"severity":null},{"id":"b","label":"Abbreviation `ukhsa` is suspect","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.gov.uk/government/organisations/uk-health-security-agency","secure":true}'::jsonb
WHERE id = 'e314522d-3278-5c3f-b413-c80fbe2f7275';

UPDATE public.questions SET
  prompt_cs = 'SZÚ — veřejné zdravotnictví, oznámení.',
  options_cs = '[{"id":"a","label":"Legitimní — `szu.cz` patří Státnímu zdravotnímu ústavu","correct":true,"severity":null},{"id":"b","label":"Zkratka `szu` je podezřelá","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.szu.cz/oznameni/2026","secure":true}'::jsonb
WHERE id = 'e314522d-3278-5c3f-b413-c80fbe2f7275';

-- ============================================================================
-- Q138: Justice.gov.sk → gov.uk/courts (EN) / justice.cz (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'GOV.UK — electronic submission to the court register.',
  options_en = '[{"id":"a","label":"Legit — `gov.uk/courts-tribunals` is the Ministry of Justice","correct":true,"severity":null},{"id":"b","label":"A `tribunals` path looks unusual, probably a scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.gov.uk/courts-tribunals","secure":true}'::jsonb
WHERE id = 'cec3899c-a90a-5304-a6ee-dd623339d115';

UPDATE public.questions SET
  prompt_cs = 'Justice.cz — elektronické podání do soudního rejstříku.',
  options_cs = '[{"id":"a","label":"Legitimní — `justice.cz` je Ministerstvo spravedlnosti ČR","correct":true,"severity":null},{"id":"b","label":"`.cz` je neobvyklé, asi podvod","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.justice.cz/sluzby/elektronicke-podani","secure":true}'::jsonb
WHERE id = 'cec3899c-a90a-5304-a6ee-dd623339d115';

-- ============================================================================
-- Q139: Štatistický úrad RPO → ONS (EN) / ČSÚ (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'ONS — Companies House lookup.',
  options_en = '[{"id":"a","label":"Legit — `find-and-update.company-information.service.gov.uk` is Companies House","correct":true,"severity":null},{"id":"b","label":"English `company-information` for a state body looks odd","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://find-and-update.company-information.service.gov.uk/company/12345678","secure":true}'::jsonb
WHERE id = 'bba74625-f3e3-5993-b8f6-e304e4a41e4f';

UPDATE public.questions SET
  prompt_cs = 'Český statistický úřad — registr právnických osob (RES) lookup.',
  options_cs = '[{"id":"a","label":"Legitimní — `czso.cz` je ČSÚ, `res.` je registr","correct":true,"severity":null},{"id":"b","label":"Anglické `czso` na český úřad je divné","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://apl.czso.cz/res/","secure":true}'::jsonb
WHERE id = 'bba74625-f3e3-5993-b8f6-e304e4a41e4f';

-- ============================================================================
-- Q140: Obchodný register SR → Companies House (EN) / Justice.cz OR (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'UK Companies House.',
  options_en = '[{"id":"a","label":"Legit — `companieshouse.gov.uk` is the UK Companies House","correct":true,"severity":null},{"id":"b","label":"Query strings with multiple IDs are suspect","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.gov.uk/get-information-about-a-company?ID=237161&SID=8&P=1","secure":true}'::jsonb
WHERE id = '009397cd-12b2-5525-9756-20be8d9c78e0';

UPDATE public.questions SET
  prompt_cs = 'Obchodní rejstřík České republiky.',
  options_cs = '[{"id":"a","label":"Legitimní — `or.justice.cz` je obchodní rejstřík ČR","correct":true,"severity":null},{"id":"b","label":"Query stringy s několika ID jsou podezřelé","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://or.justice.cz/ias/ui/vypis-sl-firma?ID=237161&SID=8&P=1","secure":true}'::jsonb
WHERE id = '009397cd-12b2-5525-9756-20be8d9c78e0';

-- ============================================================================
-- Q141: eKasa portal → HMRC MTD (EN) / EET (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'HMRC MTD — portal for the self-employed and VAT registrations.',
  options_en = '[{"id":"a","label":"Legit — `mtd.` is a subdomain of `tax.service.gov.uk`","correct":true,"severity":null},{"id":"b","label":"A short brand subdomain on a state site is suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://mtd.tax.service.gov.uk","secure":true}'::jsonb
WHERE id = '684bc731-ab5e-577f-89f2-302e39405506';

UPDATE public.questions SET
  prompt_cs = 'Elektronická evidence tržeb — portál Finanční správy.',
  options_cs = '[{"id":"a","label":"Legitimní — `adisspr.mfcr.cz/dpr/eet` je oficiální cesta na portálu","correct":true,"severity":null},{"id":"b","label":"Krátká brand-subdoména na státním webu zní podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://adisspr.mfcr.cz/dpr/eet","secure":true}'::jsonb
WHERE id = '684bc731-ab5e-577f-89f2-302e39405506';

-- ============================================================================
-- Q142: Datacentrum Bratislava → GOV.UK service (EN) / Pražský magistrát (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A London council citizen service.',
  options_en = '[{"id":"a","label":"Legit — `.gov.uk` is a reserved state zone","correct":true,"severity":null},{"id":"b","label":"The word `services` sounds like a server scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://www.london.gov.uk/services","secure":true}'::jsonb
WHERE id = '16e4eca3-e949-5585-9d0a-0bc500547b72';

UPDATE public.questions SET
  prompt_cs = 'Magistrát hlavního města Prahy — služba občanům.',
  options_cs = '[{"id":"a","label":"Legitimní — `praha.eu` je oficiální doména města Prahy","correct":true,"severity":null},{"id":"b","label":"Slovo `praha.eu` zní jako server podvod","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://www.praha.eu/jnp/cz/sluzby/index.html","secure":true}'::jsonb
WHERE id = '16e4eca3-e949-5585-9d0a-0bc500547b72';

-- ============================================================================
-- Q143: Discord Nitro gift scam from "friend"
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A friend sends you a Discord link: "Got free Discord Nitro, click here and grab yours too."',
  options_en = '[{"id":"a","label":"Click — free Nitro is great","correct":false,"severity":"critical"},{"id":"b","label":"Don''t open — the friend may have been hacked","correct":true,"severity":null},{"id":"c","label":"Click, but only in incognito","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Friend (Discord)","body":"yo got something click now and grab free Discord Nitro for a month","link":"https://discord-nitro-gift.click/free"}'::jsonb
WHERE id = 'e95e81be-9477-5fd8-a8bc-0fcc74a4a6c2';

UPDATE public.questions SET
  prompt_cs = 'Kamarád ti na Discordu posílá odkaz: „Dostal jsem zdarma Discord Nitro, klikni a vezmi si taky."',
  options_cs = '[{"id":"a","label":"Kliknu — Nitro zdarma je super","correct":false,"severity":"critical"},{"id":"b","label":"Nespustím — kamaráda mohli hacknout","correct":true,"severity":null},{"id":"c","label":"Kliknu, ale jen v inkognito režimu","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Kamarád (Discord)","body":"hele mam neco klikni hned a vezmi zdarma Discord Nitro na mesic","link":"https://discord-nitro-gift.click/free"}'::jsonb
WHERE id = 'e95e81be-9477-5fd8-a8bc-0fcc74a4a6c2';

-- ============================================================================
-- Q144: V-Bucks / Robux free generator
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A site offers: "1,000 V-Bucks / Robux FREE! Enter your username and a ''verification code''."',
  options_en = '[{"id":"a","label":"I''ll try — why would it be fake","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — a free in-game currency generator does not exist","correct":true,"severity":null},{"id":"c","label":"I''ll try with a fake username","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = NULL
WHERE id = '74438156-c08e-59fd-9a1a-198ebcb59d83';

UPDATE public.questions SET
  prompt_cs = 'Stránka nabízí: „1 000 V-Bucks / Robux ZDARMA! Zadej jméno účtu a ,ověřovací kód''."',
  options_cs = '[{"id":"a","label":"Zkusím — proč by to bylo fake","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — generátor herní měny neexistuje","correct":true,"severity":null},{"id":"c","label":"Zkusím, ale dám falešné jméno","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = NULL
WHERE id = '74438156-c08e-59fd-9a1a-198ebcb59d83';

-- ============================================================================
-- Q145: School Teams password reset
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Your school supposedly sends you a Teams password reset link.',
  options_en = '[{"id":"a","label":"Click — I don''t want to lose access","correct":false,"severity":"critical"},{"id":"b","label":"Sign in manually via `office.com` and verify with the school IT admin","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"School IT Support","fromEmail":"it-support@school-portal-update.com","subject":"Mandatory Microsoft Teams access renewal — within 24 hours","body":"Your school account expires tomorrow. Click and update your password, or you will lose access.","cta":"Update password"}'::jsonb
WHERE id = 'd2130da0-20f7-550c-8e60-7dc1a8ebd098';

UPDATE public.questions SET
  prompt_cs = 'Škola ti údajně posílá odkaz na obnovu hesla do Teams.',
  options_cs = '[{"id":"a","label":"Kliknu — nechci přijít o přístup","correct":false,"severity":"critical"},{"id":"b","label":"Přihlásím se ručně přes `office.com` a ověřím u správce IT","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"IT Podpora Škola","fromEmail":"it-support@skola-portal-update.com","subject":"Povinná obnova přístupu do Microsoft Teams — do 24 hodin","body":"Platnost vašeho školního účtu vyprší zítra. Klikněte a aktualizujte heslo, jinak ztratíte přístup.","cta":"Aktualizovat heslo"}'::jsonb
WHERE id = 'd2130da0-20f7-550c-8e60-7dc1a8ebd098';

-- ============================================================================
-- Q146: TikTok 500€ reward SMS
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'SMS: "You have been selected for a £500 reward from TikTok. Sign in to activate."',
  options_en = '[{"id":"a","label":"Sign in — £500 is £500","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — TikTok doesn''t hand out money like this","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"TikTok Promo UK","body":"Congrats! You are one of 100 selected. Activate your £500 reward here:","link":"https://tiktok-reward-uk.live/login"}'::jsonb
WHERE id = 'c707b0fe-ec76-5d64-b2c4-419a4f90cbf3';

UPDATE public.questions SET
  prompt_cs = 'SMS: „Byli jste vybráni na odměnu 13 000 Kč od TikToku. Pro aktivaci se přihlaste."',
  options_cs = '[{"id":"a","label":"Přihlásím se — 13 000 Kč je 13 000 Kč","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — TikTok takhle nic nerozdává","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"TikTok Promo CZ","body":"Gratulujeme! Jste jeden ze 100 vybraných. Aktivujte odměnu 13 000 Kč zde:","link":"https://tiktok-reward-cz.live/login"}'::jsonb
WHERE id = 'c707b0fe-ec76-5d64-b2c4-419a4f90cbf3';

-- ============================================================================
-- Q147: Instagram "work from home, 15€ registration"
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Instagram ad: "Work from home from age 15, £20/hour, just share posts. £15 registration fee."',
  options_en = '[{"id":"a","label":"Sign up — £20/hour is great","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — a job where you pay upfront isn''t a job","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '67bcbefb-a353-5b93-b5f0-1217f64d7a6a';

UPDATE public.questions SET
  prompt_cs = 'Inzerát na Instagramu: „Pracuj z domova od 15 let, 500 Kč/hod, stačí sdílet příspěvky. Registrace 400 Kč."',
  options_cs = '[{"id":"a","label":"Registruji se — 500 Kč/hod je super","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — práce, kde platíš předem, není práce","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '67bcbefb-a353-5b93-b5f0-1217f64d7a6a';

-- ============================================================================
-- Q148: School QR code phishing
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A QR code in the school corridor: "New app — order lunch faster." After scanning, the page asks for your school email and password. Enter them?',
  options_en = '[{"id":"a","label":"Enter — I want quick ordering","correct":false,"severity":"critical"},{"id":"b","label":"Leave it — I''ll check with the school IT admin first","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '48460164-ebdc-5818-9eb5-38599577ac39';

UPDATE public.questions SET
  prompt_cs = 'Ve školní chodbě visí QR kód: „Nová appka — objednej oběd rychleji." Po naskenování stránka chce školní email a heslo. Zadáš?',
  options_cs = '[{"id":"a","label":"Zadám — chci rychlé objednání","correct":false,"severity":"critical"},{"id":"b","label":"Nechám to — ověřím nejdřív u pověřeného správce IT školy","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '48460164-ebdc-5818-9eb5-38599577ac39';

-- ============================================================================
-- Q149: Spotify Premium "free" via friend's link
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A friend sends you a link: "I''ve got free Spotify Premium, you should too — enter email and password here."',
  options_en = '[{"id":"a","label":"Enter — free Spotify Premium","correct":false,"severity":"critical"},{"id":"b","label":"I won''t sign in via someone else''s link","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'd9c622d6-32b3-581b-a6d9-c9f0c0031516';

UPDATE public.questions SET
  prompt_cs = 'Kamarád ti pošle odkaz: „Mám aktivované Spotify Premium zdarma, použij taky — zadej tu email a heslo."',
  options_cs = '[{"id":"a","label":"Zadám — Spotify Premium zdarma","correct":false,"severity":"critical"},{"id":"b","label":"Nepřihlásím se přes cizí odkaz","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'd9c622d6-32b3-581b-a6d9-c9f0c0031516';

-- ============================================================================
-- Q150: Grandparent scam — "I had an accident, need £2,000"
-- ============================================================================
UPDATE public.questions SET
  prompt_en = '"Hi nan/grandad, it''s me, James. I''ve had an accident, I''m in hospital and I need £2,000 right now. Don''t tell mum." The voice sounds familiar.',
  options_en = '[{"id":"a","label":"Send it — it''s my grandson","correct":false,"severity":"critical"},{"id":"b","label":"Send half — just to be safe","correct":false,"severity":"critical"},{"id":"c","label":"Hang up and call my grandson directly on his number","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'b0b98a60-6572-5e77-9028-ba813e596411';

UPDATE public.questions SET
  prompt_cs = '„Ahoj babi/dědo, to jsem já, Tomáš. Měl jsem nehodu, jsem v nemocnici a potřebuji 50 000 Kč hned. Neříkej to mámě." Hlas zní povědomě.',
  options_cs = '[{"id":"a","label":"Pošlu — je to vnuk","correct":false,"severity":"critical"},{"id":"b","label":"Pošlu polovinu — pro jistotu","correct":false,"severity":"critical"},{"id":"c","label":"Zavěsím a zavolám přímo vnukovi na jeho číslo","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'b0b98a60-6572-5e77-9028-ba813e596411';

-- ============================================================================
-- Q151: "Bank employee" at the door checking deposits
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Someone rings the bell and says: "Good morning, I''m from the bank — we''re checking deposits in this area. Can I see your passbook or card?"',
  options_en = '[{"id":"a","label":"Show them — they''re from the bank","correct":false,"severity":"critical"},{"id":"b","label":"Don''t let them in — banks never visit homes unsolicited","correct":true,"severity":null},{"id":"c","label":"Make them wait and call the bank on the number they gave me","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = NULL
WHERE id = 'd7ce9c72-4d89-568c-909b-1751d05141a5';

UPDATE public.questions SET
  prompt_cs = 'Někdo zazvoní a řekne: „Dobré ráno, jsem z banky — kontrolujeme vklady v okolí. Můžu vidět vaši vkladní knížku nebo kartu?"',
  options_cs = '[{"id":"a","label":"Ukážu — je z banky","correct":false,"severity":"critical"},{"id":"b","label":"Nepustím dovnitř — banka nikdy nechodí po domácnostech bez objednání","correct":true,"severity":null},{"id":"c","label":"Nechám ho čekat a zavolám bance na číslo, co mi dal","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'd7ce9c72-4d89-568c-909b-1751d05141a5';

-- ============================================================================
-- Q152: Postal letter — pension top-up scam
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Letter in your post: "DWP: you are entitled to a £128/month pension top-up. Call this number to activate: 0900 XXX XXX."',
  options_en = '[{"id":"a","label":"Call — I want the top-up","correct":false,"severity":"critical"},{"id":"b","label":"Verify directly at the DWP branch, not the number from the letter","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'c36012bd-cc9c-5d52-93f0-47a4242091de';

UPDATE public.questions SET
  prompt_cs = 'Dopis ve schránce: „ČSSZ: máte nárok na příplatek k důchodu 3 300 Kč/měs. Zavolejte pro aktivaci na 900 XXX XXX."',
  options_cs = '[{"id":"a","label":"Zavolám — chci příplatek","correct":false,"severity":"critical"},{"id":"b","label":"Ověřím přímo na pobočce ČSSZ, ne na čísle z dopisu","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'c36012bd-cc9c-5d52-93f0-47a4242091de';

-- ============================================================================
-- Q153: Voice clone — child detained at border, demands Bitcoin
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Your son/daughter calls — you recognise the voice: "Mum, I''ve been stopped at the border by customs, I need £1,800 in Bitcoin now." The voice sounds 100% like them.',
  options_en = '[{"id":"a","label":"I go and buy Bitcoin — I recognise the voice","correct":false,"severity":"critical"},{"id":"b","label":"Hang up and call my child directly on their number","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '09c1eaaa-be17-59b2-aa30-149f2be8bc0f';

UPDATE public.questions SET
  prompt_cs = 'Zavolá ti syn/dcera, poznáš jeho/její hlas: „Mami, zadrželi mě celníci na hranici, potřebuji 45 000 Kč v Bitcoinu hned." Hlas zní 100% jako on/ona.',
  options_cs = '[{"id":"a","label":"Jdu pro Bitcoin — poznávám hlas","correct":false,"severity":"critical"},{"id":"b","label":"Zavěsím a zavolám dítěti přímo na jeho číslo","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '09c1eaaa-be17-59b2-aa30-149f2be8bc0f';

-- ============================================================================
-- Q154: Phone solicitation — cancer charity asks for card + CVV
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Caller: "We''re raising funds for children with cancer, send £20 now — read me your card number and CVV."',
  options_en = '[{"id":"a","label":"Read them out — I want to help","correct":false,"severity":"critical"},{"id":"b","label":"Refuse and donate online via a verified charity","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '753bd60f-cf99-578b-ba0f-28a6d7587af8';

UPDATE public.questions SET
  prompt_cs = 'Volající: „Sbíráme na onkologicky nemocné děti, pošlete teď 500 Kč — přečtěte mi číslo karty a CVV."',
  options_cs = '[{"id":"a","label":"Přečtu — chci pomoct","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu a daruji online přes ověřenou nadaci","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '753bd60f-cf99-578b-ba0f-28a6d7587af8';

-- ============================================================================
-- Q155: Rental scam — landlord abroad, asks for deposit by post
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Ad: room in London, £290/month, furnished, near the tube. Landlord: "Send a £580 deposit, I''ll post the keys — I''m abroad at the moment."',
  options_en = '[{"id":"a","label":"Send the deposit — the price is great","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — deposit before an in-person viewing = scam","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'a7229636-2611-53fd-862a-7c722c1ecae6';

UPDATE public.questions SET
  prompt_cs = 'Inzerát: pokoj v Praze, 7 500 Kč/měs, zařízený, u metra. Pronajímatel: „Pošlete zálohu 15 000 Kč, klíče pošlu poštou — sám jsem momentálně v zahraničí."',
  options_cs = '[{"id":"a","label":"Pošlu zálohu — cena je super","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu — záloha před osobní prohlídkou = podvod","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'a7229636-2611-53fd-862a-7c722c1ecae6';

-- ============================================================================
-- Q156: University AIS2 phishing email
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email: "University of London — your access to the student portal will be blocked in 24 hours."',
  options_en = '[{"id":"a","label":"Click — I don''t want to lose module enrolment","correct":false,"severity":"critical"},{"id":"b","label":"Sign in directly at `student.london.ac.uk` — not via the email link","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"IT University of London","fromEmail":"it-support@uol-portal-update.eu","subject":"Mandatory student portal update — access will be revoked","body":"Your access expires. Click and update your details within 24 hours.","cta":"Update student portal"}'::jsonb
WHERE id = 'e9ae9fff-1c18-51b8-9ec6-ec7dfd615ed0';

UPDATE public.questions SET
  prompt_cs = 'Email: „UK Praha — váš přístup do SIS bude zablokován za 24 hodin."',
  options_cs = '[{"id":"a","label":"Kliknu — nechci přijít o zápis předmětů","correct":false,"severity":"critical"},{"id":"b","label":"Přihlásím se přímo na `is.cuni.cz` — ne přes odkaz z emailu","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"IT UK Praha","fromEmail":"it-support@cuni-portal-update.eu","subject":"Povinná aktualizace SIS — zablokujeme přístup k zápisům","body":"Platnost vašeho přístupu vyprší. Klikněte a aktualizujte údaje do 24 hodin.","cta":"Aktualizovat SIS"}'::jsonb
WHERE id = 'e9ae9fff-1c18-51b8-9ec6-ec7dfd615ed0';

-- ============================================================================
-- Q157: Erasmus+ scholarship "verification fee"
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email: "Erasmus+ UK: you have been selected for a £4,500 scholarship. To activate, send a verification fee of £80."',
  options_en = '[{"id":"a","label":"Send £80 — £4,500 is worth it","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — Erasmus+ never asks for an upfront fee","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'd2c95a2d-9d8a-510e-b5b3-a7f7bc5efb52';

UPDATE public.questions SET
  prompt_cs = 'Email: „Erasmus+ Česko: byli jste vybráni na stipendium 117 000 Kč. Pro aktivaci pošlete ověřovací poplatek 2 000 Kč."',
  options_cs = '[{"id":"a","label":"Pošlu 2 000 Kč — 117 000 Kč za to stojí","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — Erasmus+ nikdy nepýtá poplatek předem","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'd2c95a2d-9d8a-510e-b5b3-a7f7bc5efb52';

-- ============================================================================
-- Q158: Slovenská pošta tracking SMS — honeypot (legit notification)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — normal notification about a parcel ready for collection","correct":true,"severity":null},{"id":"b","label":"No — it looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"RoyalMail","body":"Your parcel EE123456789GB is ready for collection at London-Camden Delivery Office for 7 days."}'::jsonb
WHERE id = '63935c7d-4b0c-5918-bb07-a8c4774ce4fc';

UPDATE public.questions SET
  prompt_cs = 'Reagoval bys na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — běžná notifikace o připravené zásilce","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CeskaPosta","body":"Vase zasilka EE123456789CZ je pripravena k vyzvednuti na poste Praha-Smichov po dobu 7 dni."}'::jsonb
WHERE id = '63935c7d-4b0c-5918-bb07-a8c4774ce4fc';

-- ============================================================================
-- Q159: Parcel box pickup code SMS — honeypot (legit)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — I''ll use the code at the locker","correct":true,"severity":null},{"id":"b","label":"No — it looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"InPost","body":"Pickup code: 482913. Valid for 48 hours. Location: InPost Locker Westfield London."}'::jsonb
WHERE id = '5049fa99-75d0-5d61-bebc-e1557d750863';

UPDATE public.questions SET
  prompt_cs = 'Reagoval bys na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — kód použiji u boxu","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"AlzaBox","body":"Vyzvedavaci kod: 482913. Platnost 48 hodin. Lokace: AlzaBox OC Chodov."}'::jsonb
WHERE id = '5049fa99-75d0-5d61-bebc-e1557d750863';

-- ============================================================================
-- Q160: Registered letter notification SMS — honeypot (legit)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — I''ll wait for the postie","correct":true,"severity":null},{"id":"b","label":"No — it looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Royal Mail","body":"Registered letter delivered, please confirm receipt with signature to the postie. Letter ID: RR0091238GB."}'::jsonb
WHERE id = 'a6fc816f-aaf5-5ade-bf7b-c7123ef6ac79';

UPDATE public.questions SET
  prompt_cs = 'Reagoval bys na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — počkám na doručovatele","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Ceska posta","body":"Dorucen doporuceny dopis, prevzeti potvrdte podpisem u dorucovatele. ID dopisu: RR0091238CZ."}'::jsonb
WHERE id = 'a6fc816f-aaf5-5ade-bf7b-c7123ef6ac79';
