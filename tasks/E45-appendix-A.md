# E45 Appendix A — Security audit, brute-force model & audit logging

**Scope:** `/api/tests/verify-password` (new Phase 2 endpoint), the
`hash_test_password` / `verify_test_password` RPCs that back it, the
short-lived `respondent_pwd_jwt` cookie, and the 4 new `audit_log`
actions that ride on E45 Phases 1–3.

**Authoring frame:** senior security engineer, fresh-context. Threats
graded against attacker economics (62-char alphabet, bcrypt cost ~10),
not vibes. Mitigations cited against existing primitives — we do not
reinvent rate limiting, JWT signing, or audit logging.

**Cross-refs:**
- `tasks/PLAN-2026-05-21-E45-test-detail-editor.md` (TL;DR, D3/D4/D5/D8, Q1/Q2, R1/R4/R5).
- `supabase/migrations/20260501000000_edu_mode.sql` L126–172 — bcrypt RPC pattern.
- `functions/api/verify-author-password.ts` — CF-side wrapper shape we mirror.
- `functions/_lib/security.ts` — `ipRateLimit`, `consumeDailyQuota`, `readClientIp`, `parsePositiveInt`.
- `functions/_lib/jwt.ts` — HS256 HMAC primitives + `EduAuthorClaims` model.
- `supabase/migrations/20260517000000_admin_hub_schema.sql` L448–479 — `audit_log` schema + immutability trigger.
- `supabase/migrations/20260518100000_fix_rls_recursion.sql` L56–63 — `tests_owner_read` and the canonical owner-or-team-or-admin chain.

---

## 1. Threat model — STRIDE for `/api/tests/verify-password`

The endpoint accepts `{ share_id, password }`, returns 200 with a
`Set-Cookie: respondent_pwd_jwt=…` on success, 401 / 429 otherwise.
All requests are anonymous (no `Authorization` header expected).

