# PLAN — E17 Backlinks & Authority Building — 2026-05-19

## Goal & Business Value

Drive **referring-domain growth** for the freshly-published 80-article
blog at `/blog`, lifting Domain Rating and per-article visibility in SK
SERPs. E16 shipped the content; E17 makes Google trust it. Without
external links, pillars stay at SERP positions 30+ even with strong
on-page SEO. With 20-30 quality SK backlinks per pillar in 90 days,
top-10 positions for the 10 pillar primary keywords become realistic.

Success measured by:

- (a) ≥5 unique referring domains per pillar within 90 days
- (b) top-10 SK SERP ranking for ≥4 of 10 pillar primary keywords
  within 6 months
- (c) ≥1 referring link from a **Tier A SK authority** (SK-CERT, NBS,
  NBÚ, Polícia SR, MIRRI) within 12 months
- (d) zero "Manual Action" penalties in Google Search Console (no
  paid-link schemes, no PBNs, no directory spam)

---

## Scope

**In:**

- Outreach to **SK security authorities and quality press** for citation
  / partnership links to pillar articles
- **Guest posts** on 5-10 SK tech / security blogs (1-2 per pillar
  category over the 90-day window)
- **HARO replies** (Help A Reporter Out / SK equivalent — see ListaQ /
  ResponseSource SK) — qualifying as expert source for journalist
  queries
- **Linkable assets in pillars** — promote existing pillar checklists,
  decision flows, scenario-card embeds as cite-worthy resources
- **Directory submissions** to legitimate SK security awareness
  directories (SK-CERT partners list, ESET awareness partner pages,
  EÚ DSA "trusted flaggers" registry)
- **Internal-link reinforcement** — when external links land, prioritise
  internal link-graph anchors to spread authority to underlinked
  clusters (per `tasks/blog/link-graph.md` §3 underlinked list)
- **Anchor-text diversity tracking** — keep anchor text natural across
  outreach (no over-optimisation of "phishing slovensko" type keywords)
- **Tracking dashboard** — single doc (`tasks/blog/backlinks-tracker.md`,
  populated weekly) listing every successful link with: target URL,
  source URL, anchor text, follow/nofollow, acquisition date

**Out (deferred or excluded):**

- **Paid-link schemes** — no link buying, no PBNs, no link exchanges
  (Manual Action risk; Google explicit penalty)
- **Comment / forum / Reddit spam** — even nofollow, hurts brand
- **Mass directory submissions** to low-quality SK directories (Zoznam,
  Centrum, etc.) — outdated, no SEO value, brand-damaging
- **Reciprocal link agreements** — sniff-out by Google as link scheme
- **English-language outreach** to international tech blogs (until
  E18 multilingual content lands)
- **Pinterest / Tumblr / Wattpad reposts** — low signal, scattered effort
- **Paid Sponsorship articles** that imply linking — disclose as ads
  per Slovak Reklamný štandard and they become nofollow + low SEO value

---

## Strategy

**Strategy A — Authority-first ladder, not volume-first.** Target the
30 highest-quality SK referring domains rather than 300 mid-quality
ones. Each Tier A SK authority backlink is worth ~20 Tier C blog
backlinks in SEO terms for SK SERPs. The corpus already cites SK-CERT,
NBS, Polícia SR heavily — that's signal we WROTE for them. Now we ask
them to cite us back.

**Rationale:**

1. Google's SK SERP for "phishing", "scam SMS", "fake e-shop" is
   currently dominated by these same authorities. A link FROM them
   to a SubenAI pillar elevates us into peer status.
2. Mass blog comment spam or low-tier directory submissions get
   filtered out by Google's spam team and risk Manual Actions.
3. Quality referring domains compound: a SK-CERT link puts SubenAI
   into other SK security pros' "frequent sources" mental map, leading
   to more organic citations downstream.

**Rejected alternatives:**

