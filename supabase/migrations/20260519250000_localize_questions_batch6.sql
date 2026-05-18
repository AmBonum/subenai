-- AH-15.8 batch 6: cultural localization of scam scenarios 201-238 (final batch)
-- Idempotent — safe to re-run.
-- AH-15.7 schema required.

-- ============================================================================
-- Q201: Honeypot — legit e-shop shipping email (Alza.sk → Amazon UK / Alza.cz)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from an online shop. Reaction?',
  options_en = '[{"id":"a","label":"Legit — my order, I copy the tracking number","correct":true,"severity":null},{"id":"b","label":"Phishing — I never click anything in emails","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"Amazon UK","fromEmail":"shipment-tracking@amazon.co.uk","subject":"Your order 8821547 has been dispatched","body":"Your parcel was dispatched via Royal Mail, tracking number Z9981234. Track it via royalmail.com once the number activates. Order details in your account on amazon.co.uk."}'::jsonb
WHERE id = 'cdca6f4e-97dc-5825-bf13-cb2e3073527c';

UPDATE public.questions SET
  prompt_cs = 'Email od e-shopu. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — moje objednávka, opíšu si tracking číslo","correct":true,"severity":null},{"id":"b","label":"Phishing — neklikám na nic v emailech","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Alza.cz","fromEmail":"obchod@alza.cz","subject":"Vaše objednávka 8821547 byla odeslána","body":"Balík odeslal kurýr Zásilkovna, sledovací číslo Z9981234. Sledování přes zasilkovna.cz po zadání čísla. Detail objednávky v účtu na alza.cz."}'::jsonb
WHERE id = 'cdca6f4e-97dc-5825-bf13-cb2e3073527c';

-- ============================================================================
-- Q202: Honeypot — corporate IT helpdesk VPN maintenance email
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from corporate IT. Reaction?',
  options_en = '[{"id":"a","label":"Legit — internal IT comms, company domain","correct":true,"severity":null},{"id":"b","label":"Phishing — IT never emails me","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"IT Helpdesk","fromEmail":"helpdesk@company.co.uk","subject":"Scheduled VPN maintenance — connection restart","body":"Tonight 22:00–23:00 the VPN concentrators will be restarted. After the restart you will need to reconnect the VPN client. No credentials are being changed."}'::jsonb
WHERE id = '36c1b946-70e3-5c1d-9831-aa3179920279';

UPDATE public.questions SET
  prompt_cs = 'Email od IT v korporaci. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — vnitřní IT komunikace, doména firmy","correct":true,"severity":null},{"id":"b","label":"Phishing — IT mi nikdy nepíše","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"IT Helpdesk","fromEmail":"helpdesk@firma.cz","subject":"Plánovaná údržba VPN — restart connection","body":"Dnes 22:00–23:00 proběhne restart VPN koncentrátorů. Po restartu budete muset znovu připojit VPN klienta. Žádné přihlašovací údaje se nemění."}'::jsonb
WHERE id = '36c1b946-70e3-5c1d-9831-aa3179920279';

-- ============================================================================
-- Q203: Honeypot — recruiter email (Profesia.sk → LinkedIn / Jobs.cz)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from a LinkedIn recruiter. Reaction?',
  options_en = '[{"id":"a","label":"Legit — linkedin.com domain, no urgent push","correct":true,"severity":null},{"id":"b","label":"Phishing — all recruiters are scams","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"Anna Thompson (LinkedIn Talent)","fromEmail":"anna.thompson@linkedin.com","subject":"Senior Backend Developer role — interested in a chat?","body":"Hi. We are hiring a senior dev for a client (bank, London). Salary £75–95k. If this is relevant I will send details — please apply via your LinkedIn profile."}'::jsonb
WHERE id = '028e8720-8dc2-5bd4-8b8e-b91106903206';

UPDATE public.questions SET
  prompt_cs = 'Email od recruitera z Jobs.cz. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — jobs.cz doména, žádný urgent push","correct":true,"severity":null},{"id":"b","label":"Phishing — recruiteři jsou scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Anna Tomková (Jobs.cz)","fromEmail":"anna.tomkova@jobs.cz","subject":"Pozice Senior Backend Developer — zájem o rozhovor?","body":"Dobrý den. Hledáme seniora pro našeho klienta (banka, Praha). Plat 110–150 tisíc Kč. Pokud má smysl, pošlu detail a CV pošlete mi prosím přes jobs.cz profil."}'::jsonb
WHERE id = '028e8720-8dc2-5bd4-8b8e-b91106903206';

-- ============================================================================
-- Q204: Honeypot — Google new sign-in notification (legit)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Email from Google. Reaction?',
  options_en = '[{"id":"a","label":"Legit — my own sign-in from iPhone","correct":true,"severity":null},{"id":"b","label":"Phishing — securing via link is always a scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"email","from":"Google","fromEmail":"no-reply@accounts.google.com","subject":"New sign-in to your Google account","body":"Someone just signed in to your Google account from a new device (iPhone, London). If this was you, ignore. If not, secure your account at myaccount.google.com."}'::jsonb
WHERE id = 'de056883-e882-5f44-bced-fa2038dd064a';

UPDATE public.questions SET
  prompt_cs = 'Email od Google. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — moje vlastní přihlášení z iPhonu","correct":true,"severity":null},{"id":"b","label":"Phishing — zabezpečení přes link je scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"email","from":"Google","fromEmail":"no-reply@accounts.google.com","subject":"Nové přihlášení k vašemu Google účtu","body":"Někdo se právě přihlásil k vašemu Google účtu z nového zařízení (iPhone, Praha). Pokud jste to byli vy, ignorujte. Pokud ne, zabezpečte účet na myaccount.google.com."}'::jsonb
WHERE id = 'de056883-e882-5f44-bced-fa2038dd064a';