| ID | Category | Attack scenario | Current mitigation (reused) | Recommended additional mitigation | Residual |
|----|----------|-----------------|-----------------------------|-----------------------------------|----------|
| T1 | **Spoofing — forged JWT** | Attacker crafts a `respondent_pwd_jwt` cookie value to bypass the gate on `/t/<share_id>` without ever calling verify-password. | HS256 HMAC with `JWT_SECRET`; signature checked on every request via `verifyRespondentPwdToken` (mirrors `verifyEduAuthorToken` in `functions/_lib/jwt.ts` L153–184). Secret never leaves the worker. | Reject tokens whose `iss != "subenai.sk"` and whose `sub != <share_id from URL>` — defense-in-depth even if HMAC ever broke. | **LOW** |
| T2 | **Spoofing — share_id enumeration** | Attacker probes a wordlist of plausible `share_id` strings to find which tests are password-locked vs. open. | `share_id` is a 22-char nanoid (base62) by current generator → 62²² ≈ 2¹³⁰ search space. Verify endpoint returns a generic `401 unauthorized` whether the share_id is unknown OR the password is wrong (no enumeration oracle). | Make the rate limit apply BEFORE the share_id lookup — drop on rate-limit even if share_id is malformed. Already the case in `verify-author-password.ts` L99 (rate-limit before RPC). | **LOW** |
| T3 | **Tampering — cookie tampering** | Attacker edits the `respondent_pwd_jwt` payload (e.g. flip `pv` to bypass version check) and replays. | HS256 signature covers the entire `header.payload`; any byte-level edit invalidates the signature → `bad_signature` reason. Same machinery as E12 author cookie (`functions/_lib/jwt.ts` L55–67). | None additional — signature is authoritative. | **LOW** |
| T4 | **Tampering — bcrypt downgrade** | Attacker tricks the system into accepting `crypt(password, $1$…)` (MD5 prefix) or unsalted SHA-1 instead of `$2a$…` (bcrypt). | RPC signature is fixed: `crypt(password, gen_salt('bf', 10))` — algorithm hard-coded in `hash_test_password`. Verifier compares the candidate against the stored hash; pgcrypto auto-detects the prefix, so a stored `$2a$` hash forces bcrypt verification. No user-controlled hash prefix path. | Add a guard in the new `hash_test_password`: `IF substr(crypt_output, 1, 4) != '$2a$' AND substr(crypt_output, 1, 4) != '$2b$' THEN RAISE EXCEPTION 'unexpected_hash_prefix'`. Cheap insurance against a future pgcrypto default change. | **LOW** |
| T5 | **Repudiation — audit log gap on verify** | Owner is contacted by a respondent claiming "I never accessed your test" — we have no record of failed attempts vs. successes. | Each verify call writes one `audit_log` row (action `respondent_password_verified`, `outcome: pass|fail`, IP hash). Append-only via `forbid_audit_log_updates` trigger (L467–479). | Audit insert MUST be in the same response path as the rate-limit decision — so even rate-limit-rejected attempts get an `outcome: 'rate_limited'` row. Drop rows on log failure rather than fail-open. | **LOW** |
| T6 | **Repudiation — audit log gap on set/clear** | Author rotates a password under DPO inquiry but denies having done it. | Each `hash_test_password` call writes `template_password_set` with `actor_id = auth.uid()`. RPC is SECURITY DEFINER so we capture the *caller*, not the definer. | RPC body MUST `INSERT INTO audit_log` before returning; if the insert raises, the whole TX rolls back and the password is not persisted. Atomicity = no orphan password without audit row. | **LOW** |
| T7 | **Info disclosure — timing oracle (absent vs failed)** | Attacker measures response time to distinguish "no password set on this share_id" (fast — RPC returns false on `NULL hash`) from "wrong password" (slow — bcrypt verify ~100ms). Both return 401, but the time differs. | The current `verify_test_set_password` returns `false` immediately when `stored_hash IS NULL` (L165–167) — that's the timing leak. | (a) Always call `crypt(password, $dummy_hash)` to consume bcrypt cost even when no hash is set, OR (b) add 100ms ± 50ms CF-side jitter on every response. We adopt (b) per R4 — simpler, doesn't require a dummy hash in the DB. | **LOW** |
| T8 | **Info disclosure — password via error messages** | Verbose error returns the submitted password, the stored hash, or the RPC error message verbatim — leaks into logs / DOM / Sentry. | `verify-author-password.ts` L113 only logs `{ ip, set_id, message }` — never the password. We mirror that. | Add a CF-side scrub: if `body.password` length > 256, reject with `400 invalid_shape` before logging. Prevents log-bomb attacks (megabyte passwords filling Sentry quotas). | **LOW** |
| T9 | **Info disclosure — hash exfil via SQL injection** | Attacker injects into the `share_id` to leak `password_hash`. | `share_id` is bound as a parameter through PostgREST; never concatenated. RPC accepts UUID-typed argument — non-UUID input rejected at parse time. | None additional. | **LOW** |
| T10 | **DoS — brute-force per IP** | Attacker tries 100 passwords/sec from a single IP. | `ipRateLimit.consume('verify-pwd:<ip>:<share_id>', 5, 900)` — 5 attempts / 15 min (D4). Module-level Map in the worker isolate; soft cap per `_lib/security.ts` L10–13 comment. | **None additional in Phase 2.** If we observe distributed attacks in production, upgrade to KV-backed counters in a Phase 4 hot-patch. The math (§3) makes the soft cap acceptable. | **MED** |
| T11 | **DoS — brute-force per share_id (rotating IPs)** | Attacker uses a botnet to dodge the per-IP limit, hammering one share_id from thousands of IPs. | `ipRateLimit.consume('verify-pwd:global:<share_id>', 50, 3600)` — 50 attempts / hour / share_id regardless of IP (D4). | Belt-and-braces: `consumeDailyQuota('verify-pwd:<share_id>', 200)` — hard 200/day ceiling. Once tripped the share_id is locked for 24h and the test owner gets a notification (Phase 3, reuses `notifications` table). | **LOW** |
| T12 | **DoS — bcrypt CPU exhaustion** | Attacker sends 10K parallel requests with valid `share_id` to spin up 10K bcrypt verifications and saturate Postgres CPU. | T10 + T11 rate limits cap concurrency at 5 attempts / IP / 15min × `n` IPs. Per-share global cap at 50/hour cuts the absolute throughput. Bcrypt cost factor 10 ≈ 100ms — even 50/hour is <1.4% of one core. | The global cap covers it; no extra mitigation. | **LOW** |
| T13 | **EoP — anon escalates to author** | Anonymous respondent who knows the password obtains a token that lets them edit the test. | `respondent_pwd_jwt` carries `role: "respondent"` (separate claim shape from `EduAuthorClaims.role: "author"` — see `_lib/jwt.ts` L124–129). Server-side checks `claims.role === "respondent"` on every gated route. RPC for editing requires `auth.uid()` (Supabase JWT), which the respondent cookie does not satisfy. | None additional — role separation is enforced at both the JWT verifier and the RPC. | **LOW** |
| T14 | **EoP — owner-only set/clear bypass** | Non-owner authenticated user calls `hash_test_password(other_test_id, 'foo')` directly via the PostgREST RPC interface. | RPC has `REVOKE ALL FROM PUBLIC, anon, authenticated` (mirror of `hash_test_set_password` L147). Only `service_role` (used by CF function under server-side auth) can execute. The CF function checks `tests.owner_id = auth.uid() OR has_role('admin')` before calling the RPC. | The RPC body also re-checks ownership (defense-in-depth) — `RAISE EXCEPTION 'not_owner'` if `(SELECT owner_id FROM tests WHERE id = $1) != auth.uid() AND NOT has_role(auth.uid(), 'admin')`. Belt + suspenders against a future bug exposing the RPC. | **LOW** |

