-- AH-15.8 batch 2: cultural localization of scam scenarios 41-80
-- Idempotent — safe to re-run.
-- AH-15.7 schema required (prompt_en/cs, options_en/cs, visual_en/cs).
--
-- Cultural substitutions:
--   EN (UK): Royal Mail, Barclays, Lloyds, HSBC, NatWest, BT, EE, O2, HMRC,
--            £ + period decimal, +44, .co.uk, IBAN GB, English names.
--   CS (CZ): Česká pošta, Česká spořitelna, ČSOB, Komerční banka, Air Bank,
--            T-Mobile, Vodafone, Finanční úřad, Kč (~26 Kč/€), +420, .cz,
--            IBAN CZ, Czech names.

-- ============================================================================
-- Q41: Fake "police" call asking to move money to a safe account
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A "police officer" calls: "Your account has been compromised, move the money to a safe account."',
  options_en = '[{"id":"a","label":"Move it — it''s my money","correct":false,"severity":"critical"},{"id":"b","label":"Hang up and dial 999 myself","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'eca4000a-1bc2-5882-800c-53c9a1ac1eef';

UPDATE public.questions SET
  prompt_cs = 'Volá „policista": „Váš účet byl napaden, převeďte peníze na bezpečný účet."',
  options_cs = '[{"id":"a","label":"Převedu — jsou to moje peníze","correct":false,"severity":"critical"},{"id":"b","label":"Zavěsím a zavolám sám na 158","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'eca4000a-1bc2-5882-800c-53c9a1ac1eef';

-- ============================================================================
-- Q42: WhatsApp "from daughter" — Hi Mum, lost my phone, need money
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'WhatsApp from your "daughter" from an unknown number: "Mum, I lost my phone, I urgently need £400 for a new one. Please send it to this account."',
  options_en = '[{"id":"a","label":"Send it — it''s my daughter","correct":false,"severity":"critical"},{"id":"b","label":"Call my daughter on her original number to verify","correct":true,"severity":null},{"id":"c","label":"Reply and ask for details","correct":false,"severity":"medium"}]'::jsonb,
  visual_en = NULL
WHERE id = '89a5f706-78da-5914-b416-da5b3194d9c0';

UPDATE public.questions SET
  prompt_cs = 'WhatsApp od „dcery" z neznámého čísla: „Mami, ztratila jsem telefon, urgentně potřebuji 12 000 Kč na nový. Pošli na tento účet."',
  options_cs = '[{"id":"a","label":"Pošlu — je to dcera","correct":false,"severity":"critical"},{"id":"b","label":"Zavolám dceři na původní číslo a ověřím","correct":true,"severity":null},{"id":"c","label":"Odpovím a zeptám se na detaily","correct":false,"severity":"medium"}]'::jsonb,
  visual_cs = NULL
WHERE id = '89a5f706-78da-5914-b416-da5b3194d9c0';

-- ============================================================================
-- Q43: Open airport WiFi — log into bank?
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'At the airport you see open WiFi "Free_Airport_WiFi". Do you connect and sign in to your bank?',
  options_en = '[{"id":"a","label":"Yes — free internet","correct":false,"severity":"critical"},{"id":"b","label":"Connect via VPN, or better use mobile data","correct":true,"severity":null},{"id":"c","label":"Connect, but only to read the news","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = NULL
WHERE id = 'dcf08155-5676-5da5-8638-9d2b44c9b127';

UPDATE public.questions SET
  prompt_cs = 'Na letišti vidíte otevřenou WiFi „Free_Airport_WiFi". Připojíte se a přihlásíte do banky?',
  options_cs = '[{"id":"a","label":"Ano — internet zdarma","correct":false,"severity":"critical"},{"id":"b","label":"Připojím přes VPN, nebo raději mobilní data","correct":true,"severity":null},{"id":"c","label":"Připojím, ale jen na čtení news","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'dcf08155-5676-5da5-8638-9d2b44c9b127';

-- ============================================================================
-- Q44: USB drive "Payroll 2024" found in car park
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'In the car park outside your office you find a USB stick labelled "Payroll 2024". Do you plug it into your PC?',
  options_en = '[{"id":"a","label":"Plug it in — I''m curious","correct":false,"severity":"critical"},{"id":"b","label":"Hand it to IT without plugging it in","correct":true,"severity":null},{"id":"c","label":"Plug it into my personal PC","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = 'c13411fb-d083-54b6-adde-2c5b47b3fbfc';

UPDATE public.questions SET
  prompt_cs = 'Na parkovišti před firmou najdete USB klíč s nápisem „Mzdy 2024". Strčíte ho do PC?',
  options_cs = '[{"id":"a","label":"Strčím — jsem zvědavý","correct":false,"severity":"critical"},{"id":"b","label":"Předám IT bez připojení","correct":true,"severity":null},{"id":"c","label":"Strčím do svého soukromého PC","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'c13411fb-d083-54b6-adde-2c5b47b3fbfc';

