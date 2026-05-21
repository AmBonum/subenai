# E48 Support Ticketing — Independent Security Audit (2026-05-21)

Senior second-pair-of-eyes review. Read-only. Findings ordered by severity.

---

## 1. [HIGH] Authenticated-path `user_id` matches submitter, but JWT `aud`/role spoofing relies on Supabase JWKS verification only

**File:** `functions/api/support-ticket-create.ts:139-205`
**Vuln:** When an Authorization header is present, the handler skips Turnstile, skips per-IP rate-limit, and applies a *per-user* limit keyed on `jwt.slice(0, 32)` (the first 32 chars of the base64url-encoded header — same for every JWT minted by Supabase for the same algorithm/kid). This is **not** a per-user bucket; it is effectively *per-algorithm*. All authenticated submitters share one 10/24h quota.
**Attack scenario:**
1. Attacker A (authenticated user) burns 10 submissions in a minute.
2. Attacker B (different authenticated user, same Supabase project) cannot submit for 24 h.
**Fix:** Decode the JWT (already done elsewhere in the codebase via `decodeJwtPayload`), key the bucket on `sub`. Cheap, deterministic, no extra round-trip:
```ts
const sub = decodeJwtPayload(jwt)?.sub ?? jwt.slice(0,32);
ipRateLimit.consume(`support:user:${sub}`, 10, 86400);
```
**Test in PR #C:** yes — two distinct JWT subs, 11 calls each; both should succeed for 10 and fail on 11.

---

## 2. [HIGH] `support-attachment-upload.ts` — TOCTOU on `MAX_ATTACHMENTS_PER_TICKET`

**File:** `functions/api/support-attachment-upload.ts:169-179, 222-232`
**Vuln:** The count is fetched, then later an INSERT happens. There is no DB-level constraint that caps attachments at 3 per `ticket_id`. Three concurrent uploads (browser sends them in parallel — the comment at line 25 actively encourages this) each see `count = 0`, all pass the gate, all insert. Bypass to 4-6+ files trivially.
**Attack scenario:**
1. Open `/kontakt` thread page, attach a file, intercept the multipart POST.
2. Replay the POST 10× in parallel (curl `&`).
3. All 10 inserts succeed → 10 files stored, 50 MB×N quota burn.
**Fix:**
- Add a partial unique constraint or a `BEFORE INSERT` trigger on `support_ticket_attachments` that counts siblings inside the same transaction and raises if `>= 3`. SQL only — no app change.
- Alternatively wrap count+insert in a SECURITY DEFINER RPC that does `SELECT ... FOR UPDATE` on the parent ticket row to serialise concurrent inserts.
**Test in PR #C:** yes — Promise.all of 5 uploads, assert exactly 3 rows persisted, exactly 2 errors returned.

---

## 3. [MEDIUM] `view_token` comparison is not constant-time

**File:** `functions/api/support-attachment-upload.ts:144-149`
**Vuln:** `tokenHash === ticketRow.view_token_hash` is a normal string equals. Both sides are 64-char lowercase hex. In JS engines, `===` short-circuits on first mismatched character.
**Practical risk:** the attacker would need to (a) know a ticket_id, (b) observe per-char latency through the entire CF Pages stack + Supabase round-trip + sanitisation pipeline. The signal is buried under enormous network noise. Theoretically extractable; in practice unlikely.
**Fix:** Cheap defence — compare via constant-time byte-by-byte XOR. Better: don't expose the hash to the function. The DB already has the comparison logic in `get_ticket_thread_for_view_token` RPC; route the upload's authorisation check through an RPC that takes the raw token and returns a boolean. Then no hash ever leaves Postgres and the comparison happens inside the DB where `=` is fine.
**Recommended pattern:**
```sql
CREATE FUNCTION authorise_attachment_upload(p_ticket_id uuid, p_view_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER ...
```
**Test in PR #C:** optional — timing tests are flaky in CI. Document the fix and skip the test.

