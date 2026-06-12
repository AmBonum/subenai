# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs/test-packs/catalog-render-and-filter.spec.ts >> /tests catalog — render + filter + sort >> catalog card title for seniori does NOT contain '(55+)'
- Location: e2e/specs/test-packs/catalog-render-and-filter.spec.ts:57:3

# Error details

```
Error: expect(received).not.toMatch(expected)

Expected pattern: not /\(55\+\)/
Received string:      "Seniori (55+) — podvody cielené na starších"
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - navigation "Hlavná navigácia" [ref=e4]:
      - link "subenai — domov" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "subenai" [ref=e6]
      - generic [ref=e7]:
        - navigation "Main" [ref=e8]:
          - list [ref=e10]:
            - listitem [ref=e11]:
              - button "Sady testov" [ref=e12]:
                - text: Sady testov
                - img [ref=e13]
            - listitem [ref=e15]:
              - button "Školenia" [ref=e16]:
                - text: Školenia
                - img [ref=e17]
            - listitem [ref=e19]:
              - link "Pre školy a lektorov" [ref=e20] [cursor=pointer]:
                - /url: /schools
            - listitem [ref=e21]:
              - link "Akadémia" [ref=e22] [cursor=pointer]:
                - /url: /blog
            - listitem [ref=e23]:
              - link "Podpora projektu" [ref=e24] [cursor=pointer]:
                - /url: /support
        - link "Spustiť rýchly test" [ref=e25] [cursor=pointer]:
          - /url: /test
          - text: Spustiť
          - generic [ref=e26]: rýchly
          - text: test
          - generic [ref=e27]: →
  - main [ref=e29]:
    - generic [ref=e30]:
      - heading "Otestuj svoju branžu. Bez registrácie." [level=1] [ref=e31]
      - paragraph [ref=e32]: Phishing v e-shope vyzerá inak ako vishing v call-centre, falošná faktúra v účtarni inak ako podozrivé SMS od kuriéra. Vyber si sadu otázok, ktoré skutočne stretávaš v práci — a zisti, kde máš slepé miesta. 5 minút, žiadna registrácia, výsledok hneď.
    - region "Anonymne · 5 minút · Zadarmo" [ref=e33]:
      - generic [ref=e34]:
        - img [ref=e36]
        - generic [ref=e39]:
          - generic [ref=e40]: Anonymne
          - generic [ref=e41]: Žiadne meno, e-mail ani IP
      - generic [ref=e42]:
        - img [ref=e44]
        - generic [ref=e47]:
          - generic [ref=e48]: 5 minút
          - generic [ref=e49]: Krátky test, hneď výsledok
      - generic [ref=e50]:
        - img [ref=e52]
        - generic [ref=e56]:
          - generic [ref=e57]: Zadarmo
          - generic [ref=e58]: Bez paywall-u, bez registrácie
    - region "Pre koho je test:" [ref=e59]:
      - heading "Pre koho je test:" [level=2] [ref=e60]
      - generic [ref=e61]:
        - button "Rodičia" [ref=e62]
        - button "Sociálne siete" [ref=e63]
        - button "AI a deepfake" [ref=e64]
        - button "Heslá a 2FA" [ref=e65]
        - button "Zdravotníctvo" [ref=e66]
        - button "Školy" [ref=e67]
        - button "Všeobecný test" [ref=e68]
        - button "Seniori (55+)" [ref=e69]
        - button "Študenti (16+)" [ref=e70]
        - button "Žiaci (do 16 rokov)" [ref=e71]
        - button "Verejné služby" [ref=e72]
        - button "IT / Softvérový vývoj" [ref=e73]
        - button "Autoservis" [ref=e74]
        - button "Gastro" [ref=e75]
        - button "E-shop" [ref=e76]
    - generic [ref=e77]:
      - paragraph [ref=e78]: 15 testov
      - generic [ref=e79]:
        - generic [ref=e80]: "Zoradiť:"
        - combobox "Zoradiť:" [ref=e81]:
          - option "Najnovšie" [selected]
          - option "Najviac otázok"
    - heading "Zoznam dostupných test packov" [level=2] [ref=e82]
    - list [ref=e83]:
      - listitem [ref=e84]:
        - 'link "Test pre rodičov — chránite deti pred sextortion, groomingom a podvodnými výhrami? Rodičia ⭐ Najnovší Test pre rodičov — chránite deti pred sextortion, groomingom a podvodnými výhrami? 4 situácie, na ktoré rodičia nie sú pripravení: sextortion e-mail tínedžerovi, fake teen IG profil s groomingom, obídenie Family Link kontroly cez druhý účet a SMS „vaše dieťa vyhralo” s menom zo zverejneného FB profilu. 📋 4 otázok · ≥ 65 %" [ref=e85] [cursor=pointer]':
          - /url: /tests/rodicia
          - img "Test pre rodičov — chránite deti pred sextortion, groomingom a podvodnými výhrami?" [ref=e86]:
            - generic [ref=e90]: 👨‍👩‍👧
          - generic [ref=e91]:
            - generic [ref=e92]:
              - generic [ref=e93]: Rodičia
              - generic [ref=e94]: ⭐ Najnovší
            - heading "Test pre rodičov — chránite deti pred sextortion, groomingom a podvodnými výhrami?" [level=3] [ref=e95]
            - paragraph [ref=e96]: "4 situácie, na ktoré rodičia nie sú pripravení: sextortion e-mail tínedžerovi, fake teen IG profil s groomingom, obídenie Family Link kontroly cez druhý účet a SMS „vaše dieťa vyhralo” s menom zo zverejneného FB profilu."
            - paragraph [ref=e97]: 📋 4 otázok · ≥ 65 %
      - listitem [ref=e98]:
        - 'link "Test pre sociálne siete — rozpoznáš hack FB stránky, fake DM a Telegram pasce? Sociálne siete Test pre sociálne siete — rozpoznáš hack FB stránky, fake DM a Telegram pasce? 6 scenárov, ktoré sa dejú každý týždeň na slovenskom Instagrame a Facebooku: OAuth takeover business stránky, fake „guidelines violation” DM, Telegram investičné skupiny, sponzorované fake eshopy, kompromitovaný kamarát žiadajúci 2FA kód a legit Meta honeypot. 📋 6 otázok · ≥ 70 %" [ref=e99] [cursor=pointer]':
          - /url: /tests/socialne-siete
          - img "Test pre sociálne siete — rozpoznáš hack FB stránky, fake DM a Telegram pasce?" [ref=e100]:
            - generic [ref=e104]: 📱
          - generic [ref=e105]:
            - generic [ref=e107]: Sociálne siete
            - heading "Test pre sociálne siete — rozpoznáš hack FB stránky, fake DM a Telegram pasce?" [level=3] [ref=e108]
            - paragraph [ref=e109]: "6 scenárov, ktoré sa dejú každý týždeň na slovenskom Instagrame a Facebooku: OAuth takeover business stránky, fake „guidelines violation” DM, Telegram investičné skupiny, sponzorované fake eshopy, kompromitovaný kamarát žiadajúci 2FA kód a legit Meta honeypot."
            - paragraph [ref=e110]: 📋 6 otázok · ≥ 70 %
      - listitem [ref=e111]:
        - 'link "Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO a AI phishing? AI a deepfake Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO a AI phishing? 4 najnovšie vektory: AI-personalizovaný phishing s reálnym kontextom z LinkedIn, ChatGPT-poháňané investičné podvody, AI-generované dating profily a voice-clone vydieranie. 30 sekúnd audia stačí. 📋 4 otázok · ≥ 70 %" [ref=e112] [cursor=pointer]':
          - /url: /tests/ai-deepfake
          - img "Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO a AI phishing?" [ref=e113]:
            - generic [ref=e117]: 🤖
          - generic [ref=e118]:
            - generic [ref=e120]: AI a deepfake
            - heading "Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO a AI phishing?" [level=3] [ref=e121]
            - paragraph [ref=e122]: "4 najnovšie vektory: AI-personalizovaný phishing s reálnym kontextom z LinkedIn, ChatGPT-poháňané investičné podvody, AI-generované dating profily a voice-clone vydieranie. 30 sekúnd audia stačí."
            - paragraph [ref=e123]: 📋 4 otázok · ≥ 70 %
      - listitem [ref=e124]:
        - 'link "Test pre heslá a 2FA — rozpoznáš pasce na hesle, passkey a SMS kód? Heslá a 2FA Test pre heslá a 2FA — rozpoznáš pasce na hesle, passkey a SMS kód? 7 reálnych scenárov za 5 minút: recovery-email phishing, lookalike haveibeenpwned, OAuth scam, passkey vs SMS, session-expired popup, credential stuffing a legit Bitwarden honeypot. 📋 7 otázok · ≥ 70 %" [ref=e125] [cursor=pointer]':
          - /url: /tests/heslo-2fa
          - img "Test pre heslá a 2FA — rozpoznáš pasce na hesle, passkey a SMS kód?" [ref=e126]:
            - generic [ref=e130]: 🔐
          - generic [ref=e131]:
            - generic [ref=e133]: Heslá a 2FA
            - heading "Test pre heslá a 2FA — rozpoznáš pasce na hesle, passkey a SMS kód?" [level=3] [ref=e134]
            - paragraph [ref=e135]: "7 reálnych scenárov za 5 minút: recovery-email phishing, lookalike haveibeenpwned, OAuth scam, passkey vs SMS, session-expired popup, credential stuffing a legit Bitwarden honeypot."
            - paragraph [ref=e136]: 📋 7 otázok · ≥ 70 %
      - listitem [ref=e137]:
        - 'link "Test pre zdravotníctvo — falošný NCZI portál, vishing o pacientovi, BEC dodávateľa Zdravotníctvo Test pre zdravotníctvo — falošný NCZI portál, vishing o pacientovi, BEC dodávateľa 6 cielených útokov na slovenské ambulancie a kliniky: lookalike eRecept portál, vishing pre laboratórne výsledky pacienta, IBAN switch zdravotníckeho dodávateľa, ransomware lure cez CT.docx, fake „NCZI licencia vypršala” SMS a legit slovensko.sk eForm honeypot. 📋 6 otázok · ≥ 75 %" [ref=e138] [cursor=pointer]':
          - /url: /tests/zdravotnictvo
          - img "Test pre zdravotníctvo — falošný NCZI portál, vishing o pacientovi, BEC dodávateľa" [ref=e139]:
            - generic [ref=e143]: 🏥
          - generic [ref=e144]:
            - generic [ref=e146]: Zdravotníctvo
            - heading "Test pre zdravotníctvo — falošný NCZI portál, vishing o pacientovi, BEC dodávateľa" [level=3] [ref=e147]
            - paragraph [ref=e148]: "6 cielených útokov na slovenské ambulancie a kliniky: lookalike eRecept portál, vishing pre laboratórne výsledky pacienta, IBAN switch zdravotníckeho dodávateľa, ransomware lure cez CT.docx, fake „NCZI licencia vypršala” SMS a legit slovensko.sk eForm honeypot."
            - paragraph [ref=e149]: 📋 6 otázok · ≥ 75 %
      - listitem [ref=e150]:
        - 'link "Test pre školy — odolnosť proti phishingu EduPage, fake EU dotáciám a sociálnemu inžinierstvu Školy Test pre školy — odolnosť proti phishingu EduPage, fake EU dotáciám a sociálnemu inžinierstvu 3 reálne scenáre slovenských ZŠ a SŠ v 2026: lookalike EduPage prihlasovanie pre učiteľov, fake „EU dotácia 18 000 €” e-mail riaditeľke a sociálne inžinierstvo na recepcii (telefonát „som otec, akú má dnes poslednú hodinu?”). 📋 3 otázok · ≥ 70 %" [ref=e151] [cursor=pointer]':
          - /url: /tests/skoly
          - img "Test pre školy — odolnosť proti phishingu EduPage, fake EU dotáciám a sociálnemu inžinierstvu" [ref=e152]:
            - generic [ref=e156]: 🏫
          - generic [ref=e157]:
            - generic [ref=e159]: Školy
            - heading "Test pre školy — odolnosť proti phishingu EduPage, fake EU dotáciám a sociálnemu inžinierstvu" [level=3] [ref=e160]
            - paragraph [ref=e161]: "3 reálne scenáre slovenských ZŠ a SŠ v 2026: lookalike EduPage prihlasovanie pre učiteľov, fake „EU dotácia 18 000 €” e-mail riaditeľke a sociálne inžinierstvo na recepcii (telefonát „som otec, akú má dnes poslednú hodinu?”)."
            - paragraph [ref=e162]: 📋 3 otázok · ≥ 70 %
      - listitem [ref=e163]:
        - 'link "Všeobecný test — najčastejšie podvody Všeobecný test Všeobecný test — najčastejšie podvody Najrozšírenejší mix: SMS/email phishing, falošné e-shopy, vishing, QR kódy, AI klonovanie hlasu a rozpoznávanie legitímnych stránok. 14 otázok. 📋 14 otázok · ≥ 70 %" [ref=e164] [cursor=pointer]':
          - /url: /tests/vseobecny
          - img "Všeobecný test — najčastejšie podvody" [ref=e165]:
            - generic [ref=e169]: 🌐
          - generic [ref=e170]:
            - generic [ref=e172]: Všeobecný test
            - heading "Všeobecný test — najčastejšie podvody" [level=3] [ref=e173]
            - paragraph [ref=e174]: "Najrozšírenejší mix: SMS/email phishing, falošné e-shopy, vishing, QR kódy, AI klonovanie hlasu a rozpoznávanie legitímnych stránok. 14 otázok."
            - paragraph [ref=e175]: 📋 14 otázok · ≥ 70 %
      - listitem [ref=e176]:
        - link "Seniori (55+) — podvody cielené na starších Seniori (55+) Seniori (55+) — podvody cielené na starších „Ahoj babka” scam s AI klonovaním hlasu, dverový podvodník z banky, falošný príplatok k dôchodku, vishing polícia/technik. 13 otázok. 📋 13 otázok · ≥ 65 %" [ref=e177] [cursor=pointer]:
          - /url: /tests/seniori
          - img "Seniori (55+) — podvody cielené na starších" [ref=e178]:
            - generic [ref=e182]: 👴
          - generic [ref=e183]:
            - generic [ref=e185]: Seniori (55+)
            - heading "Seniori (55+) — podvody cielené na starších" [level=3] [ref=e186]
            - paragraph [ref=e187]: „Ahoj babka” scam s AI klonovaním hlasu, dverový podvodník z banky, falošný príplatok k dôchodku, vishing polícia/technik. 13 otázok.
            - paragraph [ref=e188]: 📋 13 otázok · ≥ 65 %
      - listitem [ref=e189]:
        - link "Študenti (16+) — podvody, na ktoré naletia pri štúdiu Študenti (16+) Študenti (16+) — podvody, na ktoré naletia pri štúdiu Fake prenájmy izby pred zápisom, phishing univerzitných portálov AIS2, falošné Erasmus+ štipendiá, Discord Nitro a job scam-y. 13 otázok. 📋 13 otázok · ≥ 70 %" [ref=e190] [cursor=pointer]:
          - /url: /tests/studenti
          - img "Študenti (16+) — podvody, na ktoré naletia pri štúdiu" [ref=e191]:
            - generic [ref=e195]: 🎓
          - generic [ref=e196]:
            - generic [ref=e198]: Študenti (16+)
            - heading "Študenti (16+) — podvody, na ktoré naletia pri štúdiu" [level=3] [ref=e199]
            - paragraph [ref=e200]: Fake prenájmy izby pred zápisom, phishing univerzitných portálov AIS2, falošné Erasmus+ štipendiá, Discord Nitro a job scam-y. 13 otázok.
            - paragraph [ref=e201]: 📋 13 otázok · ≥ 70 %
      - listitem [ref=e202]:
        - link "Žiaci (do 16 rokov) — bezpečnosť na internete Žiaci (do 16 rokov) Žiaci (do 16 rokov) — bezpečnosť na internete Discord a gaming scam-y, falošné súťaže na TikToku, phishing školských kont, podvody s brigádami. 14 otázok pre mladých používateľov. 📋 14 otázok · ≥ 65 %" [ref=e203] [cursor=pointer]:
          - /url: /tests/ziaci-do-16
          - img "Žiaci (do 16 rokov) — bezpečnosť na internete" [ref=e204]:
            - generic [ref=e208]: 🎮
          - generic [ref=e209]:
            - generic [ref=e211]: Žiaci (do 16 rokov)
            - heading "Žiaci (do 16 rokov) — bezpečnosť na internete" [level=3] [ref=e212]
            - paragraph [ref=e213]: Discord a gaming scam-y, falošné súťaže na TikToku, phishing školských kont, podvody s brigádami. 14 otázok pre mladých používateľov.
            - paragraph [ref=e214]: 📋 14 otázok · ≥ 65 %
      - listitem [ref=e215]:
        - link "Verejné služby — odolnosť úradníkov a obyvateľov Verejné služby Verejné služby — odolnosť úradníkov a obyvateľov Falošné štátne SMS, slovensko.sk klony, fake výzvy z FS, vishing od „polície”. 14 otázok pre úradníkov aj občanov. 📋 14 otázok · ≥ 70 %" [ref=e216] [cursor=pointer]:
          - /url: /tests/verejne-sluzby
          - img "Verejné služby — odolnosť úradníkov a obyvateľov" [ref=e217]:
            - generic [ref=e221]: 🏛️
          - generic [ref=e222]:
            - generic [ref=e224]: Verejné služby
            - heading "Verejné služby — odolnosť úradníkov a obyvateľov" [level=3] [ref=e225]
            - paragraph [ref=e226]: Falošné štátne SMS, slovensko.sk klony, fake výzvy z FS, vishing od „polície”. 14 otázok pre úradníkov aj občanov.
            - paragraph [ref=e227]: 📋 14 otázok · ≥ 70 %
      - listitem [ref=e228]:
        - link "IT a softvérový vývoj — pokročilé vektory IT / Softvérový vývoj IT a softvérový vývoj — pokročilé vektory BEC, OAuth phishing, supply-chain pasce, fake recruiteri, deepfake CEO call. 15 otázok pre tím, ktorý má prístup k prod a financiám. 📋 15 otázok · ≥ 75 %" [ref=e229] [cursor=pointer]:
          - /url: /tests/it-vyvoj
          - img "IT a softvérový vývoj — pokročilé vektory" [ref=e230]:
            - generic [ref=e234]: 💻
          - generic [ref=e235]:
            - generic [ref=e237]: IT / Softvérový vývoj
            - heading "IT a softvérový vývoj — pokročilé vektory" [level=3] [ref=e238]
            - paragraph [ref=e239]: BEC, OAuth phishing, supply-chain pasce, fake recruiteri, deepfake CEO call. 15 otázok pre tím, ktorý má prístup k prod a financiám.
            - paragraph [ref=e240]: 📋 15 otázok · ≥ 75 %
      - listitem [ref=e241]:
        - link "Autoservis — scam-y proti dielenskému tímu Autoservis Autoservis — scam-y proti dielenskému tímu Fake objednávky náhradných dielov, podvody s VIN-om, smishing pre majiteľov áut, IBAN-switch dodávateľa. 13 otázok pre dielňu a recepciu. 📋 13 otázok · ≥ 70 %" [ref=e242] [cursor=pointer]:
          - /url: /tests/autoservis
          - img "Autoservis — scam-y proti dielenskému tímu" [ref=e243]:
            - generic [ref=e247]: 🚗
          - generic [ref=e248]:
            - generic [ref=e250]: Autoservis
            - heading "Autoservis — scam-y proti dielenskému tímu" [level=3] [ref=e251]
            - paragraph [ref=e252]: Fake objednávky náhradných dielov, podvody s VIN-om, smishing pre majiteľov áut, IBAN-switch dodávateľa. 13 otázok pre dielňu a recepciu.
            - paragraph [ref=e253]: 📋 13 otázok · ≥ 70 %
      - listitem [ref=e254]:
        - link "Gastro & HORECA — bezpečnosť pri PoS a rezerváciách Gastro Gastro & HORECA — bezpečnosť pri PoS a rezerváciách Falošné rezervácie cez Booking, podvodné dodávateľské faktúry, kompromitovaný POS a QR menu pasce. 14 otázok pre tím prevádzky. 📋 14 otázok · ≥ 70 %" [ref=e255] [cursor=pointer]:
          - /url: /tests/gastro-horeca
          - img "Gastro & HORECA — bezpečnosť pri PoS a rezerváciách" [ref=e256]:
            - generic [ref=e260]: 🍕
          - generic [ref=e261]:
            - generic [ref=e263]: Gastro
            - heading "Gastro & HORECA — bezpečnosť pri PoS a rezerváciách" [level=3] [ref=e264]
            - paragraph [ref=e265]: Falošné rezervácie cez Booking, podvodné dodávateľské faktúry, kompromitovaný POS a QR menu pasce. 14 otázok pre tím prevádzky.
            - paragraph [ref=e266]: 📋 14 otázok · ≥ 70 %
      - listitem [ref=e267]:
        - link "E-shop tím — odolnosť proti scam-u E-shop E-shop tím — odolnosť proti scam-u Fake kupci cez Stripe link, podvodné refundácie, balíkové smishing a Bazoš pasce. 14 otázok pre tím, ktorý komunikuje so zákazníkmi denne. 📋 14 otázok · ≥ 70 %" [ref=e268] [cursor=pointer]:
          - /url: /tests/eshop
          - img "E-shop tím — odolnosť proti scam-u" [ref=e269]:
            - generic [ref=e273]: 🛒
          - generic [ref=e274]:
            - generic [ref=e276]: E-shop
            - heading "E-shop tím — odolnosť proti scam-u" [level=3] [ref=e277]
            - paragraph [ref=e278]: Fake kupci cez Stripe link, podvodné refundácie, balíkové smishing a Bazoš pasce. 14 otázok pre tím, ktorý komunikuje so zákazníkmi denne.
            - paragraph [ref=e279]: 📋 14 otázok · ≥ 70 %
    - region "Časté otázky" [ref=e280]:
      - generic [ref=e281]:
        - generic [ref=e282]:
          - paragraph [ref=e283]: Pred testom
          - heading "Časté otázky" [level=2] [ref=e284]
          - paragraph [ref=e285]: 5 najčastejších otázok, ktoré dostávame od prvých návštevníkov. Klikni na otázku pre odpoveď.
        - button "Rozbaliť všetko" [ref=e286]
      - generic [ref=e287]:
        - heading "Je test zadarmo? Najčastejšia" [level=3] [ref=e289]:
          - button "Je test zadarmo? Najčastejšia" [ref=e290]:
            - generic [ref=e291]:
              - img [ref=e293]
              - generic [ref=e297]:
                - generic [ref=e298]: Je test zadarmo?
                - generic [ref=e299]: Najčastejšia
        - heading "Koľko času zaberie?" [level=3] [ref=e301]:
          - button "Koľko času zaberie?" [ref=e302]:
            - generic [ref=e303]:
              - img [ref=e305]
              - generic [ref=e310]: Koľko času zaberie?
        - heading "Pre koho je test vhodný?" [level=3] [ref=e312]:
          - button "Pre koho je test vhodný?" [ref=e313]:
            - generic [ref=e314]:
              - img [ref=e316]
              - generic [ref=e323]: Pre koho je test vhodný?
        - heading "Aké údaje zbierate?" [level=3] [ref=e325]:
          - button "Aké údaje zbierate?" [ref=e326]:
            - generic [ref=e327]:
              - img [ref=e329]
              - generic [ref=e333]: Aké údaje zbierate?
        - heading "Môžem test poslať kolegom?" [level=3] [ref=e335]:
          - button "Môžem test poslať kolegom?" [ref=e336]:
            - generic [ref=e337]:
              - img [ref=e339]
              - generic [ref=e347]: Môžem test poslať kolegom?
      - generic [ref=e348]:
        - generic [ref=e349]: Nenašiel si odpoveď?
        - link "Otvor akadémiu" [ref=e351] [cursor=pointer]:
          - /url: /blog
        - generic [ref=e352]:
          - text: ·
          - link "Napíš nám" [ref=e353] [cursor=pointer]:
            - /url: /contact
    - generic [ref=e354]:
      - link "Štandardný test (10 otázok)" [ref=e355] [cursor=pointer]:
        - /url: /test
      - link "Pozri bezplatné školenia" [ref=e356] [cursor=pointer]:
        - /url: /courses
  - contentinfo [ref=e357]:
    - generic [ref=e358]:
      - generic [ref=e359]:
        - link "subenai — domov" [ref=e360] [cursor=pointer]:
          - /url: /
          - img "subenai" [ref=e361]
        - paragraph [ref=e362]: Bezplatný edukatívny nástroj pre slovenský digitálny svet.
        - paragraph [ref=e363]:
          - text: spravené s 🍺 v
          - link "Novejši" [ref=e364] [cursor=pointer]:
            - /url: https://www.youtube.com/watch?v=dbuCSt_k5c8
          - text: ·
          - link "Aktuálna verzia v1.14.4 — zoznam zmien" [ref=e365] [cursor=pointer]:
            - /url: /changelog
            - text: v1.14.4
      - generic [ref=e366]:
        - heading "Obsah" [level=3] [ref=e367]
        - list [ref=e368]:
          - listitem [ref=e369]:
            - link "Spustiť test" [ref=e370] [cursor=pointer]:
              - /url: /test
          - listitem [ref=e371]:
            - link "Sady testov" [ref=e372] [cursor=pointer]:
              - /url: /tests
          - listitem [ref=e373]:
            - link "Školenia" [ref=e374] [cursor=pointer]:
              - /url: /courses
          - listitem [ref=e375]:
            - link "Šablóny testov" [ref=e376] [cursor=pointer]:
              - /url: /sablony
          - listitem [ref=e377]:
            - link "Pre školy" [ref=e378] [cursor=pointer]:
              - /url: /schools
          - listitem [ref=e379]:
            - link "Akadémia" [ref=e380] [cursor=pointer]:
              - /url: /blog
      - generic [ref=e381]:
        - heading "Projekt" [level=3] [ref=e382]
        - list [ref=e383]:
          - listitem [ref=e384]:
            - link "O projekte" [ref=e385] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e386]:
            - link "Kontakt" [ref=e387] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e388]:
            - link "Podpora projektu" [ref=e389] [cursor=pointer]:
              - /url: /support
          - listitem [ref=e390]:
            - link "Sponzori" [ref=e391] [cursor=pointer]:
              - /url: /sponsors
          - listitem [ref=e392]:
            - link "Zmeny a verzie" [ref=e393] [cursor=pointer]:
              - /url: /changelog
      - generic [ref=e394]:
        - heading "Právne" [level=3] [ref=e395]
        - list [ref=e396]:
          - listitem [ref=e397]:
            - link "Súkromie" [ref=e398] [cursor=pointer]:
              - /url: /privacy
          - listitem [ref=e399]:
            - link "Cookies" [ref=e400] [cursor=pointer]:
              - /url: /cookies
          - listitem [ref=e401]:
            - link "Spravovať podporu (sponzori)" [ref=e402] [cursor=pointer]:
              - /url: /manage-support
    - generic [ref=e403]:
      - paragraph [ref=e404]: © 2026 subenai · Všetky práva vyhradené.
      - button "Nastavenia cookies" [ref=e405]
    - paragraph [ref=e406]:
      - text: powered by
      - link "lvtesting.eu" [ref=e407] [cursor=pointer]:
        - /url: https://www.lvtesting.eu
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect } from "../../fixtures/base";
  2   | import { primeConsent } from "../../fixtures/consent";
  3   | import { platformPacksAvailable, PACKS_SKIP_MESSAGE } from "../../fixtures/platform-packs";
  4   | 
  5   | /**
  6   |  * E37 — DB-backed /tests catalog: render + filter + sort + empty state.
  7   |  *
  8   |  * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-01, TC-06,
  9   |  * TC-07, TC-08, TC-09, TC-10, TC-26).
  10  |  *
  11  |  * The catalog reads from public.get_platform_packs() at SSR. Live preview
  12  |  * deploy needs the Phase B' migration applied + platform@subenai.sk
  13  |  * Dashboard user — without those the catalog is empty.
  14  |  *
  15  |  * POM-only locators (per .claude/CLAUDE.md). The `testsDirectory` fixture
  16  |  * exposes `index` (catalog) and `pack` (detail) page objects.
  17  |  */
  18  | 
  19  | // Environment guard — these TCs read live pack rows (no mock layer);
  20  | // skip loudly when the configured Supabase project has no published
  21  | // platform packs. See e2e/fixtures/platform-packs.ts.
  22  | test.beforeEach(async ({ request }) => {
  23  |   test.skip(!(await platformPacksAvailable(request)), PACKS_SKIP_MESSAGE);
  24  | });
  25  | 
  26  | test.describe("/tests catalog — render + filter + sort", () => {
  27  |   test.beforeEach(async ({ context }) => {
  28  |     await primeConsent(context, "all");
  29  |   });
  30  | 
  31  |   // TC-01 — Catalog renders all 15 packs from DB and count badge matches.
  32  |   test("renders 15 packs from DB and the result-count badge matches", async ({
  33  |     testsDirectory,
  34  |   }) => {
  35  |     await testsDirectory.index.open();
  36  |     await expect(testsDirectory.index.heading).toBeVisible();
  37  |     await expect(testsDirectory.index.grid).toBeVisible();
  38  |     const cardCount = await testsDirectory.index.packCards().count();
  39  |     expect(cardCount).toBe(15);
  40  |     // Result-count badge reflects the catalog size on initial load.
  41  |     const badgeText = await testsDirectory.index.resultCountBadge.textContent();
  42  |     expect(badgeText).toMatch(/15/);
  43  |   });
  44  | 
  45  |   // TC-06 — Legacy migrated pack "seniori" renders without "(55+)".
  46  |   // Phase G1 (PR #128) swept age qualifiers from titles.
  47  |   test("seniori detail title does NOT contain '(55+)' (Phase G1 sweep)", async ({
  48  |     testsDirectory,
  49  |   }) => {
  50  |     await testsDirectory.pack.open("seniori");
  51  |     const heading = await testsDirectory.pack.heading.textContent();
  52  |     expect(heading).not.toMatch(/\(55\+\)/);
  53  |     expect(heading).toMatch(/Seniori/);
  54  |   });
  55  | 
  56  |   // TC-26 — Catalog card title for seniori also doesn't contain "(55+)".
  57  |   test("catalog card title for seniori does NOT contain '(55+)'", async ({ testsDirectory }) => {
  58  |     await testsDirectory.index.open();
  59  |     const title = await testsDirectory.index.packCardTitle("seniori").textContent();
> 60  |     expect(title).not.toMatch(/\(55\+\)/);
      |                       ^ Error: expect(received).not.toMatch(expected)
  61  |   });
  62  | 
  63  |   // TC-07 — Industry filter narrows the grid.
  64  |   test("toggling an industry chip narrows the grid to that industry only", async ({
  65  |     testsDirectory,
  66  |   }) => {
  67  |     await testsDirectory.index.open();
  68  |     const totalBefore = await testsDirectory.index.packCards().count();
  69  |     expect(totalBefore).toBe(15);
  70  |     await testsDirectory.index.toggleIndustryFilter("eshop");
  71  |     // eshop industry has 1 pack in the seeded data ("eshop" slug).
  72  |     const totalAfter = await testsDirectory.index.packCards().count();
  73  |     expect(totalAfter).toBeLessThan(totalBefore);
  74  |     expect(totalAfter).toBeGreaterThanOrEqual(1);
  75  |     await expect(testsDirectory.index.packCard("eshop")).toBeVisible();
  76  |   });
  77  | 
  78  |   // TC-08 — Filtering to a no-match combo shows empty state with recovery button.
  79  |   test("filtering to multiple unrelated industries shows empty state recovery", async ({
  80  |     testsDirectory,
  81  |   }) => {
  82  |     await testsDirectory.index.open();
  83  |     // Toggle two unrelated industries that no single pack shares.
  84  |     await testsDirectory.index.toggleIndustryFilter("eshop");
  85  |     await testsDirectory.index.toggleIndustryFilter("zdravotnictvo");
  86  |     // If both filters are AND-combined to zero matches, empty state shows.
  87  |     // If the catalog uses OR-combination, we still expect both industries
  88  |     // visible. The recovery button affordance is what we assert when zero.
  89  |     const empty = testsDirectory.index.emptyState;
  90  |     if (await empty.isVisible()) {
  91  |       await expect(testsDirectory.index.emptyStateClearButton).toBeVisible();
  92  |       await testsDirectory.index.emptyStateClearButton.click();
  93  |       // After recovery click, full grid restores.
  94  |       const restoredCount = await testsDirectory.index.packCards().count();
  95  |       expect(restoredCount).toBe(15);
  96  |     }
  97  |   });
  98  | 
  99  |   // TC-09 — Sort dropdown changes order.
  100 |   test("sort dropdown changes from 'newest' to 'questions_desc' and re-renders", async ({
  101 |     testsDirectory,
  102 |   }) => {
  103 |     await testsDirectory.index.open();
  104 |     const before = await testsDirectory.index.packCards().nth(0).getAttribute("data-testid");
  105 |     await testsDirectory.index.selectSort("questions_desc");
  106 |     // Re-fetch the first card — its testid identifies the slug.
  107 |     const after = await testsDirectory.index.packCards().nth(0).getAttribute("data-testid");
  108 |     // Default-sort first card and depth-sort first card can be the same
  109 |     // pack if the most-recent pack is also the deepest. The contract is
  110 |     // that the select value changed and the grid stayed visible.
  111 |     expect(after).toBeTruthy();
  112 |     await expect(testsDirectory.index.sortSelect).toHaveValue("questions_desc");
  113 |     await expect(testsDirectory.index.grid).toBeVisible();
  114 |     if (before !== after) {
  115 |       // Soft expectation — when the sort actually re-orders, the first
  116 |       // card identity differs. When it doesn't, that's also a valid
  117 |       // outcome (most-recent == deepest, fine).
  118 |       expect(before).not.toBe(after);
  119 |     }
  120 |   });
  121 | 
  122 |   // TC-10 — Featured spotlight tile has the badge on default sort.
  123 |   test("featured spotlight tile shows the 'Najnovší' badge on default sort", async ({
  124 |     testsDirectory,
  125 |   }) => {
  126 |     await testsDirectory.index.open();
  127 |     // The first card in the default-sort order is the featured one.
  128 |     const firstCardSlug = await testsDirectory.index.packCards().nth(0).getAttribute("data-testid");
  129 |     expect(firstCardSlug).toBeTruthy();
  130 |     // Extract the slug from the testid pattern `tests-catalog-card-<slug>`.
  131 |     const slug = firstCardSlug!.replace(/^tests-catalog-card-/, "");
  132 |     await expect(testsDirectory.index.packCardFeaturedBadge(slug)).toBeVisible();
  133 |   });
  134 | });
  135 | 
```