-- ============================================================================
-- Q45: "Bank worker" calls, asks you to read out SMS code
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Someone calls claiming to be from your bank. To verify, they say: "I''ll send an SMS with a code, read it back to me."',
  options_en = '[{"id":"a","label":"Read it — they''re verifying my identity","correct":false,"severity":"critical"},{"id":"b","label":"Refuse and call the bank myself","correct":true,"severity":null},{"id":"c","label":"Read only the last 3 digits","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '7c34768e-ccdb-5b15-a45d-bb5bcdb239df';

UPDATE public.questions SET
  prompt_cs = 'Volá vám člověk, představí se jako pracovník banky. Pro ověření říká: „Pošlu SMS s kódem, přečtete mi ho."',
  options_cs = '[{"id":"a","label":"Přečtu — ověřuje moji identitu","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu a zavolám sám na banku","correct":true,"severity":null},{"id":"c","label":"Přečtu jen poslední 3 čísla","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '7c34768e-ccdb-5b15-a45d-bb5bcdb239df';

-- ============================================================================
-- Q46: Devices disconnected from WiFi, router asks for new login via browser
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'At home your devices have disconnected from WiFi and the router is asking for new login details via a page in the browser. Do you enter them?',
  options_en = '[{"id":"a","label":"Enter them — I want internet","correct":false,"severity":"medium"},{"id":"b","label":"Physically reboot the router and check settings directly via 192.168.x.x","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'f29988a5-c553-52b4-bd14-86a1dd851b46';

UPDATE public.questions SET
  prompt_cs = 'Doma se vaše zařízení odpojily od WiFi a router žádá nové přihlašovací údaje přes stránku v prohlížeči. Zadáte je?',
  options_cs = '[{"id":"a","label":"Zadám — chci internet","correct":false,"severity":"medium"},{"id":"b","label":"Restartuji router fyzicky a zkontroluji nastavení přímo přes 192.168.x.x","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'f29988a5-c553-52b4-bd14-86a1dd851b46';

-- ============================================================================
-- Q47: Door-to-door charity asks for IBAN + ID copy
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Outside a shop, someone with a clipboard "helping children" stops you. They ask for your IBAN and a copy of your ID for confirmation.',
  options_en = '[{"id":"a","label":"Give it — I''m helping","correct":false,"severity":"critical"},{"id":"b","label":"Donate via a verified charity (Cancer Research UK, Oxfam…) online","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '0abf09fd-21c1-598d-bee9-5fcd84ef6f66';

UPDATE public.questions SET
  prompt_cs = 'Před obchodem vás zastaví člověk se seznamem „pomáháme dětem". Žádá IBAN i kopii OP pro potvrzení.',
  options_cs = '[{"id":"a","label":"Dám — pomáhám","correct":false,"severity":"critical"},{"id":"b","label":"Pošlu přes ověřenou nadaci (Dobrý anděl, Konto Bariéry…) online","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '0abf09fd-21c1-598d-bee9-5fcd84ef6f66';

-- ============================================================================
-- Q48: SIM swap — phone loses signal then bank payment notifications arrive
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Your phone suddenly loses signal in the middle of the day. An hour later you start getting payment notifications from your bank.',
  options_en = '[{"id":"a","label":"Wait and see if signal returns","correct":false,"severity":"critical"},{"id":"b","label":"Immediately call my mobile operator and the bank from another phone","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '69893d6e-6303-55e1-9972-8c8a2188c69c';

UPDATE public.questions SET
  prompt_cs = 'Telefon vám náhle ztratil signál uprostřed dne. Po hodině vám chodí notifikace z banky o platbách.',
  options_cs = '[{"id":"a","label":"Počkám, jestli se signál vrátí","correct":false,"severity":"critical"},{"id":"b","label":"Okamžitě zavolám operátora a banku z jiného telefonu","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '69893d6e-6303-55e1-9972-8c8a2188c69c';

-- ============================================================================
-- Q49: Nigerian prince 419 scam — currency conversion
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An email from a Nigerian prince who will send you 10 million USD for a £180 fee. What do you do?',
  options_en = '[{"id":"a","label":"Send £180","correct":false,"severity":"critical"},{"id":"b","label":"Reply — could be legit","correct":false,"severity":"medium"},{"id":"c","label":"Delete — 419 scam","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '90a59e98-63c9-588e-8679-b715cc8eb878';

UPDATE public.questions SET
  prompt_cs = 'Email od nigerijského prince, který vám pošle 10 mil. USD za poplatek 5 000 Kč. Akce?',
  options_cs = '[{"id":"a","label":"Pošlu 5 000 Kč","correct":false,"severity":"critical"},{"id":"b","label":"Odpovím — může být legit","correct":false,"severity":"medium"},{"id":"c","label":"Smažu — 419 scam","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '90a59e98-63c9-588e-8679-b715cc8eb878';

