-- AH-15.8 batch 5: cultural localization of scam scenarios 161-200
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
-- Q161: Honeypot — PostaSK tracking subdomain (legit)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you click the link in this SMS?',
  options_en = '[{"id":"a","label":"Yes — `track.royalmail.com` is the official Royal Mail tracking subdomain","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"RoyalMail","body":"Tracking your parcel CC918273645GB:","link":"https://track.royalmail.com/?id=CC918273645GB"}'::jsonb
WHERE id = '32e8ed3c-bbf3-5262-929a-c788652c0ed0';

UPDATE public.questions SET
  prompt_cs = 'Klikli byste na odkaz v této SMS?',
  options_cs = '[{"id":"a","label":"Ano — `b2c.ceskaposta.cz` je oficiální subdoména České pošty pro sledování","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CeskaPosta","body":"Sledování zásilky CC918273645CZ:","link":"https://b2c.ceskaposta.cz/?id=CC918273645CZ"}'::jsonb
WHERE id = '32e8ed3c-bbf3-5262-929a-c788652c0ed0';

-- ============================================================================
-- Q162: Honeypot — delivery confirmation SMS (legit, informational)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — just a delivery confirmation, noted","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"RoyalMail","body":"Parcel EH4438122GB was delivered on 28.04.2026 at 14:32, signed for by addressee."}'::jsonb
WHERE id = '1320bfe3-94ab-54e6-859f-b82fbcdbb5cd';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — jen potvrzení o doručení, beru na vědomí","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CeskaPosta","body":"Zásilka EH4438122CZ byla doručena dne 28.04.2026 v 14:32, převzal adresát."}'::jsonb
WHERE id = '1320bfe3-94ab-54e6-859f-b82fbcdbb5cd';

-- ============================================================================
-- Q163: Honeypot — parcel waiting at post office (legit)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — I''ll go and collect it at the post office","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"RoyalMail","body":"Your parcel is waiting at the post office until 02.05.2026. After that date it will be returned to sender."}'::jsonb
WHERE id = '9b981ed2-4397-5f58-920c-8b602827d098';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — zajdu si pro ni na poštu","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CeskaPosta","body":"Vaše zásilka čeká na poště do 02.05.2026. Po tomto datu bude vrácena odesílateli."}'::jsonb
WHERE id = '9b981ed2-4397-5f58-920c-8b602827d098';

-- ============================================================================
-- Q164: Honeypot — postage surcharge on legit subdomain
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you click the link in this SMS?',
  options_en = '[{"id":"a","label":"Yes — `royalmail.com/personal/receiving-mail/pay-a-surcharge` is the official Royal Mail surcharge page","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"RoyalMail","body":"Surcharge for parcel from abroad: £1.50. Details and payment:","link":"https://www.royalmail.com/personal/receiving-mail/pay-a-surcharge/EE883"}'::jsonb
WHERE id = '9f9f5461-540d-51f1-b877-0be69620b3d5';

UPDATE public.questions SET
  prompt_cs = 'Klikli byste na odkaz v této SMS?',
  options_cs = '[{"id":"a","label":"Ano — `ceskaposta.cz/celni-rizeni` je oficiální doména pro celní doplatky","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CeskaPosta","body":"Doplatek za zásilku ze zahraničí: 47 Kč. Detail a platba:","link":"https://www.ceskaposta.cz/celni-rizeni/EE883"}'::jsonb
WHERE id = '9f9f5461-540d-51f1-b877-0be69620b3d5';

-- ============================================================================
-- Q165: Honeypot — call the post-office published number
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — I''ll call the number from the Royal Mail website on my own phone","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"RoyalMail","body":"Parcel collection can be extended. Call 03457 740 740."}'::jsonb
WHERE id = 'c1f427e6-e929-5be5-8496-786e032da6c1';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — zavolám ze svého telefonu na číslo z webu České pošty","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CeskaPosta","body":"Vyzvednutí zásilky lze prodloužit. Volejte 954 292 292."}'::jsonb
WHERE id = 'c1f427e6-e929-5be5-8496-786e032da6c1';

-- ============================================================================
-- Q166: Honeypot — bank verification code SMS (legit, only enter on bank''s own surface)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — I''ll enter the code only in the app / on hsbc.co.uk that I opened myself","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"HSBC","body":"Verification code: 472918. Do not share it with anyone, not even a bank employee."}'::jsonb
WHERE id = '1a6cc616-eb24-54a4-a2ae-807338cef4e9';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — kód zadám jen v aplikaci / na webu kb.cz, který jsem si otevřel sám","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"KB","body":"Ověřovací kód: 472918. Nesdílejte ho s nikým, ani s pracovníkem banky."}'::jsonb
WHERE id = '1a6cc616-eb24-54a4-a2ae-807338cef4e9';

-- ============================================================================
-- Q167: Honeypot — own transaction notification (legit informational)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — just a notification about my own payment","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Barclays","body":"Payment £25.40 at TESCO LONDON authorised on card *4821 on 28.04 at 17:14."}'::jsonb
WHERE id = 'f62b78cb-90cd-5ef2-ab4c-c34358c6cc6d';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — jen notifikace o mé vlastní platbě","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CeskaSporitelna","body":"Platba 660 Kč v TESCO PRAHA byla autorizována z karty *4821 dne 28.04 v 17:14."}'::jsonb
WHERE id = 'f62b78cb-90cd-5ef2-ab4c-c34358c6cc6d';

-- ============================================================================
-- Q168: Honeypot — 3DS code matching my actual Amazon purchase
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — I''m just paying on Amazon, I''ll enter the code","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"NatWest","body":"3D Secure code: 882134. To confirm payment AMAZON £47.90. Valid for 5 min."}'::jsonb
WHERE id = 'eb19cafa-6dd4-52fb-a7cd-db8c9d413e16';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — právě platím na Amazonu, kód zadám","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"AirBank","body":"3D Secure kód: 882134. Pro potvrzení platby AMAZON 1 245 Kč. Platnost 5 min."}'::jsonb
WHERE id = 'eb19cafa-6dd4-52fb-a7cd-db8c9d413e16';