- **Strategy B — Mass directory + comment outreach**: high volume,
  low quality. Discounted because Manual Action risk + brand dilution.
- **Strategy C — Pay influencers for sponsored mentions**: hits
  audience but Google deprioritises sponsored links (nofollow per
  Slovak Reklamný kódex if disclosed honestly).

---

## Definition of Done (per outreach iteration)

Each outreach pitch passes through this gate before sending:

1. The target site has Domain Rating ≥ 30 (Ahrefs estimate) OR is a
   Tier A SK authority OR is a quality press outlet (Denník N, SME,
   Pravda, Trend).
2. The pitch references a SPECIFIC SubenAI pillar relevant to that
   site's content. Generic "please link to us" pitches do not ship.
3. The pitch offers VALUE first — exclusive scenario card embed
   permission, custom anonymised SK police statistics dataset, or
   an editorial collaboration — before asking for a link.
4. The pitch is sent from `kontakt@subenai.sk` (not a personal email)
   so it's traceable and replyable.
5. The send is logged in `tasks/blog/backlinks-tracker.md` with:
   target site, contact email, sent date, status (sent / replied /
   acquired / declined), follow-up date.
6. No follow-up is sent < 7 days after the original. Maximum 2
   follow-ups, then mark "no response — re-evaluate in 90 days".

---

## Epic Map

| Story id | Name | Effort | Order | Notes |
|---|---|---|---|---|
| E17.1 | Backlinks tracker doc + outreach templates | S | 1 | `tasks/blog/backlinks-tracker.md` + `tasks/blog/outreach-templates.md`. Authoring artifacts. |
| E17.2 | Tier A SK authority outreach wave (12 targets) | M | 2 | SK-CERT, NBS, NBÚ, Polícia SR (preventívne centrum), MIRRI, MV SR, MPSVR (IPčko), SOI, Finančná správa, Národná koncepcia ochrany detí, Slovensko.sk content authors. Pitch: cite SubenAI pillars as additional consumer resource. |
| E17.3 | Tier B SK banks + ISPs outreach (10 targets) | M | 3 | Tatra banka, SLSP, VÚB, ČSOB, mBank, Poštová banka, Unicredit, Orange SK, Slovak Telekom, O2 SK. Pitch: link to phishing/SMS/AI pillars as "secondary reading" from their security pages. |
| E17.4 | Tier C SK press outreach (8 targets) | M | 4 | Denník N, SME, Pravda, Trend, hospodárske noviny, aktuality.sk, dennikn.sk consumer section, Týždeň. Pitch: pillar P10 (študenti scams) + pillar P4 (sociálne siete) as cite-worthy for student/social trend articles. |
| E17.5 | Tier D SK tech press + bloggers (12 targets) | L | 5 | techbyte.sk, dsl.sk, zive.sk, TOUCHIT, fontech.startitup.sk, mojandroid.sk, FONET, Kryptomagazín, Mediálne.sk, SAFELab community. Pitch: guest post offer (1500 words on AI scams / quishing 2026) with backlink to relevant pillar. |
| E17.6 | HARO / SK-press-pitch wave | M | 6 | Subscribe to HARO + Sourcebottle + JustReachOut. Reply 2-3× weekly to journalist queries about scams, cybersecurity, identity theft. Each successful citation = backlink. |
| E17.7 | Directory submissions | S | 7 | SK-CERT partners list, ESET awareness affiliates, EU DSA trusted-flaggers registry, NCMEC SK-side affiliate (TakeItDown partner network), Slovenský zväz spotrebiteľov. |
| E17.8 | Scenario-card embed widget | M | 8 | Provide an embeddable `<iframe>` widget of a single scenario card (anonymous, no tracking, branded). External sites can embed it; the iframe attribution is a backlink. ~1 day eng work + privacy/CSP review. |
| E17.9 | Quarterly tracker review + outreach iteration | S | recurring | Review backlinks-tracker.md every 90 days. Identify which targets converted, retry non-responders 6mo later, expand list. |
| E17.10 | Anchor-text diversity audit | S | recurring | Review last-quarter anchor texts in tracker. Flag if any keyword phrase appears >3 times — Google penalty signal. Ask future linkers for natural language anchors. |