-- ============================================================================
-- Q50: "You won iPhone 16" — pay £4 postage SMS
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'SMS: "You''ve won an iPhone 16! To claim, pay £3.50 for postage." Reaction?',
  options_en = '[{"id":"a","label":"Pay £3.50","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — I never entered any competition","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"OFFER","body":"Congratulations, you''ve won an iPhone 16 Pro! To claim, pay £3.50 for postage:","link":"https://win-iphone.live"}'::jsonb
WHERE id = '65158bc0-ec43-5233-93f9-81bd54d75460';

UPDATE public.questions SET
  prompt_cs = 'SMS: „Vyhráli jste iPhone 16! Pro převzetí zaplaťte 99 Kč poštovné." Reakce?',
  options_cs = '[{"id":"a","label":"Zaplatím 99 Kč","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — žádnou soutěž jsem nehrál","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"AKCE","body":"Gratulujeme, vyhráli jste iPhone 16 Pro! Pro převzetí zaplaťte 99 Kč za poštovné:","link":"https://vyhra-iphone.live"}'::jsonb
WHERE id = '65158bc0-ec43-5233-93f9-81bd54d75460';

-- ============================================================================
-- Q51: Hacked Insta friend — "vote for me, sign in via Insta"
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A friend messages you on Instagram: "Vote for me in a competition, click this link and sign in via Insta." Do you click?',
  options_en = '[{"id":"a","label":"Yes — I''ll help my friend","correct":false,"severity":"critical"},{"id":"b","label":"Call her first — her account is probably hacked","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'd5c2d7dd-6f31-5370-8b30-f4d512c3d8a4';

UPDATE public.questions SET
  prompt_cs = 'Kamarádka vám na Insta píše: „Hlasuj pro mě v soutěži, klikni link a přihlas se přes Insta." Kliknete?',
  options_cs = '[{"id":"a","label":"Ano — pomůžu kamarádce","correct":false,"severity":"critical"},{"id":"b","label":"Nejdřív jí zavolám — pravděpodobně má hacknutý účet","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'd5c2d7dd-6f31-5370-8b30-f4d512c3d8a4';

-- ============================================================================
-- Q52: Gumtree/Bazoš buyer asks for your password "to verify Revolut account"
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'On Gumtree a buyer says: "I''ll send you £450 via Revolut, but I need your password to verify your account."',
  options_en = '[{"id":"a","label":"Send the password — I want the money","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — Revolut never needs a password from you","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'e5ec4150-aaed-5dba-8999-82009b3410ee';

UPDATE public.questions SET
  prompt_cs = 'Na Bazoši kupec řekne: „Pošlu ti 12 000 Kč přes Revolut, ale potřebuji tvé heslo k ověření účtu."',
  options_cs = '[{"id":"a","label":"Pošlu heslo — chci peníze","correct":false,"severity":"critical"},{"id":"b","label":"Nepošlu — Revolut žádné heslo nepotřebuje","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'e5ec4150-aaed-5dba-8999-82009b3410ee';

-- ============================================================================
-- Q53: "Sent you money by mistake, please return it" — overpayment scam
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Someone tells you they accidentally sent you £180 and asks you to send it back. Your account doesn''t yet show the deposit. Do you send it?',
  options_en = '[{"id":"a","label":"Yes — only polite to return it","correct":false,"severity":"critical"},{"id":"b","label":"No — wait until the money actually arrives (even 24h)","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '3f83f65d-c960-5300-8e22-d1eaac4a964f';

UPDATE public.questions SET
  prompt_cs = 'Někdo vám tvrdí, že vám omylem poslal 5 000 Kč a prosí, abyste mu poslal zpět. Účet zatím nezobrazuje vklad. Pošlete?',
  options_cs = '[{"id":"a","label":"Ano — slušné by bylo vrátit","correct":false,"severity":"critical"},{"id":"b","label":"Ne — počkám, dokud peníze reálně nepřijdou (i 24h)","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '3f83f65d-c960-5300-8e22-d1eaac4a964f';

-- ============================================================================
-- Q54: Selling on Gumtree/Bazoš — "buyer" sends bogus address-confirm link
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You''re selling on Gumtree. An interested buyer writes:',
  options_en = '[{"id":"a","label":"Confirm — I want to sell","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — Gumtree has no such system","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"+44 7700 900123","body":"I''m interested in your listing. To complete the purchase, please confirm the delivery address here:","link":"https://gumtree-secure-payment.com/confirm"}'::jsonb
WHERE id = 'cf091954-21c8-539e-9e6d-c5ee4ce9ec67';

UPDATE public.questions SET
  prompt_cs = 'Prodáváte na Bazoši. Zájemce napíše:',
  options_cs = '[{"id":"a","label":"Potvrdím — chci prodat","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — Bazos nemá žádný takový systém","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"+420 720 555 123","body":"Mám zájem o váš inzerát. Pro dokončení koupě potvrďte adresu doručení zde:","link":"https://bazos-secure-payment.com/confirm"}'::jsonb
WHERE id = 'cf091954-21c8-539e-9e6d-c5ee4ce9ec67';