-- ============================================================================
-- Q205: Honeypot — police call about my own ID/passport application
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A phone call. Reaction?',
  options_en = '[{"id":"a","label":"Legit — my own application, I gave them the number. I verify by calling back via gov.uk","correct":true,"severity":null},{"id":"b","label":"Vishing — the police never phone like this","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"call","caller":"Metropolitan Police — Westminster","number":"0207 230 1212","hint":"They introduce themselves: PC Short, Westminster station. Asking about my passport application from yesterday."}'::jsonb
WHERE id = '1bf373f0-e74e-56ca-8432-92bc7c72628d';

UPDATE public.questions SET
  prompt_cs = 'Volání. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — moje žádost, já jsem jim dal číslo. Ověřím přes mvcr.cz callback","correct":true,"severity":null},{"id":"b","label":"Vishing — policie takhle netelefonuje","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"PČR — Praha","number":"974 822 111","hint":"Představují se: por. Krátká, OO PČR Praha 1. Ptají se ohledně mé včerejší žádosti o nový OP."}'::jsonb
WHERE id = '1bf373f0-e74e-56ca-8432-92bc7c72628d';

-- ============================================================================
-- Q206: Honeypot — bank fraud team call (Tatra banka → Barclays / Č. spořitelna)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A phone call. Reaction?',
  options_en = '[{"id":"a","label":"Legit — the fraud team really handles this, but I give no details — I call back on the 0800 number on the back of the card","correct":true,"severity":null},{"id":"b","label":"Vishing — the bank never phones","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"call","caller":"Barclays — fraud team","number":"+44 345 734 5345","hint":"They are asking whether I really paid £1,230 on the card to Aliexpress this morning. They say it looks like fraud."}'::jsonb
WHERE id = '338e02a3-0c07-57c9-bec3-40531112ab9c';

UPDATE public.questions SET
  prompt_cs = 'Volání. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — fraud team reálně tyhle věci řeší, ale své údaje nedávám, zavolám zpět přes 0800 ze zadní strany karty","correct":true,"severity":null},{"id":"b","label":"Vishing — banka nikdy nevolá","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"Česká spořitelna — fraud team","number":"+420 956 777 956","hint":"Ptají se, jestli jsem opravdu zaplatil 32 000 Kč kartou na Aliexpressu dnes ráno. Tvrdí, že to vypadá jako fraud."}'::jsonb
WHERE id = '338e02a3-0c07-57c9-bec3-40531112ab9c';

-- ============================================================================
-- Q207: Honeypot — doctor''s office call about test results
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A phone call. Reaction?',
  options_en = '[{"id":"a","label":"Legit — surgery, I call back on a landline number I verify myself","correct":true,"severity":null},{"id":"b","label":"Vishing — I never give anything about myself over the phone","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"call","caller":"Surgery nurse","number":"07700 ... (mobile)","hint":"\"I am calling from Dr. Halliday''s surgery. The doctor wants to discuss your results — please call him back on the landline 020/...\""}'::jsonb
WHERE id = '4949aac9-3da2-55c7-ae5d-ed2024e885e0';

UPDATE public.questions SET
  prompt_cs = 'Volání. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — ambulance, já zavolám zpět na pevnou linku, kterou si ověřím","correct":true,"severity":null},{"id":"b","label":"Vishing — nikomu nic o sobě neříkám","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"Sestra ambulance","number":"720 ... (mobilní)","hint":"„Volám z ambulance MUDr. Halmády. Doktor se chce ozvat ohledně vašich výsledků, prosím, zavolejte mu zpět na pevnou linku 02/...\""}'::jsonb
WHERE id = '4949aac9-3da2-55c7-ae5d-ed2024e885e0';

-- ============================================================================
-- Q208: Honeypot — tax office call (Daňový úrad → HMRC / Finanční úřad)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A phone call. Reaction?',
  options_en = '[{"id":"a","label":"Legit — HMRC really does ask for clarifications, but I call back via the main gov.uk/hmrc number","correct":true,"severity":null},{"id":"b","label":"Vishing — HMRC never phones","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"call","caller":"HMRC — London","number":"+44 300 200 3300","hint":"The inspector asks for a clarification on my VAT return (a foreign confirmation is missing)."}'::jsonb
WHERE id = 'eec07cbc-4ceb-527e-930c-389911ccec8a';

UPDATE public.questions SET
  prompt_cs = 'Volání. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — FÚ takto reálně žádá důkazy, ale já zavolám zpět přes ústřední číslo","correct":true,"severity":null},{"id":"b","label":"Vishing — finanční správa nikdy netelefonuje","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"Finanční úřad Praha","number":"+420 225 091 111","hint":"Inspektorka žádá upřesnění mého přiznání k DPH (chybí potvrzení ze zahraničí)."}'::jsonb
WHERE id = 'eec07cbc-4ceb-527e-930c-389911ccec8a';

-- ============================================================================
-- Q209: Honeypot — courier (DPD) calling from a mobile to find the buzzer
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A phone call. Reaction?',
  options_en = '[{"id":"a","label":"Legit — couriers really do often call from a mobile, no details requested","correct":true,"severity":null},{"id":"b","label":"Vishing — couriers are scams","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"call","caller":"DPD courier","number":"07700 ... (mobile)","hint":"\"I am outside your flat, I cannot find the buzzer. I am calling from my mobile to reach you.\""}'::jsonb
WHERE id = '67922472-8ac7-5209-b1e5-a02a8ab0ca4e';

UPDATE public.questions SET
  prompt_cs = 'Volání. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — kurýr reálně často volá z mobilu, žádné údaje nepýtá","correct":true,"severity":null},{"id":"b","label":"Vishing — kurýři jsou scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"Kurýr DPD","number":"720 ... (mobilní)","hint":"„Jsem před bytem, nemůžu najít zvonek. Volám z mobilu, abych vás zastihl.\""}'::jsonb
WHERE id = '67922472-8ac7-5209-b1e5-a02a8ab0ca4e';

