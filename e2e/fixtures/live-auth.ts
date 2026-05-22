/**
 * E49 Phase 1c-2 — helpers for live-Supabase integration specs.
 *
 * For API-only specs (no `page` fixture), `mintLiveAccessToken` calls the
 * password grant endpoint against the local Supabase and returns a real
 * Supabase-issued JWT the spec attaches as `Authorization: Bearer <jwt>`.
 *
 * For UI-driving specs, `primeLiveAuthSession` mints a real session and
 * writes it into localStorage under `sb-<projectRef>-auth-token` BEFORE
 * navigation — same shape as `primeAuthSession` in `auth.ts` but with
 * real tokens instead of the synthetic mocks.
 */

import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { E49_PASSWORD, E49_USERS } from "./e49-fixtures";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIVE_STATE_FILE = path.resolve(HERE, "../../.e2e-live-supabase/state.json");

export interface LiveSupabaseState {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  projectRef: string;
  cfApiBaseUrl: string;
  previewBaseUrl: string;
  rateLimitAuthor: string;
  rateLimitIp: string;
}

export function readLiveState(): LiveSupabaseState | null {
  if (!existsSync(LIVE_STATE_FILE)) return null;
  try {
    const raw = readFileSync(LIVE_STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<LiveSupabaseState>;
    if (!parsed.supabaseUrl || !parsed.anonKey) return null;
    return parsed as LiveSupabaseState;
  } catch {
    return null;
  }
}

export interface LiveTokenResult {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: { id: string; email: string };
}

export type E49UserHandle = "educatorA" | "educatorB" | "respondent" | "admin";

export async function mintLiveAccessToken(
  request: APIRequestContext,
  handle: E49UserHandle,
  state: LiveSupabaseState,
): Promise<LiveTokenResult> {
  const user = E49_USERS[handle];
  const res = await request.post(`${state.supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: state.anonKey,
      "content-type": "application/json",
    },
    data: { email: user.email, password: E49_PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(
      `mintLiveAccessToken(${handle}): ${res.status()} ${await res.text().catch(() => "")}`,
    );
  }
  return (await res.json()) as LiveTokenResult;
}

export function authStorageKey(projectRef: string): string {
  return `sb-${projectRef}-auth-token`;
}

export async function primeLiveAuthSession(
  context: BrowserContext,
  request: APIRequestContext,
  handle: E49UserHandle,
  state: LiveSupabaseState,
): Promise<LiveTokenResult> {
  const token = await mintLiveAccessToken(request, handle, state);
  const storageKey = authStorageKey(state.projectRef);
  await context.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value);
    },
    { key: storageKey, value: JSON.stringify(token) },
  );
  return token;
}