-- ============================================================================
-- Q55: Airbnb host offers off-platform discount via email
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An Airbnb host messages and offers a cheaper "off-platform" deal via email.',
  options_en = '[{"id":"a","label":"Agree — we both save","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — communicating outside Airbnb loses you all protection","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Mark","fromEmail":"mark.airbnb@gmail.com","subject":"Better offer — without platform fees","body":"Hi, I''d like to book directly, we''ll save 15% on fees. I''ll send the deposit to your IBAN."}'::jsonb
WHERE id = '87bded60-d620-5595-8c61-39c8dfdc9bcd';

UPDATE public.questions SET
  prompt_cs = 'Hostitel na Airbnb vám napíše a pošle „mimo platformy" levnější slevu přes email.',
  options_cs = '[{"id":"a","label":"Souhlasím — ušetříme oba","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu — komunikace mimo Airbnb ztrácí ochranu","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Marek","fromEmail":"marek.airbnb@gmail.com","subject":"Lepší nabídka — bez poplatků platformy","body":"Ahoj, chtěl bych rezervovat přímo, ušetříme 15% na poplatcích. Pošlu zálohu na tvůj IBAN."}'::jsonb
WHERE id = '87bded60-d620-5595-8c61-39c8dfdc9bcd';

-- ============================================================================
-- Q56: Real PayPal? — global, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real PayPal?',
  options_en = '[{"id":"a","label":"paypal.com","correct":true,"severity":null},{"id":"b","label":"paypal-secure.com","correct":false,"severity":"critical"},{"id":"c","label":"paypaI.com (capital I)","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '64108ffa-9b89-51a5-8f84-fa9082c5cbd9';

UPDATE public.questions SET
  prompt_cs = 'Pravý PayPal?',
  options_cs = '[{"id":"a","label":"paypal.com","correct":true,"severity":null},{"id":"b","label":"paypal-secure.com","correct":false,"severity":"critical"},{"id":"c","label":"paypaI.com (s velkým I)","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '64108ffa-9b89-51a5-8f84-fa9082c5cbd9';

-- ============================================================================
-- Q57: Real Amazon? — swap .de TLD to local market
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real Amazon?',
  options_en = '[{"id":"a","label":"amazon.co.uk","correct":true,"severity":null},{"id":"b","label":"amaz0n.co.uk","correct":false,"severity":"critical"},{"id":"c","label":"amazon-uk.co.uk","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '9b0c41fb-ba2e-5a5a-9d21-7932f4d7eee0';

UPDATE public.questions SET
  prompt_cs = 'Pravý Amazon?',
  options_cs = '[{"id":"a","label":"amazon.de","correct":true,"severity":null},{"id":"b","label":"amaz0n.de","correct":false,"severity":"critical"},{"id":"c","label":"amazon-eu.de","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '9b0c41fb-ba2e-5a5a-9d21-7932f4d7eee0';

-- ============================================================================
-- Q58: Temu spin-the-wheel — universal, convert currency
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Ad: "Spin the wheel on Temu, win £1,200!" Do you click and sign in?',
  options_en = '[{"id":"a","label":"Yes — I want £1,200","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — either fake landing page or dark pattern","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '19740138-fda3-53c5-8601-24aa50f3cd7f';

UPDATE public.questions SET
  prompt_cs = 'Reklama: „Roztoč kolo na Temu, vyhraj 35 000 Kč!". Kliknete a přihlásíte se?',
  options_cs = '[{"id":"a","label":"Ano — chci 35 000 Kč","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — buď fake landing nebo dark pattern","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '19740138-fda3-53c5-8601-24aa50f3cd7f';

-- ============================================================================
-- Q59: Door-to-door "energy supplier rep" asking to see bill + ID
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A "British Gas worker" turns up at your door and asks to see your bill and ID because "you''re due a refund".',
  options_en = '[{"id":"a","label":"Show them — a refund is great","correct":false,"severity":"critical"},{"id":"b","label":"Ask for their ID and call the British Gas helpline directly","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '7407b22f-1b07-5882-9b2f-85cff44a25d0';

UPDATE public.questions SET
  prompt_cs = 'U dveří stojí „pracovník ČEZ" a chce vidět fakturu i OP, protože „máte přeplatek".',
  options_cs = '[{"id":"a","label":"Ukážu — přeplatek je super","correct":false,"severity":"critical"},{"id":"b","label":"Vyžádám si průkaz a zavolám přímo na linku ČEZ","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '7407b22f-1b07-5882-9b2f-85cff44a25d0';

-- ============================================================================
-- Q60: Packeta-style parcel locker SMS — UK: InPost / CZ: Zásilkovna
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Parcel could not be delivered.',
  options_en = '[{"id":"a","label":"Verify — I want my parcel","correct":false,"severity":"critical"},{"id":"b","label":"Check status in the InPost app","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"InPost","body":"Your parcel is ready in an InPost locker. To collect, please verify:","link":"https://inpost-box.online/pickup"}'::jsonb
