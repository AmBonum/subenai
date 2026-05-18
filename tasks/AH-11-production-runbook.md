# AH-11 production runbook

Po dokončení AH-11 epicu (15+ sub-commitov, migrácia admin-hub UI z
in-memory mock-store na produkčnú Supabase) tento runbook slúži ako
záväzný checklist pred a po nasadení na `subenai.sk`. Operátor (alebo
budúci agent) podľa tohto dokumentu overí, že každá verejná, `/app` a
`/admin` plocha v produkcii skutočne funguje.

Test baseline po AH-11: **749 passing**. Pred merge novej PR vždy ≥ 749.

---

## A. Pre-deploy checklist — Supabase Dashboard

### A.1 SQL migrácie (poradie je záväzné)

V Supabase SQL Editori spusti v presne tomto poradí (alebo jediný
`DEPLOY_SETUP.sql` ktorý ich konsoliduje):

1. `supabase/migrations/20260517000000_admin_hub_schema.sql`
   — AH-1: 32 tabuliek, RLS policies, `has_role()` funkcia
2. `supabase/migrations/20260517010000_fix_handle_new_user.sql`
   — AH-1.9: oprava trigeru pre nového používateľa
3. `supabase/migrations/20260518000000_mfa_backup_codes.sql`
   — AH-12.1: tabuľka záložných kódov pre 2FA
4. `supabase/migrations/20260518100000_fix_rls_recursion.sql`
   — AH-1.10: oprava nekonečnej rekurzie v RLS politikách
   (tests, teams, team_members)
5. `supabase/migrations/20260518200000_audit_log_insert_fn.sql`
   — AH-11.3: RPC `audit_log_insert` pre serverový audit
6. `supabase/migrations/20260518300000_public_respondent_rpc.sql`
   — AH-11.4: trojica SECURITY DEFINER RPC pre anonymný `/t/<id>` flow
7. `supabase/migrations/20260518400000_quiz_questions_db_infra.sql`
   — AH-11.5b.1: seed 238 scam scenárov + `get_quick_test_questions` RPC

Po každom kroku skontroluj v logu, že nenastala chyba. Skript je
idempotentný — opakované spustenie je bezpečné.

### A.2 Authentication

- Project Settings → **Authentication → Multi-Factor Authentication →
  Enable TOTP**. Bez tohto kroku sa admin nevie enrolovať a po prihlásení
  zostane zamknutý mimo `/admin` (vyžaduje AAL2).
- Project Settings → **Authentication → URL Configuration → Site URL**
  = `https://subenai.sk` (a pridaj redirect URL `https://subenai.sk/**`).

### A.3 API secrets

- Project Settings → **API → service_role secret** — skopíruj. Bude
  potrebné pre Cloudflare Pages env premennú v sekcii B.

---

## B. Pre-deploy checklist — Cloudflare Pages

V Cloudflare Pages → Settings → Environment Variables (Production):

| Premenná | Stav | Zdroj |
|---|---|---|
| `SUPABASE_URL` | už nastavené | Supabase Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (anon key) | už nastavené | Supabase Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | **musí byť pridané** | Supabase Project Settings → API → service_role secret |

`SUPABASE_SERVICE_ROLE_KEY` je nutný len v Production env — používa ho
Cloudflare Pages function `/api/admin/users/[id]` pre privilegované
zmeny rolí a banov používateľov. Bez tejto premennej padne pokus o
zmenu role v `/admin/users` chybou 500.

Verifikácia po nasadení (DevTools Network):
- `POST /api/admin/users/<uuid>` → 200, response obsahuje aktualizovaného
  používateľa.

---

## C. End-to-end smoke test (manuálny, ~15 min)

### C.1 Verejné marketingové plochy (nepotrebuje prihlásenie)

1. **`/`** — homepage renderuje, žiadne chyby v konzole, GA sa načíta
   (DevTools → Network → `google-analytics.com` request).
2. **`/test`** — rýchly test načíta 10 náhodných scam scenárov z DB.
   Overiť v Network: request na `get_quick_test_questions` RPC vráti
   10 položiek (nie 238).
3. **`/testy/$slug`** — test pack stránky renderujú (zatiaľ na mock —
   legitímna AH-14 carve-out, sekcia E).
4. **`/podpora`, `/sponzori`, `/zmeny`, `/privacy`, `/cookies`** —
   všetky renderujú, žiadne 500.
5. **`/s/o-projekte-rozsirene`** (alebo iná seedovaná CMS stránka) —
   renderuje cez reálnu Supabase (nie mock). Konzola tichá.
6. **`/t/$shareId`** s nasadeným testom — respondent flow:
   start → vyplniť 3 otázky → finalize.
   Overiť v Supabase Dashboard → Table Editor:
   - `sessions` má nový riadok
   - `session_answers` má 3 nové riadky priviazané k tomuto session_id