-- ============================================================================
-- Q210: Honeypot — social insurance call (Sociálna poisťovňa → DWP / ČSSZ)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A phone call. Reaction?',
  options_en = '[{"id":"a","label":"Legit — DWP really works this way, I call back via the gov.uk/dwp callback line","correct":true,"severity":null},{"id":"b","label":"Vishing — DWP has no reason to call me","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"call","caller":"DWP — local office","number":"+44 800 ... (landline)","hint":"They ask me to clarify a detail in my notification about a change of employer."}'::jsonb
WHERE id = 'acf525a1-dcfb-5bd5-be06-a2cf4bbbdcf6';

UPDATE public.questions SET
  prompt_cs = 'Volání. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — ČSSZ takto reálně pracuje, já zavolám zpět přes cssz.cz callback","correct":true,"severity":null},{"id":"b","label":"Vishing — ČSSZ nemá co volat","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"ČSSZ — pobočka","number":"+420 257 ... (pevná)","hint":"Žádají dovysvětlit údaj v mém oznámení o změně zaměstnavatele."}'::jsonb
WHERE id = 'acf525a1-dcfb-5bd5-be06-a2cf4bbbdcf6';

-- ============================================================================
-- Q211: Honeypot — HR from my own company calls about a contract
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A phone call. Reaction?',
  options_en = '[{"id":"a","label":"Legit — my own company, I verify the portal domain via our intranet","correct":true,"severity":null},{"id":"b","label":"Vishing — I trust no HR","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"call","caller":"HR — my company","number":"+44 20 ... (company main line)","hint":"HR asks me to sign a new agreement and sends a link to documents via the internal portal."}'::jsonb
WHERE id = '9e9cb7a4-d813-5280-b142-dd3d5f010b57';

UPDATE public.questions SET
  prompt_cs = 'Volání. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — moje firma, doménu portálu si ověřím přes intranet","correct":true,"severity":null},{"id":"b","label":"Vishing — HR nikomu nedůvěřuji","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"HR — moje firma","number":"+420 2 ... (firemní ústředí)","hint":"HR žádá podepsat novou dohodu a posílá link na dokumenty přes interní portál."}'::jsonb
WHERE id = '9e9cb7a4-d813-5280-b142-dd3d5f010b57';

-- ============================================================================
-- Q212: Honeypot — energy provider planned outage (ZSE → British Gas / ČEZ)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A phone call. Reaction?',
  options_en = '[{"id":"a","label":"Legit — British Gas 0800 number is official, just an info call","correct":true,"severity":null},{"id":"b","label":"Vishing — energy firms are scams","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"call","caller":"British Gas — customer line","number":"0800 048 0202","hint":"They notify me of a planned electricity outage in my area on 30 April (scheduled maintenance)."}'::jsonb
WHERE id = '6920e712-e7b2-510a-9049-34ff907f6fc9';

UPDATE public.questions SET
  prompt_cs = 'Volání. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — ČEZ 800 číslo je oficiální, jen informační hovor","correct":true,"severity":null},{"id":"b","label":"Vishing — energetické firmy jsou scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"call","caller":"ČEZ — zákaznická linka","number":"800 810 820","hint":"Avizují výpadek elektřiny v mé oblasti dne 30.04 (plánovaná údržba)."}'::jsonb
WHERE id = '6920e712-e7b2-510a-9049-34ff907f6fc9';

-- ============================================================================
-- Q213: Honeypot — Bazoš car listing, plausible low price + V5C transfer
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A Gumtree listing. Reaction?',
  options_en = '[{"id":"a","label":"Legit — the low price has a real reason (moving abroad), payment on V5C transfer","correct":true,"severity":null},{"id":"b","label":"Scam — anything under market value is a scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"listing","site":"gumtree.com","title":"Škoda Octavia 2018, 120,000 mi — QUICK SALE","price":"£7,200","location":"London — moving abroad","description":"Excellent condition, service history, 1 owner. Selling urgently because I am moving to Austria. Come and view it, sale via signed transfer of V5C logbook."}'::jsonb
WHERE id = '4db15fd5-df5c-59ce-80ba-aa18b125d9ca';

UPDATE public.questions SET
  prompt_cs = 'Inzerát na Bazos.cz. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — nízká cena má reálný důvod (stěhování), platba klasicky při převodu na DI","correct":true,"severity":null},{"id":"b","label":"Scam — všechno pod cenou je podvod","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"listing","site":"bazos.cz","title":"Auto Škoda Octavia 2018, 120 000 km — RYCHLE","price":"210 000 Kč","location":"Praha — stěhuji se do zahraničí","description":"Stav výborný, servisní knížka, 1 majitel. Prodávám urgentně kvůli stěhování do Rakouska. Auto si můžete přijet prohlédnout, koupě přes kupní smlouvu na DI."}'::jsonb
WHERE id = '4db15fd5-df5c-59ce-80ba-aa18b125d9ca';

-- ============================================================================
-- Q214: Honeypot — Bazoš listing from a parent''s estate (vintage Omega)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A listing from an estate. Reaction?',
  options_en = '[{"id":"a","label":"Legit — an estate is a real scenario, the low price has a reason","correct":true,"severity":null},{"id":"b","label":"Scam — an estate is always a scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"listing","site":"gumtree.com","title":"Vintage Omega Seamaster — from my father''s estate","price":"£290","location":"Birmingham — collection in person","description":"My father passed away, I am selling his collection. Watch working, original box. I priced it lower because I do not know the market. Meet at my place or in town."}'::jsonb
WHERE id = '8f4cf863-0326-547d-a5c5-cc6fa1f0a562';

UPDATE public.questions SET
  prompt_cs = 'Inzerát z pozůstalosti. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — pozůstalost je reálný scénář, nízká cena má důvod","correct":true,"severity":null},{"id":"b","label":"Scam — pozůstalost je vždy scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"listing","site":"bazos.cz","title":"Vintage hodinky Omega Seamaster — z pozůstalosti otce","price":"9 000 Kč","location":"Brno — osobní převzetí","description":"Otec zemřel, prodávám jeho sbírku. Hodinky funkční, originální krabička. Cenu jsem dal nižší, protože nemám přehled o trhu. Setkání u mě doma nebo ve městě."}'::jsonb