WHERE id = 'b17bdc88-7678-58c7-acc9-13bbb44b5752';

UPDATE public.questions SET
  prompt_cs = 'Balík se nedoručil.',
  options_cs = '[{"id":"a","label":"Ověřím — chci balík","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji stav v Zásilkovna aplikaci","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Zasilkovna","body":"Vaše zásilka je připravena v Z-Boxu. Pro vyzvednutí se ověřte:","link":"https://zasilkovna-box.online/pickup"}'::jsonb
WHERE id = 'b17bdc88-7678-58c7-acc9-13bbb44b5752';

-- ============================================================================
-- Q61: Mobile operator overdue payment SMS — O2 (keep brand)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'O2 reports an outstanding balance.',
  options_en = '[{"id":"a","label":"Pay — I don''t want to lose my number","correct":false,"severity":"critical"},{"id":"b","label":"Check in the My O2 app","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"O2 UK","body":"Dear customer, we have an outstanding balance of £24.40. Pay within 24h or your number will be suspended:","link":"https://o2-uk.bills-online.com"}'::jsonb
WHERE id = 'b4e3267e-447a-5648-9142-ac3c10f60e78';

UPDATE public.questions SET
  prompt_cs = 'O2 vám hlásí nedoplatek.',
  options_cs = '[{"id":"a","label":"Uhradím — nechci ztratit číslo","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji v Moje O2 aplikaci","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"O2 CZ","body":"Vážený zákazníku, evidujeme nedoplatek 712 Kč. Uhraďte do 24h, jinak vypneme číslo:","link":"https://o2-cz.faktury-online.com"}'::jsonb
WHERE id = 'b4e3267e-447a-5648-9142-ac3c10f60e78';

-- ============================================================================
-- Q62: Real Instagram login? — global, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real Instagram login?',
  options_en = '[{"id":"a","label":"instagram.com","correct":true,"severity":null},{"id":"b","label":"instagram.com-login.help","correct":false,"severity":"critical"},{"id":"c","label":"ig-secure.com","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = 'e445dee0-1de0-542f-80a0-fe63fbacff20';

UPDATE public.questions SET
  prompt_cs = 'Pravý Instagram login?',
  options_cs = '[{"id":"a","label":"instagram.com","correct":true,"severity":null},{"id":"b","label":"instagram.com-login.help","correct":false,"severity":"critical"},{"id":"c","label":"ig-secure.com","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = 'e445dee0-1de0-542f-80a0-fe63fbacff20';

-- ============================================================================
-- Q63: Selling PS5, buyer claims "courier will bring cash COD"
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You''re selling a PS5. The buyer writes: "I''ll send the money via DPD COD to your address."',
  options_en = '[{"id":"a","label":"Send my address — money via courier","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — couriers don''t carry cash like that, it''s a scam","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '6550013d-d06f-53eb-89e7-d445bdc4e3d2';

UPDATE public.questions SET
  prompt_cs = 'Prodáváte PS5. Kupec píše: „Pošlu peníze přes DPD COD na vaši adresu."',
  options_cs = '[{"id":"a","label":"Pošlu mu adresu — peníze přes kurýra","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu — kurýr peníze nepřenáší, je to scam","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '6550013d-d06f-53eb-89e7-d445bdc4e3d2';

-- ============================================================================
-- Q64: "Your PC has 5 viruses" browser pop-up
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A pop-up appears while browsing: "Your computer has 5 viruses! Download Antivirus Pro now." Action?',
  options_en = '[{"id":"a","label":"Download — viruses are bad","correct":false,"severity":"critical"},{"id":"b","label":"Close it with Esc / close the tab","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '50ac723d-8e4d-59ff-8b8e-ec6811d1c57b';

UPDATE public.questions SET
  prompt_cs = 'Při surfování vyskočí: „Váš počítač má 5 virů! Stáhněte Antivirus Pro hned." Akce?',
  options_cs = '[{"id":"a","label":"Stáhnu — viry jsou zlé","correct":false,"severity":"critical"},{"id":"b","label":"Zavřu zatlačením Esc / zavřením tabu","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '50ac723d-8e4d-59ff-8b8e-ec6811d1c57b';

-- ============================================================================
-- Q65: Invoice .docm with macros from "supplier"
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Invoice .docm/.zip attachment from a "supplier".',
  options_en = '[{"id":"a","label":"Open and enable macros","correct":false,"severity":"critical"},{"id":"b","label":"Don''t open — unknown sender + macros = malware","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"Accounts","fromEmail":"accounts@supplier-invoice.eu","subject":"Invoice no. 2024-9931 — due in 7 days","body":"Please find attached our invoice for services rendered. To view, please enable macros."}'::jsonb
WHERE id = 'f95434ab-0a13-53be-aae5-b3f2f9e61e5a';

