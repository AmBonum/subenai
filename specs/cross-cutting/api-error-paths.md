# API error paths — full test lifecycle (composer → respondent → author results)

Source: 2026-06-12 coverage audit. The lifecycle happy paths are covered
(quiz/composer, composer/round-trip, respondent/take-test,
edu/schools-howitworks-contract, app/test-sessions-*). What was missing is
systematic **API failure simulation at the UI level**: every fetch/RPC the
flow makes, failed via route interception, with the user-visible error
contract asserted verbatim and the retry path proven.

Environment: ALL test cases run against vite :8080. Every `/api/*` call is
intercepted with `page.route` (interception happens before the network, so
no wrangler needed); Supabase REST/RPC goes through the standard
`mockSupabase` envelope (per-RPC `errors` config). Re-registering a route
supersedes the previous one (last wins) — that is the retry mechanism:
stub failure → act → assert error → stub success → retry → assert recovery.

Locators: POM-only (CLAUDE.md). New getters needed (add to the POM in the
same change): `ComposerPage.errorAlert` exists; `ResultsGatePage` needs
`errorState` (`vysledky-error-state`), `notFoundState`
(`vysledky-not-found-state`), `gateError` (`vysledky-gate-error-message`),
`deleteError` (`resp-table-delete-error`); `TakeTestPage` needs
`passwordGateError` (`respondent-password-gate-error`), `submitError`
(`respondent-flow-submit-error`); results POM needs `persistError`
(`quiz-results-persist-error`), `persistRetry` (`quiz-results-persist-retry`
— verify exact testid in ResultsView.tsx before use).

UI error contracts below were extracted from source on 2026-06-12 — assert
them VERBATIM. File refs: test.builder.index.lazy.tsx (composer submit),
RespondentPasswordGate.tsx, TakeTestFlow.tsx, RespondentIntakeForm.tsx,
ResultsView.tsx (PersistFailureAlert), AuthorPasswordGate.tsx,
test.builder.$id.results.lazy.tsx, RespondentsTable.tsx.

---

## A. Composer (test creation)

**ERR-01 — submit 500 shows the error alert, preserves the draft, retry succeeds.**
Open /test/builder, select 11+ questions (DB-share path; use pagination-aware
POM helper). Stub `POST **/api/test-sets` → 500 `{"error":"submit_failed"}`.
Click „Zdieľať s tímom“. Assert `composer-error-alert` (role=alert) visible,
containing „Niečo sa pokazilo:“ and „submit_failed“ and „Skús to prosím
znova.“. Assert the selection summary still shows the same count and
`composer-submit-button` is re-enabled. Re-stub → 201
`{"id":"e2e-err-01-set"}`. Click submit again → URL becomes
`/test/builder/e2e-err-01-set`.

**ERR-02 — submit network failure maps to network_error.**
Same setup; stub the route with `route.abort("connectionrefused")`. Submit →
`composer-error-alert` contains „network_error“. Draft preserved.

**ERR-03 — edu password too short blocks submit with the exact summary copy.**
Select 5 questions, enable the edu toggle (collect responses). With an empty
password assert `composer-selection-summary` shows „Heslo musí mať aspoň 8
znakov“ and `composer-submit-button` is disabled. Type a 7-char password —
still blocked, same copy. Type an 8-char password — message replaced by the
normal summary and submit enabled.

## B. Respondent (filling the test, public /t/<shareId>)

Reuse the take-test mock setup (mockSupabase + resolve RPC) from
e2e/specs/respondent/take-test.spec.ts.

**ERR-04 — wrong password 401: verbatim error, input cleared, correct password recovers.**
Stub `GET **/api/tests/check-password*` → `{"protected":true}` and
`POST **/api/tests/verify-password` → 401 `{"error":"invalid_password"}`.
Open /t/<shareId>, type a password, submit. Assert
`respondent-password-gate-error` shows „Nesprávne heslo. Skús to znova.“ and
the input value is empty. Re-stub verify → 200 `{"ok":true}` (mirror the
real success body — check RespondentPasswordGate.tsx). Type again, submit →
gate gone, intake/quiz renders.

**ERR-05 — rate-limit variants disable the gate.**
(a) verify → 429 `{"error":"rate_limited","retry_after_minutes":3}` →
error contains „Príliš veľa pokusov. Skús to znova o 3 minút.“ (verify exact
plural form from respondent-flow.json before asserting). (b) verify → 429
`{"error":"share_locked"}` → „Tento test je dnes uzamknutý pre príliš veľa
nesprávnych pokusov. Skús to opäť zajtra.“ AND the password input + submit
button are disabled (not retryable).

**ERR-06 — verify 500 is retryable.**
verify → 500 → error „Niečo sa pokazilo. Skontroluj pripojenie a skús to
znova.“; input NOT disabled; re-stub 200 → recovery to quiz.