**Top-3 residual risks (sorted by grade × impact):**
1. **T10 (MED)** — per-IP brute-force across worker isolates. Acceptable today; flagged for KV upgrade if observed.
2. **T7 (LOW)** — timing oracle; mitigated by CF-side jitter.
3. **T11 (LOW)** — per-share botnet brute-force; mitigated by global + daily caps.

---

## 2. JWT claim schema — `respondent_pwd_jwt`

### 2.1 Header

```json
{ "alg": "HS256", "typ": "JWT" }
```

(Same constant `HEADER_B64` as `functions/_lib/jwt.ts` L20–22 — reused, not duplicated.)

### 2.2 Claims

| Claim | Type | Purpose |
|-------|------|---------|
| `sub` | `string` (share_id) | Identifies which test the token gates. Routes compare `claims.sub === params.shareId`. |
| `role` | `"respondent"` | Distinguishes from author cookies (T13). |
| `pv` | `int` | `password_hash_version`. Bumped on every password change so old cookies invalidate (D5, Q2). |
| `iat` | `int` (sec) | Issued at — epoch seconds, matches `EduAttemptClaims.iat`. |
| `exp` | `int` (sec) | Expiry — `iat + 1800` (30 min) per D5. |
| `iss` | `"subenai.sk"` | Defense-in-depth (T1). Verifier rejects on mismatch. |

### 2.3 Sample encoded JWT

Header (base64url): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

Payload (decoded):

```json
{
  "sub": "VkPpQ_o2L7w4mZ8sN3eRgX",
  "role": "respondent",
  "pv": 3,
  "iat": 1779544800,
  "exp": 1779546600,
  "iss": "subenai.sk"
}
```

Encoded token:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJWa1BwUV9vMkw3dzRtWjhzTjNlUmdYIiwicm9sZSI6InJlc3BvbmRlbnQiLCJwdiI6MywiaWF0IjoxNzc5NTQ0ODAwLCJleHAiOjE3Nzk1NDY2MDAsImlzcyI6InN1YmVuYWkuc2sifQ.<<signature>>
```

(`<<signature>>` is a placeholder — the actual signature is
`base64url(HMAC-SHA-256(header.payload, JWT_SECRET))`. We do not embed
a real signature in source documentation.)

### 2.4 Cookie attributes

```
Set-Cookie: respondent_pwd_jwt=<token>;
            Path=/t/<share_id>;
            HttpOnly;
            Secure;
            SameSite=Lax;
            Max-Age=1800