---

## 4. [MEDIUM] `support-ticket-reply.ts` — admin-status flip race + redundant state machine hops

**File:** `functions/api/support-ticket-reply.ts:167-191`
**Vuln:** The handler reads `ticketRow.status` once, then issues 1-2 `transition_ticket_status` RPC calls based on that snapshot. Between the SELECT and the first transition, another admin could move the ticket to `resolved`. The RPC then raises `invalid_transition: resolved -> in_progress`. The handler **ignores RPC errors** (`await rpc(...)` with no result check on lines 176-190). End state: ticket stuck in resolved, but the reply message is already stored — the user reads "we replied" while the admin UI still shows resolved.
**Attack scenario:** mostly an availability/integrity bug, not directly exploitable, but a malicious co-admin (or admin account compromise) could spam status flips to desynchronise tickets.
**Fix:**
1. Capture `{ data, error }` from each RPC. Log + return 409 on `invalid_transition`.
2. Better: do the status flip inside a single SECURITY DEFINER RPC that takes the message body as a parameter — atomic, no TOCTOU.
**Test in PR #C:** yes — inject a status flip between SELECT and INSERT via a service-role helper, assert handler returns informative error or recovers gracefully.

---

## 5. [MEDIUM] `decodeJwtPayload` reads AAL from an unverified payload

**File:** `functions/api/support-ticket-reply.ts:113-116, 242-254`
**Vuln (B in the brief):** `decodeJwtPayload(jwt).aal === "aal2"` parses base64 without signature verification. Order is fine in this file — `supabase.auth.getUser()` runs first (line 93), so a fully-forged JWT can't reach the AAL check. **But** the AAL claim itself comes from the unverified payload. If an attacker has a valid `aal1` Supabase JWT for an admin user (e.g. stolen via XSS on a non-admin surface), they can edit the payload to set `aal: "aal2"` and re-sign with the same `alg: none` trick — supabase-js's `getUser()` will reject `alg: none`, but **so will it reject the original `aal2` JWT** if signature is invalid? **Yes** — `getUser()` validates the JWS signature with the JWKS. So a forged payload fails getUser(), gets `userError`, returns 401 at line 95 before reaching the AAL check.

**However** there's a subtle issue: `supabase.auth.getUser()` over network uses Supabase's `/auth/v1/user` endpoint and trusts that endpoint's verification. If a token has its session revoked but the AAL claim says `aal2`, the endpoint may return the user object (depends on Supabase build), and the local AAL decode would pass. **The two checks are not stitched together.** A token with `aal1` session + `aal2` payload (locally hacked but signature stale) would: (1) fail getUser() → 401. So in practice safe. But the defence in depth wording in the comment ("we read aal client-side because supabase-js doesn't surface it") is **wrong** — `userData.user.aal` *is* surfaced under some configurations, and even when not, `auth.amr` arrays are. Use the verified user object, not the local decode.

**Fix:** Replace `decodeJwtPayload(jwt).aal` with `userData.user.user_metadata?.aal` if exposed, else call `userClient.rpc('check_aal2')` which reads `auth.jwt() ->> 'aal'` server-side (the DB has the verified JWT). Then the AAL check is server-verified, matching the SECURITY DEFINER RPC behaviour.
**Test in PR #C:** yes — forge an aal1 JWT with payload manually swapped to `aal2`, assert 403.

---

## 6. [MEDIUM] `support-ticket-reply.ts:212` — Reply-To construction with `EMAIL_FROM.split("@")[1]`

**File:** `functions/api/support-ticket-reply.ts:212`
```ts
const replyTo = `ticket+${ticketId}@${env.EMAIL_FROM.split("@")[1] ?? "subenai.sk"}`;
```
**Vuln (F in the brief):** Header injection through `EMAIL_FROM` is not exploitable here because:
1. Resend takes JSON, not raw SMTP — `\r\n` in `reply_to` would just be a malformed JSON string, rejected by Resend's API.
2. `ticketId` is validated as `^[0-9a-fA-F-]{36}$` (line 78).
3. `EMAIL_FROM` is operator-controlled, not user-controlled.