-- ============================================================================
-- Q169: Honeypot — salary credited notification (legit)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — my salary, just noted","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Lloyds","body":"Salary £1,234.56 credited to account *7821 on 28.04.2026."}'::jsonb
WHERE id = 'a591a585-6fe9-58ef-a6cc-031e29343ac2';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — moje výplata, jen beru na vědomí","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CSOB","body":"Výplata mzdy 32 100 Kč připsána na účet *7821 dne 28.04.2026."}'::jsonb
WHERE id = 'a591a585-6fe9-58ef-a6cc-031e29343ac2';

-- ============================================================================
-- Q170: Honeypot — adding new payee in app (legit, matches my action)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — I''m just adding a payee in the app, I''ll enter the code","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"FirstDirect","body":"Adding new payee John Smith GB12 HBUK 4000 5012 3456 78 in First Direct app. Code: 661482."}'::jsonb
WHERE id = '7644c1c4-d285-5ab1-8ea3-593fc943b98b';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — právě v appce přidávám příjemce, kód zadám","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"FioBanka","body":"Přidání nového příjemce Jan Novák CZ65 2010 0000 0029 1234 5678 v aplikaci Fio. Kód: 661482."}'::jsonb
WHERE id = '7644c1c4-d285-5ab1-8ea3-593fc943b98b';

-- ============================================================================
-- Q171: Honeypot — ATM withdrawal notification (legit)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — I just withdrew, just a confirmation","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Monzo","body":"Withdrawal £100 at ATM LONDON SHELL on card *3344 on 28.04 at 18:42."}'::jsonb
WHERE id = '97392731-70b2-528c-af03-d76b3b67c338';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — právě jsem vybíral, jen potvrzení","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Revolut","body":"Výběr 2 600 Kč z bankomatu PRAHA SHELL z karty *3344 dne 28.04 v 18:42."}'::jsonb
WHERE id = '97392731-70b2-528c-af03-d76b3b67c338';

-- ============================================================================
-- Q172: Honeypot — tax refund notification from HMRC / Finanční úřad
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — just an informational update on my tax return","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"HMRC","body":"Your self-assessment return for tax year 2024/25 has been processed. Refund £87.40 will be paid to your account within 30 days."}'::jsonb
WHERE id = '4a9269ed-ea97-5599-b6e4-914b57391f2d';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — jen informace o zpracování mého přiznání","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"FinUrad","body":"Vaše daňové přiznání typ B za rok 2025 bylo zpracováno. Přeplatek 2 270 Kč bude připsán na účet do 30 dní."}'::jsonb
WHERE id = '4a9269ed-ea97-5599-b6e4-914b57391f2d';

-- ============================================================================
-- Q173: Honeypot — government inbox notification (gov.uk / mojedatovaschranka)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — I''ll log in via Government Gateway on gov.uk manually","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"gov.uk","body":"You have a new message in your personal tax account. To view it, sign in via Government Gateway on gov.uk."}'::jsonb
WHERE id = 'ae91d5ae-b6b6-52ff-8e55-361ee71f31a4';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — přihlásím se přes identitu občana na portal.gov.cz ručně","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"mojedatovka","body":"V datové schránce máte nové podání. Pro zobrazení se přihlaste přes Identitu občana na portal.gov.cz."}'::jsonb
WHERE id = 'ae91d5ae-b6b6-52ff-8e55-361ee71f31a4';

-- ============================================================================
-- Q174: Honeypot — sick-pay benefit notification (legit)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — my SSP, just a confirmation","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"DWP","body":"Statutory Sick Pay for period 14.04-25.04.2026 in the amount of £312.80 paid out on 28.04.2026."}'::jsonb
WHERE id = '4bd3d488-7bab-5f3c-907f-4cd39f3f7203';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — moje nemocenská, jen potvrzení","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CSSZ","body":"Nemocenská za období 14.04-25.04.2026 ve výši 8 130 Kč vyplacena dne 28.04.2026."}'::jsonb
WHERE id = '4bd3d488-7bab-5f3c-907f-4cd39f3f7203';

-- ============================================================================
-- Q175: Honeypot — e-sick-note from doctor (legit, open in own app)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you react to this SMS?',
  options_en = '[{"id":"a","label":"Yes — my GP, I''ll open the NHS app manually","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"NHS","body":"Your GP has issued you a fit note no. 2026/04/8821, valid from 28.04.2026. Details in the NHS app."}'::jsonb
WHERE id = 'a610af3b-0745-538b-ba8a-e4f59b8412ee';

UPDATE public.questions SET
  prompt_cs = 'Reagovali byste na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — můj lékař, otevřu aplikaci eRecept ručně","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"eNeschopenka","body":"Lékař vám dnes vystavil eNeschopenku č. 2026/04/8821, platnost od 28.04.2026. Detaily v aplikaci eRecept."}'::jsonb
WHERE id = 'a610af3b-0745-538b-ba8a-e4f59b8412ee';

-- ============================================================================
-- Q176: Honeypot — post office customs link, legit subdomain
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you click the link in this SMS?',
  options_en = '[{"id":"a","label":"Yes — `track.royalmail.com` is a legit subdomain, I''ll check the code","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"RoyalMail","body":"Your parcel has cleared customs. Tracking:","link":"https://track.royalmail.com/?id=RA8821736GB"}'::jsonb
WHERE id = 'b0003b2a-17fd-52ac-bedc-f4dd415abbcf';

UPDATE public.questions SET
  prompt_cs = 'Klikli byste na odkaz v této SMS?',
  options_cs = '[{"id":"a","label":"Ano — `b2c.ceskaposta.cz` je legitimní subdoména, kód si ověřím","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"CeskaPosta","body":"Vaše zásilka prošla celní kontrolou. Sledování:","link":"https://b2c.ceskaposta.cz/?id=RA8821736CZ"}'::jsonb