UPDATE public.questions SET
  prompt_cs = 'Faktura .docm/.zip příloha od „dodavatele".',
  options_cs = '[{"id":"a","label":"Otevřu a povolím makra","correct":false,"severity":"critical"},{"id":"b","label":"Neotvírám — neznámý odesílatel + makra = malware","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Účtárna","fromEmail":"ucto@dodavatel-faktura.eu","subject":"Faktura č. 2024-9931 — splatnost 7 dní","body":"V příloze zasíláme fakturu za služby. Pro zobrazení povolte makra."}'::jsonb
WHERE id = 'f95434ab-0a13-53be-aae5-b3f2f9e61e5a';

-- ============================================================================
-- Q66: Boss "video call" on WhatsApp asking for urgent 18,000€ transfer (deepfake)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Your boss video-calls you on WhatsApp — you can see his face, but the image is pixelated. He asks for an urgent £15,000 transfer.',
  options_en = '[{"id":"a","label":"Send it — I can see the boss","correct":false,"severity":"critical"},{"id":"b","label":"Verify via another channel (in person / company phone)","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '9205b0dd-8ae4-5af5-9628-ddb23685f7b7';

UPDATE public.questions SET
  prompt_cs = 'Šéf vám zavolá přes WhatsApp video — vidíte jeho tvář, ale obraz pixeluje. Žádá urgentní převod 470 000 Kč.',
  options_cs = '[{"id":"a","label":"Pošlu — vidím šéfa","correct":false,"severity":"critical"},{"id":"b","label":"Ověřím přes druhý kanál (osobně / firemní telefon)","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '9205b0dd-8ae4-5af5-9628-ddb23685f7b7';

-- ============================================================================
-- Q67: "Work from home, £80/day, just copy text. £49 registration fee"
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Listing: "Work from home, £80/day, just copy text. Start today, £49 registration fee."',
  options_en = '[{"id":"a","label":"Sign up for £49","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — a job where you pay isn''t a job","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'f95622e0-e553-5a0a-9b70-0f62e954e940';

UPDATE public.questions SET
  prompt_cs = 'Inzerát: „Práce z domu, 2 000 Kč/den, jen kopírovat texty. Začni dnes, registrační poplatek 1 200 Kč."',
  options_cs = '[{"id":"a","label":"Zaregistruji se za 1 200 Kč","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — práce, kde platíš ty, není práce","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'f95622e0-e553-5a0a-9b70-0f62e954e940';

