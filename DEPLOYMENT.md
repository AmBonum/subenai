# 🚀 Deployment Guide — Internet IQ Test

Ako rozbehať túto appku na **vlastnom hostingu zadarmo** (Cloudflare Pages + Supabase Free + tvoja doména z Websupportu).

**Cena: 0 €/mesiac** · Kapacita: 100 000+ requestov/deň zadarmo · Bez vendor lock-inu.

---

## 📦 Čo budeš potrebovať

- ✅ GitHub účet (zadarmo) — https://github.com
- ✅ Supabase účet (zadarmo) — https://supabase.com
- ✅ Cloudflare účet (zadarmo) — https://dash.cloudflare.com/sign-up
- ✅ Doménu na Websupporte (alebo ktoromkoľvek registrátorovi)

Žiadnu kartu, žiadne predplatné. Vystačíš si s free tier.

---

## KROK 1 — Pripoj projekt na GitHub

1. V Lovable klikni vľavo na **Connectors** → **GitHub** → **Connect project**
2. Autorizuj Lovable GitHub App
3. Vyber účet/organizáciu
4. Klikni **Create Repository** → vyber názov (napr. `subenai`)

✅ Hotovo. Tvoj kód je teraz na GitHub a synchronizuje sa obojsmerne.

---

## KROK 2 — Vytvor si vlastnú databázu na Supabase

1. Choď na **https://supabase.com** a klikni **Start your project**
2. Sign up cez GitHub (najrýchlejšie)
3. **New project**:
   - Name: `subenai`
   - Database password: **vygeneruj silné heslo a ulož si ho**
   - Region: **Frankfurt (eu-central-1)** ← najbližšie k SK
   - Plan: **Free**
4. Počkaj ~2 minúty kým sa projekt vytvorí

### Importuj schému
1. V ľavom menu otvor **SQL Editor** → **New query**
2. Skopíruj celý obsah súboru **`DEPLOY_SETUP.sql`** (z root projektu)
3. Vlož do editora a klikni **Run**
4. Mal by si vidieť „Success. No rows returned"

### Skopíruj credentials
1. V ľavom menu otvor **Settings** (ikona ⚙️) → **API**
2. Skopíruj si tieto **dve hodnoty** (potrebuješ ich v ďalšom kroku):
   - **Project URL** (napr. `https://abcdefgh.supabase.co`)
   - **anon public** key (dlhý JWT token začínajúci `eyJ...`)

⚠️ **NIKDY nezdieľaj `service_role` key!** Iba `anon public` key je bezpečný v prehliadači.

---

## KROK 3 — Deploy na Cloudflare Pages