WHERE id = '8f4cf863-0326-547d-a5c5-cc6fa1f0a562';

-- ============================================================================
-- Q215: Honeypot — low-rent flat with estate-agent contract
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A rental — feels suspiciously cheap. Reaction?',
  options_en = '[{"id":"a","label":"Legit — below market, but with a reason (inherited) + contract via estate agent","correct":true,"severity":null},{"id":"b","label":"Scam — anything under £900 is a scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"listing","site":"rightmove.co.uk","title":"2-bed flat 55 m² Croydon","price":"£850 / month","location":"London — Croydon, near East Croydon station","description":"Looking for a long-term tenant, flat inherited from grandfather, we will add a few small bits. Viewings this week. Contract via Reality Plus estate agency."}'::jsonb
WHERE id = 'e3b60a32-a5be-5c24-8b4b-aa2a9243e004';

UPDATE public.questions SET
  prompt_cs = 'Pronájem bytu — působí podezřele levně. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — pod-trh, ale s důvodem (po dědovi) + smlouva přes realitku","correct":true,"severity":null},{"id":"b","label":"Scam — byty pod 15 000 Kč jsou scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"listing","site":"sreality.cz","title":"2+kk byt 55 m² Praha 4","price":"14 500 Kč / měsíc","location":"Praha — Háje, blízko metra","description":"Hledáme dlouhodobého nájemníka, byt po dědovi, doplníme jen pár věcí. Prohlídka tento týden. Smlouva přes realitní kancelář Reality Plus."}'::jsonb
WHERE id = 'e3b60a32-a5be-5c24-8b4b-aa2a9243e004';

-- ============================================================================
-- Q216: Honeypot — household items, symbolic price
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A listing with an unusually low price. Reaction?',
  options_en = '[{"id":"a","label":"Legit — household trinkets often sell for token amounts","correct":true,"severity":null},{"id":"b","label":"Scam — low price = scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"listing","site":"gumtree.com","title":"Stoneware — set of 6 plates from an estate","price":"£18","location":"Reading — collection in person","description":"Mum is throwing it out, I would rather someone got use out of it. Set of plates, light scratches. Collection only, I do not post."}'::jsonb
WHERE id = '5f115a86-c9f5-572d-8e3b-1e255891a4dc';

UPDATE public.questions SET
  prompt_cs = 'Inzerát s neobvykle nízkou cenou. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — drobnosti z domova prodávají často symbolicky","correct":true,"severity":null},{"id":"b","label":"Scam — nízká cena = scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"listing","site":"bazos.cz","title":"Keramika — sada 6 ks z pozůstalosti","price":"500 Kč","location":"Kolín — osobní převzetí","description":"Máma vyhazuje, já bych rád, aby to někdo využil. Sada talířků mírný škrábanec. Pouze osobně, neposílám."}'::jsonb
WHERE id = '5f115a86-c9f5-572d-8e3b-1e255891a4dc';

-- ============================================================================
-- Q217: Honeypot — urgent bike sale, student going to USA
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A bicycle listing — sounds urgent. Reaction?',
  options_en = '[{"id":"a","label":"Legit — clear reason (leaving for the USA) + collection in person + proof of purchase","correct":true,"severity":null},{"id":"b","label":"Scam — anything urgent is a scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"listing","site":"gumtree.com","title":"CUBE Stereo 27.5 mountain bike — bought 2022","price":"£720","location":"Manchester — collection in person","description":"Selling because I am going to study in the USA, within 14 days. Original price £1,900, ridden ~10×. Meet this weekend, proof of purchase included."}'::jsonb
WHERE id = 'bb93ae54-cc96-5c77-aa97-592d349ea4b3';

UPDATE public.questions SET
  prompt_cs = 'Inzerát kola — působí naléhavě. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — důvod (odchod do USA) + osobní převzetí + doklad","correct":true,"severity":null},{"id":"b","label":"Scam — všechno naléhavé je scam","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"listing","site":"bazos.cz","title":"Horské kolo CUBE Stereo 27.5 — koupené 2022","price":"22 000 Kč","location":"Brno — osobní převzetí","description":"Prodávám, protože jdu studovat do USA, do 14 dní. Originální cena 55 000 Kč, používané ~10×. Setkání tento víkend, při koupi doklad o původu."}'::jsonb
WHERE id = 'bb93ae54-cc96-5c77-aa97-592d349ea4b3';

-- ============================================================================
-- Q218: Honeypot — free sofa, collect yourself
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Free sofa. Reaction?',
  options_en = '[{"id":"a","label":"Legit — free furniture during a move is common","correct":true,"severity":null},{"id":"b","label":"Scam — nothing is free","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"listing","site":"gumtree.com","title":"FREE sofa — collection today/tomorrow","price":"£0","location":"London — Hammersmith, 3rd floor no lift","description":"We are moving, we do not need the sofa. The new owner arranges collection. Decent condition, lightly used."}'::jsonb
WHERE id = '154c28d4-ddcd-554c-9cdd-d16cacfe990d';

UPDATE public.questions SET
  prompt_cs = 'Pohovka zdarma. Reakce?',
  options_cs = '[{"id":"a","label":"Legit — nábytek zdarma při stěhování je běžné","correct":true,"severity":null},{"id":"b","label":"Scam — nic není zadarmo","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"listing","site":"bazos.cz","title":"ZDARMA sedací souprava — odvoz dnes/zítra","price":"0 Kč","location":"Praha — Břevnov, 3. patro bez výtahu","description":"Stěhujeme se, sedačku už nepotřebujeme. Odvoz si zařídí nový majitel. Stav slušný, mírně použitá."}'::jsonb
WHERE id = '154c28d4-ddcd-554c-9cdd-d16cacfe990d';