**ERR-07 — check-password preflight 500 fails OPEN.**
Stub `GET **/api/tests/check-password*` → 500. Open /t/<shareId> → NO
password gate; the test intake/runner renders directly (documented
fail-open in t.$shareId.tsx).

**ERR-08 — answer submit RPC 500 mid-quiz: inline error, state kept, retry continues.**
Start the quiz (happy mocks). Before answering question 1, reconfigure the
supabase mock so `submit_respondent_answer` errors 500 (use the envelope's
per-RPC `errors` knob; if it can't be reconfigured mid-test, register a
superseding `page.route` on the RPC URL). Answer → assert
`respondent-flow-submit-error` (role=alert) shows „Nepodarilo sa odoslať
odpoveď. Skús to znova.“; the selected option and question index are
unchanged. Restore success → click next/submit again → question 2 renders.

**ERR-09 — finalize RPC 500: error, then retry reaches the thank-you screen.**
Answer all questions; fail `finalize_respondent_session` → same submit-error
alert on the last step. Restore success → retry → thank-you state renders.

## C. Edu respondent (intake + persist at /test/builder/<setId>)

The edu runner loads the set via the mocked `test_sets` table; intake posts
`/api/begin-edu-attempt`, finish posts `/api/finish-edu-attempt` — both pure
route stubs.

**ERR-10 — intake error-code mapping (4 variants), values preserved, retry succeeds.**
Fill name/e-mail/consent, stub `POST **/api/begin-edu-attempt`:
(a) 500 → `intake-form-error-message` shows „Formulár sa nepodarilo odoslať.
Skús prosím znova.“; (b) 409 `{"error":"already_attempted"}` → „Tento test si
už pod týmto e-mailom absolvoval/a. Pre opakovanie kontaktuj autora.“;
(c) 429 `{"error":"rate_limited"}` → „Príliš veľa pokusov v krátkom čase.
Skús znova o pár minút.“; (d) `route.abort()` → „Pripojenie sa nepodarilo.
Skontroluj sieť a skús znova.“. After each, the name/e-mail inputs keep
their values and `intake-form-submit-button` is enabled. Finally re-stub the
real success body (mirror begin-edu-attempt's 200 response — read
functions/api/begin-edu-attempt.ts) → submit → quiz starts.

**ERR-11 — finish persist failure shows the persist alert; retry delivers.**
Complete the edu quiz with `POST **/api/finish-edu-attempt` stubbed → 500.
On results assert `quiz-results-persist-error` with „Tvoj výsledok sa
nepodarilo doručiť autorovi testu. Skontroluj pripojenie na internet a skús
to znova — inak sa tvoj pokus stratí.“ and the local score still rendered.
Click the retry button (still failing) → alert persists. Re-stub 200 →
retry → alert disappears.

## D. Author results (password gate + dashboard at /test/builder/<setId>/results)

The route POSTs `/api/results-data` on mount (401 → needs_auth phase), the
gate POSTs `/api/verify-author-password`. All stubable; craft a results-data
success body mirroring functions/api/results-data.ts (read it first).

**ERR-12 — verify-author-password 500: verbatim error, password preserved, retry enters dashboard.**
Stub initial results-data → 401 (gate shows). Stub verify → 500. Submit a
password → `vysledky-gate-error-message` shows „Chyba pri overovaní hesla.
Skús to prosím znova.“ and the password input retains its value. Re-stub
verify → 200 + results-data → 200 (2 respondents) → retry → dashboard
renders with the seeded aggregate count.

**ERR-13 — results-data 500 renders the error state.**
Stub results-data → 500 on first load. Assert `vysledky-error-state` shows
„Niečo sa pokazilo“ and „Skús obnoviť stránku.“.

**ERR-14 — delete failure surfaces the new inline alert and keeps the row; retry removes it.**
Enter the dashboard (stubs as ERR-12 happy). Stub
`POST **/api/delete-edu-respondent` → 500. Delete a respondent through the
ConfirmDialog → assert `resp-table-delete-error` shows „Respondenta sa
nepodarilo vymazať. Skús to prosím znova.“ and the row is still present.
Re-stub → 200 `{"ok":true}` AND update the results-data stub to return the
list without that respondent → delete again → row gone, error alert gone.

**ERR-15 — /app sessions CSV export failure shows the toast.**
Use the educator app-shell fixture (setupAppShell) + mocked sessions list.
Stub `GET **/api/tests/export-sessions*` → 500. Click
`test-sessions-list-export-csv-button` → assert a sonner toast with „Export
zlyhal. Skús to znova.“ (text locator inside a POM getter — the toast has no
testid; acceptable as the documented last-resort for verbatim Slovak copy).
Button remains enabled.

---

Definition of done: spec at `e2e/specs/cross-cutting/api-error-paths.spec.ts`
(split into describe blocks per stage), all POM getters added, every TC
green against vite :8080 (`--project=e2e-chromium`), lint 0/0, no
`page.locator`/`getByTestId` calls in the spec body (POM-only), Slovak
strings asserted verbatim.