**But** there's a real issue: if `EMAIL_FROM` is set to a value without `@` (misconfiguration), `split("@")[1]` is `undefined`, fallback is `"subenai.sk"`. The send proceeds with a domain mismatch (`from: invalid-config`, `reply_to: ticket+...@subenai.sk`). Resend will reject the from-domain; the reply silently fails (handler logs warn + continues, line 228).
**Fix:** Validate `EMAIL_FROM` matches `^[^@]+@[^@]+\.[^@]+$` at startup; refuse to construct the reply-to if not.
**Test in PR #C:** low priority — config sanity, not a security test.

---

## 7. [LOW] PDF sanitiser — `RISKY_NAMES` sweep is correctly recursive via `enumerateIndirectObjects`

**File:** `functions/_lib/attachment-sanitize.ts:256-266`
**Finding:** `doc.context.enumerateIndirectObjects()` iterates every indirect object in the PDF cross-reference table, not just the catalog tree. That means deeply-nested objects (forms inside annotations inside pages inside named destinations) ARE reached. **Recursion depth is sufficient.** ✓

**However**, `PDFArray` branches are not walked into. If a risky action is stored as a *direct* object inside a `PDFArray` (rather than as an `indirect ref` to a `PDFDict`), it is missed. Example:
```
/AA << /O [ << /S /JavaScript /JS (alert()) >> ] >>
```
Here `/JS` lives inside a `PDFDict` that is a direct child of an array. `enumerateIndirectObjects` reaches `/AA` (via its parent dict) and `delete`s the AA key entirely — so the whole subtree goes. ✓ Action-removal is upstream of value-recursion.

**But** if the PDF stores `/OpenAction` as `/OpenAction [ 5 0 R ]` where `5 0 R` is an indirect ref to a dict carrying `/S /JavaScript`, the sweep catches the catalog's `/OpenAction` key (deletes it). The indirect dict still exists but is unreachable. ✓ Safe.