WHERE id = 'b0003b2a-17fd-52ac-bedc-f4dd415abbcf';

-- ============================================================================
-- Q177: Honeypot — bank security link on legit domain
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you click the link in this SMS?',
  options_en = '[{"id":"a","label":"Yes — `hsbc.co.uk` is legit, I''ll deal with it immediately","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"HSBC","body":"Unusual sign-in detected from a new device (Manchester, UK). If this wasn''t you:","link":"https://www.hsbc.co.uk/security/block-access"}'::jsonb
WHERE id = '1021aee2-181a-5b32-8ef2-cb294d1187c7';

UPDATE public.questions SET
  prompt_cs = 'Klikli byste na odkaz v této SMS?',
  options_cs = '[{"id":"a","label":"Ano — `kb.cz` je legitimní, hned to řeším","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"KB","body":"Detekováno neobvyklé přihlášení z nového zařízení (Bratislava, SK). Pokud to nebyl vy:","link":"https://www.kb.cz/security/zablokovat-pristup"}'::jsonb
WHERE id = '1021aee2-181a-5b32-8ef2-cb294d1187c7';

-- ============================================================================
-- Q178: Phishing — fake "doctor" emailing about insurance card via Gmail
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from a "GP". Reaction?',
  options_en = '[{"id":"a","label":"Fill it in — I don''t want to lose my NHS access","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — GPs never confirm details via Gmail","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Dr. Jane Short","fromEmail":"surgery.short@gmail-clinic.com","subject":"Your NHS card requires confirmation of details","body":"Hello. Your NHS card will be deactivated within 48h unless you confirm your details. Click and fill in your NI number and GP practice.","cta":"Confirm details"}'::jsonb
WHERE id = '1baba37f-bc46-5c68-89f4-52dde89bed93';

UPDATE public.questions SET
  prompt_cs = 'E-mail od „lékaře". Reakce?',
  options_cs = '[{"id":"a","label":"Vyplním — nechci přijít o průkaz pojištěnce","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — ordinace nikdy takto nepotvrzují údaje přes Gmail","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"MUDr. Jana Krátká","fromEmail":"ordinace.kratka@gmail-clinic.com","subject":"Vaše karta pojištěnce vyžaduje potvrzení údajů","body":"Dobrý den. Vaše elektronická karta pojištěnce bude deaktivována do 48h, pokud nepotvrdíte údaje. Klikněte a vyplňte rodné číslo a zdravotní pojišťovnu.","cta":"Potvrdit údaje"}'::jsonb
WHERE id = '1baba37f-bc46-5c68-89f4-52dde89bed93';

-- ============================================================================
-- Q179: Phishing — fake Microsoft patch email to hospital IT
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email for a hospital worker. Action?',
  options_en = '[{"id":"a","label":"Run it — IT didn''t respond, I''ll deal with it","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — Microsoft delivers patches via WSUS, not email and a .org domain","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Updates Microsoft","fromEmail":"security-updates@windows-patch-2026.org","subject":"Critical security update — hospital systems","body":"To support isolated hospital networks, a necessary security update has been released. Download and run the attached installer with admin rights.","cta":"Download patch.exe"}'::jsonb
WHERE id = 'beeb425b-e5c4-5278-8cca-6e4b84d40ff9';

UPDATE public.questions SET
  prompt_cs = 'E-mail pro nemocničního pracovníka. Akce?',
  options_cs = '[{"id":"a","label":"Spustím — IT se neozvalo, vyřeším to","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — Microsoft posílá patch přes WSUS, ne přes e-mail a .org doménu","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Updates Microsoft","fromEmail":"security-updates@windows-patch-2026.org","subject":"Kritická bezpečnostní aktualizace — nemocniční systémy","body":"Pro podporu izolovaných nemocničních sítí přibyla nutná bezpečnostní aktualizace. Stáhněte a spusťte přiložený instalátor s admin právy.","cta":"Stáhnout patch.exe"}'::jsonb
WHERE id = 'beeb425b-e5c4-5278-8cca-6e4b84d40ff9';

-- ============================================================================
-- Q180: Scenario — patient asks nurse to SMS prescription
-- ============================================================================
UPDATE public.questions SET
  prompt_en = '"Patient" asks the receptionist: "send me my prescription".',
  options_en = '[{"id":"a","label":"Send an SMS with the prescription number — helping a senior","correct":false,"severity":"medium"},{"id":"b","label":"Refuse — e-prescriptions aren''t sent by SMS; the pharmacy retrieves them by NHS number","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"text","label":"Phone call to reception","body":"Mr. Holman: ''Hello, my father can''t come in today. Please text me his insulin prescription and I''ll pick it up at the chemist for him.''"}'::jsonb
WHERE id = 'c8339e43-9d4e-5d83-8574-b236ebc2e59e';

UPDATE public.questions SET
  prompt_cs = 'Pacient žádá sestru „pošlete mi recept".',
  options_cs = '[{"id":"a","label":"Pošlu SMS s číslem receptu — pomáhám seniorovi","correct":false,"severity":"medium"},{"id":"b","label":"Odmítnu — eRecepty se neposílají SMS, lékárna je vyhledá podle rodného čísla","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"text","label":"Telefonát na recepci","body":"Pan Holman: „Dobrý den, můj otec dnes nemůže přijít. Pošlete mi prosím SMS s receptem na inzulin, já mu ho vyzvednu v lékárně.\""}'::jsonb
WHERE id = 'c8339e43-9d4e-5d83-8574-b236ebc2e59e';

-- ============================================================================
-- Q181: Phishing — urgent freight redispatch with .online domain
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email to a freight dispatcher. Action?',
  options_en = '[{"id":"a","label":"Send CMR and reg plate — the price is good, urgent","correct":false,"severity":"critical"},{"id":"b","label":"Verify via TimoCom / call the company from its website — no confirmations via a .online domain","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Logistics Partner DE","fromEmail":"dispo@logisticspartner-de.online","subject":"New job 24t Frankfurt → London — urgent re-dispatch","body":"The original carrier dropped out. Price £2,200 (£250 above market). We need CMR and vehicle reg plate for confirmation within 1 hour — reply to this address.","cta":"Reply with CMR + reg plate"}'::jsonb
