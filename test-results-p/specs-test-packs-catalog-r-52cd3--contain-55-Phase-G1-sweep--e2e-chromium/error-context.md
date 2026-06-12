# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs/test-packs/catalog-render-and-filter.spec.ts >> /tests catalog — render + filter + sort >> seniori detail title does NOT contain '(55+)' (Phase G1 sweep)
- Location: e2e/specs/test-packs/catalog-render-and-filter.spec.ts:47:3

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
    - img "Seniori (55+) — podvody cielené na starších" [ref=e30]:
      - generic [ref=e34]: 👴
    - generic [ref=e35]:
      - heading "Seniori (55+) — podvody cielené na starších" [level=1] [ref=e36]
      - paragraph [ref=e37]: „Ahoj babka” scam s AI klonovaním hlasu, dverový podvodník z banky, falošný príplatok k dôchodku, vishing polícia/technik. 13 otázok.
      - paragraph [ref=e38]: Dôchodca alebo aktívny päťdesiatnik — cieľ telefonických, dverových a poštových podvodov, vrátane najnovšej vlny AI voice-cloning podvodov.
      - list "Počet otázok" [ref=e39]:
        - listitem [ref=e40]:
          - img [ref=e41]
          - text: 📋 13 otázok
        - listitem [ref=e44]:
          - img [ref=e45]
          - text: Vyhovenie pri ≥ 65 %
        - listitem [ref=e49]:
          - img [ref=e50]
          - text: Seniori (55+)
    - generic [ref=e54]:
      - button "Spustiť pack →" [ref=e55]
      - link "Štandardný test" [ref=e56] [cursor=pointer]:
        - /url: /test
    - region "Zdroje" [ref=e57]:
      - heading "Zdroje" [level=2] [ref=e58]
      - list [ref=e59]:
        - listitem [ref=e60]:
          - link "PZ SR — podvody na senioroch" [ref=e61] [cursor=pointer]:
            - /url: https://www.minv.sk/
        - listitem [ref=e62]:
          - link "Sociálna poisťovňa — upozornenia na falošné listy" [ref=e63] [cursor=pointer]:
            - /url: https://www.socpoist.sk/
        - listitem [ref=e64]:
          - link "Europol — voice cloning fraud 2024" [ref=e65] [cursor=pointer]:
            - /url: https://www.europol.europa.eu/
        - listitem [ref=e66]:
          - link "SK-CERT — vishing a telefonické podvody" [ref=e67] [cursor=pointer]:
            - /url: https://www.sk-cert.sk/
    - region "Vyskúšaj ďalší pack" [ref=e68]:
      - heading "Vyskúšaj ďalší pack" [level=2] [ref=e69]
      - generic [ref=e70]:
        - 'link "Test pre rodičov — chránite deti pred sextortion, groomingom a podvodnými výhrami? Rodičia Test pre rodičov — chránite deti pred sextortion, groomingom a podvodnými výhrami? 4 situácie, na ktoré rodičia nie sú pripravení: sextortion e-mail tínedžerovi, fake teen IG profil s groomingom, obídenie Family Link kontroly cez druhý účet a SMS „vaše dieťa vyhralo” s menom zo zverejneného FB profilu. 📋 4 otázok · ≥ 65 %" [ref=e71] [cursor=pointer]':
          - /url: /tests/rodicia
          - img "Test pre rodičov — chránite deti pred sextortion, groomingom a podvodnými výhrami?" [ref=e72]:
            - generic [ref=e76]: 👨‍👩‍👧
          - generic [ref=e77]:
            - generic [ref=e79]: Rodičia
            - heading "Test pre rodičov — chránite deti pred sextortion, groomingom a podvodnými výhrami?" [level=3] [ref=e80]
            - paragraph [ref=e81]: "4 situácie, na ktoré rodičia nie sú pripravení: sextortion e-mail tínedžerovi, fake teen IG profil s groomingom, obídenie Family Link kontroly cez druhý účet a SMS „vaše dieťa vyhralo” s menom zo zverejneného FB profilu."
            - paragraph [ref=e82]: 📋 4 otázok · ≥ 65 %
        - 'link "Test pre sociálne siete — rozpoznáš hack FB stránky, fake DM a Telegram pasce? Sociálne siete Test pre sociálne siete — rozpoznáš hack FB stránky, fake DM a Telegram pasce? 6 scenárov, ktoré sa dejú každý týždeň na slovenskom Instagrame a Facebooku: OAuth takeover business stránky, fake „guidelines violation” DM, Telegram investičné skupiny, sponzorované fake eshopy, kompromitovaný kamarát žiadajúci 2FA kód a legit Meta honeypot. 📋 6 otázok · ≥ 70 %" [ref=e83] [cursor=pointer]':
          - /url: /tests/socialne-siete
          - img "Test pre sociálne siete — rozpoznáš hack FB stránky, fake DM a Telegram pasce?" [ref=e84]:
            - generic [ref=e88]: 📱
          - generic [ref=e89]:
            - generic [ref=e91]: Sociálne siete
            - heading "Test pre sociálne siete — rozpoznáš hack FB stránky, fake DM a Telegram pasce?" [level=3] [ref=e92]
            - paragraph [ref=e93]: "6 scenárov, ktoré sa dejú každý týždeň na slovenskom Instagrame a Facebooku: OAuth takeover business stránky, fake „guidelines violation” DM, Telegram investičné skupiny, sponzorované fake eshopy, kompromitovaný kamarát žiadajúci 2FA kód a legit Meta honeypot."
            - paragraph [ref=e94]: 📋 6 otázok · ≥ 70 %
        - 'link "Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO a AI phishing? AI a deepfake Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO a AI phishing? 4 najnovšie vektory: AI-personalizovaný phishing s reálnym kontextom z LinkedIn, ChatGPT-poháňané investičné podvody, AI-generované dating profily a voice-clone vydieranie. 30 sekúnd audia stačí. 📋 4 otázok · ≥ 70 %" [ref=e95] [cursor=pointer]':
          - /url: /tests/ai-deepfake
          - img "Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO a AI phishing?" [ref=e96]:
            - generic [ref=e100]: 🤖
          - generic [ref=e101]:
            - generic [ref=e103]: AI a deepfake
            - heading "Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO a AI phishing?" [level=3] [ref=e104]
            - paragraph [ref=e105]: "4 najnovšie vektory: AI-personalizovaný phishing s reálnym kontextom z LinkedIn, ChatGPT-poháňané investičné podvody, AI-generované dating profily a voice-clone vydieranie. 30 sekúnd audia stačí."
            - paragraph [ref=e106]: 📋 4 otázok · ≥ 70 %
    - paragraph [ref=e107]: © 2026 am.bonum s. r. o.. Obsah packu je chránený autorským zákonom č. 185/2015 Z. z.
  - contentinfo [ref=e108]:
    - generic [ref=e109]:
      - generic [ref=e110]:
        - link "subenai — domov" [ref=e111] [cursor=pointer]:
          - /url: /
          - img "subenai" [ref=e112]
        - paragraph [ref=e113]: Bezplatný edukatívny nástroj pre slovenský digitálny svet.
        - paragraph [ref=e114]:
          - text: spravené s 🍺 v
          - link "Novejši" [ref=e115] [cursor=pointer]:
            - /url: https://www.youtube.com/watch?v=dbuCSt_k5c8
          - text: ·
          - link "Aktuálna verzia v1.14.4 — zoznam zmien" [ref=e116] [cursor=pointer]:
            - /url: /changelog
            - text: v1.14.4
      - generic [ref=e117]:
        - heading "Obsah" [level=3] [ref=e118]
        - list [ref=e119]:
          - listitem [ref=e120]:
            - link "Spustiť test" [ref=e121] [cursor=pointer]:
              - /url: /test
          - listitem [ref=e122]:
            - link "Sady testov" [ref=e123] [cursor=pointer]:
              - /url: /tests
          - listitem [ref=e124]:
            - link "Školenia" [ref=e125] [cursor=pointer]:
              - /url: /courses
          - listitem [ref=e126]:
            - link "Šablóny testov" [ref=e127] [cursor=pointer]:
              - /url: /sablony
          - listitem [ref=e128]:
            - link "Pre školy" [ref=e129] [cursor=pointer]:
              - /url: /schools
          - listitem [ref=e130]:
            - link "Akadémia" [ref=e131] [cursor=pointer]:
              - /url: /blog
      - generic [ref=e132]:
        - heading "Projekt" [level=3] [ref=e133]
        - list [ref=e134]:
          - listitem [ref=e135]:
            - link "O projekte" [ref=e136] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e137]:
            - link "Kontakt" [ref=e138] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e139]:
            - link "Podpora projektu" [ref=e140] [cursor=pointer]:
              - /url: /support
          - listitem [ref=e141]:
            - link "Sponzori" [ref=e142] [cursor=pointer]:
              - /url: /sponsors
          - listitem [ref=e143]:
            - link "Zmeny a verzie" [ref=e144] [cursor=pointer]:
              - /url: /changelog
      - generic [ref=e145]:
        - heading "Právne" [level=3] [ref=e146]
        - list [ref=e147]:
          - listitem [ref=e148]:
            - link "Súkromie" [ref=e149] [cursor=pointer]:
              - /url: /privacy
          - listitem [ref=e150]:
            - link "Cookies" [ref=e151] [cursor=pointer]:
              - /url: /cookies
          - listitem [ref=e152]:
            - link "Spravovať podporu (sponzori)" [ref=e153] [cursor=pointer]:
              - /url: /manage-support
    - generic [ref=e154]:
      - paragraph [ref=e155]: © 2026 subenai · Všetky práva vyhradené.
      - button "Nastavenia cookies" [ref=e156]
    - paragraph [ref=e157]:
      - text: powered by
      - link "lvtesting.eu" [ref=e158] [cursor=pointer]:
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
> 52  |     expect(heading).not.toMatch(/\(55\+\)/);
      |                         ^ Error: expect(received).not.toMatch(expected)
  53  |     expect(heading).toMatch(/Seniori/);
  54  |   });
  55  | 
  56  |   // TC-26 — Catalog card title for seniori also doesn't contain "(55+)".
  57  |   test("catalog card title for seniori does NOT contain '(55+)'", async ({ testsDirectory }) => {
  58  |     await testsDirectory.index.open();
  59  |     const title = await testsDirectory.index.packCardTitle("seniori").textContent();
  60  |     expect(title).not.toMatch(/\(55\+\)/);
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