# E37 — Tests catalog coverage expansion + senior copy/SEO/UX hardening

**Owner:** Claude (synthesis) — senior agent, multi-lens audit
**Date opened:** 2026-05-20
**Status:** 🟡 Phase A complete (discovery via 4 parallel agents); Phases B–F awaiting kickoff
**Surfaces in scope:** `/tests` catalog · `/tests/$slug` detail pages · `src/content/test-packs/**` · `src/lib/quiz/bank/questions.ts` · `src/content/blog/**` (frontmatter only)

## TL;DR

Three months after E25 senior-redesigned the `/tests` catalog UI (PR #36), the catalog still ships **9 packs** while the academy blog covers **81 articles** worth of distinct scam taxonomies. The gap is structural: passwords/passkeys (6 articles, 0 packs), AI deepfake (6 articles, 0 dedicated pack), social-media takeover (7 articles, 0 pack), parents protecting kids (7 articles, 0 pack), schools (1 article, 0 pack), healthcare (0 articles but high SEO ceiling).

This epic closes that gap with **6 new packs** authored to senior content quality, **expands the question bank** by ~27–32 new scenarios to support them, **rewrites copy across all 9 existing packs** for SEO + brand voice, **wires `related_test_slug` on all 81 blog posts**, and **applies 15 P0/P1 UX fixes** identified by the audit. After E37 the catalog ships 15 packs at 100% blog topic coverage, with every pack having ≥ 1 corresponding learning trail.

A single critical hotfix (#66, separate to main) preceded this epic to fix a typo (`univerzitnÿch`) currently shipping to `/tests/studenti` meta description.

## Phase A — Discovery (complete)

Four parallel agents returned simultaneously on 2026-05-20:

| Agent | Output | Critical finding |
|---|---|---|
| Question-bank inventory | 210 IDs taxonomized across 5 prefixes; per-pack gap table | **All 6 proposed packs blocked — 27–32 new questions needed** |
| Blog→test mapping (81 posts) | Full recommendation table, primary `related_test_slug` per post | Distribution: vseobecny 29 · eshop 8 · socialne-siete 8 · heslo-2fa 7 · rodicia 7 |
| UX/a11y audit of /tests | 21 issues ranked (3 P0 / 13 P1 / 5 P2) + 6 OOS flags | Filter chips < 44px AA; no "help me choose"; sort-label binding fragments |
| SEO + brand-voice (9 packs) | Per-pack scorecards + Slovak keyword landscape + paste-ready rewrites | **Production typo in studenti.ts (hotfixed via PR #66)**; titles miss CTR hooks; 18/26 sources are homepage roots |

### Decisions locked in Phase A
1. **Industry enum extension:** add 4 values — `rodicia`, `heslo_2fa`, `ai_deepfake`, `socialne_siete` (snake_case per existing `verejne_sluzby`, `strojova_vyroba`, `sme_ucto` precedent). `skoly` and `zdravotnictvo` already in enum.
2. **Bank coverage policy:** ship-blocking. A pack does not ship until its required questions exist in the bank at senior content quality.
3. **Out-of-scope scenarios → courses:** 2 behavioral items (cyberbullying response, school incident reporting) move to a follow-up `/courses` epic — they don't fit the multiple-choice quiz format.

## Phase B — Question-bank expansion (~27–32 new questions)

**Branch:** `feature/E37-tests-coverage`
**Files touched (est.):** 1 (`src/lib/quiz/bank/questions.ts`) + tests for each new ID

### New questions to author (aggregated from Phase A gap analysis)

| Pack | Count | Topics |
|---|---|---|
| heslo-2fa | 5–6 | recovery-email phishing · passkey vs SMS legit prompt · HIBP lookalike · credential-stuffing scenario · OAuth consent-screen phishing · legit Bitwarden/1Password honeypot · session-expired bank popup |
| ai-deepfake | 4 | AI-personalized phishing (internal projects mentioned) · ChatGPT investment-bot scam · AI-generated dating profile photo · voice-clone extortion ("I have your voice") |
| socialne-siete | 6–7 | FB business OAuth takeover · IG "guidelines violation" DM · Telegram/WhatsApp investment-group invite · sponsored ad → fake eshop · brand-impersonation DM giveaway · compromised-friend money request · legit Meta security notification honeypot |
| rodicia | 4 | teen sextortion email · fake teen IG profile (parent-recognition) · parental-controls bypass attempt · "your child won a contest" SMS |
| skoly | 3 | EduPage login phishing · "EU dotácia pre školy" email · fake-parent call to recepcia |
| zdravotnictvo | 5–6 | fake "e-recept" portal · clinic-specific vishing for lab data · medical-supplier BEC variant · ransomware lure for clinics · fake MZ SR / NCZI SMS · legit eHealth honeypot URL |

Each question follows the existing bank pattern: `id` (prefix-topic-N), `prompt`, `options`, `correctAnswer`, `explanation`, `sources[]`. Slovak strings throughout; `sources` deep-linked (not homepage roots).

### Verification
- `tests/lib/quiz/bank/*.test.ts` — unit per new ID
- `validatePackQuestionIds` confirms every new pack's `questionIds` resolve

## Phase C — Author 6 new test packs

**Files touched:** 6 new `src/content/test-packs/{slug}.ts` + `src/content/test-packs/index.ts` (register) + `src/content/test-packs/_schema.ts` (extend `Industry` enum) + `src/lib/seo/quiz-jsonld.ts` (add `INDUSTRY_LABEL` entries) + i18n industry-label strings.

### Pack manifests (each follows existing TestPack shape)
| Slug | Industry enum | Emoji | Title pattern | Question count |
|---|---|---|---|---|
| `heslo-2fa` | `heslo_2fa` | 🔐 | "Test pre heslá a 2FA — rozpoznáš pasce na hesle, passkey a SMS kód?" | 14 |
| `ai-deepfake` | `ai_deepfake` | 🤖 | "Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO call a AI phishing?" | 14 |
| `socialne-siete` | `socialne_siete` | 📱 | "Test pre sociálne siete — rozpoznáš hack FB účtu, fake DM a Telegram pasce?" | 14 |
| `rodicia` | `rodicia` | 👨‍👩‍👧 | "Test pre rodičov — chránite deti pred online pascami?" | 13 |
| `skoly` | `skoly` | 🏫 | "Test pre školy — phishing EduPage, fake EU dotácie, falošný rodič na recepcii" | 13 |
| `zdravotnictvo` | `zdravotnictvo` | 🏥 | "Test pre zdravotníctvo — fake e-recept, BEC dodávateľa, vishing o pacientovi" | 13 |

Each pack: Slovak `title` + `tagline` + `targetPersona` per the SEO audit's question-form-CTR pattern; `sources[]` deep-linked to specific advisories (no homepage roots); `passingThreshold` 65 (consumer-facing packs) or 75 (B2B packs like zdravotnictvo/skoly/it-vyvoj-tier).

## Phase D — Copy upgrade on 9 existing packs

Apply the paste-ready Slovak rewrites from the SEO audit. Per-pack scope:

| Pack | Action |
|---|---|
| vseobecny | retitle to "Test kybernetickej bezpečnosti — rozpoznáš 14 najčastejších podvodov?"; rewrite tagline + persona; deep-link 3 sources |
| seniori | retitle to "Test pre seniorov — odhalíte „Ahoj babka", falošnú políciu a vishing?"; persona addresses adult children too; deep-link sources |
| studenti | already hotfixed (#66); retitle + persona refresh; deep-link sources |
| ziaci-do-16 | retitle to "Test pre žiakov a tínedžerov — odhalíš podvod na Discorde a TikToku?" |
| eshop | retitle to "Test pre e-shopy — falošný kupec, fake refundácia, smishing kuriéra" |
| gastro-horeca | retitle for searchability ("reštaurácie a hotely" not "HORECA") |
| autoservis | retitle to "Test pre autoservisy — fake objednávka dielov, IBAN podvod, VIN scam" |
| it-vyvoj | retitle to "Test pre IT tímy — BEC, OAuth phishing, deepfake CEO call, supply-chain pasce" |
| verejne-sluzby | retitle to "Test pre úradníkov a občanov — falošné SMS Finančnej správy, klony slovensko.sk" |

Cross-cutting changes applied to all 9:
- Move `X otázok · ~Y min` to **front** of tagline (currently buried after em-dash)
- Drop `(55+)`, `(16+)`, `(do 16 rokov)` parentheses from titles
- Replace homepage roots with deep advisory links (SK-CERT `/sk/aktuality/`, Socpoist `/upozornujeme-na-podvodne-listy/`, etc.)
- Sweep `scam-y`, `študentský life`, `backoffice`, `operatívci`, `vektory` for Slovak idiom

## Phase E — Blog cross-link wiring (81 frontmatter edits)

Apply `related_test_slug` per the Phase A mapping table. Content-only edit — schema (`related_test_slug` column on `blog_posts`) shipped in E25 Phase 3 (PR #38).

| Pack | Articles wired |
|---|---|
| vseobecny | 29 |
| eshop | 8 |
| socialne-siete | 8 |
| heslo-2fa | 7 |
| rodicia | 7 |
| seniori | 5 |
| ai-deepfake | 4 |
| it-vyvoj | 5 |
| studenti | 1 |
| skoly | 1 |
| Total wired | **75 / 81** (6 multi-pack candidates resolved to primary) |

Side observation (out-of-scope flag): 5 packs have **zero blog corpus** (`gastro-horeca`, `autoservis`, `verejne-sluzby`, `ziaci-do-16`, `zdravotnictvo`). Backfill is a separate "blog topical-coverage" epic — flagged in section "Risk register" below.

## Phase F — UX/UI fixes (P0 + P1 only; P2 deferred)

From the UX audit, 3 P0 + 12 P1 = **15 fixes** in scope. P2 polish (8 items) deferred to a future "/tests polish" sub-epic.

### P0 (3 — required to ship 15 packs without conversion regression)
1. **Bump filter chip touch targets to ≥ 44px AA.** `tests.index.tsx` filter button + `tests-catalog-filter-clear` — change to `min-h-11 px-4 py-2.5 text-sm`.
2. **Add "Pomôž mi vybrať" affordance.** New `tests-catalog-help-choose` testid linking to `/test` standard quiz with Slovak copy `"Neviem si vybrať — spusť všeobecný test"`. New i18n key `testy.help_choose_cta`.
3. **Fix sort-label binding fragmentation on mobile.** Wrap `<label>` + `<select>` in a single inline-flex group; anchor next to the filter clear button.

### P1 (12)
4. Result count + catalog depth badge (`Zobrazené: {n} z 15 · {k} odvetví`) with `aria-live="polite"`.
5. Mobile filter scroll rail below `sm:` breakpoint.
6. Sticky filter bar at scrollY > 200px (when `availableIndustries.length > 5`).
7. Distinguish featured spotlight visually (ring + eyebrow + tagline outside line-clamp).
8. Move bottom CTAs above the FAQ.
9. Helpful empty state with `Vyčistiť filter` + `Spustiť štandardný test` buttons inline.
10. Replace card meta `📋 {n} otázok · ≥ {threshold} %` with `📋 {n} otázok · ~{minutes} min`.
11. Visually-hidden `<h2>` for the grid for SR landmark navigation.
12. Fix double-announce on card hero (emoji `aria-hidden="true"`).
13. Localize "min čítania" in learning strip.
14. Audit `text-xs text-muted-foreground` contrast (AA pass on light + dark).
15. Move duplicated industry chip into hero zone as tinted pill (BlogPostCard pattern).

### P2 (deferred to follow-up epic)
- Pack-level personalization ("recommended for you")
- Category-level hierarchical filter (Persona / Industry / Téma)
- `/test/firma/{slug}` vs `/tests/{slug}` routing IA decision
- Algorithmic featured tile → editorial `featured: true` manifest flag
- `FaqAccordion` keyboard nav deep audit
- Card hero gradient palette identity vs `/blog` (visual repetition at 15 packs)

## Phase G — Tests, lint, build, CHANGELOG

- Vitest: snapshot per new pack, `validatePackQuestionIds(p).ok === true` for all 15 packs
- Vitest: new question-bank unit tests (≥ 1 assertion per new ID)
- Playwright: E2E spec per new `/tests/{slug}` route, asserting head meta + h1 + question count
- `npm run lint` → 0/0 (CLAUDE.md zero-tolerance)
- `npm run build` → ✓ (SSR worker bundle)
- `CHANGELOG.md` Slovak entry: "6 nových sád testov + senior copy upgrade na všetkých testoch + viac SEO + UX vylepšenia"

## Phasing & shipping order

| PR # | Scope | Files | Tests | Independent? |
|---|---|---|---|---|
| 1 (#66 ✅) | studenti.ts typo hotfix | 1 | 0 | ✅ landed |
| 2 | Phase B (bank expansion) | 1 + N | ~30 unit | ✅ |
| 3 | Phase C (6 new packs) | ~10 | ~12 | ❌ blocked on PR 2 |
| 4 | Phase D (copy upgrade on 9 existing packs) | 9 + 1 i18n | ~9 snapshot | ✅ (parallel to PR 3) |
| 5 | Phase E (blog cross-links, 81 frontmatter edits) | 81 MDX | 0 (frontmatter only, no schema test) | ✅ |
| 6 | Phase F (UX P0 + P1, 15 fixes) | ~6 component + 1 i18n | ~10 RTL | ✅ |

**Total estimate:** 5 PRs after the hotfix · 22–28 files of production code · 80–90 MDX content edits · ~60 new tests · 1 enum extension migration-free.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Authoring 27–32 senior-quality scam scenarios slips timeline | High | Med | Per-pack PRs (PR 2 ships in waves: heslo-2fa bank → ai-deepfake bank → …) |
| 5 packs ship with zero blog corpus → UX dead-end on detail page | High | Low | Flagged as separate "blog topical-coverage" epic. Detail page `TestsLearningStrip` already gracefully renders fewer than N posts. |
| `Industry` enum extension cascades into composer (E8.2) or analytics | Low | Med | Audit `INDUSTRY_LABEL` consumers before PR 2 lands. New values are additive — no rename or removal. |
| Slovak idiom rewrites change meta descriptions → temporary SERP volatility | Med | Low | Phase D is content-only; pre-existing meta_title/description tests catch any structural break. SERP volatility is expected and self-corrects. |
| 81-row frontmatter edit in PR 5 is review-heavy | High | Low | Use a single batch edit; CR focuses on spot-checks (5 random rows) + count assertions. |
| User runs out of patience before all 5 PRs land | Med | Med | Each PR independently mergeable. Phase D + F can ship before Phase C if bank work delays. |
| Bumping `CONSENT_VERSION` accidentally | Low | High | None of these phases touch consent / analytics surface. Confirmed. |

## Decisions locked (no further questions before kickoff)

| # | Decision | Resolution |
|---|---|---|
| D1 | Industry enum strategy | Extend for every new pack (4 new values: `rodicia`, `heslo_2fa`, `ai_deepfake`, `socialne_siete`) |
| D2 | Bank coverage policy | Ship-blocking — author missing questions before pack ships |
| D3 | Typo hotfix shipping | Separate to main — done (PR #66) |
| D4 | Scope ambition | Full — all 27–32 questions + 6 packs + copy + blog wiring + P0/P1 UX |
| D5 | Out-of-scope behavioral scenarios | Move to `/courses` follow-up epic |
| D6 | Deferred packs | `marketing`, `doprava`, `sme-ucto`, `romance-investicie` — separate "Phase 2" epic, not E37 |

## Next step

Kick off **PR 2 (Phase B — question-bank expansion)** on branch `feature/E37-tests-coverage`. Stops before PR 3 to let the user code-review the new question authoring (highest-content-risk PR in the epic).

The plan is the contract. PR 1 (#66) has landed; PR 2 starts when the user confirms kickoff.