WHERE id = '2044a48f-9b1b-5b88-9ee0-53bf07b8c35d';

UPDATE public.questions SET
  prompt_cs = 'E-mail pro dispečera přepravní firmy. Akce?',
  options_cs = '[{"id":"a","label":"Pošlu CMR a SPZ — cena je dobrá, urgent","correct":false,"severity":"critical"},{"id":"b","label":"Ověřuji přes TimoCom / volání do firmy z webu — žádné potvrzování přes .online doménu","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Logistics Partner DE","fromEmail":"dispo@logisticspartner-de.online","subject":"Nová zakázka 24t Frankfurt → Praha — urgentní re-dispatch","body":"Původní dopravce odpadl. Cena 57 200 Kč (6 500 nad trh). Potřebujeme CMR a SPZ vozidla na potvrzení do 1 hodiny — odpověď na tuto adresu.","cta":"Odpovědět s CMR + SPZ"}'::jsonb
WHERE id = '2044a48f-9b1b-5b88-9ee0-53bf07b8c35d';

-- ============================================================================
-- Q182: Fake-vs-real — .icu domain + foreign IBAN advance payment
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'PDF attached to an email from a "new carrier". Action?',
  options_en = '[{"id":"a","label":"Pay the advance — we have CMR, it''s fine","correct":false,"severity":"critical"},{"id":"b","label":"Verify the company in Companies House and TimoCom — a `.icu` domain and SI IBAN are red flags","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Mark B., dispatcher","fromEmail":"dispatch@trans-express-eu.icu","subject":"CMR confirmed — vehicle reg AB12 XYZ","body":"Attached is the signed CMR and broker letter. Please transfer the 30% advance to IBAN SI56 ... before loading.","cta":"Open CMR.pdf"}'::jsonb
WHERE id = '47499fde-302d-5d0c-b9b5-88e44b7000dc';

UPDATE public.questions SET
  prompt_cs = 'PDF přiložené k mailu od „nového dopravce". Akce?',
  options_cs = '[{"id":"a","label":"Zaplatím zálohu — máme CMR, je to v pořádku","correct":false,"severity":"critical"},{"id":"b","label":"Ověřuji firmu přes obchodní rejstřík a TimoCom — `.icu` doména a SI IBAN jsou red flag","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Marek B., dispatcher","fromEmail":"dispatch@trans-express-eu.icu","subject":"Potvrzený CMR — vozidlo SPZ 2AB 1234","body":"V příloze podepsaný CMR a list o zprostředkování. Prosím o úhradu zálohy 30 % na účet IBAN SI56 ... před naložením.","cta":"Otevřít CMR.pdf"}'::jsonb
WHERE id = '47499fde-302d-5d0c-b9b5-88e44b7000dc';

-- ============================================================================
-- Q183: Phishing — bulk order via personal email, no PO
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You own an e-shop. An order arrives by email (not via the admin panel). Reaction?',
  options_en = '[{"id":"a","label":"Send invoice and IBAN — big order, the boss will be happy","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — orders go through the e-shop; any B2B goes through a Companies-House-verified entity","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Roman Carver","fromEmail":"roman.carver.firm@outlook.com","subject":"Bulk order — 25× ASUS laptop, urgent","body":"Hello, we''re a company from DE, we need 25 ASUS laptops for tomorrow. Urgent, client is waiting. Send the invoice and payment details. PO will follow.","cta":"Reply with IBAN"}'::jsonb
WHERE id = 'bf04208f-7914-52a7-9a7f-b930cf0b6154';

UPDATE public.questions SET
  prompt_cs = 'Jste majitel e-shopu. Přijde objednávka e-mailem (ne přes admin panel). Reakce?',
  options_cs = '[{"id":"a","label":"Pošlu fakturu a IBAN — velká objednávka, šéf bude rád","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu — objednávky chodí přes e-shop, žádné B2B mimo subjekt ověřený v obchodním rejstříku","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Roman Kovář","fromEmail":"roman.kovar.firma@outlook.com","subject":"Hromadná objednávka — 25× notebook ASUS, spěchá","body":"Dobrý den, jsme firma z DE, potřebujeme 25 ks notebooků ASUS na zítra. Spěchá, klient čeká. Pošlete fakturu a údaje na úhradu. PO bude posláno později.","cta":"Odpovědět s IBAN"}'::jsonb
WHERE id = 'bf04208f-7914-52a7-9a7f-b930cf0b6154';

-- ============================================================================
-- Q184: Phishing — refund to a "new IBAN" request
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Customer-care email in the e-shop admin panel. Action?',
  options_en = '[{"id":"a","label":"Send the refund to the new IBAN — customer is entitled","correct":false,"severity":"critical"},{"id":"b","label":"Refund only to the original IBAN used for payment; request warehouse proof","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Anna Newman","fromEmail":"anna.newman1991@gmail.com","subject":"Complaint about order #45821 — missing items","body":"Hello, 2 items are missing from the parcel (phone case + cable). I have a photo. Please refund £47.80 to a new IBAN GB00 BARC ... — the original account is blocked. Send the invoice by email.","cta":"Refund"}'::jsonb
WHERE id = 'ee11bb97-f0a6-5076-a0c3-07cc2bd6a690';

UPDATE public.questions SET
  prompt_cs = 'Zákaznický e-mail v admin panelu e-shopu. Akce?',
  options_cs = '[{"id":"a","label":"Pošlu refund na nový IBAN — zákazník má nárok","correct":false,"severity":"critical"},{"id":"b","label":"Refund jen na původní IBAN použitý při platbě; vyžádám si doklad ze skladu","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Anna Nováková","fromEmail":"anna.novak1991@gmail.com","subject":"Reklamace objednávky #45821 — chybějící položky","body":"Dobrý den, v zásilce chybí 2 položky (kryt na mobil + kabel). Mám fotku. Prosím refund 1 245 Kč na nový IBAN CZ00 0300 ... — původní účet je zablokovaný. Fakturu pošlete e-mailem.","cta":"Vrátit peníze"}'::jsonb