-- ============================================================================
-- Q219: Honeypot — Bolt driver-arriving SMS
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you act on this SMS?',
  options_en = '[{"id":"a","label":"Yes — my ride, just info","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Bolt","body":"Driver Mark (LO19 EEN) is 2 min from the pickup. Ride fare £6.20."}'::jsonb
WHERE id = '9deb1fb1-956f-5e7c-8f90-f12b581bc5e2';

UPDATE public.questions SET
  prompt_cs = 'Reagoval bys na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — moje jízda, jen info","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Bolt","body":"Řidič Marek (1A2 3456) je 2 min od místa vyzvednutí. Cena jízdy 165 Kč."}'::jsonb
WHERE id = '9deb1fb1-956f-5e7c-8f90-f12b581bc5e2';

-- ============================================================================
-- Q220: Honeypot — Wolt courier pickup SMS
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you act on this SMS?',
  options_en = '[{"id":"a","label":"Yes — my order, tracking status","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Wolt","body":"Your courier picked up the order from The Lime Inn. Delivers in 22 minutes."}'::jsonb
WHERE id = 'bc197e63-75d4-555a-aed1-20ba9aaf70ef';

UPDATE public.questions SET
  prompt_cs = 'Reagoval bys na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — moje objednávka, sleduje stav","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Wolt","body":"Tvůj kurýr převzal objednávku z Hostinec U Lípy. Doručí do 22 minut."}'::jsonb
WHERE id = 'bc197e63-75d4-555a-aed1-20ba9aaf70ef';

-- ============================================================================
-- Q221: Honeypot — Uber verification code SMS
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you act on this SMS?',
  options_en = '[{"id":"a","label":"Yes — I am signing in to the app right now","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Uber","body":"Your verification code: 4821. Do not share with anyone."}'::jsonb
WHERE id = '367593b0-d497-5cee-a573-3fdb9d40ff1f';

UPDATE public.questions SET
  prompt_cs = 'Reagoval bys na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — právě se přihlašuji do aplikace","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Uber","body":"Verifikační kód: 4821. Nikomu jej neposílejte."}'::jsonb
WHERE id = '367593b0-d497-5cee-a573-3fdb9d40ff1f';

-- ============================================================================
-- Q222: Honeypot — ride-completed SMS (Yango → Bolt UK / Liftago CZ)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you act on this SMS?',
  options_en = '[{"id":"a","label":"Yes — my ride, noted","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Bolt","body":"Your ride is complete. £4.90 charged to card *6628. Rate it in the app."}'::jsonb
WHERE id = '1ba1ce8e-ec52-5010-8f4c-90a2295da088';

UPDATE public.questions SET
  prompt_cs = 'Reagoval bys na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — moje jízda, beru na vědomí","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Liftago","body":"Tvá jízda je dokončena. Cena 140 Kč stržena z karty *6628. Hodnocení v aplikaci."}'::jsonb
WHERE id = '1ba1ce8e-ec52-5010-8f4c-90a2295da088';

-- ============================================================================
-- Q223: Honeypot — Airbnb reservation-confirmed SMS
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you act on this SMS?',
  options_en = '[{"id":"a","label":"Yes — my booking, I open the app manually","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Airbnb","body":"Your reservation HMA82B7K has been confirmed. Details in the app."}'::jsonb
WHERE id = '56919a4f-de70-5100-b6b9-2da40a4763ba';

UPDATE public.questions SET
  prompt_cs = 'Reagoval bys na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — moje rezervace, otevřu aplikaci ručně","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Airbnb","body":"Tvá rezervace HMA82B7K byla potvrzena. Detail v aplikaci."}'::jsonb
WHERE id = '56919a4f-de70-5100-b6b9-2da40a4763ba';

-- ============================================================================
-- Q224: Honeypot — Apple ID verification SMS
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Would you act on this SMS?',
  options_en = '[{"id":"a","label":"Yes — I am signing in on a new MacBook right now","correct":true,"severity":null},{"id":"b","label":"No — looks suspicious","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"sms","sender":"Apple","body":"Apple ID Verification Code: 728193. Do not share. Valid 10 min."}'::jsonb
WHERE id = '9824285e-a7d6-596a-85ff-ee5e02b8e6dc';

UPDATE public.questions SET
  prompt_cs = 'Reagoval bys na tuto SMS?',
  options_cs = '[{"id":"a","label":"Ano — právě se přihlašuji na novém MacBooku","correct":true,"severity":null},{"id":"b","label":"Ne — vypadá podezřele","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"sms","sender":"Apple","body":"Apple ID Verification Code: 728193. Nesdílejte. Platnost 10 min."}'::jsonb
WHERE id = '9824285e-a7d6-596a-85ff-ee5e02b8e6dc';

-- ============================================================================
-- Q225: Pig butchering — WhatsApp "wrong number" opener
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A WhatsApp message arrives: "Hi Mike, sending you Tom''s number, but maybe I got it wrong — sorry!" Unknown foreign number. What do you do?',
  options_en = '[{"id":"a","label":"I reply — these things happen, could be an interesting person","correct":false,"severity":"critical"},{"id":"b","label":"I ignore it, or reply only \"Wrong number\" and nothing else","correct":true,"severity":null},{"id":"c","label":"I reply and ask where they got my number","correct":false,"severity":"medium"}]'::jsonb
WHERE id = '43c37fd0-16aa-56b2-b915-a2c83858fa57';

UPDATE public.questions SET
  prompt_cs = 'Na WhatsApp ti přijde zpráva: „Ahoj Mirku, posílám číslo od Tomáše, ale možná jsem se spletl — omlouvám se!" Neznámé zahraniční číslo. Co uděláš?',
  options_cs = '[{"id":"a","label":"Odpovím — to se stává, může to být zajímavý člověk","correct":false,"severity":"critical"},{"id":"b","label":"Zprávu ignoruji nebo odpovím jen \"Špatné číslo\" a nic víc","correct":true,"severity":null},{"id":"c","label":"Odpovídám a ptám se, kde vzal moje číslo","correct":false,"severity":"medium"}]'::jsonb
