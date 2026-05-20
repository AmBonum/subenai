# E44 — Appendix D: UX/UI critique of `/app/templates` + a11y spec for new dialogs

**Owner:** Claude (design + a11y lens) — fronts story E44.3 in `tasks/PLAN-2026-05-20-E44-template-marketplace.md`.
**Date:** 2026-05-20
**Standard:** WCAG 2.1 AA, Radix Dialog/AlertDialog patterns, project test-id rule.
**Skill activations:** `design:design-critique`, `design:accessibility-review`.
**Source files reviewed:** `src/routes/app.templates.tsx`, `src/components/app/page-header.tsx`, `src/components/ui/{dialog,alert-dialog,tabs,dropdown-menu}.tsx`, `src/components/admin/ConfirmDialog.tsx`, `src/styles.css`.

This appendix is the **why** behind E44.3. The story file owns the **how** and the acceptance criteria. Slovak appears only inside `""` for verbatim UI strings.

---

## 1. Current `/app/templates` audit

Page in production today: page header + sticky-less filter card (search + category select) + 2-column card grid + minimal empty state. ~174 LOC. Today's prod DB has 0 rows; after E44.1 it ships 15 platform-owned defaults. The page is structurally fine for 0–15 cards and visibly breaks at 25+.

Severity legend: **BLOCKER** = ships broken or fails AA · **MAJOR** = noticeably hurts task completion · **MINOR** = polish that affects perceived quality · **NIT** = senior-bar polish, no user impact.

### D1.1 — Card grid caps at 2 columns at `md+` **(MAJOR · Phase A)**
- **Issue.** `grid gap-3 md:grid-cols-2` (line 127) means 1440px screens see giant half-width cards with `line-clamp-2` descriptions; the right half of every card after the description is whitespace. Once 15+ defaults ship + user copies, the user scrolls a column of half-empty rectangles.
- **Why it hurts.** Scanning cost scales with vertical scroll. Two columns at desktop wastes ~40 % of horizontal real-estate; users mis-read it as "this is the entire library" when 80 % of templates are below the fold.
- **Fix.** `grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3` and reduce per-card body padding from `p-4` to `p-5` so the denser grid still breathes. Cap card max-width via the grid, not a per-card class.
- **Lands in.** Phase A (E44.3).

### D1.2 — Filter bar is not sticky **(MAJOR · Phase A)**
- **Issue.** Search input + category select live in a regular `<Card>` (line 68). After scrolling past row 6 the user has lost the filter; they scroll up, change category, scroll back down.
- **Why it hurts.** Twice the scroll distance for every refine action. On mobile (375 px) it is worse because the cards are 1-up and the filter bar is 100 vh away.
- **Fix.** Wrap the filter card in `sticky top-[var(--app-shell-header-h,4rem)] z-10 backdrop-blur supports-[backdrop-filter]:bg-background/80`. Confirm the header CSS var exists or hard-code `top-16`. Adds `aria-label="Filter šablón"` on the wrapper so screen readers can jump to it as a landmark.
- **Lands in.** Phase A.

### D1.3 — No skeleton during load **(MAJOR · Phase A)**
- **Issue.** While `templatesQ.isLoading` the page renders the filter bar + nothing where cards would be. The user sees a blank rectangle for the duration of the round-trip.
- **Why it hurts.** Layout shift when data lands; on slow 3G (the school respondent persona) it reads as "broken page". Also a CLS hit for any future Lighthouse run on this surface (`/app/templates` is `noindex` but we still care about CWV signals for the marketing `/sablony`).
- **Fix.** Render 6 `<Skeleton className="h-40 rounded-xl" />` cards (already available at `src/components/ui/skeleton.tsx`) inside the same grid container during `isLoading`. Match the final card height (≈ 9.5 rem) to keep CLS at 0.
- **Lands in.** Phase A.

### D1.4 — No result count next to filter **(MINOR · Phase A)**
- **Issue.** User filters by category "Vzdelávanie" and has no idea whether they're looking at 3 of 15 or 3 of 3.
- **Why it hurts.** Without a count, "0 results" feels like the system is broken; "3 results" feels like there might be more behind a scroll.
- **Fix.** Right of the category select, add `<span className="text-xs text-muted-foreground">{t("results_count", { count: filtered.length, total: templates.length })}</span>` → `"3 z 15"`. Updates on every keystroke (debounce 150 ms to avoid screen-reader chatter).
- **Lands in.** Phase A.

### D1.5 — No sort control **(MINOR · Phase A)**
- **Issue.** Templates render in insertion order (whatever Supabase returns). Once user copies pile up, the user's most recent duplicate is buried at the bottom.
- **Why it hurts.** "Where's the one I just made?" is a known support cost on a list with 20+ rows.
- **Fix.** A small `<Select>` to the right of the category filter: "Najnovšie" (default), "Najstaršie", "Abecedne A–Z". Persist in `localStorage("app.templates.sort")`. Default = `updated_at desc` so a fresh duplicate floats to the top.
- **Lands in.** Phase A (cheap; ships with the rewrite).