WHERE id = 'ee11bb97-f0a6-5076-a0c3-07cc2bd6a690';

-- ============================================================================
-- Q185: BEC — supplier "changed IBAN" email
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from supplier with an updated invoice. Reaction?',
  options_en = '[{"id":"a","label":"Update the IBAN in the accounting system and pay","correct":false,"severity":"critical"},{"id":"b","label":"Call the supplier on the number from their website and verify the IBAN change in person","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Accounting — Logistics UK","fromEmail":"accounting@logistics-uk.com","subject":"Updated invoice no. 2026/0428 — change of bank account","body":"Hello, attached is an updated invoice. Please pay to the NEW IBAN: GB56 NWBK ... (the original account was closed due to reorganisation). Due date remains 5 days.","cta":"Open invoice.pdf"}'::jsonb
WHERE id = '254ca883-432c-55e5-9db9-276c65f3add6';

UPDATE public.questions SET
  prompt_cs = 'E-mail od dodavatele s aktualizovanou fakturou. Reakce?',
  options_cs = '[{"id":"a","label":"Změním IBAN v účetním systému a zaplatím","correct":false,"severity":"critical"},{"id":"b","label":"Zavolám dodavateli na číslo z webu a osobně ověřím změnu IBAN","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Účetnictví — Logistika CZ","fromEmail":"uctarna@logistika-cz.com","subject":"Aktualizovaná faktura č. 2026/0428 — změna bankovního účtu","body":"Dobrý den, přikládám aktualizovanou fakturu. Prosíme o úhradu na NOVÝ IBAN: CZ56 0100 ... (původní účet byl zrušen kvůli reorganizaci). Splatnost zůstává 5 dní.","cta":"Otevřít fakturu.pdf"}'::jsonb
WHERE id = '254ca883-432c-55e5-9db9-276c65f3add6';

-- ============================================================================
-- Q186: Phishing — fake e-shop admin platform security alert
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from "Shopify" to an e-shop admin. Action?',
  options_en = '[{"id":"a","label":"Sign in via the link — I don''t want to lose my e-shop","correct":false,"severity":"critical"},{"id":"b","label":"Ignore the link; open Shopify manually from a bookmark and check active sessions","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Shopify Security","fromEmail":"security@shopify-admin-uk.com","subject":"Unauthorised sign-in detected — verify your account within 24h","body":"Hello, your admin account will be suspended within 24h due to a suspicious sign-in. To restore, sign in here and confirm 2FA.","cta":"Verify account"}'::jsonb
WHERE id = 'cafdc340-b861-59d0-92c4-6495208beb9b';

UPDATE public.questions SET
  prompt_cs = 'E-mail od „Shoptetu" administrátorovi e-shopu. Akce?',
  options_cs = '[{"id":"a","label":"Přihlásím se přes link — nechci přijít o e-shop","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji link; otevřu Shoptet ručně přes záložku a zkontroluji aktivní přihlášení","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Shoptet Security","fromEmail":"security@shoptet-admin-cz.com","subject":"Detekováno neoprávněné přihlášení — ověřte účet do 24h","body":"Dobrý den, váš admin účet bude pozastaven do 24h kvůli podezřelému přihlášení. Pro obnovu se přihlaste zde a potvrďte 2FA.","cta":"Ověřit účet"}'::jsonb
WHERE id = 'cafdc340-b861-59d0-92c4-6495208beb9b';

-- ============================================================================
-- Q187: Phishing — restaurant group-reservation .docx attachment
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A restaurant gets an email with a large group reservation. Open the attachment?',
  options_en = '[{"id":"a","label":"Open the attachment — I want to see the requirements","correct":false,"severity":"critical"},{"id":"b","label":"Reply asking for a phone contact; don''t open the attachment without verification","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Eventes London","fromEmail":"events@eventes-london.online","subject":"Reservation for 50 — company party 15.05.2026","body":"Hello, we''d like to book the whole restaurant for 50 people. Attached is menu_preferences.docx with our requirements and the coordinator''s contact.","cta":"Open menu_preferences.docx"}'::jsonb
WHERE id = '1e4c95ef-50fd-5544-8308-7bfdb6dd1764';

UPDATE public.questions SET
  prompt_cs = 'Restaurace dostane e-mail s velkou skupinovou rezervací. Otevřete přílohu?',
  options_cs = '[{"id":"a","label":"Otevřu přílohu — chci si projít požadavky","correct":false,"severity":"critical"},{"id":"b","label":"Odpovím s prosbou o telefonický kontakt; přílohu neotevírám bez ověření","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Eventes Praha","fromEmail":"events@eventes-praha.online","subject":"Rezervace 50 osob — firemní oslava 15.05.2026","body":"Dobrý den, chceme rezervovat celou restauraci pro 50 osob. V příloze menu_preferences.docx s našimi požadavky a kontakt na koordinátora.","cta":"Otevřít menu_preferences.docx"}'::jsonb
WHERE id = '1e4c95ef-50fd-5544-8308-7bfdb6dd1764';

-- ============================================================================
-- Q188: Phishing — "Verifone technician" calling for POS admin PIN
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Call to the restaurant manager. Reaction?',
  options_en = '[{"id":"a","label":"Read out the terminal ID and PIN — I can''t run without the POS","correct":false,"severity":"critical"},{"id":"b","label":"Hang up and call Verifone on the number from your invoice / the manufacturer''s website","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"call","caller":"\"Verifone Technician\"","number":"unknown number","hint":"Claims a remote update to the POS terminal is required — needs the terminal ID and admin PIN, otherwise it will stop working."}'::jsonb
WHERE id = '69e9ed0f-3e42-59d9-bec0-7a4330ffca12';

