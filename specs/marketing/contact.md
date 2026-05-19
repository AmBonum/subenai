# Contact page — test plan

**Area:** `specs/marketing/`
**Component(s) under test:** `src/routes/contact.tsx`
**Routes:** `/contact`
**API endpoints:** _None — the page contains only `mailto:` links; no CF Function is involved. `BASE_URL=http://localhost:8788` (wrangler) is NOT required for this spec._
**Data dependencies:** `src/config/site.ts` (`CONTACT_EMAIL = "subenai.podpora@gmail.com"`), `src/i18n/locales/sk/marketing.json` (`kontakt.*` keys)
**Source stories:** _None — pre-story feature; intent inferred from `src/routes/contact.tsx` + `src/i18n/locales/sk/marketing.json`._
**Last updated:** 2026-05-19

---

## Context

The `/contact` page is a static marketing page that lets any visitor reach the project team via pre-addressed `mailto:` links. There is no server-side form submission and no CF Function. Six topic shortcuts (technical help, content, sponsorship, GDPR, press, other) generate mailto URLs with a pre-filled subject prefix "subenai — ". A legal operator card carries company registration details and a GDPR contact path. The page is fully indexable (`robots: index, follow`).

## Missing `data-testid` attributes (flag for generator)

The contact page `<main>` contains zero `data-testid` attributes. Before the generator can write stable Playwright locators, the following test-ids must be added to `src/routes/contact.tsx`:

| Suggested test-id | Element |
|---|---|
| `contact-page-root` | `<main>` wrapper |
| `contact-back-link` | "← Späť na domov" link |
| `contact-heading` | `<h1>Kontakt</h1>` |
| `contact-main-email-link` | Primary "Napísať na …" mailto button |
| `contact-email-fallback` | `<code>` element with the raw email address |
| `contact-topics-list` | `<ul>` containing the six topic links |
| `contact-topic-link-tech` | Topic link "Technická pomoc / chyba na stránke" |
| `contact-topic-link-content` | Topic link "Otázka k testu, kurzu alebo obsahu" |
| `contact-topic-link-sponsor` | Topic link "Sponzorstvo a faktúry" |
| `contact-topic-link-gdpr` | Topic link "GDPR žiadosť (vymazanie, prístup, námietka)" |
| `contact-topic-link-press` | Topic link "Spolupráca alebo médiá" |
| `contact-topic-link-other` | Topic link "Iné" |
| `contact-operator-card` | Operator information section |
| `contact-privacy-link` | "Zásadách ochrany súkromia" inline link |
| `contact-gdpr-email-link` | Inline GDPR mailto link in the operator card |

## Out of scope

- No server-side form submission exists; form validation TCs do not apply.
- `BASE_URL=http://localhost:8788` wrangler setup is not needed — the spec runs against `http://localhost:8080` only.
- Header and footer component behavior (covered by `specs/cross-cutting/`).
- Cookie banner interaction (covered by `specs/consent/`).
- Actual email delivery to `subenai.podpora@gmail.com` (external, untestable).
- Privacy policy page content (covered separately in `specs/consent/`).
- Mobile-triggered mega-menu flows on this page (covered by `specs/cross-cutting/`).

---

## Happy paths

### TC-01: Page renders with correct title, heading, and all mailto links visible