WHERE id = '43c37fd0-16aa-56b2-b915-a2c83858fa57';

-- ============================================================================
-- Q226: Pig butchering — 3-week chat, video call always postponed
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A stranger has been messaging you on WhatsApp for 3 weeks, every day. They offer a video call, but always postpone — "bad signal", "work meeting". Your reaction?',
  options_en = '[{"id":"a","label":"I know they have a busy job — this is a serious person","correct":false,"severity":"critical"},{"id":"b","label":"Without a live video call I do not trust this person and I refuse financial topics","correct":true,"severity":null},{"id":"c","label":"I send them a small amount first — that will verify their intent","correct":false,"severity":"critical"}]'::jsonb
WHERE id = 'cba5ca06-154f-589e-b32d-708d52f978c9';

UPDATE public.questions SET
  prompt_cs = 'Cizinec ti píše na WhatsApp už 3 týdny, každý den. Nabízí videohovor, ale vždy ho odkládá — „špatné spojení", „pracovní schůzka". Tvá reakce?',
  options_cs = '[{"id":"a","label":"Vím, že má rušnou práci — je to vážný člověk","correct":false,"severity":"critical"},{"id":"b","label":"Bez živého videohovoru této osobě nedůvěřuji a finanční témata odmítám","correct":true,"severity":null},{"id":"c","label":"Pošlu mu nejprve malou částku — ověří se tím jeho záměr","correct":false,"severity":"critical"}]'::jsonb
WHERE id = 'cba5ca06-154f-589e-b32d-708d52f978c9';

-- ============================================================================
-- Q227: Pig butchering — friend recommends investment platform (NBS → FCA / ČNB)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A new online "friend" recommended an investment platform via a link, where his portfolio supposedly grew 180 % in 2 months. What do you check before registering?',
  options_en = '[{"id":"a","label":"Nothing — if it works for him, why not for me","correct":false,"severity":"critical"},{"id":"b","label":"I check the platform in the FCA / ESMA register — whether it is licensed in the UK","correct":true,"severity":null},{"id":"c","label":"I invest a small amount and see","correct":false,"severity":"critical"}]'::jsonb
WHERE id = '130b27fd-ed75-5edf-beb6-c95132399d2e';

UPDATE public.questions SET
  prompt_cs = 'Nový online „přítel" ti doporučil investiční platformu odkazem, kde jeho portfolio vzrostlo o 180 % za 2 měsíce. Co kontroluješ před registrací?',
  options_cs = '[{"id":"a","label":"Nic — pokud mu to funguje, proč ne mně","correct":false,"severity":"critical"},{"id":"b","label":"Ověřím platformu v registru ČNB / ESMA — zda má licenci v Česku","correct":true,"severity":null},{"id":"c","label":"Investuji malou částku a uvidím","correct":false,"severity":"critical"}]'::jsonb
WHERE id = '130b27fd-ed75-5edf-beb6-c95132399d2e';

-- ============================================================================
-- Q228: URL — fake investment platform domain (.sk → .co.uk / .cz prefix)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'A friend from the internet sent you a link to a "verified" investment platform. Is this URL OK?',
  options_en = '[{"id":"a","label":"Yes — HTTPS and a UK prefix are good signs","correct":false,"severity":"critical"},{"id":"b","label":"No — no regulated institution has a domain like this","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://uk-invest-global-trade.com/dashboard","secure":true}'::jsonb
WHERE id = 'd8248b25-ea4a-5f24-b027-2a200cad1383';

UPDATE public.questions SET
  prompt_cs = 'Přítel z internetu ti poslal link na „ověřenou" investiční platformu. Je tato URL v pořádku?',
  options_cs = '[{"id":"a","label":"Ano — HTTPS a český prefix jsou dobré signály","correct":false,"severity":"critical"},{"id":"b","label":"Ne — žádná regulovaná instituce nemá takovou doménu","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://cz-invest-global-trade.com/dashboard","secure":true}'::jsonb
WHERE id = 'd8248b25-ea4a-5f24-b027-2a200cad1383';

-- ============================================================================
-- Q229: Pig butchering — "tax deposit" before withdrawal (€ → £ / Kč)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You want to withdraw "profits" from an online investment platform. The platform says: "Before paying out £8,000 you must settle a 15 % tax deposit (£1,200) in crypto." What do you do?',
  options_en = '[{"id":"a","label":"I pay — I want my profits","correct":false,"severity":"critical"},{"id":"b","label":"Refuse — this is a scam, I never pay tax deposits before a withdrawal","correct":true,"severity":null},{"id":"c","label":"I pay half and see","correct":false,"severity":"critical"}]'::jsonb
WHERE id = '76327aa6-790f-5a76-96fe-f26ea16f85f0';

UPDATE public.questions SET
  prompt_cs = 'Chceš vybrat „zisky" z online investiční platformy. Platforma říká: „Před výplatou 240 000 Kč musíte uhradit daňovou zálohu 15 % (36 000 Kč) kryptoměnou." Co uděláš?',
  options_cs = '[{"id":"a","label":"Zaplatím — chci dostat zisky","correct":false,"severity":"critical"},{"id":"b","label":"Odmítnu — toto je podvod, zálohu na daň před výběrem nikdy neplatím","correct":true,"severity":null},{"id":"c","label":"Zaplatím polovinu a uvidím","correct":false,"severity":"critical"}]'::jsonb
WHERE id = '76327aa6-790f-5a76-96fe-f26ea16f85f0';

-- ============================================================================
-- Q230: fake_vs_real — pig-butchering markers vs legit (NBS → FCA / ČNB)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Which of these signals indicates pig butchering (NOT a legitimate investment platform)?',
  options_en = '[{"id":"a","label":"First contact was a \"wrong number\" message from a stranger, then romantic interest, then an investment pitch","correct":true,"severity":null},{"id":"b","label":"The platform is registered with the FCA and offers bank transfer as a deposit option","correct":false,"severity":"minor"},{"id":"c","label":"The broker offers a video consultation with an FCA-licensed advisor in the UK","correct":false,"severity":"minor"}]'::jsonb