UPDATE public.questions SET
  prompt_cs = 'Volání pro provozního restaurace. Reakce?',
  options_cs = '[{"id":"a","label":"Nadiktuji ID a PIN — bez POS nemůžu fungovat","correct":false,"severity":"critical"},{"id":"b","label":"Položím to a zavolám Verifone na číslo z faktury / web stránky výrobce","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"„Technik Verifone“","number":"neznámé číslo","hint":"Tvrdí, že je nutná dálková aktualizace POS terminálu — potřebuje ID terminálu a PIN správce, jinak přestane fungovat."}'::jsonb
WHERE id = '69e9ed0f-3e42-59d9-bec0-7a4330ffca12';

-- ============================================================================
-- Q189: Phishing — fake new supplier with too-good prices
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A new supplier of fresh produce sends an email to the kitchen. Reaction?',
  options_en = '[{"id":"a","label":"Send Company Number/VAT and order — good price","correct":false,"severity":"critical"},{"id":"b","label":"Verify the farm in Companies House + the FSA registry before any further communication","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Bio Farm Cotswolds","fromEmail":"orders@biofarm-cotswolds.shop","subject":"Special offer — organic meat 30% cheaper","body":"Hello, we''re a new organic farm in the Cotswolds. We offer meat 30% cheaper than the competition. Just send your order and Company Number/VAT for a pro forma — delivery within 48h.","cta":"Order"}'::jsonb
WHERE id = '48766657-4d9f-501f-8f25-ac4da528a3d6';

UPDATE public.questions SET
  prompt_cs = 'Nový dodavatel čerstvých produktů pro kuchyni pošle e-mail. Reakce?',
  options_cs = '[{"id":"a","label":"Pošlu IČO/DIČ a objednám — výhodná cena","correct":false,"severity":"critical"},{"id":"b","label":"Ověřím farmu přes obchodní rejstřík + Státní veterinární správu před jakoukoli komunikací","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Bio Farma Vysočina","fromEmail":"objednavky@biofarma-vysocina.shop","subject":"Speciální nabídka — bio maso o 30 % levněji","body":"Dobrý den, jsme nová bio farma z Vysočiny. Nabízíme maso o 30 % levněji než konkurence. Stačí poslat objednávku a IČO/DIČ na předfakturu — zboží dovezeme do 48h.","cta":"Objednat"}'::jsonb
WHERE id = '48766657-4d9f-501f-8f25-ac4da528a3d6';

-- ============================================================================
-- Q190: Phishing — "buyer" requesting full service history via Protonmail
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email to a garage from a "client". Reaction?',
  options_en = '[{"id":"a","label":"Send the history — buyers have a right to know","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — records go only to the verified owner (ID + V5C logbook)","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Peter — buyer","fromEmail":"buying.skoda@protonmail.com","subject":"Service history check — VIN TMBJG7NE5L0123456","body":"Hello, I''m buying a used car and would like to verify whether it was serviced at your garage. Please send all service records + the seller''s name and phone number."}'::jsonb
WHERE id = '517fb81a-3e7a-5477-93bf-d31dc47738e0';

UPDATE public.questions SET
  prompt_cs = 'E-mail pro autoservis od „klienta". Reakce?',
  options_cs = '[{"id":"a","label":"Pošlu historii — kupující má právo vědět","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu — záznamy posílám jen ověřenému majiteli (občanský + technický průkaz)","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Petr — kupující","fromEmail":"kupuji.skoda@protonmail.com","subject":"Žádost o ověření servisní historie — VIN TMBJG7NE5L0123456","body":"Dobrý den, kupuji ojeté auto a chtěl bych ověřit, jestli bylo servisováno u vás. Pošlete prosím všechny servisní záznamy + jméno prodávajícího a jeho telefon."}'::jsonb
WHERE id = '517fb81a-3e7a-5477-93bf-d31dc47738e0';

-- ============================================================================
-- Q191: Phishing — WhatsApp order from unknown +44 number
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A tyre shop is messaged on WhatsApp by an unknown number.',
  options_en = '[{"id":"a","label":"Send IBAN — pro forma payment is fine","correct":false,"severity":"critical"},{"id":"b","label":"Refuse WhatsApp orders; only in person or via our e-shop with 3DS payment","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"+44 7700 900882","body":"Hi, I need 4 Continental 205/55 R16 summer tyres for tomorrow. I''ll pay by pro forma. Send IBAN."}'::jsonb
WHERE id = 'a4f9e3c4-cc27-525c-be40-5b27ff4caa5a';

UPDATE public.questions SET
  prompt_cs = 'Pneuservisu napíše neznámé číslo na WhatsApp.',
  options_cs = '[{"id":"a","label":"Pošlu IBAN — předfaktura je v pohodě","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu WhatsApp objednávky; jen osobně, nebo přes náš e-shop s 3DS platbou","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"+420 720 555 882","body":"Dobry den, potrebuji 4 ks letnich pneu Continental 205/55 R16 na zitra. Plat predfakturou. Poslete IBAN."}'::jsonb
WHERE id = 'a4f9e3c4-cc27-525c-be40-5b27ff4caa5a';

-- ============================================================================
-- Q192: Scenario — "client" demanding payment to third party after repair
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A garage gets a call a week after a major repair. Reaction?',
  options_en = '[{"id":"a","label":"Send £2,800 — I don''t want trouble","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — all complaints go through insurance and in writing; no direct payments to a third party","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"call","caller":"\"Client — Mr. Howard\"","number":"unknown number","hint":"Claims that after your repair, engine braking caused him to crash into another car. The other driver wants £2,800. The \"client\" wants you to send the money directly to the other driver by IBAN to avoid court."}'::jsonb
WHERE id = '3ec7ff1b-127e-57d1-afae-c1803a5c9805';

