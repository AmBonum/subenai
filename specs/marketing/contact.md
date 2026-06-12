# Contact page — test plan

**Area:** `specs/marketing/`
**Component(s) under test:** `src/routes/contact.tsx` (+ deep-link target `src/routes/contact-form.index.tsx`)
**Routes:** `/contact` (hub), `/contact-form` (web ticket form)
**API endpoints:** _None on `/contact` itself — every CTA is an internal SPA link. The form POST pipeline is covered by `specs/support/ticket-system-full-coverage.md`._
**Data dependencies:** `src/config/site.ts` (`CONTACT_EMAIL = "subenai.podpora@gmail.com"`, plain-text fallback only), `src/i18n/locales/sk/marketing.json` (`kontakt.*` keys)
**Source stories:** E48 ticketing follow-up — truthful-copy rewrite of the contact hub (2026-06-11)
**Last updated:** 2026-06-11

---

## Context

The `/contact` page is a hub that routes every enquiry to the web ticket
form at `/contact-form`. The hero promises — truthfully — a request number
and an e-mail reply from a real person ("Dostaneš číslo žiadosti a odpoveď
e-mailom — od reálneho človeka, nie od bota."). The main CTA
("Otvoriť kontaktný formulár") links to the bare form; six topic cards
deep-link with `?topic=<slug>` (`tech`, `content`, `sponsor`, `gdpr`,
`press`, `other`), which the form route validates and uses to preselect the
ticket category and prefill the subject from the same i18n label
(`kontakt.topic_<slug>_subject`):

| topic | preselected category | prefilled subject |
|---|---|---|
| tech | bug | Technická pomoc |
| content | question | Obsahová otázka |
| sponsor | billing | Sponzorstvo a faktúry |
| gdpr | gdpr | GDPR žiadosť |
| press | other | Spolupráca |
| other | other | Otázka |

There are NO mailto links anywhere on the page. The e-mail address appears
only as plain-text `<code>` fallbacks (under the main CTA and inside the
operator card). A legal operator card carries company registration details
and the GDPR contact path. The page is fully indexable
(`robots: index, follow`).

## Test-id inventory

| test-id | element |
|---|---|
| `contact-page-root` | `<main>` wrapper |
| `contact-back-link` | "← Späť na domov" link |
| `contact-heading` | `<h1>Kontakt</h1>` |
| `contact-main-form-link` | Primary "Otvoriť kontaktný formulár" CTA → `/contact-form` |
| `contact-email-fallback` | `<code>` element with the raw e-mail address |
| `contact-topics-list` | `<ul>` containing the six topic links |
| `contact-topic-link-<slug>` | Topic deep-links → `/contact-form?topic=<slug>` |
| `contact-operator-card` | Operator information section |
| `contact-privacy-link` | "Zásadách ochrany súkromia" inline link |
| `contact-gdpr-email-code` | Plain-text GDPR e-mail `<code>` in the operator card |

## Out of scope

- Form validation / submission / Turnstile (covered by `specs/support/ticket-system-full-coverage.md`).
- Header and footer component behavior (covered by `specs/cross-cutting/`).
- Cookie banner interaction (covered by `specs/consent/`).
- Privacy policy page content (covered separately in `specs/consent/`).

---

## Test cases (mirrors `e2e/specs/marketing/contact.spec.ts`)

### Happy paths

- **TC-01** — Page renders: title "Kontakt — subenai", `<h1>Kontakt</h1>`, primary CTA with verbatim label "Otvoriť kontaktný formulár", all six topic links, operator card "Prevádzkovateľ".
- **TC-02** — Primary CTA `href` is exactly `/contact-form` (no mailto).
- **TC-03** — Each topic link `href` is `/contact-form?topic=<slug>`; all six are distinct.
- **TC-04** — "← Späť na domov" navigates to `/`.
- **TC-05** — Clicking the GDPR topic card lands on `/contact-form?topic=gdpr` with subject prefilled to "GDPR žiadosť" and category select showing "Žiadosť o údaje (GDPR)".
- **TC-06** — Plain-text fallback: copy "Ak radšej píšeš e-mail, naša adresa je" + `<code>subenai.podpora@gmail.com</code>` visible.
- **TC-07** — Operator GDPR inline link points to `/privacy` and navigates there.
- **TC-08** — Operator-card GDPR e-mail is a plain-text `<code>` (not wrapped in an anchor).

### Edge cases

- **TC-09** — Meta: title, description ("Napíš nám cez kontaktný formulár. Technická pomoc, GDPR žiadosti, sponzorstvo aj všeobecné otázky. Odpovedáme typicky do 2 pracovných dní."), `robots = "index, follow"`, canonical ends `/contact`.
- **TC-10** — 375×667: no horizontal overflow; topics grid collapses to 1 column.
- **TC-11** — 768×1024: topics grid renders 2 columns.
- **TC-12** — Keyboard: Tab reaches the main CTA, then the first topic link; Enter performs SPA navigation to `/contact-form?topic=tech`.
- **TC-13** — Truthful copy guard: hero contains "Dostaneš číslo žiadosti a odpoveď e-mailom"; the obsolete "Žiadny formulár, žiadny ticket systém" claim is absent; zero `a[href^="mailto:"]` on the page.
- **TC-14** — No console errors on load.
- **TC-15** — OG meta (`og:title`, `og:type=website`, `og:url=https://subenai.sk/contact`, non-empty `og:description`).
- **TC-16** — Footer "Kontakt" link navigates to `/contact`.
- **TC-17** — Rapid re-navigation: no double render, no React key warnings, topic hrefs intact.