```

**`Path=/t/<share_id>`** — narrower than the author cookie (`Path=/`,
see `verify-author-password.ts` L62–65) because the respondent token
ONLY needs to be sent on the take route. Narrow path = the cookie
never leaks to `/api/*` calls the respondent doesn't make, and never
mixes with the author cookie's broader scope.

**`SameSite=Lax`** — Lax is sufficient because:
- The cookie is set on a same-site POST from our own UI (`/api/tests/verify-password`).
- Respondents typically land on `/t/<share_id>` via top-level navigation (email link, share link), which Lax allows.
- We are not embeddable as a third-party iframe (CSP `frame-ancestors 'self'`).

**No `Domain` attribute** → defaults to the response host (`subenai.sk`).
Subdomain isolation preserved (any future `staging.subenai.sk` will not see this cookie).

### 2.5 `password_hash_version` mechanism

**Storage:** add column to `public.tests` in Phase 2 migration:

```sql
ALTER TABLE public.tests
  ADD COLUMN password_hash_version INT NOT NULL DEFAULT 0;
```

`0` = no password ever set (sentinel; ignored by gate logic since
`password_hash IS NULL`). First set → `1`. Every subsequent
set/change/clear → `+1`.

**Bumped where:** inside `hash_test_password` RPC body, in the same
`UPDATE tests SET password_hash = …, password_hash_version = password_hash_version + 1 WHERE id = $1`
statement. Atomic — no window where hash and version disagree.

**Embedded where:** `verify_test_password` returns
`TABLE(verified boolean, current_pv int)` instead of just `boolean`,
so the CF function can mint the cookie with the right `pv` without a
second round-trip.

**Compared where:** every guard on `/t/<share_id>` (route loader OR
the CF function that gates the take flow) decodes the cookie, then
runs:

```sql
SELECT password_hash IS NOT NULL AS has_pwd,
       password_hash_version AS current_pv
FROM public.tests
WHERE share_id = $1;
```

If `cookie.pv !== current_pv` → invalidate → respond
`{ error: "password_changed" }` (see §8).

**Why not just check `password_hash` equality?** Hash equality
requires reading the hash into the worker, which weakens
defense-in-depth. Comparing an integer is leak-free and identical in
correctness.

---

## 3. Rate-limit matrix

Three layers, all keyed independently so a single bypass doesn't lift
the others.

| Layer | Limit | Window | Key | Primitive | Justification |
|-------|-------|--------|-----|-----------|---------------|
| L1 — Per IP / share | **5 attempts** | **15 min** | `verify-pwd:<ip>:<share_id>` | `ipRateLimit.consume` (`_lib/security.ts` L86–101) | At 5/15min an attacker against an 8-char alphanumeric password (62⁸ ≈ 2.18×10¹⁴) needs 2.18×10¹⁴ ÷ 5 × 15 min ≈ 6.2 billion years. Reduced to "instant" against a 4-char weak password (62⁴ ≈ 1.5×10⁷ → 87 years). The L1 layer protects strong passwords; weak passwords are protected by the L3 daily cap (see below). |
| L2 — Per share, global | **50 attempts** | **1 hour** | `verify-pwd:global:<share_id>` | Second call to `ipRateLimit.consume` (same primitive, different key) | Caps a botnet rotating IPs. At 50/hour an 8-char password lasts 62⁸ ÷ 50 × 1h ≈ 497,000 years; a 4-char password lasts 62⁴ ÷ 50 ≈ 12.6 days. L2 is the **anti-botnet** layer; L3 is the **weak-password failsafe**. |
| L3 — Per share, daily | **200 attempts** | **1 day** | `verify-pwd:<share_id>` | `consumeDailyQuota` (`_lib/security.ts` L105–112) | Hard ceiling regardless of distribution. At 200/day a 4-char password takes 62⁴ ÷ 200 ≈ 211 days — and a notification fires on first L3 trip so the author sees the attack. The 200/day bound also caps Resend/Postgres cost in worst case. |
| **Timing jitter** | n/a | per response | n/a | `await new Promise(r => setTimeout(r, 100 + (Math.random() * 50 - 25)))` | Closes T7. 100±25ms is < bcrypt variance, so it dominates the signal. Applied uniformly to ALL outcomes (rate-limited / unknown share / wrong password / right password) — adversary can't distinguish. |

### 3.1 Attack-economics math (sketched)

Let `N` be the alphabet size (62 for a-zA-Z0-9), `L` the password
length, `T` the layer's "attempts per unit time."

| Password | Search | L1 (5/15min) | L2 (50/hr) | L3 (200/day) |
|----------|--------|--------------|------------|--------------|
| 4 char (62⁴ ≈ 1.5×10⁷) | 1.5×10⁷ | 1.5e7 / 5 × 0.25h = 750 kh ≈ 86 yr | 1.5e7 / 50 = 300k h ≈ 34 yr | 1.5e7 / 200 = 75k d ≈ 206 yr |
| 6 char (5.7×10¹⁰) | 5.7×10¹⁰ | 5.7e10/20/h ≈ 327k yr | 5.7e10/50/h ≈ 130k yr | 5.7e10/200/d ≈ 780k yr |
| 8 char (2.2×10¹⁴) | 2.2×10¹⁴ | ≈ 1.3 billion yr | ≈ 497M yr | ≈ 3 billion yr |

(Assuming a uniformly distributed password — real passwords skew
toward dictionary words, which is why we ALSO recommend a client-side
zxcvbn-lite strength meter per E45.10. Bcrypt cost factor 10 is the
floor at ~100ms; bumping to 12 quadruples attacker cost at the price
of UX, deferred.)

### 3.2 Response semantics

| Layer triggered | HTTP | Body | Notes |
|-----------------|------|------|-------|
| L1 only | `429` | `{ error: "rate_limited", retry_after: <int seconds> }` | Polite retry hint. |
| L1 + L2 | `429` | `{ error: "rate_limited" }` | No `retry_after` — denies oracle on global counter. |
| L3 (daily cap) | `429` | `{ error: "share_locked" }` | Author is notified once per 24h window. |
| Valid password | `200` | `{ ok: true }` + `Set-Cookie` | Jitter still applied. |
| Wrong / unknown share | `401` | `{ error: "unauthorized" }` | Identical shape for both, per T2. |

---

## 4. RPC scope

### 4.1 `hash_test_password(test_id uuid, password text) → void`

**Properties (mirror `hash_test_set_password` L133–148):**

- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = public, extensions` — pins pgcrypto's `crypt()`.
- Min length: `8` chars (matches edu mode).
- Bcrypt cost: `gen_salt('bf', 10)` (same as edu).
- `REVOKE ALL ON FUNCTION public.hash_test_password(uuid, text) FROM PUBLIC, anon, authenticated;`
- `service_role` retains the default EXECUTE.

**Body invariants (in order):**

1. `IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'`
   — even though `service_role` bypasses RLS, we want the CF function
   to forward the user JWT so `auth.uid()` is populated.
2. `SELECT owner_id INTO _owner FROM public.tests WHERE id = test_id`
   — single lookup.
3. `IF _owner IS NULL THEN RAISE EXCEPTION 'test_not_found'`
4. `IF _owner != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_owner'` — T14 defense.
5. `IF length(password) < 8 THEN RAISE EXCEPTION 'password_too_short'`
6. `IF length(password) > 256 THEN RAISE EXCEPTION 'password_too_long'` — log-bomb defense (T8).
7. `UPDATE public.tests SET password_hash = crypt(password, gen_salt('bf', 10)), password_hash_version = password_hash_version + 1, updated_at = now() WHERE id = test_id`
8. `INSERT INTO public.audit_log (actor_id, action, target_type, target_id, pii_access, details) VALUES (auth.uid(), 'template_password_set', 'test', test_id::text, false, jsonb_build_object('op', 'set_or_change'))`

**Clear path:** a separate RPC `clear_test_password(test_id uuid) → void`
with the same owner check, sets `password_hash = NULL`, bumps
`password_hash_version`, audits with `details: {"op": "clear"}`.
Splitting avoids overloading one RPC with NULL-vs-string semantics.

### 4.2 `verify_test_password(share_id text, password text) → TABLE(verified boolean, current_pv int)`

- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = public, extensions`
- `GRANT EXECUTE … TO anon, authenticated` — **deliberately** like `verify_test_set_password` L172. Anonymous can call, but the CF function gates with rate limits BEFORE the RPC, so the anon grant is never the front door.

**Body:**

1. `SELECT password_hash, password_hash_version INTO _hash, _pv FROM public.tests WHERE share_id = verify_test_password.share_id` — share_id-indexed, single row.
2. If no row OR `_hash IS NULL` → `RETURN QUERY SELECT false, COALESCE(_pv, 0)`. (Caller already gated by rate limits; absent-share has the same response time as wrong-pwd thanks to §3 jitter.)
3. `RETURN QUERY SELECT crypt(password, _hash) = _hash, _pv`

The audit row for the verify attempt is written by the **CF function**
(not the RPC) because it needs `ip_hash`, which lives outside Postgres.

---

## 5. Audit-log row schema for the new actions

All four use the existing `public.audit_log` columns (L448–458) — no
schema changes. `pii_access` is the policy-relevant boolean that
triggers DPO surfacing.

### 5.1 `template_password_set` (Phase 2, written inside `hash_test_password` RPC and `clear_test_password` RPC)

| Column | Value |
|--------|-------|
| `actor_id` | `auth.uid()` — the test owner (or admin in admin-override case). |
| `actor_name` | NULL — joinable to `profiles` via `actor_id`. |
| `action` | `'template_password_set'` |
| `target_type` | `'test'` |
| `target_id` | `tests.id::text` |
| `pii_access` | `false` |
| `details` | `{"op": "set" | "change" | "clear"}` — `set` if `OLD.password_hash IS NULL`, `change` if `OLD.password_hash IS NOT NULL`, `clear` if RPC was `clear_test_password`. |

### 5.2 `respondent_password_verified` (Phase 2, written inside `functions/api/tests/verify-password.ts` for every attempt regardless of outcome — including rate-limited)

| Column | Value |
|--------|-------|
| `actor_id` | NULL — respondent is anonymous. |
| `actor_name` | `'respondent:' || <ip_hash>` where `ip_hash = base64url(SHA-256(ip))[0:12]` — short, unrecoverable IP fingerprint. |
| `action` | `'respondent_password_verified'` |
| `target_type` | `'test'` |
| `target_id` | `tests.id::text` (resolved via share_id at the CF layer; if share_id was unknown, set `target_id = 'unknown:' || sha256(share_id_input)[0:12]` to avoid logging attacker-controlled strings). |
| `pii_access` | `false` — we only persist a hash of the IP. |
| `details` | `{"outcome": "pass" | "fail" | "rate_limited" | "share_locked", "share_id": "<share_id>", "pv": <int or null>}` |

**Why log every attempt incl. rate-limited:** without it, an attacker
who hits the rate limit looks identical to a user who gave up. Author
+ DPO need the full count to assess attack volume.

### 5.3 `test_invite_sent` (Phase 3, one row per recipient, written inside `functions/api/tests/send-invites.ts` AFTER Resend returns 2xx — see R6)

| Column | Value |
|--------|-------|
| `actor_id` | `auth.uid()` — the test owner. |
| `actor_name` | NULL. |
| `action` | `'test_invite_sent'` |
| `target_type` | `'test'` |
| `target_id` | `tests.id::text` |
| `pii_access` | **`true`** — recipient email is PII per E11 privacy register, even if we only persist a hash. The flag is what `/admin` surfaces for DPO sweep purposes. |
| `details` | `{"recipient_email_hash": "<sha256_hex>", "included_password": <bool>, "resend_message_id": "<string>"}` |

Plaintext email is **NOT** stored — only `sha256(lower(email))` so a
DPO Art. 15 request can verify whether a given email was contacted
without leaving an email list at rest. Resend's own log retains
plaintext for 24h then aggregates (per Resend privacy policy, already
documented in `tasks/E11-email-runbook.md`).

### 5.4 `test_question_modified` (Phase 1, written inside the server fn that handles add/remove/reorder)

| Column | Value |
|--------|-------|
| `actor_id` | `auth.uid()` |
| `actor_name` | NULL |
| `action` | `'test_question_modified'` |
| `target_type` | `'test'` |
| `target_id` | `tests.id::text` |
| `pii_access` | `false` |
| `details` | `{"op": "add" | "remove" | "reorder", "count": <int>, "question_ids": [<uuid>, …]}` — question_ids included for `add`/`remove`, omitted for `reorder` (the order is captured by `count` + the timestamp ordering across consecutive rows). |

The append-only trigger `forbid_audit_log_update_trg`
(`20260517000000_admin_hub_schema.sql` L477–479) covers all four
actions — no new trigger needed.

---

## 6. Owner-only set/clear — RLS chain

The trust chain for `set password` is:

1. **HTTP layer:** the UI calls a TanStack server fn (`useSetTestPassword`), which forwards the user's Supabase JWT.
2. **`tests` RLS:** `tests_owner_write` (`20260517000000_admin_hub_schema.sql` L787–790) — `FOR ALL TO authenticated USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))`. The CF function that calls the RPC under `service_role` bypasses RLS, BUT…
3. **RPC body re-check** (§4.1 step 4) — the RPC itself reads `tests.owner_id` and compares to `auth.uid()`. So even if `service_role` is misused, the RPC refuses.
4. **REVOKE on the RPC** — `anon` and `authenticated` can't call `hash_test_password` directly; only `service_role` can.

Three independent locks: RLS, RPC body check, RPC EXECUTE grant. Any
two failing still leaves the third active.

`test_questions` write path uses the same chain — `test_questions_via_test_write` policy (L802–) joins via `test_id → tests.owner_id`.

---

## 7. Constant-time bcrypt + timing-attack defense

**pgcrypto's `crypt()` is constant-time per hash.** Bcrypt's inner
loop runs exactly `2^cost` Blowfish key schedule iterations regardless
of password content; the only variance is the equality check at the
end (compare two 60-byte strings), which is also fixed-length. Real
measured variance on a hot connection is < 1 ms — below our 100 ms ±
25 ms jitter floor.

**However**, the "no password set" path is fast (no `crypt()` call at
all). That's T7. We close it with CF-side jitter, NOT with a dummy
`crypt()` call, because:

- Dummy `crypt()` doubles the average DB cost during normal traffic.
- Jitter is per-request, not per-attempt-counter — so even if an
  attacker bypasses our worker entirely (say, hits the RPC via a
  leaked service-role token), they don't learn the absent-vs-failed
  signal at the worker boundary.
- 100 ms ± 25 ms (uniform) is large enough to mask bcrypt cost
  variance AND DB round-trip variance (~5–20 ms p99). It is small
  enough that legitimate respondents notice no UX cost.

Implementation snippet (for engineer ref only; not file content):

```ts
const JITTER_MS = 100;
const JITTER_RANGE_MS = 50;
const finishWithJitter = async (resp: Response) => {
  const target = JITTER_MS + (Math.random() * JITTER_RANGE_MS - JITTER_RANGE_MS / 2);
  await new Promise(r => setTimeout(r, target));
  return resp;
};
```

Applied to **every** code path before returning, including:
- 400 invalid_json
- 400 invalid_shape
- 401 unauthorized
- 429 rate_limited / share_locked
- 200 ok
- 500 rpc_failed / supabase_not_configured

Otherwise the error-path latencies become an oracle for which branch fired.

---

## 8. In-flight password rotation — state machine

The respondent is mid-take. The author opens settings and rotates the
password. Per D5 / Q2, the respondent's existing JWT must invalidate
**without losing in-progress answers**.

```
[respondent has cookie pv=N]
            │
            │ author rotates password
            │  → UPDATE tests SET password_hash = …,
            │                     password_hash_version = N+1
            ▼
[next respondent request hits /t/<share_id>]
            │
            │ route loader (or middleware) calls:
            │   SELECT password_hash_version FROM tests WHERE share_id = $1
            │   → returns N+1
            │
            │ verifyRespondentPwdToken(cookie, JWT_SECRET):
            │   → ok=true, claims.pv = N
            │
            │ N !== N+1 → password_changed
            ▼
[CF function / route loader returns 401 { error: "password_changed" }]
            │
            │ UI catches 401, mounts <PasswordReprompt /> overlay
            │ over the existing TestFlow state
            │
            │ in-progress answers live in `session_answers`
            │ (server-side, indexed by question_id) — NOT cleared
            ▼
[respondent enters new password]
            │
            │ POST /api/tests/verify-password
            │ → 200 + new cookie with pv = N+1
            ▼
[<PasswordReprompt /> unmounts, TestFlow resumes from saved state]
```

**Slovak UI verbatim copy for the re-prompt overlay** (UI-facing
string only — the rest of this doc stays English):

- Title: `"Heslo bolo zmenené"`
- Body: `"Autor testu medzitým zmenil heslo. Zadaj nové heslo, aby si mohol pokračovať. Tvoje odpovede sú uložené."`
- Button: `"Pokračovať"`

**State retention guarantee:** `session_answers` is the source of
truth for in-progress responses (Supabase row per `(session_id,
question_id)`, written on every "next" click). The JWT carries no
answer state. So invalidating the JWT does NOT touch saved answers —
the only thing that becomes invalid is the proof-of-password-knowledge,
which the respondent must re-supply.

**Edge case — answers between JWT issuance and password change:**
those answers are in `session_answers` keyed by `session_id`. The
respondent's `session_id` lives in a separate, longer-lived cookie
(`subenai_session`) that is NOT affected by `pv` mismatch. So
`session_id` continuity holds across the re-prompt.

**Edge case — respondent never returns:** the 30-min `exp` reaps the
cookie eventually. `session_answers` rows are retained per the 12-month
PII purge policy in `purge_expired_respondent_pii` (`20260501000000_edu_mode.sql` L177–).

---

## 9. ERD sketch — verify-password flow

```
   ┌──────────────────────┐
   │  public.tests        │
   │  ─────────────────── │
   │  id (uuid, PK)       │
   │  owner_id            │
   │  share_id (TEXT, UQ) │──┐
   │  password_hash       │  │ FK-equiv via share_id
   │  password_hash_      │  │
   │   version (INT)      │  │
   └──────────────────────┘  │
                             │
                             ▼
                  ┌────────────────────────┐
                  │  /t/$shareId route     │
                  │  (loader / middleware) │
                  └─────────┬──────────────┘
                            │
                            │ reads cookie
                            ▼
                  ┌────────────────────────┐
                  │ respondent_pwd_jwt     │
                  │  HttpOnly,Secure,Lax   │
                  │  Path=/t/<share_id>    │
                  │  claims: sub,role,pv,  │
                  │          iat,exp,iss   │
                  └─────────┬──────────────┘
                            │ pv mismatch → 401
                            │ else → render TestFlow
                            ▼
                  ┌────────────────────────┐
                  │  POST /api/tests/      │
                  │     verify-password    │
                  │  (CF Pages Function)   │
                  │  ─ ipRateLimit L1+L2   │
                  │  ─ consumeDailyQuota L3│
                  │  ─ jitter 100±25ms     │
                  │  ─ supabase.rpc(       │
                  │     verify_test_pwd)   │
                  │  ─ audit_log INSERT    │
                  └────────────────────────┘
```

---

## 10. Open security questions (need a second opinion)

| ID | Question | My lean | Reasoning |
|----|----------|---------|-----------|
| O1 | Should `pv` be hashed/MAC'd separately so leaking the JWT doesn't reveal rotation count? | **No** | Rotation count is not sensitive — knowing an author rotated 3 times tells the attacker nothing actionable. Keeping `pv` as a plain int simplifies the version comparison in route loaders and keeps the JWT debuggable in jwt.io for ops triage. |
| O2 | Should we accept `Authorization: Bearer <token>` in addition to the cookie, e.g. for a CLI/test harness? | **No** | Cookie-only forces all traffic through the browser's same-site rules (T13 boundary). A Bearer path opens CORS attack surface for anyone proxying respondent UA via a `fetch()` from another origin. Tests can set the cookie directly (Playwright supports `context.addCookies`). |
| O3 | Should the share_id daily lockout (L3) auto-unlock after 24h, or require an author "unlock" click? | **Auto-unlock** | Auto-unlock is the lower-touch choice for legitimate authors whose respondents triggered the cap accidentally. The author still sees the notification (Phase 3 hook) so they can rotate the password if they suspect the cap was attack-driven. A click-to-unlock UX is a Phase 4+ refinement if we see false positives. |

---

## 11. Definition of Done — security delta

For E45 Phase 2 to ship, the security checklist below must be all-green:

- [ ] `hash_test_password` and `clear_test_password` REVOKE'd from `PUBLIC, anon, authenticated` in the migration.
- [ ] `verify_test_password` GRANT'd to `anon, authenticated` (mirrors edu pattern).
- [ ] Both RPCs include the owner-or-admin re-check inside the body.
- [ ] `tests.password_hash_version` column added, default 0, bumped atomically with every set/change/clear.
- [ ] CF function `functions/api/tests/verify-password.ts` applies L1, L2, L3 rate limits BEFORE the RPC call.
- [ ] Every code path goes through `finishWithJitter`.
- [ ] Cookie set with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/t/<share_id>`, `Max-Age=1800`.
- [ ] JWT verifier rejects `iss != "subenai.sk"` and `sub != share_id`.
- [ ] All four audit actions write rows; `pii_access` correctly set (only `test_invite_sent` is true).
- [ ] Vitest covers: rate-limit boundary at L1/L2/L3, jitter present on every branch, JWT pv-mismatch returns 401, owner-only set/clear, T1 forged-JWT rejection, T4 hash-prefix guard.
- [ ] Privacy / cookies page updated: new cookie `respondent_pwd_jwt` documented with purpose + retention.
- [ ] CHANGELOG `[Unreleased]` entry for Phase 2.
- [ ] Fresh-context code review (per `tasks/README.md` DoD) signs off on this appendix's recommendations being honored in the implementation.

— end of Appendix A —