---

## Backlink Target List (full v1 — 42 targets)

### Tier A — SK authorities (12 targets)

| Target | URL | Pitch angle | Pillar(s) to link |
|---|---|---|---|
| SK-CERT | sk-cert.sk | "additional consumer resource for verejnosť" | P1 phishing, P2 sms, P5 AI |
| NBS — Pozor na podvody | nbs.sk/pozor-na-podvody | bank-fraud consumer education partnership | P1, P9 nakupovanie, C51, C66 |
| NBÚ SR | nbu.gov.sk | NIS2 / corporate awareness extension | P6 digital security, C70 firmy |
| Polícia SR — Prevencia kriminality | minv.sk/?prevencia-kriminality | senior + family scam awareness alignment | P8 rodičia, C41, C45 |
| Polícia SR — Detská kriminalita | minv.sk/?prevencia-deti | parent + children safety content | P10 študenti, C44, C46 |
| MIRRI — Digitálna gramotnosť | mirri.gov.sk | adult digital literacy curriculum link | P6, C53, C68 |
| MV SR — Hoaxy a podvody | minv.sk/?hoaxy | hoax-tracking ecosystem partner | C57, C58, news-trendy |
| MPSVR — Národná koncepcia detí | detstvobeznasilia.gov.sk | child safety online resource | P8, C44, C46 |
| SOI | soi.sk | fake e-shop reporting flow co-promotion | P3, P9, C13, C17 |
| Finančná správa SR | financnasprava.sk | tax-impersonation phishing | C4, C8 (Finančná správa SMS scam) |
| IPčko (Linka detskej istoty 116 111) | ipcko.sk | cyberbullying + sextortion resource | C44, P8 |
| ESET awareness | bezpecnenanete.sk | general security content partnership | P1, P5, P6 |

### Tier B — SK banks + ISPs (10 targets)

| Target | URL | Pitch angle | Pillar(s) to link |
|---|---|---|---|
| Tatra banka | tatrabanka.sk/sk/blog/podvody | bank-fraud awareness reciprocal | P1, P2, C4, C9 |
| Slovenská sporiteľňa | slsp.sk/sk/clanky/bezpecnost | senior + parent security overlap | P8, C45, C41 |
| VÚB | vub.sk/o-banke/bezpecnost | corporate BEC + invoice scams | C42, C54, C3 |
| ČSOB | csob.sk/bezpecnost | mobile-banking SMS scams | P2, C4, C9 |
| mBank | mbank.sk/blog/bezpecnost | digital-native readers | P5, P6, C28 |
| Poštová banka | postovabanka.sk/bezpecnost | Slovenská pošta phishing crossover | P1, C5, C58 |
| Unicredit | unicreditbank.sk/sk/bezpecnost | corporate audience | C42, C54 |
| 365.bank | 365.bank/blog | fintech audience, virtual cards | C66, C51 |
| Orange SK | orange.sk/podpora/bezpecnost | SMS spam-reporting flow | P2, C8, C11, C12 |
| Slovak Telekom | telekom.sk/podpora/bezpecnost | call-blocking flow | P2, C10, C12 |

### Tier C — SK quality press (8 targets)