UPDATE public.questions SET
  prompt_cs = 'Volání autoservisu týden po velké opravě. Reakce?',
  options_cs = '[{"id":"a","label":"Pošlu 73 000 Kč — nechci mít problém","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu — všechny reklamace přes pojistku a písemně, žádné přímé platby třetí straně","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"„Klient — pan Horváth“","number":"neznámé číslo","hint":"Tvrdí, že po vaší opravě brzdil motorem a narazil do jiného auta. Druhý řidič žádá 73 000 Kč. „Klient“ chce, abyste poslali peníze přímo druhému řidiči přes IBAN, vyhnete se tím soudu."}'::jsonb
WHERE id = '3ec7ff1b-127e-57d1-afae-c1803a5c9805';

-- ============================================================================
-- Q193: Phishing — fake npm maintainer-invite email
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'GitHub-style email to a developer. Reaction?',
  options_en = '[{"id":"a","label":"Sign in via the link — nice show of trust by a colleague","correct":false,"severity":"critical"},{"id":"b","label":"Ignore; open npmjs.com manually from a bookmark and check invitations","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"npm support","fromEmail":"support@npmjs-helpdesk.com","subject":"You''ve been added as maintainer to package `react-utils-pro`","body":"Hi, user `m4int4iner` has added you as a maintainer to react-utils-pro (12k weekly downloads). To accept and publish your first release, sign in here with your npm token.","cta":"Accept maintainer role"}'::jsonb
WHERE id = 'fe5e6d7d-379f-5b7f-b6f8-9d2f84661736';

UPDATE public.questions SET
  prompt_cs = 'GitHub-bot e-mail vývojáři. Reakce?',
  options_cs = '[{"id":"a","label":"Přihlásím se přes link — hezká důvěra od kolegy","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji; otevřu npmjs.com ručně přes záložku a zkontroluji invitations","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"npm support","fromEmail":"support@npmjs-helpdesk.com","subject":"You''ve been added as maintainer to package `react-utils-pro`","body":"Hi, user `m4int4iner` has added you as a maintainer to react-utils-pro (12k weekly downloads). To accept and publish your first release, sign in here with your npm token.","cta":"Accept maintainer role"}'::jsonb
WHERE id = 'fe5e6d7d-379f-5b7f-b6f8-9d2f84661736';

-- ============================================================================
-- Q194: OAuth consent — overprivileged scope request
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'GitHub OAuth consent screen. Approve?',
  options_en = '[{"id":"a","label":"Approve — it''s github.com and I want to try it","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — `delete_repo` + `workflow` scope for an unknown app is a no-go","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://github.com/login/oauth/authorize?client_id=8a3d&scope=repo,workflow,delete_repo","secure":true}'::jsonb
WHERE id = 'ddd3cb73-b3d7-55f7-8c34-71c7eb928ea3';

UPDATE public.questions SET
  prompt_cs = 'GitHub OAuth consent obrazovka. Schválíte?',
  options_cs = '[{"id":"a","label":"Schválím — je to github.com a chci to zkusit","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu — `delete_repo` + `workflow` scope pro neznámou app je no-go","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://github.com/login/oauth/authorize?client_id=8a3d&scope=repo,workflow,delete_repo","secure":true}'::jsonb
WHERE id = 'ddd3cb73-b3d7-55f7-8c34-71c7eb928ea3';

-- ============================================================================
-- Q195: Phishing — fake LinkedIn recruiter with "coding assignment" repo
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'LinkedIn DM from a recruiter. Click on the repo with the test assignment?',
  options_en = '[{"id":"a","label":"Clone and run — I want the job","correct":false,"severity":"critical"},{"id":"b","label":"First verify the recruiter profile + company on LinkedIn with 2nd-degree connections; never run the repo without a sandbox","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"text","label":"LinkedIn DM","body":"Hi! We have a Senior Backend role at a US fintech ($120k–$160k remote). First round is a 90-min coding assignment — clone this repo and run `npm install && npm start`, then submit a PR. Repo: github.com/jobs-backend-tasks/payment-api-v2"}'::jsonb
WHERE id = '2b7152be-9719-5320-adea-b8cae89fe0ec';

UPDATE public.questions SET
  prompt_cs = 'LinkedIn DM od recruitera. Kliknete na repo s test assignmentem?',
  options_cs = '[{"id":"a","label":"Klonuji a spustím — chci práci","correct":false,"severity":"critical"},{"id":"b","label":"Nejprve ověřím profil recruitera + společnost přes LinkedIn s 2nd-degree connections; repo NESpouštím bez sandboxu","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"text","label":"LinkedIn DM","body":"Hi! We have a Senior Backend role at a US fintech ($120k–$160k remote). First round is a 90-min coding assignment — clone this repo and run `npm install && npm start`, then submit a PR. Repo: github.com/jobs-backend-tasks/payment-api-v2"}'::jsonb
WHERE id = '2b7152be-9719-5320-adea-b8cae89fe0ec';

-- ============================================================================
-- Q196: Honeypot — real bank security email on legit domain
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from the bank, genuinely urgent tone. Reaction?',
  options_en = '[{"id":"a","label":"Legit — `barclays.co.uk` is the official domain, the steps lead to the app","correct":true,"severity":null},{"id":"b","label":"Phishing — banks never send urgent emails","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"Barclays — security","fromEmail":"security@barclays.co.uk","subject":"Unusual sign-in from a new device (Linz, AT)","body":"Today at 03:14 someone attempted to sign in to your account from a new device in Linz. If this wasn''t you, sign in to Online Banking and remove the device in the ''Active devices'' section. Change your password via the Barclays app."}'::jsonb
WHERE id = '330064e6-53e2-51f3-a9dd-b034c84678bf';

UPDATE public.questions SET
  prompt_cs = 'E-mail od banky, opravdu urgentní tón. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — `csas.cz` je oficiální doména, postup vede do appky","correct":true,"severity":null},{"id":"b","label":"Phishing — banka nikdy neposílá urgentní e-maily","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Česká spořitelna — bezpečnost","fromEmail":"bezpecnost@csas.cz","subject":"Neobvyklé přihlášení z nového zařízení (Linz, AT)","body":"Dnes ve 03:14 se někdo pokusil přihlásit na váš účet z nového zařízení v Linci. Pokud to nebyl(a) jste vy, přihlaste se do internetového bankovnictví a v sekci „Aktivní zařízení\" zařízení odhlaste. Heslo změňte přes aplikaci George."}'::jsonb