-- ============================================================================
-- Q68: Telekom loyalty bonus SMS — BT (EN) / T-Mobile (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'BT supposedly has a bonus for you.',
  options_en = '[{"id":"a","label":"Claim it — £50 is £50","correct":false,"severity":"critical"},{"id":"b","label":"Check in the My BT app","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"BT","body":"£50 loyalty bonus! Claim it within 48h:","link":"https://bt.bonus-loyalty.co.uk"}'::jsonb
WHERE id = '563a9098-4e08-550e-bd86-ed451f687721';

UPDATE public.questions SET
  prompt_cs = 'T-Mobile vám prý posílá bonus.',
  options_cs = '[{"id":"a","label":"Vyzvednu — 1 300 Kč je 1 300 Kč","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji v Můj T-Mobile aplikaci","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"TMOBILE","body":"Bonus 1 300 Kč za věrnost! Vyzvedněte si ho do 48h:","link":"https://tmobile.bonus-vernost.cz"}'::jsonb
WHERE id = '563a9098-4e08-550e-bd86-ed451f687721';

-- ============================================================================
-- Q69: Real Google login? — global, keep
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real Google login?',
  options_en = '[{"id":"a","label":"accounts.google.com","correct":true,"severity":null},{"id":"b","label":"accounts-google.com","correct":false,"severity":"critical"},{"id":"c","label":"google.com-signin.net","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '3be19514-0401-5f69-8a6b-98328ac144da';

UPDATE public.questions SET
  prompt_cs = 'Pravý Google login?',
  options_cs = '[{"id":"a","label":"accounts.google.com","correct":true,"severity":null},{"id":"b","label":"accounts-google.com","correct":false,"severity":"critical"},{"id":"c","label":"google.com-signin.net","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '3be19514-0401-5f69-8a6b-98328ac144da';

-- ============================================================================
-- Q70: Booking.com host says card failed, please complete via link
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'After booking on Booking, the host messages you in Booking chat: "Your card didn''t go through, please complete via this link." Do you click?',
  options_en = '[{"id":"a","label":"Click — I want to keep my booking","correct":false,"severity":"critical"},{"id":"b","label":"Check in the Booking app and contact support","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '9160f82b-9dbd-55c5-9908-5750603d03bd';

UPDATE public.questions SET
  prompt_cs = 'Po rezervaci na Booking vám hostitel pošle zprávu přes Booking chat: „Karta vám neprošla, dokončete přes tento link." Kliknete?',
  options_cs = '[{"id":"a","label":"Kliknu — chci si zachovat rezervaci","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji v Booking aplikaci a kontaktuji support","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '9160f82b-9dbd-55c5-9908-5750603d03bd';

-- ============================================================================
-- Q71: Site asks to install a "security certificate" for access
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A site wants to install a "security certificate" for access. Action?',
  options_en = '[{"id":"a","label":"Install — I want to access the site","correct":false,"severity":"critical"},{"id":"b","label":"Close it — no real site asks for a certificate this way","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '4238c64f-a51e-52fb-b56b-fe5b60a5c591';

UPDATE public.questions SET
  prompt_cs = 'Stránka chce nainstalovat „bezpečnostní certifikát" pro přístup. Akce?',
  options_cs = '[{"id":"a","label":"Nainstaluji — chci na stránku","correct":false,"severity":"critical"},{"id":"b","label":"Zavřu — žádná stránka takto nežádá certifikát","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '4238c64f-a51e-52fb-b56b-fe5b60a5c591';

-- ============================================================================
-- Q72: Inheritance email — 1.2m EUR from English aunt, pay notary fee
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email: "Your inheritance of €1.2m from your English aunt is waiting. Send your ID and £300 in notary fees."',
  options_en = '[{"id":"a","label":"Send it — didn''t know about the aunt","correct":false,"severity":"critical"},{"id":"b","label":"Delete — inheritance scam","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '4129cfb1-17f7-5ba9-9389-559e1da147f4';

UPDATE public.questions SET
  prompt_cs = 'Email: „Vaše dědictví 1,2 mil. EUR po anglické tetě čeká. Pošlete OP a 8 000 Kč na notářské poplatky."',
  options_cs = '[{"id":"a","label":"Pošlu — nevěděl jsem o tetě","correct":false,"severity":"critical"},{"id":"b","label":"Smažu — inheritance scam","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '4129cfb1-17f7-5ba9-9389-559e1da147f4';

-- ============================================================================
-- Q73: Bank "3D Secure 2.0 mandatory activation" email — VÚB → NatWest / Air Bank
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Your bank sends a link to "activate the new security system".',
  options_en = '[{"id":"a","label":"Activate — I want to be able to pay","correct":false,"severity":"critical"},{"id":"b","label":"Check announcements in the app / on natwest.com directly","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"email","from":"NatWest Bank","fromEmail":"security@natwest-online.co.uk","subject":"Mandatory 3D Secure 2.0 activation","body":"From 1 May all customers must activate the new security system. Otherwise you will not be able to pay by card online.","cta":"Activate"}'::jsonb
WHERE id = 'a6acbbd8-fd7d-5180-92f7-4d0d14b7e7f8';

UPDATE public.questions SET
  prompt_cs = 'Banka vám posílá link na „aktivaci nového bezpečnostního systému".',
  options_cs = '[{"id":"a","label":"Aktivuji — chci platit","correct":false,"severity":"critical"},{"id":"b","label":"Zkontroluji oznámení v aplikaci / na airbank.cz přímo","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Air Bank","fromEmail":"security@airbank-online.cz","subject":"Povinná aktivace 3D Secure 2.0","body":"Od 1. května musí všichni klienti aktivovat nový bezpečnostní systém. Jinak nebudete moci platit kartou online.","cta":"Aktivovat"}'::jsonb
WHERE id = 'a6acbbd8-fd7d-5180-92f7-4d0d14b7e7f8';

-- ============================================================================
-- Q74: FB disaster appeal "Help family X, IBAN: ..." with heartbreaking photo
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'After a disaster you see a Facebook appeal "Help family X, IBAN: GB…" with a heart-rending photo. Do you send money?',
  options_en = '[{"id":"a","label":"Send — I want to help","correct":false,"severity":"critical"},{"id":"b","label":"Donate via a verified fundraiser (JustGiving, GoFundMe)","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = 'a10a84ad-eff5-539d-93df-e4e08b2fd9da';

UPDATE public.questions SET
  prompt_cs = 'Po katastrofě vidíte na FB výzvu „Pomozte rodině X, IBAN: CZ…" se srdcervoucí fotkou. Pošlete?',
  options_cs = '[{"id":"a","label":"Pošlu — chci pomoci","correct":false,"severity":"critical"},{"id":"b","label":"Pošlu přes ověřenou sbírku (Donio, Darujme.cz)","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = 'a10a84ad-eff5-539d-93df-e4e08b2fd9da';

-- ============================================================================
-- Q75: Real VÚB? → NatWest (EN) / Air Bank (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real NatWest?',
  options_en = '[{"id":"a","label":"natwest.com","correct":true,"severity":null},{"id":"b","label":"natwest-banking.co.uk","correct":false,"severity":"critical"},{"id":"c","label":"natwestbank.co.uk","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '61835464-3448-5b35-a07f-5112920d5f4a';

UPDATE public.questions SET
  prompt_cs = 'Která je pravá Air Bank?',
  options_cs = '[{"id":"a","label":"airbank.cz","correct":true,"severity":null},{"id":"b","label":"air-bank.cz","correct":false,"severity":"critical"},{"id":"c","label":"airbanka.cz","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '61835464-3448-5b35-a07f-5112920d5f4a';

-- ============================================================================
-- Q76: Revolut account suspended SMS — keep brand
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Revolut claims your account is suspended.',
  options_en = '[{"id":"a","label":"Confirm — I want my account back","correct":false,"severity":"critical"},{"id":"b","label":"Open the Revolut app — all messages are there","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Revolut","body":"Your account has been temporarily suspended. To restore it, please verify your identity:","link":"https://revolut-verify.app"}'::jsonb
WHERE id = '62be4536-f938-57c4-a072-994dfdca161b';

UPDATE public.questions SET
  prompt_cs = 'Revolut vám tvrdí, že máte pozastavený účet.',
  options_cs = '[{"id":"a","label":"Potvrdím — chci účet zpět","correct":false,"severity":"critical"},{"id":"b","label":"Otevřu Revolut aplikaci — tam vidím všechny zprávy","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Revolut","body":"Váš účet byl dočasně pozastaven. Pro obnovení potvrďte identitu:","link":"https://revolut-verify.app"}'::jsonb
WHERE id = '62be4536-f938-57c4-a072-994dfdca161b';

-- ============================================================================
-- Q77: "Bank" asks you to install AnyDesk and share the code
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Your bank calls: "To resolve the issue, please install AnyDesk and give us the code."',
  options_en = '[{"id":"a","label":"Install — they''ll fix the problem","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — a real bank never needs remote access","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '89f0daa7-2702-590d-99bd-002954b7ada6';

UPDATE public.questions SET
  prompt_cs = 'Banka vám zavolá: „Pro vyřešení problému si stáhněte AnyDesk a dejte nám kód."',
  options_cs = '[{"id":"a","label":"Stáhnu — vyřeší problém","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu — banka nikdy nepotřebuje vzdálený přístup","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '89f0daa7-2702-590d-99bd-002954b7ada6';

-- ============================================================================
-- Q78: MrBeast giveaway ad — global, keep + convert currency
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Instagram ad: "MrBeast is giving £1,000 to the first 100 people! Just click."',
  options_en = '[{"id":"a","label":"Click — I''m fast","correct":false,"severity":"critical"},{"id":"b","label":"Ignore — celebrity giveaway scam","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '49797c3c-a518-5a8b-a323-25a609299965';

UPDATE public.questions SET
  prompt_cs = 'Insta reklama: „MrBeast rozdává 25 000 Kč prvním 100 lidem! Stačí kliknout."',
  options_cs = '[{"id":"a","label":"Kliknu — jsem rychlý","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — celebrity giveaway scam","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '49797c3c-a518-5a8b-a323-25a609299965';

-- ============================================================================
-- Q79: Sextortion email — pay in Bitcoin
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email: "I have a video of you watching porn. Send £700 in Bitcoin, or I''ll send it to all your contacts."',
  options_en = '[{"id":"a","label":"Pay — I don''t want the shame","correct":false,"severity":"critical"},{"id":"b","label":"Delete — sextortion scam, they have no video","correct":true,"severity":null}]'::jsonb,
  visual_en = NULL
WHERE id = '2c1219c7-2bcc-573b-8194-273270bfec7c';

UPDATE public.questions SET
  prompt_cs = 'Email: „Mám video, jak se díváš na porno. Pošli 18 000 Kč v Bitcoinu, jinak to pošlu všem kontaktům."',
  options_cs = '[{"id":"a","label":"Zaplatím — nechci hanbu","correct":false,"severity":"critical"},{"id":"b","label":"Smažu — sextortion scam, žádné video nemá","correct":true,"severity":null}]'::jsonb,
  visual_cs = NULL
WHERE id = '2c1219c7-2bcc-573b-8194-273270bfec7c';

-- ============================================================================
-- Q80: Real Alza? → eBay (EN) / Alza (CS)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which is the real eBay?',
  options_en = '[{"id":"a","label":"ebay.co.uk","correct":true,"severity":null},{"id":"b","label":"ebay-shop.co.uk","correct":false,"severity":"critical"},{"id":"c","label":"ebay.co.uk.deal-zone.com","correct":false,"severity":"critical"},{"id":"d","label":"eb4y.co.uk","correct":false,"severity":"critical"}]'::jsonb,
  visual_en = NULL
WHERE id = '8d0caaa0-2f0f-5284-b21f-b05d66e5491a';

UPDATE public.questions SET
  prompt_cs = 'Pravá Alza?',
  options_cs = '[{"id":"a","label":"alza.cz","correct":true,"severity":null},{"id":"b","label":"alza-eshop.cz","correct":false,"severity":"critical"},{"id":"c","label":"alza.cz.deal-zone.com","correct":false,"severity":"critical"},{"id":"d","label":"a1za.cz","correct":false,"severity":"critical"}]'::jsonb,
  visual_cs = NULL
WHERE id = '8d0caaa0-2f0f-5284-b21f-b05d66e5491a';