1. Choď na **https://dash.cloudflare.com** → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Vyber svoj GitHub účet, schvál Cloudflare prístup
3. Vyber repo `subenai`
4. **Set up builds and deployments**:
   - Framework preset: **None** (alebo „Vite" ak je v zozname)
   - Build command: `bun install && bun run build`
   - Build output directory: `dist`
   - Root directory: `/`
5. **Environment variables** (klikni „Add variable"):
   ```
   VITE_SUPABASE_URL          = https://tvoj-projekt.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY = eyJ... (anon public key)
   VITE_SUPABASE_PROJECT_ID   = tvoj-projekt   (časť pred .supabase.co)
   ```
6. Klikni **Save and Deploy**

Build trvá ~3-5 minút. Keď doběhne, dostaneš URL ako `subenai.pages.dev`.

✅ **Otestuj appku na tej URL.** Ak funguje, ideš na vlastnú doménu.

---

## KROK 4 — Pripoj svoju doménu z Websupportu

### V Cloudflare Pages
1. V Cloudflare projekte: **Custom domains** → **Set up a custom domain**
2. Zadaj svoju doménu (napr. `subenai.eu`)
3. Cloudflare ti ukáže DNS záznamy, ktoré treba nastaviť

### Vo Websupporte (DNS manager)
Máš dve možnosti:

**Možnosť A: Nameservery na Cloudflare** (odporúčané — zadarmo CDN, DDoS ochrana)
1. Vo Websupporte: **Domény** → tvoja doména → **Nameservery**
2. Zmeň na nameservery, ktoré ti dá Cloudflare (napr. `xxx.ns.cloudflare.com`)
3. V Cloudflare DNS sa už záznamy pridajú automaticky

**Možnosť B: Iba CNAME** (necháš nameservery vo Websupporte)
1. Vo Websupporte: **DNS záznamy** → pridaj:
   ```
   Typ:   CNAME
   Názov: @  (alebo www)
   Cieľ:  subenai.pages.dev
   TTL:   3600
   ```

DNS propagácia trvá od pár minút do 48 hodín. Cloudflare automaticky vystaví SSL certifikát (HTTPS).

---

## 🎉 Hotovo!

Tvoja appka beží na vlastnej doméne, vlastnom GitHub repe, vlastnom Supabase účte. Cena 0€.

### Ako pristúpiť k dátam dotazníka
- Supabase dashboard → **Table Editor** → `attempts`
- Export do CSV: klikni na tabuľku → menu → **Export data as CSV**

### Free tier limity (pre kontext)
| Služba | Free limit | Reálne pre 50k userov/týždeň |
|---|---|---|
| Cloudflare Pages | 100 000 requestov/deň | ✅ Bohato stačí |
| Supabase Free | 500 MB DB, 5 GB bandwidth/mesiac | ✅ Stačí ~250 000 testov |
| Supabase API requests | Neobmedzené | ✅ |

⚠️ **Pozor**: Supabase Free pauzne projekt po **7 dňoch nečinnosti**. Pri reálnom traffiku ti to nehrozí. Ak appka zaspí, klikni v Supabase **Restore project**.

---

## 🔄 Ako updatovať appku po deploy?

1. Spravíš zmenu v Lovable
2. Auto-syncne sa do GitHub
3. Cloudflare Pages auto-detekuje push a re-buildne (~3 min)

Žiadne manuálne deploy kroky.

---

## 🆘 Riešenie problémov

**Build fails na Cloudflare**
- Skontroluj, či máš v env variables všetky 3 `VITE_SUPABASE_*` hodnoty
- Logy buildu sú v Cloudflare → tvoj projekt → **Deployments** → klikni na deployment

**Appka načíta, ale data sa neukladajú**
- Otvor v prehliadači F12 → Console → pozri error
- Skontroluj v Supabase **Logs** → **Postgres logs**, či prichádzajú requesty
- Over si, že `VITE_SUPABASE_URL` aj `VITE_SUPABASE_PUBLISHABLE_KEY` sú správne (bez medzier, bez úvodzoviek)

**Doména neukazuje na appku**
- DNS propagácia môže trvať až 48h. Skontroluj na https://dnschecker.org
- Skontroluj, že CNAME ukazuje presne na `tvoj-projekt.pages.dev`

---

## 💳 Stripe sponsorship setup (E10+)

Sponzorský flow potrebuje samostatné env vars na **Cloudflare Pages
Functions** (server-side, nikdy nie v client bundle).

### Krok 1 — vytvor Stripe účet pre s.r.o.

1. https://stripe.com/sk → Sign up
2. Pre **am.bonum s. r. o.** zadaj IČO 55 055 290, DIČ 2121850005, IBAN
   Tatra banky, kópiu OP konateľa
3. Verifikácia 1–3 dni (Stripe potvrdí cez e-mail)
4. Kým neuvidíš „Activate live mode" tlačidlo, používaj iba **test
   mode** (`sk_test_*`, `pk_test_*`) na vývoj

### Krok 2 — env vars do Cloudflare

V dashboardi: Cloudflare Pages → tvoj projekt → **Settings** →
**Environment variables** → **Production**:

| Variable | Type | Hodnota |
|---|---|---|
| `STRIPE_PUBLISHABLE_KEY` | Plain text | `pk_live_...` (po activate) |
| `STRIPE_SECRET_KEY` | **Secret** | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | **Secret** | `whsec_...` (z Webhook endpoint) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | service_role JWT |
| `RESEND_API_KEY` | **Secret** | `re_...` (po DKIM verify) |
| `JWT_SECRET` | **Secret** | 64-hex random (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `EMAIL_FROM` | Plain text | `noreply@subenai.sk` |
| `EMAIL_REPLY_TO` | Plain text | `subenai.podpora@gmail.com` |
| `OPS_EMAIL` | Plain text | `subenai.podpora@gmail.com` |
| `SITE_ORIGIN` | Plain text | `https://subenai.sk` |

⚠️ Mark **Secret** type (nie Plain) všetky `*_KEY` / `*_SECRET` polia,
aby sa neobjavili v build logoch.

### Krok 3 — lokálny dev s wranglerom

```bash
cp .dev.vars.example .dev.vars
# Vyplň test-mode keys
npx wrangler pages dev -- npm run dev
```

### Krok 4 — Stripe webhook endpoint

V Stripe Dashboard → Developers → Webhooks → **Add endpoint**:
- URL: `https://subenai.sk/api/stripe-webhook`
- Events: `checkout.session.completed`, `invoice.paid`,
  `customer.subscription.{created,updated,deleted}`, `charge.refunded`
- Skopíruj „Signing secret" (whsec_…) → vlož ako `STRIPE_WEBHOOK_SECRET`

### Krok 5 — bundle audit (CI gate)

Pred každým merge spusť:

```bash
npm run audit:bundle
```

Skript zachytí (a) tracker SDK kód v dist/, (b) leak `STRIPE_SECRET`,
`whsec_`, `service_role` alebo `RESEND_API_KEY` references do client
bundle. Akýkoľvek hit = exit 1.

---

## 🔎 SEO, indexácia a Google Search Console

Toto je produkčný checklist pre `subenai.sk`, aby Google videl reálne HTML,
našiel sitemapu a indexoval len tie stránky, ktoré majú byť verejné.

### Čo má byť indexované

Tieto routy majú zostať `index, follow` a majú byť v `sitemap.xml`:

- `/`
- `/tests`
- `/tests/$slug`
- `/courses`
- `/courses/$slug`
- `/support`
- `/sponsors`
- `/sponsors/all`
- `/manage-support`
- `/privacy`
- `/cookies`
- `/about`
- `/changelog`
- `/contact`

### Čo nemá byť indexované

Tieto routy musia zostať mimo indexu a nesmú byť v `sitemap.xml`:

- `/test`
- `/test/zostav`
- `/test/zostava/$id`
- `/thank-you/$sessionId`
- `/r/$shareId`

Pravidlo je jednoduché: ak je route session-based, share-based alebo dočasne
vypnutá, patrí `noindex` a nesmie sa objaviť v sitemape.

### Stav v kóde

- `public/robots.txt` povoľuje crawl a odkazuje na `https://subenai.sk/sitemap.xml`
- `scripts/generate-sitemap.mjs` generuje len verejné routy
- `/test` a `/test/zostav` sú už odstránené zo sitemap
- dynamické súkromné routy ako `/thank-you/$sessionId` a `/test/zostava/$id`
  majú zostať `noindex, nofollow`

Ak pridáš novú verejnú landing page, musíš spraviť všetky 3 kroky:

1. doplniť route-level SEO meta (`title`, `description`, canonical, robots)
2. pridať ju do `scripts/generate-sitemap.mjs`, ak je statická
3. overiť, že nie je blokovaná Cloudflare challenge stránkou

### Cloudflare: kritický krok pre Googlebot

Ak `subenai.sk` vracia Cloudflare „Just a moment..." challenge aj pre
Googlebot, Search Console neuvidí ani obsah, ani Google tag. V takom stave
nepomôže ani správny sitemap, ani meta tagy.

V Cloudflare nastav custom rule:

1. `Security` → `WAF` → `Custom rules`
2. `Create rule`
3. Názov napr. `Allow verified search crawlers on subenai.sk`
4. Expression:

```txt
(http.host eq "subenai.sk" and cf.bot_management.verified_bot and cf.verified_bot_category eq "Search Engine Crawler")
```

5. Action: `Skip`
6. V skip zozname zapni aspoň:
   - `All managed rules`
   - `Super Bot Fight Mode`
   - `Browser Integrity Check`
   - `Security Level`

Ak máš vlastné challenge/block pravidlá, uisti sa, že toto skip pravidlo je
nad nimi v poradí.

### Google Search Console checklist

Po deployi a po Cloudflare zmene sprav toto:

1. V Search Console maj property `https://subenai.sk/`
2. V `Sitemaps` pošli `https://subenai.sk/sitemap.xml`
3. Cez `URL Inspection` otestuj:
   - `/`
   - `/tests`
   - `/courses`
   - `/support`
   - jeden konkrétny `/tests/$slug`
   - jeden konkrétny `/courses/$slug`
4. Ak `Live test` neukáže HTML z appky, ale challenge stránku, problém je stále
   Cloudflare, nie React appka
5. Ak HTML sedí, daj `Request indexing` len na kľúčové landing pages; ostatné si
   Google doberie zo sitemap

### Google tag: čo je nutné pre detekciu

Pre GA4 na `subenai.sk` používame `G-95QZ12WGFD` v hybridnom režime:

- bootstrap je priamo v `index.html`, aby ho Google vedel detegovať aj bez
  hydratácie
- consent update sa posiela z React appky podľa cookie voľby používateľa

Ak Search Console alebo Tag Assistant tag nevidia, skontroluj v tomto poradí:

1. či `subenai.sk` vracia reálny HTML dokument a nie challenge page
2. či sa po deployi nasadil aktuálny `index.html`
3. či CSP alebo blokovacie pravidlá nebránia načítaniu `gtag/js`

### Operatívny checklist pred merge na `main`

Pred produkčným merge pre novú verejnú stránku over:

1. route má správny `title`, `meta description`, canonical a `robots`
2. ak je verejná a statická, je v `scripts/generate-sitemap.mjs`
3. ak je neverejná alebo tokenová, nie je v sitemape a má `noindex`
4. `public/robots.txt` stále ukazuje na produkčnú sitemapu
5. Cloudflare nepúšťa challenge pre verified search crawlers
6. Search Console `Live test` vracia HTML z appky