WHERE id = '330064e6-53e2-51f3-a9dd-b034c84678bf';

-- ============================================================================
-- Q197: Honeypot — real GitHub verification email
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email after a sign-in attempt. Click?',
  options_en = '[{"id":"a","label":"Legit — I signed in myself from a new laptop","correct":true,"severity":null},{"id":"b","label":"Phishing — `verify` links are always suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"GitHub","fromEmail":"noreply@github.com","subject":"[GitHub] Please verify your device","body":"We''ve detected a sign-in to your account from a new device. To continue, click the verification link below. If this wasn''t you, change your password.","cta":"Verify device"}'::jsonb
WHERE id = '0424f276-54cc-5853-b437-8e52cb4d7d96';

UPDATE public.questions SET
  prompt_cs = 'E-mail po pokusu o přihlášení. Kliknete?',
  options_cs = '[{"id":"a","label":"Legit — vlastnoručně jsem se přihlašoval z nového notebooku","correct":true,"severity":null},{"id":"b","label":"Phishing — `verify` linky jsou vždy podezřelé","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"GitHub","fromEmail":"noreply@github.com","subject":"[GitHub] Please verify your device","body":"We''ve detected a sign-in to your account from a new device. To continue, click the verification link below. If this wasn''t you, change your password.","cta":"Verify device"}'::jsonb
WHERE id = '0424f276-54cc-5853-b437-8e52cb4d7d96';

-- ============================================================================
-- Q198: Honeypot — real DHL delivery-attempt email on legit domain
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from a courier with a suspect tone. Reaction?',
  options_en = '[{"id":"a","label":"Legit — `dhl.com` and `mydhl.express.dhl` are official, I''ll open them manually","correct":true,"severity":null},{"id":"b","label":"Phishing — deadline pressure = scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"DHL Express","fromEmail":"noreply@dhl.com","subject":"Delivery failed — parcel will be returned","body":"During delivery of your parcel 7891234567 the addressee could not be reached. Without action within 5 days the parcel will be returned to sender. To re-book, visit mydhl.express.dhl."}'::jsonb
WHERE id = '466aace9-0258-5c6a-937c-ac4b40fca5aa';

UPDATE public.questions SET
  prompt_cs = 'E-mail od kurýra se suspect tónem. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — `dhl.com` a `mydhl.express.dhl` jsou oficiální, otevřu ručně","correct":true,"severity":null},{"id":"b","label":"Phishing — tlak na termín = scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"DHL Express","fromEmail":"noreply@dhl.com","subject":"Doručení se nezdařilo — zásilka bude vrácena","body":"Při doručování vaší zásilky 7891234567 se nepodařilo zastihnout adresáta. Bez akce do 5 dní se zásilka vrátí odesílateli. Pro přebookování navštivte mydhl.express.dhl."}'::jsonb
WHERE id = '466aace9-0258-5c6a-937c-ac4b40fca5aa';

-- ============================================================================
-- Q199: Honeypot — real Stripe payout-account request
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from Stripe to a business owner. Reaction?',
  options_en = '[{"id":"a","label":"Legit — Stripe sends notices like this, I''ll open dashboard.stripe.com manually","correct":true,"severity":null},{"id":"b","label":"Phishing — who would ask a business owner for IBAN","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"Stripe","fromEmail":"no-reply@stripe.com","subject":"Action required: update bank account for payouts","body":"To continue payouts, we need to verify the current IBAN. Sign in to dashboard.stripe.com and in Settings → Payouts verify / update the bank account."}'::jsonb
WHERE id = '0e9f6b47-bfd9-513e-b275-21619980ca0a';

UPDATE public.questions SET
  prompt_cs = 'E-mail od Stripe podnikateli. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — Stripe takto upozorňuje, otevřu dashboard.stripe.com ručně","correct":true,"severity":null},{"id":"b","label":"Phishing — kdo by od podnikatele chtěl IBAN","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Stripe","fromEmail":"no-reply@stripe.com","subject":"Akce nutná: aktualizace bankovního účtu pro payouts","body":"Abychom mohli pokračovat ve výplatách, musíme ověřit aktuální IBAN. Přihlaste se na dashboard.stripe.com a v Settings → Payouts ověřte / aktualizujte bankovní účet."}'::jsonb
WHERE id = '0e9f6b47-bfd9-513e-b275-21619980ca0a';

-- ============================================================================
-- Q200: Honeypot — real Microsoft Azure subscription notice
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from Microsoft to an IT admin. Reaction?',
  options_en = '[{"id":"a","label":"Legit — `microsoft.com` domain, points to `portal.azure.com` opened manually","correct":true,"severity":null},{"id":"b","label":"Phishing — surely MS wouldn''t send urgent emails like this","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"Microsoft Azure","fromEmail":"azure-noreply@microsoft.com","subject":"Action required: subscription will be disabled in 3 days","body":"Your Azure subscription has reached the spending limit. Without billing review, services will be paused on 2026-05-01. Manage in Azure portal (portal.azure.com)."}'::jsonb
WHERE id = 'ad44e56f-cd9c-54c6-b779-7eef7fca2ff5';

UPDATE public.questions SET
  prompt_cs = 'E-mail od Microsoftu IT-správci. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — `microsoft.com` doména, směřuje na `portal.azure.com` ručně","correct":true,"severity":null},{"id":"b","label":"Phishing — vážně MS by neposílal takové urgentní e-maily","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Microsoft Azure","fromEmail":"azure-noreply@microsoft.com","subject":"Action required: subscription will be disabled in 3 days","body":"Your Azure subscription has reached the spending limit. Without billing review, services will be paused on 2026-05-01. Manage in Azure portal (portal.azure.com)."}'::jsonb
WHERE id = 'ad44e56f-cd9c-54c6-b779-7eef7fca2ff5';