**Prerequisites**:
- Dev server running at `http://localhost:8080`.
- No prior consent record (clean localStorage).
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/contact`
**Then** the browser tab title is "Kontakt — subenai"
**and** the `<h1>` heading reads "Kontakt"
**and** the primary email link labelled "Napísať na subenai.podpora@gmail.com" is visible
**and** all six topic links are visible in the topics list
**and** the operator card with heading "Prevádzkovateľ" is visible

### TC-02: Primary mailto link carries the correct pre-filled subject

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.
- Viewport 1280×800.

**When** the user inspects the `href` attribute of the link labelled "Napísať na subenai.podpora@gmail.com"
**Then** the `href` value starts with `mailto:subenai.podpora@gmail.com?`
**and** the decoded query string contains `subject=subenai — Kontakt`

### TC-03: Topic link "GDPR žiadosť" generates a mailto with the correct subject

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.
- Viewport 1280×800.

**When** the user inspects the `href` of the link labelled "GDPR žiadosť (vymazanie, prístup, námietka)"
**Then** the decoded `subject` parameter equals `subenai — GDPR žiadosť`
**and** the `mailto:` address part is `subenai.podpora@gmail.com`

### TC-04: "← Späť na domov" link navigates to the home page

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.

**When** the user clicks the link labelled "← Späť na domov"
**Then** the browser navigates to `/` (the home page)
**and** no 404 or error page is shown

---

## Negative scenarios

### TC-05: All six topic mailto hrefs decode to a non-empty `subject` parameter

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.

**When** the generator reads the `href` attributes of all six links inside the topics list
**Then** each decoded `subject` value is non-empty and starts with "subenai — "
**and** none of the six subjects is identical to another (subjects are topic-specific)

### TC-06: Fallback plain-text email address is visible for copy-paste

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.

**When** the user views the section below the primary mailto button
**Then** the text "Ak ti tlačidlo nefunguje, skopíruj adresu ručne:" is visible
**and** the `<code>` element containing `subenai.podpora@gmail.com` is visible in the DOM

### TC-07: Operator GDPR inline link points to the correct relative route

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.

**When** the user reads the operator card paragraph that begins "Detaily o spracovaní osobných údajov sú v"
**Then** the link labelled "Zásadách ochrany súkromia" has an `href` of `/privacy`
**and** clicking that link navigates to `/privacy` without a 404

### TC-08: Operator GDPR mailto link in the card carries the GDPR subject

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.

**When** the user inspects the mailto link for `subenai.podpora@gmail.com` inside the operator card
**Then** the decoded `subject` parameter equals `subenai — GDPR žiadosť`

---

## Edge cases

### TC-09: Page title and meta description are set; `robots` meta is `index, follow`

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.

**When** the page finishes loading
**Then** `document.title` equals "Kontakt — subenai"
**and** the `<meta name="description">` content equals "Napíš nám priamo na email. Technická pomoc, GDPR žiadosti, sponzorstvo aj všeobecné otázky. Odpovedáme typicky do 2 pracovných dní."
**and** the `<meta name="robots">` content equals "index, follow" (NOT "noindex")
**and** the canonical link tag `href` ends with `/contact`

### TC-10: Mobile viewport 375×667 — no horizontal overflow

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.
- Viewport resized to 375×667 (iPhone SE).

**When** the full page is rendered in mobile viewport
**Then** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal overflow)
**and** the primary mailto button is fully visible within the viewport without horizontal scrolling
**and** all six topic cards are stacked in a single column (2-column grid collapses on small screens)

### TC-11: Tablet viewport 768×1024 — topic grid renders in two columns

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.
- Viewport resized to 768×1024.

**When** the topics section is visible
**Then** the six topic links render in a two-column grid (CSS grid with `sm:grid-cols-2`)
**and** no topic card overflows its container

### TC-12: All mailto links are keyboard-reachable and activatable

**Prerequisites**:
- Browser at `http://localhost:8080/contact` with cookie banner dismissed.
- Input device: keyboard only.

**When** the user tabs through the page from the top
**Then** the primary mailto button receives visible focus before the topic links
**and** every topic link in the list receives visible focus in DOM order
**and** pressing Enter on a focused mailto link does not throw a JavaScript error
**and** no interactive element is skipped or unreachable by Tab alone

### TC-13: Slovak diacritics in subject lines encode correctly in the href

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.

**When** the `href` of the link labelled "GDPR žiadosť (vymazanie, prístup, námietka)" is read
**Then** the raw `href` contains percent-encoded characters for `ž`, `ť`, and `—` (em dash)
**and** `decodeURIComponent` of the subject value round-trips back to `subenai — GDPR žiadosť` without data loss

### TC-14: Page loads without JavaScript errors in the browser console

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.
- Console error level monitoring enabled.

**When** the page finishes loading and the consent banner is dismissed via "Odmietnuť všetko"
**Then** no `console.error` entries appear that originate from `contact.tsx` or its imported modules
**and** no uncaught React render exceptions are thrown

### TC-15: OG meta tags are present for social sharing

**Prerequisites**:
- Browser at `http://localhost:8080/contact`.

**When** the page head is inspected
**Then** `og:title` content equals "Kontakt — subenai"
**and** `og:type` content equals "website"
**and** `og:url` content equals "https://subenai.sk/contact"
**and** `og:description` is non-empty

### TC-16: Direct navigation via footer "Kontakt" link lands on the correct page

**Prerequisites**:
- Browser at `http://localhost:8080/` (home page).
- Viewport 1280×800.

**When** the user clicks the link labelled "Kontakt" inside the footer "Projekt" column
**Then** the browser navigates to `/contact`
**and** the `<h1>` heading "Kontakt" is visible

### TC-17: Rapid successive navigation to `/contact` does not cause a double-render or console error

**Prerequisites**:
- Browser at `http://localhost:8080/`.
- TanStack Router client-side navigation active.

**When** the user navigates to `/contact` and then immediately navigates away and back within 500 ms
**Then** the page renders correctly on the second visit
**and** the six topic links are all present and have non-empty `href` values
**and** no React `key` warning appears in the console

---

## Open questions

- Should the `contact-topic-link-*` test-ids follow the same `kebab-case area-component-element` pattern as header test-ids, or should they mirror the `labelKey` suffix from `TOPICS`? Generator needs a decision before writing POM getters.
- The `robots` meta is explicitly set to `"index, follow"` in code. Confirm this is intentional (some similar marketing pages set "noindex" for thin content) — affects TC-09.
- No rate-limit or honeypot applies here (mailto only). If a contact form is ever added in a future epic, this plan must be extended with TC-pairs for server validation, rate limiting, and spam honeypot.