WHERE id = '3d5f715e-e420-5a95-890c-cda9f6922094';

UPDATE public.questions SET
  prompt_cs = 'Který z těchto znaků naznačuje pig butchering (NE legitimní investiční platformu)?',
  options_cs = '[{"id":"a","label":"První kontakt byl \"omylná\" zpráva od cizince, pak romantické zájmy, pak investiční nabídka","correct":true,"severity":null},{"id":"b","label":"Platforma je registrována u ČNB a má bankovní převod jako možnost vkladu","correct":false,"severity":"minor"},{"id":"c","label":"Broker nabízí videokonzultaci s licencovaným poradcem v Česku","correct":false,"severity":"minor"}]'::jsonb
WHERE id = '3d5f715e-e420-5a95-890c-cda9f6922094';

-- ============================================================================
-- Q231: Recovery scam after losing money to fake platform (€ → £ / Kč)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'After losing £3,500 on a fake investment platform someone messages you on Facebook: "We help scam victims recover crypto — 80 % success rate, fee only after recovery." Do you reply?',
  options_en = '[{"id":"a","label":"Yes — I lose nothing, I pay only after recovery","correct":false,"severity":"critical"},{"id":"b","label":"No — a recovery scam is another fraud on the victim of the previous one","correct":true,"severity":null},{"id":"c","label":"I send a small amount as a test — if they recover, I send more","correct":false,"severity":"critical"}]'::jsonb
WHERE id = '03313d86-d2d3-5eb2-8a16-bc84e2db30e9';

UPDATE public.questions SET
  prompt_cs = 'Po ztrátě 100 000 Kč na falešné investiční platformě ti na Facebooku napíše: „Pomáháme obětem podvodů získat kryptoměny zpět — 80 % úspěšnost, poplatek až po vrácení." Reaguješ?',
  options_cs = '[{"id":"a","label":"Ano — nic neztrácím, poplatek platím až po vrácení","correct":false,"severity":"critical"},{"id":"b","label":"Ne — recovery scam je další podvod na oběti předchozího","correct":true,"severity":null},{"id":"c","label":"Pošlu malou částku jako test — pokud vrátí, pošlu víc","correct":false,"severity":"critical"}]'::jsonb
WHERE id = '03313d86-d2d3-5eb2-8a16-bc84e2db30e9';

-- ============================================================================
-- Q232: Pig butchering — Instagram contact pivots to investments (€ → £ / Kč)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'An unknown contact on Instagram has been messaging you for 2 weeks — interested in you, commenting on photos, asking about work. Then changes the topic: "My friend made £4,500 via a platform, I''ll show you." What is this?',
  options_en = '[{"id":"a","label":"Maybe they really want to help — I will ask more","correct":false,"severity":"critical"},{"id":"b","label":"Pig butchering — building trust before an investment scam","correct":true,"severity":null},{"id":"c","label":"Multi-level marketing — I will be careful but hear them out","correct":false,"severity":"medium"}]'::jsonb
WHERE id = '30466482-abb0-565d-8c40-921a1867b428';

UPDATE public.questions SET
  prompt_cs = 'Neznámý kontakt na Instagramu ti posílá zprávy 2 týdny — zajímá se o tebe, komentuje fotky, ptá se na práci. Pak změní téma: „Kamarádka vydělala 130 000 Kč přes platformu, ukážu ti." Co to je?',
  options_cs = '[{"id":"a","label":"Možná opravdu chce pomoct — zeptám se víc","correct":false,"severity":"critical"},{"id":"b","label":"Pig butchering — budování důvěry před investičním podvodem","correct":true,"severity":null},{"id":"c","label":"Multilevel marketing — budu opatrný, ale vyslechnu si","correct":false,"severity":"medium"}]'::jsonb
WHERE id = '30466482-abb0-565d-8c40-921a1867b428';

-- ============================================================================
-- Q233: URL — sponsored bank phishing (Tatra banka → Barclays / Č. spořitelna)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'You search "barclays login" on Google. The first result has a "Sponsored" label and this URL. Do you click?',
  options_en = '[{"id":"a","label":"Yes — the first search result is always correct","correct":false,"severity":"critical"},{"id":"b","label":"No — the real domain is barclays.co.uk, not barclays-login.co.uk","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://barclays-login.co.uk/ib/login","secure":true}'::jsonb
WHERE id = '06030df1-0696-5597-81fe-f0b2a900cab4';

UPDATE public.questions SET
  prompt_cs = 'Hledáš „ceska sporitelna prihlaseni" na Googlu. První výsledek má štítek „Sponzorované" a URL je tato. Klikneš?',
  options_cs = '[{"id":"a","label":"Ano — první výsledek ve vyhledávači je vždy správný","correct":false,"severity":"critical"},{"id":"b","label":"Ne — pravá doména je csas.cz, ne csas-prihlaseni.cz","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://csas-prihlaseni.cz/ib/login","secure":true}'::jsonb
WHERE id = '06030df1-0696-5597-81fe-f0b2a900cab4';

-- ============================================================================
-- Q234: URL — VÚB Internetbanking ad (→ NatWest / Air Bank)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'In Google results you see an ad "NatWest Online Banking — Sign in". The URL in the ad is this. Is it OK?',
  options_en = '[{"id":"a","label":"Yes — NatWest is in the URL, definitely their site","correct":false,"severity":"critical"},{"id":"b","label":"No — NatWest lives on natwest.com, not natwest-banking.online","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://natwest-banking.online/login","secure":true}'::jsonb
WHERE id = '2f4d2568-7977-59d9-86e8-f6a928a7d46b';