| Target | URL | Pitch angle | Pillar(s) to link |
|---|---|---|---|
| Denník N | dennikn.sk | investigative crossover (deepfake politics, organised scams) | P5, P7, C25, C42 |
| SME | sme.sk | wide-audience parent + senior content | P8, P10, C41 |
| Pravda — Užitočná pravda | pravda.sk/zaujimavosti | consumer-friendly explainer crossover | P1, P3, P9 |
| Trend | trend.sk | B2B + investment scam coverage | C25, C59, C42, C70 |
| Aktuality.sk | aktuality.sk/podvody | news-trendy syndication | C56, C57, C58 |
| Týždeň | tyzden.sk | long-form deep-dive crossover | P5, P7 |
| Hospodárske noviny | hnonline.sk | financial-fraud SMB audience | C25, C54, C66 |
| Forbes Slovensko | forbes.sk | executive + B2B audience | C42, C70, C3 |

### Tier D — SK tech press + bloggers (12 targets)

| Target | URL | Pitch angle | Pillar(s) to link |
|---|---|---|---|
| Živé.sk | zive.sk | guest post on AI scam landscape 2026 | P5, C25, C27 |
| Touchit | touchit.sk | hardware-security + YubiKey buyer guide | C65, C28 |
| dsl.sk | dsl.sk | network/ISP-side scam coverage | C11, C30, C31 |
| techbyte.sk | techbyte.sk | password manager comparison guest post | C29, C63 |
| Fontech | fontech.startitup.sk | startup + freelancer BEC scam | C54, C3, C70 |
| MojAndroid | mojandroid.sk | Android spam-call blocking guide | C12, C30 |
| Kryptomagazín | kryptomagazin.sk | crypto pump-and-dump cite | C59, C25 |
| Mediálne.sk | omediach.com | deepfake media + journalism context | C23, C26, P5 |
| FONET | fonet.sk | spam-call carrier-side guide | C11, C12 |
| SAFELab | safelab.sk | youth safety community | C44, P10, C46 |
| StartItUp | startitup.sk | entrepreneur audience for BEC + firmy IQ test | C70, C54, C42 |
| GenZ blog (TBD) | tbd | Gen-Z platform scams (TikTok, Discord) | C20, C44, P10 |

---

## Outreach Templates

Three pitch templates live as separate file `tasks/blog/outreach-templates.md`
(created in E17.1). Templates are Slovak language, follow this structure:

**Template 1 — Authority cite request** (for Tier A targets):
- 3-sentence intro: who we are, what we ship (80 SK articles, SK-CERT/NBS
  cited heavily), why your team's work informed ours
- Specific ask: "Pri ďalšej aktualizácii vašej stránky o phishingu by
  sa zišiel odkaz na náš [Pillar P1 link] ako doplnkový spotrebiteľský
  zdroj — máme tam interaktívne scenáre, ktoré u vás zatiaľ neexistujú."
- No reciprocation pressure: "Nehľadáme oplátku, len si vážime vašu prácu."

**Template 2 — Guest post offer** (for Tier C/D targets):
- 3-sentence intro: who we are, why we know the SK scam landscape
- Specific topic offer (with proposed title + outline): e.g. "Pre Živé.sk
  by sme radi napísali analýzu AI-personalizovaného phishingu v 2026 s
  konkrétnymi SK príkladmi z posledných 30 dní"
- Author bio + 1-2 example pillars as proof of writing quality
- Expected link: "1 odkaz na náš pillar v tele, 1 v autorskej bio"

**Template 3 — HARO / journalist reply**:
- Direct answer to the specific question
- 2-3 sentence credentials
- Offer: "ak chcete viac kontextu, môžeme poslať anonymizované SK police
  štatistiky alebo dať vám rozhovor"