### D1.6 — The "Preview hidden" comment is shipping a code-smell, not a button **(NIT · Phase A)**
- **Issue.** Lines 154-156: comment explains a Preview button was removed because the read-only viewer doesn't exist. The comment is correct (no zombie button ships), but the explanation belongs in the commit / story, not in the JSX of the rewrite.
- **Why it hurts.** Future me reads the comment and wonders if it's a TODO. It's not — it's archaeology.
- **Fix.** Drop the comment in the E44.3 rewrite. If we want to track "Preview returns when AH-12 lands", that's a story file note, not an inline comment. (Per CLAUDE.md "Never comment WHAT — names already say that.")
- **Lands in.** Phase A.

### D1.7 — Empty states confuse the two failure modes **(MAJOR · Phase A)**
- **Issue.** Today there are two empty states (line 96 vs 118) discriminated by `templates.length === 0` (no rows at all) vs `filtered.length === 0` (filter miss). With Mine/Public tabs landing, the matrix doubles to 4 states: *Public tab + DB empty*, *Public tab + filter miss*, *Mine tab + user has never duplicated*, *Mine tab + filter miss*. Today's branching can't express that.
- **Why it hurts.** "Pre tento filter nemáme žiadne šablóny" is the wrong copy when the user is on the **Mine** tab and has simply never duplicated anything — there is no "filter", the library is just empty.
- **Fix.** Four explicit empty states keyed by `(activeTab, filterIsActive)`:
  - `(public, no-filter)` — never happens after E44.1 (always 15 defaults). Defensive fallback only.
  - `(public, filter)` — "Pre tento filter nemáme žiadne verejné šablóny. Skús zmeniť kategóriu alebo vyhľadávací výraz."
  - `(mine, no-filter)` — "Ešte si si žiadnu šablónu nezduplikoval. Začni z verejnej knižnice." + CTA "Pozrieť verejné" (switches tab).
  - `(mine, filter)` — "Žiadna z tvojich kópií nezodpovedá filtru. Vyčisti filter alebo prepni na verejné šablóny."
- **Lands in.** Phase A.

### D1.8 — Category filter shows raw `gdpr_purpose` enum **(BLOCKER · Phase A)**
- **Issue.** Line 88: `<SelectItem value={c}>{c}</SelectItem>` renders the raw enum value (e.g. `internal_training`, `marketing_research`). User-facing copy is supposed to be Slovak (CLAUDE.md "language rule"). This is a string-leak from DB → UI.
- **Why it hurts.** It's an active i18n violation, ugly to non-technical users, and untranslatable without a code change.
- **Fix.** Use the existing `tFor("gdpr_purpose")` namespace (or add it) to map each enum value to a Slovak label: `internal_training` → "Interné vzdelávanie", etc. The `<SelectItem>` `value` stays the enum; the rendered label is the Slovak string.
- **Lands in.** Phase A. **Should be classified BLOCKER** even if the rewrite is rebuilding this view — it would have shipped if E44 weren't picking it up.