**Genuine gap:** custom name trees and PieceInfo dictionaries. `/PieceInfo` can hold app-specific data with arbitrary nested dicts that may resurrect after our pass if a reader walks them. Low practical risk for Chrome/Acrobat (they don't execute PieceInfo) but worth a note.
**Fix:** Add `"PieceInfo"`, `"Metadata"` (already handled by save), `"3D"` to RISKY_NAMES. Low priority.
**Test in PR #C:** synthetic PDF with each risky name, assert post-sanitise bytes don't contain the string.

---

## 8. [LOW] `sanitizeFilename` — no Unicode normalisation; null bytes already caught by class regex

**File:** `functions/_lib/attachment-sanitize.ts:164-198`
**Finding:** The character-class `[^A-Za-z0-9._-]+` replaces every non-ASCII byte (including null `\x00`, RTL override U+202E, combining marks, control characters) with `_`. The final regex `^[A-Za-z0-9._-]+$` enforces it. ✓ Null bytes, RTL spoofing, and control characters are all neutralised.

**Genuine gap:** no Unicode-normalisation step. A filename like `café.pdf` first becomes `caf__.pdf` (combining-acute `e` + `́` → 2 underscores then collapsed to 1). This is fine for security, but loses information unpredictably; if the user attaches the same `café.pdf` from macOS NFD vs Windows NFC, they get different sanitised names. Cosmetic, not a vuln.
**Fix:** none required for security.
**Test in PR #C:** no.

---

## 9. [LOW] Resend idempotency keys are application-attacker-immune

**File:** `functions/api/support-ticket-create.ts:266`, `support-ticket-reply.ts:224`
**Finding (C in the brief):** Idempotency keys `support-ticket-received-${ticket_id}` and `support-ticket-reply-${message_id}` are stored in **Resend's** DB, not ours. The attacker cannot insert a row in Resend's idempotency table. The keys cannot be guessed-and-forged to suppress a send because the ticket_id / message_id is a server-generated UUIDv4 returned only to the legitimate caller.
**Conclusion:** safe as designed. No fix needed.
**Test in PR #C:** no.

---

## 10. [LOW] Service-role blast radius — both functions construct `adminClient`

**File:** `functions/api/support-ticket-reply.ts:120-122`, `support-attachment-upload.ts:117-119`
**Finding (D in the brief):** Both functions construct `adminClient` with `SUPABASE_SERVICE_ROLE_KEY` after authorisation has been established (admin role + AAL2 for reply; view_token / JWT-owner for upload). Inputs passed to admin-scoped operations are all narrowed:
- `eq("id", ticketId)` — UUID regex'd
- `eq("ticket_id", ticketId)` — same
- `submitter_email` field is read, never re-written under user control (column is also DB-immutable)
- Storage path is `${ticketId}/${attachmentId}.${ext}` — both UUIDs, ext is from an internal whitelist (`MIME_EXT`)

**No user-controlled string reaches a `.from(<user-input>)` or `.rpc(<user-input>)` call.** ✓ Service-role usage is properly scoped.

---

## 11. [INFO] Console logging — no secrets leaked

**Files checked:** all `console.error` / `console.warn` statements in the three CF functions.
**Finding (E in the brief):** Logged fields are: `code`, `message`, `reason`, `ticket_id`, `message_id`. No `env.*` value, no JWT, no view_token, no payload body is ever logged. ✓

---

## 12. [INFO] Admin XSS — React default escape is the only protection, no `dangerouslySetInnerHTML` anywhere

**File:** `src/components/admin/SupportTicketDetail.tsx`
**Finding:** `{ticket.subject}`, `{ticket.body}`, `{m.body}` are rendered as text children. `whitespace-pre-wrap` on the `<p>` does not bypass React's escape. ✓ No `dangerouslySetInnerHTML` usage in the file. Stored XSS via a crafted subject/body is not possible in the admin surface.

---

## 13. [INFO] ILIKE escape (CodeQL fix) — verified correct

**File:** `src/lib/admin/queries.ts:2201`
```ts
const escaped = query.trim().replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
```
**Finding:** Order is correct — backslash first, then `%`/`_`. PostgreSQL ILIKE default escape char is `\`, matching the doubled output. ✓ The fix matches the comment.

---

## Summary

| # | Severity | Area | Action |
|---|---|---|---|
| 1 | HIGH  | rate-limit key | Decode JWT, key on `sub` |
| 2 | HIGH  | attachment TOCTOU | Trigger or RPC-with-FOR-UPDATE |
| 3 | MED   | non-constant-time hash compare | Route through RPC |
| 4 | MED   | reply status-flip race | Single atomic RPC, check errors |
| 5 | MED   | AAL2 from unverified payload | Use server-side `auth.jwt()` check |
| 6 | MED   | EMAIL_FROM validation | Startup config validation |
| 7 | LOW   | PDF risky-names completeness | Add PieceInfo/3D, low priority |
| 8 | LOW   | Unicode normalisation | Cosmetic, no action |
| 9 | LOW   | Idempotency keys | Safe by design |
| 10 | LOW  | Service-role scope | Safe — well-scoped |
| 11 | INFO | Logging | No leaks |
| 12 | INFO | Admin XSS | Safe — React escape |
| 13 | INFO | ILIKE escape | Correct |

**Net assessment:** Two findings (#1, #2) deserve action before merging E48.2 to main. The threat-model pass likely missed #1 (the JWT-prefix collision) and #2 (the parallel-attachment race), both of which only show up by reading the code, not the design doc.

Word count: ~1,420.
