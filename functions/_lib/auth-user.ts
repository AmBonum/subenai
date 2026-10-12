import { createClient } from "@supabase/supabase-js";

import { PROD_SUPABASE_URL } from "./supabase-url";

export interface AuthUser {
  id: string;
  email: string;
}

/** Verifies the Supabase JWT with the auth server (getUser, never a local decode). */
export async function authenticateUser(
  jwt: string | null,
  anonKey: string,
): Promise<AuthUser | null> {
  if (!jwt) return null;
  const client = createClient(PROD_SUPABASE_URL, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}