UPDATE public.questions SET
  prompt_cs = 'Ve výsledcích Googlu vidíš reklamu „Air Bank Internetbanking — Přihlášení". URL v reklamě je tato. Je v pořádku?',
  options_cs = '[{"id":"a","label":"Ano — Air Bank je tam uvedena, určitě je to jejich stránka","correct":false,"severity":"critical"},{"id":"b","label":"Ne — Air Bank je na airbank.cz, ne airbank-banking.online","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://airbank-banking.online/prihlaseni","secure":true}'::jsonb
WHERE id = '2f4d2568-7977-59d9-86e8-f6a928a7d46b';

-- ============================================================================
-- Q235: URL — Bing sponsored M365 phishing
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'Bing shows you a sponsored result for Microsoft 365 sign-in at this address. Do you sign in?',
  options_en = '[{"id":"a","label":"Yes — I see Microsoft in the URL and HTTPS","correct":false,"severity":"critical"},{"id":"b","label":"No — the real M365 login is login.microsoftonline.com, not login-secure.com","correct":true,"severity":null}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://microsoft365-uk.login-secure.com/oauth2","secure":true}'::jsonb
WHERE id = 'c481d4fa-18dc-51ba-a37b-c5a3691d2c18';

UPDATE public.questions SET
  prompt_cs = 'Bing ti jako sponzorovaný výsledek zobrazí přihlášení do Microsoft 365 na této adrese. Přihlásíš se?',
  options_cs = '[{"id":"a","label":"Ano — vidím Microsoft v adrese i HTTPS","correct":false,"severity":"critical"},{"id":"b","label":"Ne — pravý M365 login je login.microsoftonline.com, ne login-secure.com","correct":true,"severity":null}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://microsoft365-cz.login-secure.com/oauth2","secure":true}'::jsonb
WHERE id = 'c481d4fa-18dc-51ba-a37b-c5a3691d2c18';

-- ============================================================================
-- Q236: Facebook ad — bank crypto portal with guaranteed yield (SLSP → Lloyds / KB)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'On Facebook you see an ad: "Lloyds Bank — crypto portal for UK clients. Guaranteed 12 % monthly yield." What do you do?',
  options_en = '[{"id":"a","label":"I click — Lloyds is a trusted bank, this must be legitimate","correct":false,"severity":"critical"},{"id":"b","label":"I ignore it — a guaranteed yield is illegal under FCA rules and Lloyds has no crypto portal","correct":true,"severity":null},{"id":"c","label":"I register with a small amount — I will see","correct":false,"severity":"critical"}]'::jsonb
WHERE id = '56547498-45c7-52da-9059-f3a56b56e5c5';

UPDATE public.questions SET
  prompt_cs = 'Na Facebooku vidíš reklamu: „Komerční banka — krypto portál pro klienty ČR. Garantovaný výnos 12 % měsíčně." Co s tím?',
  options_cs = '[{"id":"a","label":"Kliknu — KB je důvěryhodná banka, to musí být legitimní","correct":false,"severity":"critical"},{"id":"b","label":"Ignoruji — garantovaný výnos je zákonem zakázaný a KB krypto portál nemá","correct":true,"severity":null},{"id":"c","label":"Registruji se s malou částkou — uvidím","correct":false,"severity":"critical"}]'::jsonb
WHERE id = '56547498-45c7-52da-9059-f3a56b56e5c5';

-- ============================================================================
-- Q237: Honeypot — ČSOB George ad with legit URL (→ HSBC / KB MojeBanka)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'In Google results you see an ad "HSBC — Sign in to Online Banking". The URL in the ad points to hsbc.co.uk. Do you sign in?',
  options_en = '[{"id":"a","label":"Yes — hsbc.co.uk is the real HSBC domain","correct":true,"severity":null},{"id":"b","label":"No — ads are always dangerous","correct":false,"severity":"minor"}]'::jsonb,
  visual_en = '{"kind":"url","url":"https://hsbc.co.uk/online-banking/login","secure":true}'::jsonb
WHERE id = '7da091ed-695a-5d84-ad77-5ddb44f05535';

UPDATE public.questions SET
  prompt_cs = 'Ve výsledcích Googlu vidíš reklamu „Komerční banka — Přihlášení do MojeBanky". URL v reklamě ukazuje na kb.cz. Přihlásíš se?',
  options_cs = '[{"id":"a","label":"Ano — kb.cz je pravá doména KB","correct":true,"severity":null},{"id":"b","label":"Ne — reklamy jsou vždy nebezpečné","correct":false,"severity":"minor"}]'::jsonb,
  visual_cs = '{"kind":"url","url":"https://kb.cz/mojebanka/login","secure":true}'::jsonb
WHERE id = '7da091ed-695a-5d84-ad77-5ddb44f05535';

-- ============================================================================
-- Q238 (FINAL): How to never click a fake Google bank-login ad (bookmarks)
-- ============================================================================
UPDATE public.questions SET
  prompt_en = 'What is the best way to make sure you never click a fake Google ad for a bank sign-in?',
  options_en = '[{"id":"a","label":"I always use Google — I quickly find what I need","correct":false,"severity":"medium"},{"id":"b","label":"I save the sign-in page as a browser bookmark and always use that bookmark","correct":true,"severity":null},{"id":"c","label":"I always check whether the ad has a \"Sponsored\" label — I skip those","correct":false,"severity":"minor"}]'::jsonb
WHERE id = '0e86480f-8b07-5c20-a890-4450af7f99df';

UPDATE public.questions SET
  prompt_cs = 'Jak si nejlépe zajistit, abys nikdy neklikl na falešnou Google reklamu na bankovní přihlášení?',
  options_cs = '[{"id":"a","label":"Používám vždy Google — rychle najdu, co potřebuji","correct":false,"severity":"medium"},{"id":"b","label":"Uložím si přihlášení do záložek prohlížeče a tyto záložky vždy používám","correct":true,"severity":null},{"id":"c","label":"Kontroluji vždy, zda reklama má štítek \"Sponzorované\" — takové přeskočím","correct":false,"severity":"minor"}]'::jsonb
WHERE id = '0e86480f-8b07-5c20-a890-4450af7f99df';
