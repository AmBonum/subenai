// Public-by-link RLS regression for `public.test_sets`.
//
// Pinned by the 2026-05-22 incident: a signed-in user clicking the
// "Link pre respondentov" copied from `EduSuccessDialog` saw "Test
// nenájdený". Root cause: the original `TO anon USING (true)` SELECT
// policy never applied to `authenticated` requests, and E38's owner-
// scoped `TO authenticated USING (owner_id = auth.uid())` policy
// excluded non-owner viewers. The fix migration
// `20260522210000_test_sets_authenticated_public_select.sql` adds an
// additive `TO authenticated USING (true)` SELECT policy mirroring
// the anon contract.
//
// This spec proves the contract holds for all three viewer shapes:
//   * anonymous respondent  → row visible
//   * authenticated non-owner (different user clicked the link) → row visible
//   * authenticated owner  → row visible
//
// Insert is done via the service-role client so the test is
// independent of any rate-limited API endpoint. Cleanup runs in
// `afterAll` using the service-role client; on failure the row stays
// (id is randomised so re-runs don't collide).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getLocalSupabase, isReachable, type LocalSupabaseFixture } from "./setup-supabase";

let fixture: LocalSupabaseFixture | null = null;
let alive = false;

// Created once for the suite — keep all three viewer flavours.
let ownerClient: SupabaseClient | null = null;
let nonOwnerClient: SupabaseClient | null = null;
let ownerUserId: string | null = null;
let nonOwnerUserId: string | null = null;
let testSetId: string | null = null;

const OWNER_EMAIL = `rls-owner-${Date.now()}@test.local`;
const NONOWNER_EMAIL = `rls-nonowner-${Date.now()}@test.local`;
const PASSWORD = "Public-by-link-rls-test-pw";

beforeAll(async () => {
  fixture = getLocalSupabase();
  if (!fixture) return;
  alive = await isReachable(fixture.anon);
  if (!alive) return;

  // 1. Create both auth users via service-role admin API.
  const owner = await fixture.serviceRole.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (owner.error || !owner.data.user) {
    throw new Error(`owner createUser failed: ${owner.error?.message}`);
  }
  ownerUserId = owner.data.user.id;

  const nonOwner = await fixture.serviceRole.auth.admin.createUser({
    email: NONOWNER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (nonOwner.error || !nonOwner.data.user) {
    throw new Error(`nonOwner createUser failed: ${nonOwner.error?.message}`);
  }
  nonOwnerUserId = nonOwner.data.user.id;

  // 2. Mint per-user authenticated clients (separate JWTs).
  const anonKey = process.env.SUPABASE_ANON_KEY!;
  ownerClient = createClient(fixture.url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await ownerClient.auth.signInWithPassword({ email: OWNER_EMAIL, password: PASSWORD });

  nonOwnerClient = createClient(fixture.url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await nonOwnerClient.auth.signInWithPassword({ email: NONOWNER_EMAIL, password: PASSWORD });

  // 3. Insert a public-by-link test_set owned by `owner`.
  const { data, error } = await fixture.serviceRole
    .from("test_sets")
    .insert({
      question_ids: ["f-ig-crypto-1"],
      passing_threshold: 60,
      max_questions: 5,
      creator_label: "RLS regression",
      source_pack_slugs: null,
      collects_responses: true,
      owner_id: ownerUserId,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`insert test_set failed: ${error?.message}`);
  }
  testSetId = data.id as string;
});

afterAll(async () => {
  if (!fixture) return;
  if (testSetId) {
    await fixture.serviceRole.from("test_sets").delete().eq("id", testSetId);
  }
  if (ownerUserId) await fixture.serviceRole.auth.admin.deleteUser(ownerUserId);
  if (nonOwnerUserId) await fixture.serviceRole.auth.admin.deleteUser(nonOwnerUserId);
});

describe("test_sets public-by-link RLS contract", () => {
  it.skipIf(!alive)("anonymous viewer can read by id", async () => {
    expect(testSetId).not.toBeNull();
    const { data, error } = await fixture!.anon
      .from("test_sets")
      .select("id, owner_id")
      .eq("id", testSetId!)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(testSetId);
  });

  it.skipIf(!alive)(
    "authenticated non-owner viewer can read by id (regression for 2026-05-22 bug)",
    async () => {
      expect(testSetId).not.toBeNull();
      const { data, error } = await nonOwnerClient!
        .from("test_sets")
        .select("id, owner_id")
        .eq("id", testSetId!)
        .maybeSingle();
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.id).toBe(testSetId);
    },
  );

  it.skipIf(!alive)("authenticated owner can read their own set by id", async () => {
    expect(testSetId).not.toBeNull();
    const { data, error } = await ownerClient!
      .from("test_sets")
      .select("id, owner_id")
      .eq("id", testSetId!)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.owner_id).toBe(ownerUserId);
  });
});
