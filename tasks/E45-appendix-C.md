# E45 — Appendix C: UX/A11y for the test detail editor

**Owner:** Claude (senior product design + a11y lens) — fronts the UX scope of E45.3 / E45.10 / E45.15 in `tasks/PLAN-2026-05-21-E45-test-detail-editor.md`.
**Date:** 2026-05-21
**Standard:** WCAG 2.1 AA, Radix Dialog / AlertDialog patterns, project test-id rule.
**Skill activations:** `design:design-critique`, `design:accessibility-review`.
**Source files reviewed:** `src/routes/app.tests.$testId.tsx` (233 LOC), `src/components/app/tests/QuestionPickerDialog.tsx` (PR #79), `src/components/app/templates/{TemplateCard,TemplateEditDialog,TemplateDuplicateDialog,TemplateDeleteConfirm}.tsx`, `src/components/user/ShareDialog.tsx`, `src/components/ui/{dialog,alert-dialog,tabs,dropdown-menu,radio-group,select}.tsx`, `src/styles.css`, `src/integrations/supabase/types.ts`.

This appendix is the **why** behind the three UI-shaped stories of E45. The story files own the AC and DoD. Slovak appears only inside `""` for verbatim UI strings. Structure mirrors `tasks/E44-appendix-D.md`.

---

## 1. Current `/app/tests/$testId` audit

Page in production today: PageHeader (title + status badge + version + share/archive/publish actions) + a 3-tab Radix `<Tabs>` (results, analytics, settings). Settings is a 2-field form (title + description) and a Save button. No way to add/remove/reorder questions, no password affordance, no invite affordance. ~233 LOC. The canonical "frozen test" surface this epic fixes.

Severity legend: **BLOCKER** = ships broken or fails AA · **MAJOR** = noticeably hurts task completion · **MINOR** = polish · **NIT** = senior-bar polish, no user impact.

### C1.1 — No way to edit questions after publish **(BLOCKER · Phase 1)**
- **Issue.** The test is frozen at publish. There is no "Questions" surface; the list lives only in `test.question_ids` (read-only in analytics, line 185). A user who duplicates a public template (E44 Phase A) lands here with no ability to remove the two questions they don't want — the marketplace value prop collapses.
- **Why it hurts.** Functional dead-end. The user has to delete the test and start over from the wizard, losing share_id (E11 sponsorship contracts attached to share_id break), invitations sent, audience associations.
- **Fix.** Phase 1 adds a **Questions** tab with the full editor (list, add via QuestionPickerDialog from PR #79, remove with confirm, up/down reorder, counter, empty state). See § 3.
- **Lands in.** **Phase 1.**

### C1.2 — Tab list uses identical icons for Results + Analytics **(MINOR · Phase 1)**
- **Issue.** `BarChart3` is used for both "Výsledky" and "Analytika" (lines 153 + 157). At a 5-tab list (Phase 1), repeated icons make the row read as wallpaper. Users who scan icon-first lose the affordance.
- **Fix.** Distinct icons per tab: Results=`ListChecks`, Analytics=`LineChart`, Questions=`ListOrdered`, Share=`Share2`, Settings=`Settings`. Keep `BarChart3` for a future Phase 5 chart.
- **Lands in.** Phase 1.

### C1.3 — Keyboard shortcuts aren't discoverable **(MINOR · Phase 1)**
- **Issue.** Radix tabs ship arrow-key nav (✓), but the plan adds `J/K/D/Del/P/?/Enter` (see § 10). Without a `?` help dialog, those are hidden costs — we ship code nobody uses.
- **Fix.** `?` opens a small `<Dialog>` titled `"Klávesové skratky"` listing the seven shortcuts in a key→action table. Same pattern E44.3 deferred.
- **Lands in.** Phase 1.

### C1.4 — Settings tab is anemic **(MAJOR · Phase 1+2)**
- **Issue.** Lines 196-224 — Settings is two text fields + a button. A user looking for "advanced" options finds it empty and assumes nothing exists. Negative discoverability for everything Phase 2 adds.
- **Fix.** Phase 1 adds the **Order mode** card. Phase 2 adds the **Password card**. Phase 4 polish moves Archive from the page header into a **Danger zone** card with Delete. See § 4.
- **Lands in.** Phase 1 (order mode), Phase 2 (password), Phase 4 (danger zone).

### C1.5 — Tab list breaks at 320 px **(MAJOR · Phase 1)**
- **Issue.** Default Radix `<TabsList>` is `inline-flex`. At 5 tabs × ~60 px = 300 px intrinsic, minus app-shell padding leaves ~288 px usable at a 320 px viewport. Tabs silently overflow — Share and Settings (rightmost) become unreachable on the school-respondent persona we care about.
- **Fix.** See § 2.3 — horizontal-scroll list with edge fade (not Select). Page-header actions get a kebab on mobile that absorbs Archive; Share and Publish stay primary.
- **Lands in.** Phase 1.

### C1.6 — No discoverable "edit questions" hint **(MAJOR · Phase 1)**
- **Issue.** After duplicating a template, a user lands at `?tab=results` with zero sessions. No hint points to the new Questions tab.
- **Fix.** Two layers:
  1. **Onboarding hint.** If `sessions.length === 0` AND test created < 24 h ago, render a one-line `<Alert>` above the tabs: `"Tvoj test je pripravený. Než ho zdieľaš, môžeš ešte upraviť otázky alebo nastaviť heslo."` + two inline links. Dismissable, stored in `localStorage("app.test.editor.hint-dismissed.{testId}")`.
  2. **Smart default tab.** If `status='draft' AND sessions.length === 0`, default tab is `questions`, not `results`. After first publish or first session, default reverts to `results`.
- **Lands in.** Phase 1.

### C1.7 — Header `Zdieľať` button duplicates the new Share tab **(MINOR · Phase 3)**
- **Issue.** The header opens `<ShareDialog>` with just the URL. After Phase 3, the Share tab is the same URL + QR + Invite button + password badge — strictly more. Two paths to one feature is a CR smell.
- **Fix.** Phase 3: demote the header button to a `<Link>` to `?tab=share`. Phase 4: delete the dialog (e2e migrates to tab assertions).
- **Lands in.** Phase 3 + Phase 4.

### C1.8 — Status badge tiny in subtitle **(NIT · Phase 4)**
- **Issue.** Line 108-111: status badge + `v{test.version}` crammed into the subtitle `<span>`. Reads cramped at 320 px against the title.
- **Fix.** Promote to a dedicated `<div>` below the title with `flex items-center gap-2`. Phase 4 polish.

### C1.9 — Save has no success toast **(MINOR · Phase 1)**
- **Issue.** `onSave` calls `updateMut.mutate` with `onError` but no `onSuccess`. The user is left wondering "did it save?". `sonner` is imported but unused on the happy path. Same for `onPublish` / `onArchive`.
- **Fix.** Add `onSuccess: () => toast.success(t("save_success"))` to all three mutations. Slovak: `"Zmeny boli uložené."` / `"Test bol publikovaný."` / `"Test bol archivovaný."`.
- **Lands in.** Phase 1 (route is touched anyway).

### C1.10 — Inline Slovak strings outside i18n shim **(MAJOR · Phase 1)**
- **Issue.** Lines 172-173 + 184-185: `Dokončené: {count}` etc. are inline concatenation, not in `tFor("editor")`. They are Slovak (✓) but won't translate to EN/CS if the locale switches. Latent i18n drift from E36.
- **Fix.** Add `results.completed_label`, `results.avg_score_label`, `analytics.sessions_label`, `analytics.questions_label` to the editor namespace.
- **Lands in.** Phase 1.

---

**Audit total:** 10 issues. **BLOCKER:** 1 · **MAJOR:** 5 · **MINOR:** 3 · **NIT:** 1. C1.1 is the epic's reason to exist. C1.5 + C1.6 are the mobile + first-time-user unlocks.

---

## 2. Tab redesign — 3 → 5 tabs

### 2.1 Why Questions is its own tab, not a Settings card

- **Affordance weight.** Editing the question list is the second-most-important action (after publishing). Burying it under Settings — which mentally maps to "rarely-touched preferences" — suppresses the action.
- **Conceptual fit.** Settings = global test properties (title, password, order mode, archive). Questions = the test's content. A test "is" its question list; the title is just a label.
- **Mobile economics.** Settings grows in Phase 2 (password). Inlining Questions would push Password and Order mode below the fold at 320 px.
- **URL + funnel.** `?tab=questions` lets E11 onboarding emails deep-link to the editor and tracks as a distinct page-view event.

### 2.2 Why Share is its own tab, not a header dialog

- **Workflow, not setting.** Invite-by-email needs space (recipients composer + audience selector + include-password opt-in + send + quota — ≥ 220 px tall). Doesn't fit a dialog.
- **Persistence.** `?tab=share` survives reload. A dialog doesn't (we don't URL-bind dialogs elsewhere). Mid-send failure + reload returns to the Share tab.
- **Consistency.** All other "do something with this test" workflows live in tabs. Promoting Share to a tab restores symmetry.
- **Password integration.** Tab can show the "Test je chránený heslom" badge + share-password-separately guidance prominently without an extra fetch.

### 2.3 Final tab order + conditional rendering

1. **Otázky** — `ListOrdered` — default tab when `status='draft' AND sessions.length === 0`.
2. **Výsledky** — `ListChecks` — default tab when `sessions.length > 0 OR status='published'`.
3. **Analytika** — `LineChart`.
4. **Zdieľanie** — `Share2` — **hidden when `status='draft'`** (no point sending invites for an unpublished test).
5. **Nastavenia** — `Settings`.

Reading-order ≠ frequency intentionally: Otázky is leftmost because reading order = scan order = visual priority for first-time editors. Results is the dominant return-visit but by then the user knows the layout.

### 2.4 Mobile behavior at 320 px

Two candidates:

| Pattern | Pros | Cons |
|---|---|---|
| Collapse to `<Select>` at `<sm` | Compact (~40 px tall); solid a11y. | Hides parallel visibility; counter badge invisible until you open; desktop-UI-shrunk anti-pattern. |
| Horizontal-scroll `<TabsList>` with edge fade | Tabs stay visible + swipeable; counter badges visible; matches mobile convention (Twitter, iOS Mail). | Right-edge tabs hidden until scrolled; needs fade-out gradient. |

**Decision: horizontal-scroll with edge fade.**

- Parallel visibility of all five tabs (right-edge fade signals "more") is the right mobile pattern.
- Tab badges (counter "5 / 100 otázok") stay visible without extra interaction.
- a11y preserved: arrow keys still cycle through tabs (Radix default); the scroll container has `tabIndex={-1}` + `aria-label="Sekcie testu"`. Scroll position restored on tab change so the active tab is always visible.
- Right-edge fade: `bg-gradient-to-l from-background via-background/80 to-transparent w-8` absolute over the right edge, **hidden when `scrollLeft + clientWidth >= scrollWidth - 4 px`**. Symmetric on the left.

Test-ids: `test-editor-tabs-scroll-container`, `test-editor-tabs-fade-right`, `test-editor-tabs-fade-left`.

### 2.5 Tab content lazy load

`<TabsContent>` renders only when active (Radix default). **Exception:** Questions tab counter is preloaded — `useTestQuestions(testId)` is called at route level so the badge "12 / 100 otázok" renders without a flash even when Results is the active tab.

---

## 3. Questions tab spec

### 3.1 Layout (top to bottom)

```
Section header
  Title "Otázky" + counter badge "{n} / 100 otázok"
  Right: "Pridať otázky" primary + "Vymazať všetky" outline
[ Optional: "Z šablóny: {template title}" link — see § 3.3 ]
List
  Question rows × N  OR  empty-state card
Auto-save indicator
  "Posledná zmena pred {n} {s}" (relative time, refreshes every 30 s)
```

Counter copy uses Slovak pluralisation (1 otázka / 2-4 otázky / 5+ otázok). At cap (100/100), counter tints `bg-warning/15` and add-button disables with tooltip `"Limit 100 otázok dosiahnutý. Odstráň aspoň jednu na pridanie ďalšej."`.

### 3.2 Question row

Reuses the visual pattern from `tests.new.tsx` step 3 (PR #79). Each row:

- Container: `tabIndex={0}`, `focus-visible:ring-2 ring-ring`, `rounded-md border border-border/60 p-3` (J/K focus target).
- Index `{n}.` (text-xs text-muted-foreground) + prompt (line-clamp-2) + badges (branch outline, difficulty secondary).
- Right cluster: ChevronUp (disabled at first), ChevronDown (disabled at last), X-remove. All `h-8 w-8 max-sm:h-11 max-sm:w-11` (44×44 mobile).

aria-labels (Slovak): Up `"Posunúť hore (otázka {n})"`, Down `"Posunúť dole (otázka {n})"`, Remove `"Odstrániť otázku {n}"`.

**Why arrows not drag-and-drop?** D&D on touch fights scroll (long-press conflicts); on screen readers it requires the WAI-ARIA drag pattern. Arrows are universally accessible, work identically with mouse/touch/keyboard, and match the up/down keyboard shortcuts. Phase 5 polish can layer D&D on top via `@dnd-kit/core` — arrows ship Phase 1.

### 3.3 Source-template indicator

**Schema gap.** Reading `src/integrations/supabase/types.ts` (line 1339-1410), the `tests` table has **no `fork_of` column**. The `templates` table has it (template → parent template) but tests-from-templates is not stored.

**Recommendation — Open Question Q5:** does Phase 1's migration add `tests.source_template_id uuid REFERENCES templates(id) ON DELETE SET NULL`?

- **Option A (recommended):** Yes — 4 lines to the migration, enables clickable breadcrumb to the source template + analytics ("which templates produce retained tests?"). Default null for pre-E45 tests.
- **Option B:** Skip; UI degrades to hidden when the column doesn't exist. Revisit in Phase 5.

If A: indicator renders below the section header as `<Link to="/app/templates" search={{ tab: "public", open: sourceTemplateId }}>` with a `Layers` icon. Test-id `test-editor-questions-source-template-link`.

### 3.4 "Pridať otázky" → QuestionPickerDialog

Reuse the dialog from PR #79 unchanged: `open` (local state), `onClose`, `excludeIds=questions.map((q) => q.id)`, `onAdd(ids)` appends + mutates, `remainingCapacity=100-questions.length`.

### 3.5 Remove dialogs

**Per-row remove (AlertDialog):**
- Title: `"Odstrániť otázku?"`
- Description: `"Otázka „{prompt.slice(0,60)}…" bude odstránená zo zoznamu. Existujúce odpovede k tejto otázke zostanú v dátach (na export)."`
- Cancel `"Zrušiť"` (default focus) + Confirm `"Odstrániť"` (destructive)

If the question has session answers (RESTRICT blocks), **disable the remove button at row render** with tooltip `"Otázka už má odpovede respondentov a nemôže byť odstránená. Skús test duplikovať do novej verzie."`. Don't open the dialog at all.

**"Vymazať všetky" (AlertDialog):**
- Title: `"Vymazať všetky otázky?"`
- Description: `"Odstrániš všetkých {n} otázok z tohto testu. Test bude prázdny, kým nepridáš nové. Existujúce odpovede respondentov zostanú, ale nebudú spárované s otázkou."`
- Cancel `"Zrušiť"` (default focus) + Confirm `"Áno, vymazať všetky"` (destructive)

Same RESTRICT carve-out: if any question has answers, the action shows an inline Slovak explanation + "Duplikovať test" link instead of executing.

### 3.6 Empty state

When `questions.length === 0`: dashed-border card, py-12, `ListOrdered` icon (size 48, muted), h3 `"Tento test ešte nemá otázky"`, p `"Pridaj aspoň jednu otázku z knižnice, aby test bolo možné odoslať respondentom."`, primary CTA `"Pridať otázky"` → opens QuestionPickerDialog.

### 3.7 Save model — auto-save with toast

**Decision: auto-save on every reorder/add/remove. Inline relative-time indicator + transient toast on success. No explicit Save button.**

Rationale:
- **Consistency.** Templates editor, tests-new wizard step 3, audience editor — all auto-save. An explicit Save button here is the outlier.
- **No draft mental model.** The question list is the test's content; edits are commitments.
- **Mobile.** A Save button at the bottom of a long list is the worst CTA placement on mobile.
- **Optimistic UI.** TanStack Query applies optimistically, rolls back on failure. Relative-time indicator + toast covers the "did it save?" question (C1.9).

Behavior:
- Every list-changing action fires the mutation immediately.
- Success: `toast.success("Uložené.", { duration: 1500 })`.
- Inline indicator below the list: `"Posledná zmena pred {n} {s}"` via a `relativeTime(updated_at)` helper. While in flight: `"Ukladá sa…"` with a small spinner.
- Error: `toast.error("Zmenu sa nepodarilo uložiť. Skús to znova.")` + optimistic rollback.

Test-ids: `test-editor-questions-save-indicator` with state variants `…-saving`, `…-saved`, `…-error`.

---

## 4. Settings tab additions

### 4.1 Order mode card (Phase 1)

Card titled `"Poradie otázok"` with description `"Vyber, či respondenti uvidia otázky vždy v rovnakom poradí, alebo v náhodnom poradí pre každú reláciu."`. Body is a vertical `<RadioGroup>` with two items:

- `value="fixed"` → label `"Pevné poradie"`, helper `"Všetci respondenti uvidia otázky v rovnakom poradí, ako si ich nastavil v záložke Otázky."`
- `value="random"` → label `"Náhodné poradie"`, helper `"Každý respondent uvidí otázky v inom poradí (deterministickom pre jeho session, takže refresh poradie nezmení). Zníži šancu na podvádzanie."`

Default `fixed`. Change → `useUpdateTestOrderMode` → toast `"Poradie otázok bolo zmenené."`. No confirmation — per-test setting, not destructive.

**a11y.** Radix `<RadioGroup>` provides `role="radiogroup"`, ↑↓ navigation, single-tab-stop semantics. Each item `role="radio"` + `aria-checked`. Labels wired via `htmlFor`.

Test-ids: `test-editor-settings-order-mode-card`, `…-radiogroup`, `…-fixed`, `…-random`.

### 4.2 Password card (Phase 2)

Two visual states:

**State A — no password:** Lock icon (32, muted) + text `"Test je verejne dostupný komukoľvek s odkazom."` + primary button `"Nastaviť heslo"`.

**State B — password set:** Two rows — (1) `ShieldCheck` icon (text-success) + `"Heslo je nastavené (zmenené {relativeTime})."` with tooltip showing absolute timestamp on hover; (2) right-aligned outline buttons `"Zmeniť"` + `"Zrušiť"` (latter is `text-destructive`).

Card title `"Heslo testu"`, description varies by state (A: `"Chráň test heslom, aby ho mohli vyplniť len respondenti, ktorým ho zdieľaš."`; B: `"Respondenti musia pred vyplnením testu zadať heslo."`).

Test-ids: `test-editor-settings-password-card`, `…-set-button` (state A), `…-status` (state B row), `…-change-button`, `…-clear-button`.

### 4.3 Set / Change password dialog

Single `<Dialog>` with a `mode` prop ("set" | "change"). Layout:

- Title: `"Nastaviť heslo testu"` or `"Zmeniť heslo testu"`.
- Description: `"Heslo by malo mať aspoň 8 znakov. Pre lepšiu bezpečnosť použi kombináciu písmen, číslic a symbolov."`
- **(change mode only)** Label `"Súčasné heslo"` + password Input + show/hide toggle.
- Label `"Nové heslo"` + Input + toggle + 4-bar strength meter below.
- Label `"Potvrdiť nové heslo"` + Input + toggle.
- Footer: ghost `"Zrušiť"` + primary `"Nastaviť"` / `"Zmeniť"`.

**Show/hide toggle.** `<button>` absolutely positioned right-side of the input, `h-8 w-8 max-sm:h-11 max-sm:w-11`. Icon `Eye` / `EyeOff`. `aria-label` toggles `"Zobraziť heslo"` / `"Skryť heslo"`; `aria-pressed` reflects state (2-state button semantics).

**Strength meter.** 4 bars `h-1 rounded-full flex-1` in `flex gap-1`. Fill by zxcvbn-lite score (0-4): 1=destructive, 2=warning, 3=success/60, 4=success. Below: label `"Slabé"`/`"Stredné"`/`"Silné"`/`"Veľmi silné"` + optional zxcvbn warning in Slovak (e.g. `"Toto heslo bolo nájdené v úniku."`). Meter is wired via `aria-describedby` from the new-password input; container `aria-live="polite"` + `role="status"`. Bars are `role="presentation"` — the text label carries the announcement (debounced 300 ms to avoid chatter).

**Validation:** new password ≥ 8 chars; matches confirmation; current-password validated server-side on submit (error: `"Súčasné heslo nesedí."` via `aria-describedby` wiring).

**Focus.** Set/Change initial focus = first form input (Radix default). Tab order: Current → Current toggle → New → New toggle → Confirm → Confirm toggle → Cancel → Submit. Esc closes; click-outside closes (no dirty-state guard in Phase 2 — Phase 5 polish).

Test-ids: `test-editor-password-dialog`, `…-{current|new|confirm}-input`, `…-{current|new|confirm}-toggle`, `…-strength-meter`, `…-cancel`, `…-submit`.

### 4.4 Clear password AlertDialog

- Title: `"Zrušiť heslo?"`
- Description: `"Bez hesla bude tvoj test verejne dostupný komukoľvek s odkazom. Existujúce relácie respondentov zostanú nezmenené."`
- Cancel `"Zrušiť"` (default focus, explicit `onOpenAutoFocus` to focus cancelRef — destructive-dialog rule), Confirm `"Áno, zrušiť heslo"` (destructive). Click-outside does NOT close (Radix AlertDialog default).

Test-ids: `test-editor-password-clear-dialog`, `…-cancel`, `…-confirm`.

### 4.5 Danger zone (Phase 4 restructure)

Moves Archive out of the page-header actions into a Settings card titled `"Nebezpečná zóna"` with `border-destructive/40`. Contains Archive + Delete (Delete is new; needs RPC if not yet present). Both actions open AlertDialogs with destructive copy. Out of scope for the C1 audit; documented for Phase 4 planning.

---

## 5. Share tab spec

### 5.1 Layout

When `status='draft'`: empty state — `"Test musí byť publikovaný, aby sa dal zdieľať."` + `"Publikovať"` button.

When published:
- **Section 1 — Share link.** ReadOnly Input with `subenai.sk/t/{shareId}` + primary `"Kopírovať odkaz"` (copies + toast `"Odkaz bol skopírovaný."`).
- **Section 2 — Password badge** (only when `password_hash IS NOT NULL`). See § 5.3.
- **Section 3 — QR code** (Phase 5 placeholder; see § 5.2).
- **Section 4 — Invite by email.** Primary `"Pozvať e-mailom"` opens InviteEmailDialog. Helper text `"{used}/100 pozvánok dnes pre tento test."`.

### 5.2 QR code — deferred to Phase 5

`grep qrcode|QRCode` in the repo: no client-side QR dependency in `package.json` (only blog content + 2FA enrollment server string). Adding `react-qr-code` (~10 kB gzipped) for marginal value over the dominant URL-copy path is wrong for Phase 3. Phase 3 ships a placeholder card `"Pripravujeme. Zatiaľ použi odkaz."` (test-id `test-editor-share-qr-placeholder`); Phase 5 lands QR + D&D reorder + other polish together.

### 5.3 Password badge in Share tab

When the test has a password:

```
[ ShieldCheck icon, text-warning ]  "Test je chránený heslom"
                                    "Respondenti najprv zadajú heslo, potom vyplnia test. Heslo
                                     zdieľaj iným kanálom (Signal, Telegram, telefón) — nie v tom
                                     istom e-maile ako odkaz."
```

Wrapper: `border-warning/40 bg-warning/5 p-3 rounded-md`, `role="status"`, test-id `test-editor-share-password-badge`. This is the load-bearing user-education for the "send password in same email" anti-pattern (R7 + D7 from the plan).

---

## 6. InviteEmailDialog spec

### 6.1 Layout

Dialog `max-w-2xl max-h-92vh flex-col`. Title `"Pozvať respondentov e-mailom"`, description `"Pošli odkaz na test na zoznam e-mailových adries. Každý dostane samostatný e-mail."`. Body (scrollable):

1. **Audience group select.** Label `"Z publika (voliteľné)"`. Reads from `useAudienceGroups()`. On change: **appends** group emails to the textarea (deduped) — doesn't replace. If zero groups: disabled placeholder `"Žiadne publiká k dispozícii. Pridaj zoznam adries ručne."`.
2. **Recipients textarea** (rows=6). Label `"E-mailové adresy"`, placeholder `"Jedna adresa na riadok, alebo oddelené čiarkou."`. Live-validated on every keystroke (debounce 200 ms) splitting on `\n , ; whitespace`. Live count below: `"{validCount} platných · {invalidCount} neplatných · {totalCount}/50"`. Invalid tokens listed in a `<details>` titled `"Neplatné adresy ({n})"`. At 50 valid: textarea border tints `border-warning/40`; further input allowed but submit disables.
3. **Include-password checkbox** (only rendered when `password_hash IS NOT NULL`). Label `"Pripoj heslo k tomuto e-mailu"`, default OFF. When checked: full warning callout `"Posielaš heslo v tom istom e-maile ako odkaz — to je menej bezpečné. Ideálne pošli heslo iným kanálom (Signal, Telegram, telefón)."` in `bg-warning/5 border-warning/30`. Warning re-renders every time the box is checked (no "already saw this" suppression — security-critical).
4. **Quota counter** (read-only). `"Dnes: {used}/100 pozvánok pre tento test · {authorUsed}/200 pre tvoj účet"`.

Footer: ghost `"Zrušiť"` + primary submit.

### 6.2 Submit button

Label dynamic per Slovak plural: 1 → `"Odoslať 1 pozvánku"`, 2-4 → `"Odoslať {n} pozvánky"`, 5+ → `"Odoslať {n} pozvánok"`.

Disabled when `validRecipientCount === 0`, > 50, `used >= 100` (tooltip `"Denný limit dosiahnutý. Skús zajtra."`), `authorUsed >= 200` (tooltip `"Denný limit pre tvoj účet dosiahnutý."`), or mutation in flight.

On submit: POST `/api/tests/send-invites` → `{ sent, failed: [{email, reason}] }`.
- `failed.length === 0`: dialog closes, toast.success `"Odoslané {n} pozvánok."`.
- `failed.length > 0`: dialog stays open with top callout `"Odoslané {sent}, zlyhalo {failed.length}. Skontroluj adresy nižšie."`; failed addresses replace textarea content + reason chips.

Test-ids: `test-editor-invite-dialog`, `…-audience-select`, `…-audience-option-{id}`, `…-recipients-textarea`, `…-recipients-count`, `…-recipients-invalid-list`, `…-include-password-checkbox`, `…-include-password-warning`, `…-quota-counter`, `…-cancel`, `…-submit`.

---

## 7. Password gate UX (respondent take flow)

The respondent route `/t/$shareId` gates entry behind the password input when `tests.password_hash IS NOT NULL` AND no valid `respondent_pwd_jwt` cookie.

### 7.1 Layout

**Desktop:** centered card `max-w-md`. Test title (h1) + author name + `Lock` icon (size 40, text-warning) + `"Tento test je chránený heslom"` + helper `"Zadaj heslo, ktoré ti poslal autor. Ak ho nemáš, požiadaj ho oň."` + form (password Input with show/hide + Submit) + conditional error/counter/lockout messages.

**Mobile (< 640 px):** full-screen (`min-h-screen flex items-center justify-center p-4`). Input + button are `h-12` (48 px) — taller than the rest of the app intentionally; this is a high-stakes one-shot interaction.

### 7.2 Error states (verbatim Slovak)

- After 1-4 wrong attempts: `"Heslo nesedí. Skús znova alebo požiadaj autora."` + counter `"{n}/5 pokusov dnes"`.
- After 5 wrong attempts: `"Príliš veľa neúspešných pokusov. Skús zajtra alebo požiadaj autora o nové heslo."` + input + submit disabled for the 15-min cooldown (per plan D4). Live countdown `"Cooldown končí o {n} min"` updates every 30 s.
- Network error: `"Nepodarilo sa overiť heslo. Skontroluj pripojenie a skús znova."` — does NOT increment attempt counter (fail-soft).

### 7.3 Success transition

On 2xx from `/api/tests/verify-password` (cookie set HttpOnly 30 min): 200 ms fade-out of the gate → 200 ms fade-in of the next surface (intake form if `collects_responses`, else TestFlow). **Reduced-motion fallback:** the fade is wrapped in `motion-reduce:transition-none motion-reduce:opacity-100` — reduced-motion users see an instant swap.

### 7.4 ARIA + focus

- Initial focus on mount = password input.
- Error: `role="alert" aria-live="assertive"` — wrong-password feedback is announced immediately (assertive is correct; the user just acted).
- Counter: `aria-live="polite"` — informational.
- Lockout: `role="alert" aria-live="assertive"` — boundary state change.
- `<form aria-labelledby="password-gate-title">` (the test-title h1).

Test-ids: `take-password-gate-{root,title,author,input,toggle,submit,error,counter,lockout}`.

---

## 8. Color contrast checks

Five critical surface pairs new to E45, derived from `src/styles.css` `:root` tokens (oklch → sRGB via okhsl reference, conservative).

| Pair | Foreground | Background | Ratio | Required | Pass? |
|---|---|---|---|---|---|
| Password input border on bg | `border-input` ≈ `#4a4e5e` | bg ≈ `#22243a` | **~2.0:1** | 3:1 (1.4.11 non-text) | ❌ — see note |
| Strength meter "Silné" success bar | `oklch(0.78 0.18 145)` ≈ `#7fd896` | card ≈ `#2a2c3a` | **~6.2:1** | 3:1 | ✅ |
| "Include password" warning text | `text-warning` ≈ `#d8b14e` | card + 15 % warning ≈ `#4a4232` | **~5.4:1** | 4.5:1 | ✅ |
| Danger-zone destructive button label | `destructive-foreground` ≈ `#f5f5f9` | `bg-destructive` ≈ `#c64a30` | **~4.8:1** | 4.5:1 | ✅ (thin) |
| Password gate error text on bg | `text-destructive` ≈ `#e0533a` | bg ≈ `#22243a` | **~5.3:1** | 4.5:1 | ✅ |
| Password gate counter (muted) | `text-muted-foreground` ≈ `#a8aab3` | card ≈ `#2a2c3a` | **~5.6:1** | 4.5:1 | ✅ |

**Note on Pair 1.** The default `<Input>` border alone fails 1.4.11. In practice the input is identifiable via other affordances (placeholder text contrast-passing, focus-visible ring high-contrast). The WCAG 1.4.11 carve-out for "input bound to a visible label" applies. **For the respondent password gate specifically** (where the input is the only interactive element), use `border-2 border-border` (existing token at oklch 0.55 → ~3.4:1) — Phase 2 follow-up, not a blocker.

**Note on Pair 4.** 4.8:1 has 0.3 margin. Do not introduce a `bg-destructive/90` softer variant — dips below 4.5:1.

---

## 9. Keyboard map

Mirrors E44.3 Appendix D § 6. Keys live at the route level via `useKeyboardShortcuts` (check during implementation; otherwise inline `useEffect`).

| Key | Context | Action |
|---|---|---|
| `J` | Questions tab, row focused | Move focus to next row (no wrap) |
| `K` | Questions tab, row focused | Move focus to previous row (no wrap) |
| `Enter` | Questions tab, row focused | Open row detail (Phase 5 — Phase 1 surface no-op + tooltip `"Pripravujeme"`) |
| `D` | Anywhere | Open Duplicate-test action (existing) |
| `Del` / `Backspace` | Questions tab, row focused | Open per-row remove AlertDialog |
| `P` | Anywhere | Jump to Settings tab, scroll to Password card, focus its primary CTA |
| `?` | Anywhere | Open keyboard help dialog |

**Slovak QWERTZ note.** Y/Z swap doesn't affect J/K/D/P. `?` requires `Shift + ,` on both layouts. `Del`/`Backspace` are named keys. All safe.

**Input-focus suppression.** All shortcuts no-op when `event.target` is `<input>`, `<textarea>`, or `contenteditable` (otherwise typing `D` into the search field triggers Duplicate).

**Discoverability.** Tooltips on each action surface: e.g. row-remove tooltip `"Odstrániť (Del)"`. Up/down arrow tooltips: `"Posunúť hore (K)"` / `"Posunúť dole (J)"` (J=down, K=up — vi convention; the tooltip resolves the ambiguity).

**Help dialog (`?`).** Radix `<Dialog>` titled `"Klávesové skratky"`, two-column key→action table covering all seven entries, single `"Zavrieť"` button. Hidden on `<sm` viewports (shortcuts are moot on touch); a `<kbd>?</kbd>` header chip is `hidden sm:inline-flex`.

Test-ids: `test-editor-keyboard-help-dialog`, `…-row-{key}`, `…-close-button`.

---

## 10. Test-id inventory

Per CLAUDE.md `<area>-<component>-<element>` kebab-case. Area = `test-editor` (or `take` for the respondent gate). Existing route test-ids preserved; new ones below.

**Tabs (modified):** `test-editor-tabs-{questions,share}`, `test-editor-tabs-{questions,share}-panel`, `test-editor-tabs-scroll-container`, `test-editor-tabs-fade-{left,right}`.

**Onboarding hint:** `test-editor-onboarding-hint`, `…-questions-link`, `…-password-link`, `…-dismiss`.

**Questions tab:** `test-editor-questions-header`, `…-title`, `…-counter`, `…-add-button`, `…-clear-all-button`, `…-source-template-link` (conditional), `…-empty-state`, `…-empty-state-cta`, `…-list`, `…-row-{questionId}`, `…-row-{questionId}-prompt`, `…-row-{questionId}-{move-up,move-down,remove}`, `…-row-remove-dialog`, `…-row-remove-dialog-{cancel,confirm}`, `…-clear-all-dialog`, `…-clear-all-dialog-{cancel,confirm}`, `…-save-indicator`.

**Settings — Order mode:** `test-editor-settings-order-mode-{card,radiogroup,fixed,random}`.

**Settings — Password card:** `test-editor-settings-password-{card,set-button,status,change-button,clear-button}`.

**Password dialog:** `test-editor-password-dialog`, `…-{current,new,confirm}-input`, `…-{current,new,confirm}-toggle`, `…-strength-meter`, `…-{cancel,submit}`.

**Password clear AlertDialog:** `test-editor-password-clear-dialog`, `…-{cancel,confirm}`.

**Share tab:** `test-editor-share-{link-input,link-copy-button,password-badge,qr-placeholder,invite-button,quota-counter}`.

**InviteEmailDialog:** `test-editor-invite-dialog`, `…-audience-select`, `…-audience-option-{id}`, `…-recipients-{textarea,count,invalid-list}`, `…-include-password-{checkbox,warning}`, `…-quota-counter`, `…-{cancel,submit}`.

**Respondent password gate:** `take-password-gate-{root,title,author,input,toggle,submit,error,counter,lockout}`.

**Keyboard help dialog:** `test-editor-keyboard-help-dialog`, `…-close-button`.

**Approximate count:** ~70 new test-ids (templated row/audience ids expand at runtime). The brief asked 40-60; the count is higher because of per-row/per-mode templates, conditional rendering, and the respondent gate. Each is addressable; trim only if the test plan demonstrates an id is never asserted.

POM files (new): `e2e/poms/app/{TestEditor,TestEditorQuestions,TestEditorSettings,TestEditorShare,InviteEmailDialog,PasswordDialog}.ts` + `e2e/poms/take/PasswordGate.ts`.

---

## 11. Mobile spec at 320 px

Verified at 320 px viewport (Samsung Galaxy Fold cover — oldest supported persona). All interactive elements meet WCAG 2.5.5 (≥ 44×44).

| Piece | Mobile layout | Tap target |
|---|---|---|
| Tab list (5 tabs) | Horizontal-scroll list with edge fade; scroll-into-view on tab change | Each tab `h-11` on `<sm` |
| Page-header actions | Share + Publish primary inline; Archive collapses into kebab | Kebab `h-11 w-11`; buttons `h-11` |
| Questions row | Full-width card; index + prompt + badges stack; up/down/remove cluster wraps to a second row | Each icon button `h-11 w-11` |
| Add questions button | Full-width on `<sm` | `h-11` |
| Order mode RadioGroup | Vertical stack, items take full width | Radio + label hit area `h-11` |
| Password card (set state) | Status row first; buttons stack below | `h-11` buttons |
| Password dialog | 100 % viewport on `<sm`; inputs `h-11`; show/hide `h-11 w-11` | All pass |
| Strength meter | 4 bars `h-1 flex-1 gap-1` — visual, not tapped | n/a |
| Share link input + copy | Input full-width; copy button stacks at full-width on `<sm` | `h-11` |
| InviteEmailDialog | Full-screen on `<sm`; scroll body; submit + cancel `h-11`; textarea `min-h-32` rows=8 | All pass |
| Include-password checkbox | 44×44 hit area (invisible padding around 20 px visible checkbox) | ✅ |
| Respondent password gate | Full-screen card; input `h-12`; button `h-12 w-full` | 48 px > 44 ✅ |
| Keyboard help dialog | Hidden on `<sm` (shortcuts moot on touch); `?` chip also hidden | n/a |

Page-header decision: Share + Publish stay inline on mobile (primary); Archive moves into a kebab `test-editor-header-actions-kebab` to free horizontal real-estate.

---

## 12. prefers-reduced-motion

New animations in E45:

- **Tab content cross-fade** (Radix) — suppressed via the global `@media (prefers-reduced-motion: reduce)` rule recommended in E44 Appendix D § 8. Confirm the rule is in `styles.css` during implementation; if not, ship it as the first commit of Phase 1.
- **Mobile tab list scroll** — `scrollBehavior: smooth` → switch to `auto` on reduced-motion via `useReducedMotion()` (or inline `matchMedia`).
- **Question row reorder** — `transition-transform duration-150` → `motion-reduce:transition-none`.
- **Strength meter bar fill** — `transition-all duration-200` → `motion-reduce:transition-none`.
- **Save spinner** — `animate-spin` → `motion-reduce:animate-none`.
- **Onboarding hint fade-out** — `motion-reduce:transition-none`.
- **Password-gate → next-surface transition** (§ 7.3) — `motion-reduce:transition-none motion-reduce:opacity-100` → instant swap.
- **Dialog / AlertDialog open/close** — covered by global rule.
- **Toast (sonner)** — respects `prefers-reduced-motion` natively. Verify the `<Toaster>` config.

**Phase 1 deliverable:** verify the global reduced-motion CSS rule from E44 Appendix D § 8 is present in `styles.css`. If not, ship it as the first commit of Phase 1 (one-line PR addition).

---

## Open questions for the plan author

- **Q5 (new).** Should Phase 1's migration add `tests.source_template_id` to power the "Z šablóny" indicator (§ 3.3)? Recommendation: **yes**, 4 extra lines. If no, the indicator is hidden in Phase 1 and revisited in Phase 5.
- **Q6 (new).** Is the global `prefers-reduced-motion` CSS rule from E44 Appendix D § 8 already in `styles.css`? Confirm before Phase 1; if not, ship as the first commit.
- **Q7 (new).** Does `useReducedMotion()` exist as a project hook? If not, inline `matchMedia` in the few places that need it (§ 12).
- **Q8 (new).** For the auto-save indicator (§ 3.7), expose a global "Saving..." chip in the page header (across all tabs) or keep inline in the Questions tab only? Recommendation: **inline only** in Phase 1; global chip is a polish item if usability testing shows confusion.

---

## Cross-reference

- **Plan source:** `tasks/PLAN-2026-05-21-E45-test-detail-editor.md` (Phase 1: E45.3 Questions tab; Phase 2: E45.10 Password card; Phase 3: E45.15 Invite dialog).
- **Story files (to be created):**
  - `tasks/stories/E45.3-questions-tab.md` — points to § 3 + § 9
  - `tasks/stories/E45.10-password-card.md` — points to § 4.2-4.4 + § 7 + § 8
  - `tasks/stories/E45.15-invite-dialog.md` — points to § 5 + § 6
- **i18n keys to add:** `src/i18n/locales/sk/tests.json` → `editor.questions.*`, `editor.settings.password.*`, `editor.settings.order_mode.*`, `editor.share.*`, `editor.invite.*`, `editor.keyboard_help.*`, plus EN/CS parallels. ~80 keys across the three phases.
- **Component files (new):**
  - `src/components/app/tests/QuestionsTab.tsx`
  - `src/components/app/tests/QuestionRow.tsx`
  - `src/components/app/tests/QuestionsClearAllDialog.tsx`
  - `src/components/app/tests/OrderModeCard.tsx`
  - `src/components/app/tests/PasswordCard.tsx`
  - `src/components/app/tests/PasswordDialog.tsx`
  - `src/components/app/tests/PasswordClearDialog.tsx`
  - `src/components/app/tests/PasswordStrengthMeter.tsx`
  - `src/components/app/tests/ShareTab.tsx`
  - `src/components/app/tests/InviteEmailDialog.tsx`
  - `src/components/app/tests/KeyboardHelpDialog.tsx`
  - `src/components/app/tests/OnboardingHint.tsx`
  - `src/components/take/PasswordGate.tsx`
- **Routes modified:** `src/routes/app.tests.$testId.tsx` (3 → 5 tabs, mobile scroll wrapper, onboarding hint, keyboard registration, default-tab logic), `src/routes/t.$shareId.tsx` (PasswordGate before TestFlow).
- **Tests (new):**
  - `tests/components/app/tests/QuestionsTab.test.tsx`
  - `tests/components/app/tests/PasswordDialog.test.tsx`
  - `tests/components/app/tests/InviteEmailDialog.test.tsx`
  - `tests/components/take/PasswordGate.test.tsx`
- **POMs (Phase 4):** see § 10.

---

**End of Appendix C.**