- No link in the reply itself (HARO rules) — credit comes from the
  journalist's article when it publishes

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Manual Action from Google for "unnatural link building" | Strict rule: zero paid links, zero link exchanges, zero comment spam. Every outreach is a personal email with value-first ask. Outreach pacing ≤10 pitches per week (slower = more natural). |
| Authority sites ignore SubenAI as "yet another blog" | Pre-cite them in our pillars (DONE — 224 Tier A SK citations across 80 articles). Open the outreach with "we already cite you 5+ times". |
| Low response rate (typical: 5-15% for cold outreach) | Plan for it. 42 targets → 5-7 acquired backlinks in 90 days is normal. Quality > quantity. |
| Anchor text over-optimisation | Track anchors in `backlinks-tracker.md`. If any keyword phrase appears >3 times, future pitches request softer / natural anchors. |
| Reciprocal-link asks contaminating outreach | Templates explicitly say "no reciprocation needed". If targets offer it, decline politely — Google penalises reciprocal schemes. |
| HARO reply taking too much time per session | Set a per-week budget: 30 minutes Mondays, 30 minutes Thursdays. Don't reply to queries outside our category strength. |
| Brand risk from low-quality SK directories | Only submit to authority-vetted directories (SK-CERT partners list, ENISA EU registry, EU DSA registry). No "free SK directory" submissions. |
| Backlinks-tracker.md drifts out of date | E17.9 quarterly review story is a recurring reminder. Set 90-day calendar event. |
| Scammer outreach impersonation (someone pretending to be subenai pitches a third party) | Always include @subenai.sk address + signature + phone number in pitches. If a third party reports a suspicious "subenai" outreach, we can disclaim quickly. |

---

## Out-of-Scope (deferred)

1. **International (EN/CZ) outreach** — deferred to post-E18 trilingual
   content launch. SK domain rating must stabilise first.
2. **Paid sponsorship articles** — only consider after 12 months of
   organic outreach. Always disclose per Slovak Reklamný kódex.
3. **Podcast appearances** — interesting but high effort + low backlink
   value (podcast notes often don't link). Defer.
4. **Conference speaking** — same as podcasts; backlink only if conf
   publishes proceedings online.
5. **Affiliate partnerships** (e.g. ESET, Bitwarden affiliate links) —
   product comparison articles (C61, C62, C63) ARE affiliate-ready but
   we haven't joined any affiliate program. Defer to a separate E18
   monetisation epic.
6. **Press release distribution** — most SK PR wire services are paid
   + low-quality. Skip in favour of personal outreach.

---

## Open Questions for the User

1. **Outreach owner**: who sends pitches? Options:
   - You personally from `kontakt@subenai.sk`
   - A marketing-agent (similar to content-agent pipeline) drafts pitches
     for your review + send
   - A separate freelance SK SEO consultant
2. **Pitch cadence**: 10/week (90-day plan = 130 pitches against 42-target
   list with follow-ups), or slower (5/week, more personalized)?
3. **Scenario-card embed widget (E17.8) priority**: build it now as the
   main "linkable asset" hook for guest posts, or defer until first wave
   of outreach reveals whether sites accept the offer?
4. **HARO equivalent for SK**: do you know an active SK platform that
   connects journalists with sources? (ResponseSource Slovakia exists
   but is paid; Helpareporter.com is international.)
5. **Disclosure language**: when a SubenAI pillar cites a real scam
   campaign with named-and-shamed company, how aggressive can we be?
   Conservative-default is "no naming"; aggressive is "name + link to
   official takedown notice". Affects which press outlets will link us.
6. **Tracker location**: store `backlinks-tracker.md` in this repo
   (tasks/blog/), in a separate private repo, or in a spreadsheet?
   Public repo = transparent but anyone can see our outreach pipeline.
7. **Quarterly review owner**: same as outreach owner, or a separate
   reviewer for second-set-of-eyes?

---

## Next Action

Before any outreach pitches go out, the user must:

1. Answer the 7 open questions above (or accept proposed defaults).
2. Approve the Tier A + Tier B target lists (anyone we should NOT
   contact for relationship reasons?).
3. Confirm the outreach email address (`kontakt@subenai.sk`) is
   monitored — replies need response within 48 hours or threads
   die.

After user approves, the first executable unit is **E17.1**: write
`tasks/blog/backlinks-tracker.md` + `tasks/blog/outreach-templates.md`,
both as living documents updated weekly during the 90-day outreach
window.