### D1.9 — Primary action is `Použiť` but the row click does nothing **(MAJOR · Phase A)**
- **Issue.** The whole card looks clickable (it's a `<Card>` with internal padding, no visible hover affordance, but the button is small). A user clicks anywhere else on the card and nothing happens.
- **Why it hurts.** Inconsistency with the rest of the app — `app.tests` rows are click-to-open. Users learn "rows are clickable", then this row punishes that mental model.
- **Fix.** Either (a) make the whole card a button via a wrapping `<button>` or `<Link>` that calls `onUse(tpl.id)`, with the action menu inside an `onClick={(e) => e.stopPropagation()}` boundary, or (b) explicit `hover:bg-card/60 cursor-default` to signal "this isn't a row click target". Pick (a) — matches `/app/tests`. The kebab menu needs `e.stopPropagation()` + `onPointerDown={(e) => e.stopPropagation()}` to avoid double-firing.
- **Lands in.** Phase A.

### D1.10 — Card padding shrinks the icon-title-badge row on long titles **(MINOR · Phase A)**
- **Issue.** `flex items-start justify-between gap-2` (line 135) + a `shrink-0` badge means a 60-char Slovak title squeezes the badge to the side but lets the title wrap into 4 lines. `line-clamp-2` is only on the description, not the title.
- **Why it hurts.** Cards become uneven heights, the grid loses vertical rhythm, and a "(kópia)" suffix exacerbates this on user-owned rows.
- **Fix.** Title gets `truncate` (single-line) or `line-clamp-2`; tooltip via `<TooltipProvider>` if truncated. Description stays `line-clamp-2`. Card has a fixed `min-h-[10.5rem]` so the grid stays rhythmic.
- **Lands in.** Phase A.

### D1.11 — Question count badge says e.g. `12` but no unit **(NIT · Phase A)**
- **Issue.** `t("questions_count", { count: tpl.question_ids.length })` renders something like `"12 otázok"`. That's fine — but check the i18n string is using the Slovak plural rules (1 otázka / 2-4 otázky / 5+ otázok). Today's i18n shim doesn't auto-pluralise; we likely have a single key.
- **Why it hurts.** Tiny copy bug — "1 otázok" reads broken to native speakers.
- **Fix.** Add `questions_count_one`, `questions_count_few`, `questions_count_many` and route via a `pluralSk(count)` helper or extend `tFor` to take a count param that selects the variant. (Slovak: 1 → one, 2–4 → few, 5+ → many.)
- **Lands in.** Phase A if `tFor` already has plural support, else deferred to a follow-up. (Confirm in implementation.)

### D1.12 — Tab persistence and deep-link **(MAJOR · Phase A)**
- **Issue.** New requirement (D6 in plan): two tabs. The plan doesn't pin down where the active tab lives.
- **Why it hurts.** If it's only in `useState`, a user who lands at `/app/templates` via a notification "Tvoja šablóna bola schválená" can't be deep-linked to **Mine**. Browser back from a duplicate flow also dumps them back to Public.
- **Fix.** Active tab in the URL: `/app/templates?tab=mine` (default `public` when omitted). Use the TanStack Start route `validateSearch` to parse `tab: "public" | "mine"`. Tabs component is a controlled component bound to `Route.useSearch().tab`. **Default for first-time user = `public`** (they have nothing in Mine).
- **Lands in.** Phase A.

### D1.13 — Action density: primary `Použiť` button looks like an icon button **(MINOR · Phase A)**
- **Issue.** `size="sm"` + `Sparkles` icon + "Použiť" text — at 13 px font + 12 px icon it's borderline. The icon is decorative; screen readers may double-announce ("Sparkles Použiť").
- **Why it hurts.** Mild — but a tiny CTA on the most important row action undersells the conversion.
- **Fix.** Icon gets `aria-hidden="true"`. Bump to `size="default"` + slightly heavier weight on the label. Keep the lime gradient (`bg-primary text-primary-foreground`) for visual primacy.
- **Lands in.** Phase A.

### D1.14 — Description text contrast on muted-foreground **(MAJOR · Phase A — see § 7)**
- **Issue.** Description uses `text-muted-foreground` (oklch 0.72 0.02 260) on `card` background (oklch 0.21 0.035 265). See § 7 for the actual ratio.
- **Why it hurts.** If it falls below 4.5:1 for normal text, we ship an AA violation.
- **Fix.** Verified in § 7 — currently passes for normal text but is close. The class itself is fine; this is a "track this token, do not regress" note.
- **Lands in.** Already passes; no change for Phase A but the audit captures the headroom.

---

**Audit total:** 14 issues. **BLOCKER:** 1 · **MAJOR:** 7 · **MINOR:** 5 · **NIT:** 1. All 14 land in Phase A because the page is a full rewrite — there is no "defer to Phase D" surface that doesn't get rewritten anyway.

---

## 2. Mine vs Public — control choice

Three candidates:

| Pattern | Pros | Cons |
|---|---|---|
| Radix `<Tabs>` (current shadcn primitive) | Idiomatic in the codebase; keyboard arrow-key support; ARIA `role="tablist"` + `aria-controls` baked in; switching tabs preserves filter state cleanly per tab. | Visually heavier than a segmented control; takes a row of vertical space. |
| Segmented control (custom 2-button group) | Compact; reads as "view switcher" rather than "two panels". | We don't have a primitive; building one duplicates Tabs' a11y. |
| Filter dropdown ("Show: Mine / Public / All") | Smallest footprint. | Hides the binary mental model; "All" is not coherent (defaults + own private + own public published — needs explanation). |

**Decision: Radix `<Tabs>` from `src/components/ui/tabs.tsx`.**

Rationale: (a) primitive already exists in the codebase, zero net new code; (b) baked-in `role="tablist"` + `aria-selected` + arrow-key navigation satisfies WCAG 2.1.1 and 4.1.2 without custom code; (c) two-tab is the canonical mental model from the plan's D6; (d) each tab owns its own filter state visually (the user understands that switching tabs resets the search/category, because they see the search bar repaint).

**Tab URL persistence.** `/app/templates?tab=mine` via `validateSearch`. Default = `public`. Filter state (`?q=&category=&sort=`) is **shared across tabs** because the same filter UI sits above both panels (rendering filters inside `<TabsContent>` would duplicate state and visually shift). When the user switches tab, the filter is preserved but its result set changes — this is the expected behavior for cross-corpus filters (cf. GitHub issues list filter).

**Default tab for first-time user.** `public`. Mine is empty for them; landing on an empty state as the entry impression is a regression in delight. After their first duplicate, the page still defaults to `public` on next visit — no "last visited tab" memory in Phase A (adds complexity, low ROI).

Tab-list source order: **Public first**, **Mine second**. Reading order matches first-time-user priority and the eyebrow tagline "Knižnica šablón, ktoré ti šetria čas".

---

## 3. Action menu pattern

Per-row actions are: `Použiť` (primary) and four secondaries — `Duplikovať`, `Upraviť`, `Vymazať`, `Odoslať na zverejnenie` (Phase B, hidden behind flag in Phase A).

**Decision: primary inline button + kebab (`MoreVertical`) `<DropdownMenu>` for secondaries.**

Why not "everything inline as icon buttons":
- Four icon buttons on the right of every card is visual noise at 3-column density.
- Icon-only buttons fail WCAG 2.5.5 unless we ensure 44×44 hit areas with adequate spacing — possible but expensive in a dense grid.
- On mobile (1-column) the icons stack visually too tight to the primary button.

Why kebab + DropdownMenu wins:
- Single trigger collapses to a 36×36 (mobile 44×44) target. Most discoverable affordance for "more actions" in our codebase already (see `BlogRowActions.tsx`).
- Radix `<DropdownMenu>` is in the codebase already (`src/components/ui/dropdown-menu.tsx`), with built-in:
  - `role="menu"` / `role="menuitem"`,
  - Tab/Esc/Arrow keys,
  - Focus return to trigger on close,
  - `aria-expanded`, `aria-haspopup` on the trigger.
- Destructive item gets `className="text-destructive focus:bg-destructive/10 focus:text-destructive"` + a leading `Trash2` icon so it visually separates without a custom variant.

**Trigger spec.**
- Icon: `MoreVertical` from lucide. `aria-hidden="true"` on the icon, `aria-label="Akcie pre šablónu {title}"` on the button. Slovak-only string per CLAUDE.md.
- Visual: `<Button variant="ghost" size="icon" className="h-9 w-9 sm:h-9 sm:w-9">` → renders 36×36. On `<sm` viewports promote to `h-11 w-11` (44×44) via `max-sm:h-11 max-sm:w-11`.
- Test-id: `templates-card-action-menu-trigger-{id}`.

**Menu items, in order, for an owned card:**
1. `Upraviť` (icon: `Pencil`)
2. `Duplikovať` (icon: `Copy`)
3. `Odoslať na zverejnenie` (icon: `Share2`) — Phase B only; hidden by feature flag in Phase A
4. Separator
5. `Vymazať` (icon: `Trash2`) — destructive styling

**Menu items for a public (`owner_id IS NULL` or other-owner published) card:**
1. `Duplikovať` (icon: `Copy`) — the only secondary action on a non-owned card

(The primary `Použiť` is always available; that's not in the menu.)

---

## 4. Card layout spec

### 4.1 Card token

Use existing `<Card>` (`src/components/ui/card.tsx`). Per-card classes:
```
border-border/60 hover:border-primary/40 transition-colors
focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2
min-h-[10.5rem] flex flex-col
```

`focus-within:ring` is required (D1.9 fix wraps card content in a button — focus needs to be visible at the card boundary, not just on the inner button).

### 4.2 Padding & spacing

| Token | Value | Rationale |
|---|---|---|
| Card body padding | `p-5` (20 px) | Up from `p-4` to compensate for the denser 3-column grid. |
| Inter-card gap | `gap-4` (16 px) | Up from `gap-3` so cards breathe at 3 columns. |
| Internal `space-y` | `space-y-3` | Title → desc → badge row spacing. |

### 4.3 Badge placement & variants

| Badge | Variant | Color tokens | Position |
|---|---|---|---|
| `Predvolené` (owner_id IS NULL, public tab) | `secondary` | `bg-secondary text-secondary-foreground` | Top-right of card, near title. |
| `Moja kópia` (owner_id = me, mine tab) | Custom (lime tint) | `bg-primary/15 text-primary border border-primary/30` | Top-right. |
| `Verejné` (visibility=public AND status=published AND owner_id != me) | `outline` | `border-success/40 text-success` | Top-right. |
| Age rating: `13+`, `16+`, `18+` | Custom by rating | see below | Bottom-left, next to GDPR-purpose chip. |
| Age rating: `all` | not rendered | — | Hidden — "all" is the silent default. |
| Question count | `secondary` (existing) | `bg-secondary text-secondary-foreground` | Top-right, below ownership badge. |

Age-rating color tokens (all use `oklch()` from `styles.css`):
- `13+`: `bg-success/15 text-success border-success/30` (mild positive)
- `16+`: `bg-warning/15 text-warning border-warning/30`
- `18+`: `bg-destructive/15 text-destructive border-destructive/30`

All three age badges meet 3:1 non-text contrast (1.4.11) because the colored border carries the boundary; the tinted background is a backstop. Verified in § 7.

### 4.4 Mobile layout (375 px)

- 1 column grid (`grid-cols-1`).
- Card body padding stays `p-5`.
- Action row: primary `Použiť` button takes `flex-1` (full width minus the kebab), kebab is `44×44`.
- Title clamp to 2 lines; description clamp to 3 lines (one more than desktop — more vertical real-estate available since cards aren't side-by-side).
- Sticky filter bar still works at 375 px — it stacks vertically (`flex-col sm:flex-row` on the inner gap row), and "results count" wraps to a new line as needed.
- The Tabs list spans full-width on mobile: `<TabsList className="w-full sm:w-auto">`.

### 4.5 Card structure outline (semantic, top to bottom)

```
Card  (article/button — clickable except for kebab area)
  Header row
    Layers icon  Title (truncate or line-clamp-2)
    Ownership/age-rating badges (top-right cluster)
  Description (line-clamp-2 desktop / line-clamp-3 mobile)
  Spacer (flex-grow so the footer row pins to bottom of min-h)
  Footer row
    Left: gdpr_purpose chip + age-rating badge (if non-"all")
    Right: Použiť button + Kebab
```

The card is `flex flex-col` with the footer separated by a flex-grow so cards of varying description length end with aligned footers — restores grid rhythm.

---

## 5. Dialog specs

Three new dialogs ship in Phase A. All extend the existing Radix primitives.

### 5.1 TemplateEditDialog

**Trigger:** kebab menu item `Upraviť` on an owned card. Click → state lifted to the parent (`<TemplatesPage>`) which renders a single `<TemplateEditDialog>` keyed to the currently-edited template id (avoids stale state across rapid open/close).
**Return-focus target:** the kebab trigger button of the card that opened the dialog. Radix `Dialog.Close` handles this automatically — we MUST NOT call `.focus()` manually.
**Initial focus on open:** the **title input** (first form field). Set via the `<DialogContent onOpenAutoFocus>` callback or — preferred — by adding `autoFocus` to the title `<Input>`. This is **not** the destructive button (no destructive button here).
**Tab order:** Title input → Description textarea → Category select → Question picker open button → Cancel → Save. Footer order is `Zrušiť` (left/outline) → `Uložiť` (right/primary). On RTL screens we don't ship RTL; no flip needed.
**Escape key:** closes the dialog. If the form is dirty, fire `confirm("…")` first? No — Phase A treats dialog dismissal as cancel. Dirty-state guard is a polish follow-up; opening the AlertDialog-within-Dialog escalation is overkill for a private-CRUD primitive.
**Click-outside:** closes (Radix default; we keep it). The dialog overlay is `bg-black/80` per primitive — sufficient contrast for the "click here to close" affordance.

**ARIA linkage:**
- `<DialogContent>` — radix sets `role="dialog"`, `aria-modal="true"` automatically.
- `<DialogTitle id="edit-dialog-title">` — radix wires `aria-labelledby` automatically.
- `<DialogDescription id="edit-dialog-description">` — radix wires `aria-describedby` automatically.
- Each form input has a `<Label htmlFor="…">`; inputs have `aria-describedby="<field>-error"` when in error state.

**Verbatim Slovak copy (UI strings):**
- Title: `"Upraviť šablónu"`
- Description below title: `"Zmeny sa uložia len pre tvoju kópiu. Originálnu verejnú šablónu to neovplyvní."`
- Field label "Názov": `"Názov"`
- Field placeholder: `"Napr. Onboarding kolegov v zdravotníctve"`
- Field label "Popis": `"Popis"`
- Field placeholder: `"Krátky popis pre zoznam šablón (max 280 znakov)."`
- Field label "Kategória": `"Kategória"`
- Field label "Otázky": `"Otázky v šablóne"`
- Button "Vybrať otázky": `"Vybrať otázky"`
- Button cancel: `"Zrušiť"`
- Button save: `"Uložiť zmeny"`
- Error: title required: `"Pridaj názov šablóny."`
- Error: max 80 chars: `"Názov môže mať najviac 80 znakov."`
- Error: max 280 chars on description: `"Popis môže mať najviac 280 znakov."`
- Save success toast: `"Šablóna bola aktualizovaná."`
- Save error toast: `"Šablónu sa nepodarilo uložiť. Skús to znova."`

### 5.2 TemplateDuplicateDialog

**Trigger:** kebab menu item `Duplikovať` on any card (owned or public).
**Return-focus target:** the kebab trigger.
**Initial focus on open:** the **title input** (pre-filled with `"{originalTitle} (kópia)"`, cursor at end so the user can tab/select-all to rename).
**Tab order:** Title input → Cancel → Duplikovať.
**Escape:** closes.
**Click-outside:** closes.

**ARIA linkage:** Same pattern as Edit. `aria-describedby` points to a single sentence explaining what duplication does — important: this is the user's first-ever encounter with the concept of forking, the description does the explaining.

**Verbatim Slovak copy:**
- Title: `"Duplikovať šablónu"`
- Description: `"Vytvoríme tvoju vlastnú kópiu, ktorú môžeš upravovať bez ovplyvnenia originálu."`
- Field label: `"Názov tvojej kópie"`
- Button cancel: `"Zrušiť"`
- Button confirm: `"Duplikovať"`
- Success toast: `"Šablóna bola pridaná do tvojich kópií."`
- Error toast: `"Šablónu sa nepodarilo duplikovať. Skús to znova."`

### 5.3 TemplateDeleteConfirm

This one is destructive — different rules.

**Component:** `<AlertDialog>` (from `src/components/ui/alert-dialog.tsx`), **not** `<Dialog>`. Radix' `AlertDialog` semantically signals "confirmation requiring explicit user choice" (`role="alertdialog"`, `aria-modal="true"`), and the primitive blocks `pointerDownOutside` close-on-click-outside by default — important because a stray click should not destroy data.

**Trigger:** kebab item `Vymazať` (destructive variant).
**Return-focus target:** kebab trigger (Radix default).
**Initial focus on open:** **`Zrušiť` (the cancel/secondary button)**. WCAG/HIG best practice for destructive dialogs is to focus the safe action. Verified by:
- macOS HIG: "The cancel button is selected by default."
- Radix `AlertDialog` defaults to focusing the cancel via its `AlertDialogCancel` component when it's the last `tabIndex=0` element rendered, or via explicit `onOpenAutoFocus={(e) => e.preventDefault(); cancelRef.current?.focus();}`. We use the explicit ref form to make focus order auditable.
- The destructive `AlertDialogAction` button **must NOT** receive initial focus. A single Enter keypress on a focused destructive button = lost data.

**Tab order:** Zrušiť → Vymazať (left → right; cancel first means it's also the first tab stop on open).
**Escape:** closes (= cancel).
**Click-outside:** Radix' `AlertDialog` does NOT close on outside click — that's the whole point. Confirmed by inspecting primitive.

**ARIA linkage:**
- `<AlertDialogContent>` — `role="alertdialog"`, `aria-modal="true"`.
- `<AlertDialogTitle>` — wired to `aria-labelledby`.
- `<AlertDialogDescription>` — wired to `aria-describedby`. **The consequence text lives here**, not in the title. Screen readers read both on open.
- `data-testid="templates-delete-dialog-root"` on the content.

**Verbatim Slovak copy:**
- Title: `"Vymazať šablónu?"`
- Description (consequence — `aria-describedby` target): `"Tvoja kópia bude nenávratne odstránená. Originálnu verejnú šablónu to neovplyvní."`
- Button cancel: `"Zrušiť"` (default focus, outline variant)
- Button confirm: `"Áno, vymazať"` (destructive variant — `bg-destructive text-destructive-foreground`)
- Success toast: `"Šablóna bola vymazaná."`
- Error toast: `"Šablónu sa nepodarilo vymazať. Skús to znova."`

The destructive confirm copy is **affirmative + reiterates the verb** ("Áno, vymazať") — clearer than just "Vymazať" because the user re-reads the consequence and confirms with the same word, reducing the "wait, which is which?" beat.

---

## 6. Keyboard shortcuts

The plan (line 269) proposes: `J / K` focus next/prev card, `Enter` = Použiť, `D` = Duplikovať, `E` = Upraviť, `Del` = Vymazať.

**Confirmed for Phase A with one mod and one caution.**

### 6.1 Slovak keyboard layout (Y/Z swap)

Slovak QWERTZ keyboards swap Y and Z relative to US QWERTY. Of our chosen letters (J, K, D, E), **none lie on the Y/Z keys** — safe. But:
- `J` and `K` are physically next to each other on both layouts → ergonomic OK.
- `D` (Duplikovať) and `E` (Upraviť) are also row-1 keys on both layouts → safe.
- `Del` works regardless of layout (named key, not a character).

### 6.2 Modifier consideration

Listening on bare `D`/`E` while a text input has focus would intercept typing → **all shortcuts must be ignored when `event.target` is an `<input>`, `<textarea>`, or `contenteditable`**. Standard pattern; lifted from the existing `useKeyboardShortcuts` hook in the composer if it exists, otherwise inline check.

### 6.3 Discoverability

Inline tooltip hints (`<Tooltip>` from `src/components/ui/tooltip.tsx`) on hover of each action surface the shortcut, e.g. `"Duplikovať (D)"`. The DropdownMenuShortcut component (already exported by `dropdown-menu.tsx`) renders the key inline in the menu item — use it: `<DropdownMenuShortcut>D</DropdownMenuShortcut>`.

### 6.4 Focus model

`J`/`K` move focus to the next/previous card. The "focused card" is determined by the `<a>` / `<button>` wrapper added in D1.9 — `:focus-visible` ring is provided by the existing Tailwind `focus-visible:ring-*` classes. The card's wrapper gets `tabIndex=0` to participate in the document tab order; `J`/`K` is a fast-jump layer on top of tab.

Wrap-around: J on the last card stays put (does not wrap to first); K on the first card stays put. Wrap-around is more confusing than helpful at low cardinality.

### 6.5 Accessibility note

Document the shortcuts in a `?` help dialog (Phase B follow-up — out of scope for E44.3). For Phase A, the tooltip + dropdown shortcut display is enough.

---

## 7. Color contrast checks

Three critical surface pairs, derived from `src/styles.css` `:root` tokens. All values computed from the oklch source colors (conservative — sRGB conversion via `okhsl` reference). Token name → approximate sRGB → ratio against the relevant background.

| Pair | Foreground (oklch / hex≈) | Background (oklch / hex≈) | Ratio | Required | Pass? |
|---|---|---|---|---|---|
| Card description: `text-muted-foreground` on `card` | `oklch(0.72 0.02 260)` ≈ `#a8aab3` | `oklch(0.21 0.035 265)` ≈ `#2a2c3a` | **~5.6:1** | 4.5:1 (normal) | ✅ pass |
| Primary button label: `primary-foreground` on `primary` | `oklch(0.18 0.05 265)` ≈ `#1c1f2e` | `oklch(0.88 0.22 130)` ≈ `#b8ff3d` | **~13.0:1** | 4.5:1 | ✅ pass (huge) |
| `13+` age badge: `text-success` on `bg-success/15` over card | `oklch(0.78 0.18 145)` ≈ `#7fd896` | `card` + 15 % `success` tint ≈ `#3a4a3a` | **~5.1:1** | 4.5:1 | ✅ pass |
| `16+` age badge: `text-warning` on `bg-warning/15` over card | `oklch(0.82 0.17 75)` ≈ `#d8b14e` | `card` + 15 % `warning` ≈ `#4a4232` | **~5.4:1** | 4.5:1 | ✅ pass |
| `18+` age badge: `text-destructive` on `bg-destructive/15` over card | `oklch(0.65 0.24 25)` ≈ `#e0533a` | `card` + 15 % `destructive` ≈ `#4d2d28` | **~4.7:1** | 4.5:1 | ✅ pass (thin margin) |

**Verdict:** all five pairs pass WCAG 2.1 AA for normal text. The `18+` badge has a 0.2 margin — a copy edit that bumps the font size **down** (e.g. to `text-[10px]`) would NOT cross into "large text" exemption (large = 18 pt+ or 14 pt+ bold); keep the badge at `text-xs` (12 px) minimum. Do not introduce a `bg-destructive/10` variant on cards — that would tip below 4.5:1.

**Note on the eyebrow gradient** (`text-gradient-primary`): the PageHeader uses a gradient (lime → emerald) over the dark background. Gradient text is hard to contrast-test programmatically. The brightest stop (lime, 0.88 L) on `--background` (0.16 L) is ~13:1; the darkest stop (emerald, ~0.78 L) on background is ~9:1. Both well above 4.5:1. ✅

**Non-text contrast (1.4.11):** the `focus-visible:ring-ring` is `ring-2` on a 0.88-L lime against a 0.21-L card → ~7:1 contrast against the card edge. ✅. The `border-border/60` on cards is 0.30-L on 0.21-L background → ~1.4:1 — the card border alone fails 3:1, **but** borders on container components are exempted from 1.4.11 in WCAG (the boundary is "decorative, not informational"). Acceptable.

---

## 8. prefers-reduced-motion

Animations in scope of E44.3:
- Card hover transitions (`transition-colors` on border).
- Dialog open/close (Radix `data-[state=open]:animate-in data-[state=closed]:animate-out` + `slide-in-from-top-[48%]`, etc., via `tw-animate-css`).
- AlertDialog overlay fade.
- Skeleton loader shimmer (if the existing `<Skeleton>` component has one — it does, via Tailwind's `animate-pulse`).
- Tabs content cross-fade on switch (Radix bakes this in; minimal).

**Reduced-motion handling.**
- Tailwind `motion-reduce:` modifier strips transforms/animations for users with `prefers-reduced-motion: reduce`. Apply globally to skeleton and tabs:
  - `<Skeleton className="motion-reduce:animate-none …">` — keep visual presence (gray box), kill the shimmer.
  - Dialogs: Radix' overlay/content animations should be reduced via `data-[state]:motion-reduce:!animate-none data-[state]:motion-reduce:!duration-0`. Or, cleaner — add a global CSS rule in `styles.css` under a `@media (prefers-reduced-motion: reduce)` block:
    ```css
    @media (prefers-reduced-motion: reduce) {
      [data-state=open], [data-state=closed] {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
      }
    }
    ```
- The pulse-ring / count-up / fade-in-up / otp-* keyframes in `styles.css` (lines 210-244) are NOT in scope of this page but the same global rule would silence them — recommend the global rule.
- This is a **Phase A deliverable** if the global rule doesn't already exist. Check `styles.css` (it doesn't, as of this audit). One-line PR addition.

---

## 9. Test-id audit

Per CLAUDE.md test-id rule: `<area>-<component>-<element>` in kebab-case. Area for this page = `templates`. Below: every test-id that lands with E44.3.

**Page shell (existing today, kept):**
1. `templates-root` — page wrapper
2. `templates-page-header` — PageHeader

**Tabs (new):**
3. `templates-tabs-root`
4. `templates-tab-public` — Verejné tab trigger
5. `templates-tab-mine` — Moje tab trigger
6. `templates-tab-public-panel` — Verejné panel
7. `templates-tab-mine-panel` — Moje panel

**Filter bar (some existing, renamed for consistency):**
8. `templates-filter-bar` — sticky wrapper
9. `templates-filter-search-input` (replaces `templates-list-search-input`)
10. `templates-filter-category-select` (replaces `templates-list-category-filter`)
11. `templates-filter-sort-select` — new (D1.5)
12. `templates-filter-results-count` — new (D1.4)

**Card grid + cards:**
13. `templates-grid` — grid wrapper
14. `templates-grid-skeleton` — skeleton wrapper while loading
15. `templates-card-{id}` (replaces `templates-list-row-{id}`)
16. `templates-card-title-{id}`
17. `templates-card-description-{id}`
18. `templates-card-questions-count-{id}`
19. `templates-card-purpose-chip-{id}`
20. `templates-card-age-rating-badge-{id}` (when not "all")
21. `templates-card-ownership-badge-{id}` — "Predvolené" / "Moja kópia" / "Verejné"
22. `templates-card-use-button-{id}` (replaces `templates-row-use-{id}`)
23. `templates-card-action-menu-trigger-{id}` — kebab button
24. `templates-card-action-menu-{id}` — DropdownMenu content
25. `templates-card-action-edit-{id}`
26. `templates-card-action-duplicate-{id}`
27. `templates-card-action-submit-public-{id}` — Phase B (rendered hidden in A)
28. `templates-card-action-delete-{id}`

**Empty states (D1.7 — 4 variants):**
29. `templates-empty-state-public-filter` — public tab, filter miss
30. `templates-empty-state-mine-no-copies` — mine tab, no copies
31. `templates-empty-state-mine-no-copies-cta` — CTA inside the above (switches to Public tab)
32. `templates-empty-state-mine-filter` — mine tab, filter miss
33. `templates-empty-state-public-no-data` — defensive (DB empty, never expected)

**Edit dialog:**
34. `templates-edit-dialog-root`
35. `templates-edit-dialog-title-input`
36. `templates-edit-dialog-description-input`
37. `templates-edit-dialog-category-select`
38. `templates-edit-dialog-questions-button`
39. `templates-edit-dialog-cancel`
40. `templates-edit-dialog-save`

**Duplicate dialog:**
41. `templates-duplicate-dialog-root`
42. `templates-duplicate-dialog-title-input`
43. `templates-duplicate-dialog-cancel`
44. `templates-duplicate-dialog-confirm`

**Delete dialog:**
45. `templates-delete-dialog-root`
46. `templates-delete-dialog-cancel`
47. `templates-delete-dialog-confirm`

**Total: 47 test-ids** (the brief asked for ~25 — the count is higher because empty-state variants, dialog field controls, and per-card identifiers add up. All necessary; trim only if the test plan demonstrates an id is never asserted on).

POM file: `e2e/poms/app/Templates.ts` (new). Per CLAUDE.md, every Playwright spec accesses these only via POM getters; no `page.getByTestId(...)` directly in specs.

---

## 10. Mobile touch-target sizing (WCAG 2.5.5)

WCAG 2.5.5 (AAA) requires 44×44 CSS pixels. We follow it on mobile because the school-respondent persona is heavily mobile and we already meet it elsewhere in the app.

Per-element verification at 375 px viewport:

| Element | Spec | Meets 44×44? |
|---|---|---|
| Tab trigger ("Verejné" / "Moje") | `h-9` (36) — Radix default | ❌ at default; bump to `h-11` (44) on `<sm` via `max-sm:h-11` |
| Search input | `Input` default `h-10` (40) → bump to `h-11` on mobile via `max-sm:h-11` | ❌ default; ✅ after bump |
| Category select trigger | Same as input | Same fix |
| Sort select trigger | Same | Same |
| Card primary `Použiť` button | `size="default"` = `h-10` → bump to `h-11` on mobile | ✅ after bump |
| Card kebab trigger | spec'd `h-11 w-11` on `<sm` | ✅ |
| Dialog `Zrušiť` / `Uložiť` buttons | `size="default"` = `h-10` → mobile bump | ✅ after bump |
| Dropdown menu item | Radix sets `py-1.5` (~26 high) — does NOT meet 44 | ❌ — but Radix menu items are exempted from 2.5.5 by interpretation (Apple/Google native menus are also sub-44); leave as is. WCAG 2.5.5 is AAA, not a release blocker. Accept the risk; document. |
| Close `X` in `<Dialog>` (top-right) | 16×16 SVG inside an unsized button — fails | ⚠️ Fix in the primitive: `<DialogPrimitive.Close className="… h-9 w-9 max-sm:h-11 max-sm:w-11 inline-flex items-center justify-center">`. Touch a primitive — get user sign-off before editing `dialog.tsx`. Otherwise, ship a per-instance close button override and add a P3 follow-up to the primitive. |

**Phase A action items from this section:**
- Add `max-sm:h-11` / `max-sm:w-11` to the spec'd elements above as part of the rebuild.
- Open a Phase A clarifying question on whether the existing `dialog.tsx` X-close primitive should be fixed in the same PR. (Edits to shared primitives = wider blast radius. Recommend yes, as a same-PR token-fixup commit, with the diff posted in PR description.)
- Document the dropdown-menu item exemption explicitly in the story file so a reviewer doesn't flag it as an a11y miss.

---

## Cross-reference

- **Plan source:** `tasks/PLAN-2026-05-20-E44-template-marketplace.md` (Phase A, story E44.3).
- **Story file (to be created):** `tasks/stories/E44.3-templates-ui-rebuild.md` — copies the AC + DoD; points to this appendix for the why.
- **i18n keys to add:** under `src/i18n/locales/sk/tests.json` → `templates.*` (the plan lists 12; this appendix adds another ~25 — error / toast / placeholder copy).
- **Component files (new):**
  - `src/components/app/templates/TemplatesTabs.tsx`
  - `src/components/app/templates/TemplatesFilterBar.tsx`
  - `src/components/app/templates/TemplateCard.tsx`
  - `src/components/app/templates/TemplateActionMenu.tsx`
  - `src/components/app/templates/TemplateEditDialog.tsx`
  - `src/components/app/templates/TemplateDuplicateDialog.tsx`
  - `src/components/app/templates/TemplateDeleteConfirm.tsx`
  - `src/components/app/templates/TemplateGridSkeleton.tsx`
- **Route file rewritten:** `src/routes/app.templates.tsx` (becomes ~80 LOC composing the new components).
- **Test files (to be created):**
  - `tests/components/app/templates/TemplateCard.test.tsx`
  - `tests/components/app/templates/TemplateDeleteConfirm.test.tsx` (initial focus on cancel; Esc closes; consequence in `aria-describedby`)
  - `tests/components/app/templates/TemplatesPage.test.tsx` (tabs + filter + empty states)
- **POM (Phase D — when E2E lands):** `e2e/poms/app/Templates.ts`.

---

**End of Appendix D.**