### C.2 Admin plochy (vyžaduje admin s AAL2)

7. **`/login`** → admin creds → redirect na `/login/verify-2fa` → zadať
   TOTP kód z autentifikátora → land na `/admin`.
8. **`/admin`** dashboard renderuje, žiadne 500. Overiť v Network:
   `tests`, `sessions`, `profiles` queries nevracajú 500 (po AH-1.10
   fix rekurzie).
9. **`/admin/questions`** — listing 238 otázok. Filter podľa autora
   prázdny zoznam neháže chybu.
10. **`/admin/users`** — `volckin@gmail.com` je v zozname s rolou admin.
11. **`/admin/security`** — TOTP status "Aktívne", počet záložných
    kódov viditeľný.
12. **`/admin/respondents`, `/admin/dsr`, `/admin/audit`** — empty
    states renderujú (alebo seedované záznamy zo smoke testu C.6).
13. **`/admin/pages`, `/admin/header`, `/admin/footer`,
    `/admin/navigation`, `/admin/share-card`, `/admin/quick-test`** —
    všetky CMS plochy renderujú s reálnymi dátami zo Supabase.
14. Sidebar — všetky odkazy fungujú. Logout button v dolnej časti
    sidebaru ukončí session a presmeruje na `/`.

### C.3 User plochy (vyžaduje plain user — bez admin role)

Vytvor cez Supabase Dashboard → Authentication → Users → Add user
testovacieho používateľa bez admin role.

15. **`/login`** → user creds → land na `/app` (žiadna 2FA výzva pre
    plain user).
16. **`/app`** dashboard, **`/app/tests`**, **`/app/audiences`**,
    **`/app/notifications`**, **`/app/teams`**, **`/app/account/profile`**,
    **`/app/account/security`**, **`/app/legal/dsr`** — všetky renderujú
    bez chýb.
17. **`/app/library`, `/app/tests/new`** — zatiaľ na mock (legitímna
    AH-14 carve-out, sekcia E).
18. Logout z `/app` → land na `/` s plne vyčistenou session (full
    reload, žiadny `sb-` cookie nezostáva).

---

## D. Bundle health verification

V repo root:

```bash
npm run lint                       # → 0 errors / 0 warnings
npm test                           # → 749 passing
npm run build                      # → ✓ built in N s
npm run check:bundle-no-mocks      # → PASS (zero mock strings in dist/)
```

Bundle veľkosti (`dist/client/assets/*.js`):
- Main chunk **< 1 MB** pre-gzip (aktuálne ~873 KB raw)
- Main chunk **< 250 KB** gzipped

Ak `check:bundle-no-mocks` vráti FAIL — neidem do produkcie. Mock string
sa dostal do bundle a treba ho najprv odstrániť (alebo doplniť do
allow-listu v `scripts/check-bundle-no-mocks.ts` s jasným odôvodnením).

---

## E. Známe carve-outs (AH-14 follow-up)

Tieto štyri body sú vedome odložené do nasledujúceho epicu AH-14 a v
produkcii prejavujú **mock správanie** (žiadny crash, len in-memory
dáta):

1. **`get_test_by_share_id` RPC** — `/t/<id>` zatiaľ vie len writnúť
   session a odpovede; čítanie metadát testu je stále mock. Po AH-14
   bude celý respondent flow čisto Supabase.
2. **`useAnswerSets` / `useAnswers` hooky** — `/app/sets/<setId>` viewer
   stále číta z mock store. Admin CRUD pre answer-sets v
   `/admin/answer-sets` je už na Supabase.
3. **`questions.type` / `category` schema enrichment** — `/app/tests/new`
   wizard a `/app/library` browser potrebujú dodatočné stĺpce na
   `questions` tabuľke, ktoré schema ešte nemá.
4. **Delete remaining mocks + flip bundle guard** — po dokončení
   bodov 1–3 sa odstránia posledné mock súbory a
   `check:bundle-no-mocks` sa prepne z **alarm-only** na **`exit(1)`**
   (hard fail v CI).

---

## F. Rollback

Ak po nasadení nastane regresia kritickej veľkosti:

1. Cloudflare Pages → Deployments → vyber posledný známy zdravý
   deployment → "Rollback to this deployment".
2. SQL migrácie **nerollbackuj** — sú aditívne (žiadne `DROP`),
   produkčný stav po revert bude konzistentný s predchádzajúcou verziou
   aplikácie.
3. Ak je nutné odstrániť konkrétnu novú tabuľku alebo RPC, urob to
   ručne v Supabase SQL Editori a zapíš do `tasks/PLAN-*.md` ako
   incident.

---

## G. Test count snapshot

Test count po AH-11: **749** (baseline).
Pred merge novej PR vždy ≥ 749. Pokles = regresia, blokuje merge.
