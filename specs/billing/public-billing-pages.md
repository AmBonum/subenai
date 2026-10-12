# Paid plans — public pages — test plan

**Area:** `specs/billing/`
**Component(s) under test:** `src/routes/cennik.tsx`, `src/components/billing/PlanCards.tsx`, `src/routes/obchodne-podmienky.tsx`, `src/routes/overenie.$reportId.tsx`, `src/routes/app.tsx` (auth guard), `src/components/layout/Footer.tsx`
**Routes:** `/cennik`, `/obchodne-podmienky`, `/overenie/$reportId`, `/app/billing`
**API endpoints:** Supabase RPC `POST /rest/v1/rpc/verify_evidence_report` (mocked in every scenario that reaches it)
**Data dependencies:** none — prices come from `src/lib/billing/plans.ts`; the verification RPC is mocked.
**Source stories:** `tasks/stories/E66-b2b-monetization.md` (E66.1, E66.2)
**Last updated:** 2026-10-12

---

## Context

Paid plans (Štart / Firma / Firma+) sell the training-evidence layer on top of the free product. Anonymous visitors see the price list on `/cennik`, the terms of sale on `/obchodne-podmienky`, and anyone holding an evidence PDF can check it on `/overenie/<report id>`. Buying requires an account, so a plan CTA leads into `/app/billing`, which is behind the auth guard and must survive the sign-in round-trip.

## Out of scope

- Stripe Checkout itself and the webhook (covered by Vitest handler tests in `tests/functions/billing-*.test.ts`).
- The authenticated `/app/billing` and `/app/tests/$testId/doklad` screens (covered by `tests/routes/billing-pages.test.tsx`).
- PDF rendering.

---

## Happy paths

### TC-01: Pricing page lists the free tier, three paid plans and the custom tier

**Prerequisites**: anonymous session, consent primed, viewport 1280×800.

**When** the visitor opens `/cennik`
**Then** the title "Doklad o preškolení zamestnancov bez drahého LMS" is visible
**and** the plan cards `billing-plan-card-free`, `billing-plan-card-start`, `billing-plan-card-firma`, `billing-plan-card-firma_plus` and `billing-plan-card-custom` are visible
**and** the prices read "149", "390" and "790" for Štart, Firma and Firma+ respectively
**and** the Firma card shows its recommended badge
**and** each paid CTA links to `/app/billing?plan=<id>` (`start`, `firma`, `firma_plus`).

### TC-02: Cancelled checkout shows a status banner

**When** the visitor opens `/cennik?checkout=cancelled`
**Then** `pricing-checkout-cancelled` is visible with "Platba bola zrušená. Plán si môžete vybrať kedykoľvek znova."
**and** opening `/cennik` without the parameter shows no such banner.

### TC-03: Terms of sale render all nine sections and are reachable from the footer

**When** the visitor clicks the footer link "Obchodné podmienky" (legal column)
**Then** the URL is `/obchodne-podmienky`
**and** the heading "Obchodné podmienky platených plánov" and "Účinné od 12. 10. 2026" are visible
**and** the nine section headings are visible in order: "1. Úvodné ustanovenia", "2. Predmet zmluvy", "3. Objednávka a uzavretie zmluvy", "4. Cena a platobné podmienky", "5. Trvanie, obnovenie a zrušenie", "6. Odstúpenie od zmluvy", "7. Reklamácie a riešenie sporov", "8. Zodpovednosť a osobné údaje", "9. Záverečné ustanovenia"
**and** section 1 contains "IČO: 55 055 290"
**and** no section contains the literal placeholder "{email}"
**and** the back link leads to `/cennik`.

### TC-04: Verification of a genuine report

**Given** the RPC `verify_evidence_report` is mocked to return one row: org "Firma s. r. o.", test "Phishing 2026", version 3, respondent_count 12, passed_count 10, content_sha256 of 64 hex chars
**When** the visitor opens `/overenie/7d1f0c2e-4b8a-4f61-9c3e-2a5b6d7e8f90`
**Then** `verify-valid` is visible with "Doklad je pravý"
**and** `verify-org` reads "Firma s. r. o."
**and** `verify-hash` shows the 64-char hash.

### TC-05: Paid-plan CTA keeps the destination through sign-in

**When** an anonymous visitor clicks the Firma CTA on `/cennik`
**Then** they land on `/login` with a `redirect` query parameter that decodes to `/app/billing?plan=firma`.

## Edge cases

### TC-06: Malformed report id never calls the RPC

**When** the visitor opens `/overenie/not-a-uuid`
**Then** `verify-invalid` is visible with "Doklad sa nenašiel"
**and** no request to `/rest/v1/rpc/verify_evidence_report` was made.

### TC-07: Unknown report id

**Given** the RPC is mocked to return `[]`
**When** the visitor opens `/overenie/00000000-0000-4000-8000-000000000000`
**Then** `verify-invalid` is visible with "Doklad sa nenašiel".

### TC-08: RPC failure surfaces an error, not a false "invalid"

**Given** the RPC is mocked to respond 500
**When** the visitor opens `/overenie/7d1f0c2e-4b8a-4f61-9c3e-2a5b6d7e8f90`
**Then** `verify-error` (role `alert`) is visible
**and** `verify-valid` and `verify-invalid` are absent.

### TC-09: Pricing and terms fit a phone screen

**Given** viewport 375×812
**When** the visitor opens `/cennik` and then `/obchodne-podmienky`
**Then** on both pages `document.documentElement.scrollWidth` ≤ `clientWidth` (no horizontal scroll)
**and** every plan card is visible after scrolling into view.
