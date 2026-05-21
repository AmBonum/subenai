# E45 — Fresh-context security review (2026-05-21)

**Reviewer:** Claude Code (`feature-dev:code-reviewer` subagent, fresh context).
**Scope:** merged diff of E45 Phases 1-3 + follow-up #97 on `main`:

- `5abfd13` Phase 1 — question editor + random/fixed order mode (#89)
- `23ff198` Phase 2 — password protection for `/t/<share_id>` (#92)
- `9652bff` Phase 3 — email invites infra, PRO-gated entry (#95)
- `28e26b9` Phase 3 follow-up — relabel as "Pripravujeme" (#97)

**Contract:** `tasks/E45-appendix-A.md` (STRIDE T1–T14, rate-limit matrix,
JWT claim schema, cookie attrs, audit-log row schemas, RLS + RPC scope).

## HIGH

**None.** No immediately-exploitable bypass found. All three rate-limit
layers are applied before the bcrypt RPC. REVOKE/GRANT pattern on RPCs
is correct. HMAC verification is in place. Cookie attributes match the
spec.

## MEDIUM

### M1 — Audit `target_id` for unknown-share fallback uses IP hash (contract drift from §5.2)

**Confidence: 85.** Appendix A §5.2 specifies that when `share_id` is
unknown, `target_id = 'unknown:' || sha256(share_id_input)[0:12]` to
avoid logging attacker-controlled strings while preserving the share-id
identity for forensic correlation.

`functions/api/tests/verify-password.ts` L114:

```ts
target_id: testId ?? `unknown:${ipHash}`,
```

When `testId` is `null` the fallback appends the **IP hash**, not a hash
of the `share_id` input. Two consequences:

- two different fake share_ids probed from the same IP produce the same
  `target_id` (forensic ambiguity);
- the `share_locked` path at L176 also passes `testId = null` even
  though `shareId` is a known string at that point — the audit row
  loses the share identity entirely.

**Fix:** `'unknown:' + sha256hex(shareId).slice(0, 12)` for the
fallback. **Resolved in Phase 4 (this PR).**

### M2 — `wrong_issuer` JWT rejection silently collapses to `"no_cookie"` (T1 observability gap)

**Confidence: 82.** `verifyRespondentPwdToken` returns
`reason: "wrong_issuer"` when `claims.iss !== "subenai.sk"`
(`functions/_lib/jwt.ts`). The fan-out in
`functions/api/tests/check-password.ts` L117–123:

```ts
const reason: GateReason =
  verified.reason === "expired"
    ? "expired"
    : verified.reason === "bad_signature" || verified.reason === "wrong_role"
      ? "bad_signature"
      : "no_cookie"; // catch-all — silently includes "wrong_issuer"
```

`"wrong_issuer"` falls through to `"no_cookie"`. Functionally the user
sees the password prompt, which is correct. The gap is **observability**:
a surge of forged tokens with a wrong `iss` (the T1 scenario) is
indistinguishable in the client reason field from ordinary first-visit
respondents. Ops has no signal that T1 is being attempted.

**Fix:** add `verified.reason === "wrong_issuer" ? "bad_signature" :`
before the catch-all. **Resolved in Phase 4 (this PR).**

## LOW

### L1 — `test_question_modified` audit action (§5.4) is never written anywhere

**Confidence: 90.** Appendix A §5.4 specifies a `test_question_modified`
row written *"inside the server fn that handles add/remove/reorder."*
A grep of the entire codebase finds the action string only in the
appendix itself. The Phase 1 migration adds the schema columns but no
audit hook; no server function inserts this row. The Appendix A DoD
item *"All four audit actions write rows"* is satisfied only for three
actions.

Impact is low because question edits are owner-authenticated actions
(not anonymous), but the forensic trail for *"who changed the question
bank on test X"* is absent.

**Fix:** Postgres TRIGGER on `test_questions` (INSERT / DELETE) writes
the audit row automatically using `auth.uid()` as `actor_id`. Migration
`20260521230000_test_question_modified_audit.sql`. **Resolved in Phase 4
(this PR).**

### L2 — Rate-limit evaluation order differs from appendix §3 (contract drift, no security impact)

**Confidence: 80.** Appendix A §3 orders layers as L1 (per-IP/share)
→ L2 (global per-share) → L3 (daily). The implementation applies
L3 → L2 → L1 (verify-password.ts L172 comment acknowledges the
deliberate order swap for operational reasons). Security properties are
equivalent or better, but the response-semantics table in §3.2
(*"L1 only → 429 with `retry_after`; L1+L2 → 429 without"*) becomes
slightly inaccurate.

**Fix:** corrected in Appendix A as part of close-out. **No code change.**

## NOTES

- **N1** — Cookie attributes correct (Path / HttpOnly / Secure /
  SameSite / Max-Age). Test coverage confirms in `verify-password.test.ts`.
- **N2** — JWT claim schema matches §2.2 verbatim. Verifier rejects
  wrong `role` and wrong `iss` independently. `claims.sub === shareId`
  comparison performed in the route layer.
- **N3** — T4 hash-prefix guard exceeds spec — `hash_test_password`
  checks `$2a$`, `$2b$`, AND `$2y$` (spec listed only first two). `$2y$`
  is a valid bcrypt variant; conservative + correct.
- **N4** — Jitter applied on every response path including 5xx.
- **N5** — REVOKE/GRANT pattern correct on all three RPCs.
- **N6** — `send-invites.ts` calls `verify_test_password` RPC directly
  (not through `/api/tests/verify-password`), bypassing the rate-limit
  budget. Acceptable: the caller is the authenticated owner who already
  knows the password; this path is not anonymous.

## Summary

No HIGH findings. Two MEDIUM (M1 audit target_id fingerprint, M2
wrong_issuer observability) and one LOW (L1 missing
test_question_modified audit hook) addressed in Phase 4 (this PR). One
contract-drift (L2 rate-limit order) corrected in Appendix A.

Core brute-force defenses — 3-layer rate limiting, bcrypt + jitter,
REVOKE'd RPCs, ownership re-check, HS256 cookie — all correctly
implemented and match the contract.
