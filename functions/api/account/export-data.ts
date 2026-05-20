// E42 / P-18 + P-28 — GDPR Art. 15 + Art. 20 self-service export endpoint.
//
// User flow:
//   1. Authenticated user clicks "Download my data" on /app/account/profile.
//   2. Browser POSTs to /api/account/export-data with the user's
//      Supabase access token in the Authorization header.
//   3. This handler calls the `export_my_data()` RPC against Supabase
//      using a service-role client (the RPC itself runs as
//      SECURITY DEFINER but reads auth.uid() — which is null when
//      called with service-role credentials — so we forward the
//      user's JWT by creating a per-request client with the user's
//      access token).
//   4. Response body is the JSON snapshot; Content-Disposition
//      forces a file download with a date-stamped filename.

import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const auth = request.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "missing_authorization" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Per-request client carrying the user's JWT so the RPC's auth.uid()
  // resolves to the correct subject. ANON key + Bearer token is the
  // documented Supabase pattern for user-scoped RPC calls.
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("export_my_data");

  if (error) {
    // 401 if RPC raised the 'unauthorized' SQLSTATE (anonymous caller).
    const status = error.code === "42501" || /unauthorized/i.test(error.message) ? 401 : 500;
    return new Response(JSON.stringify({ error: error.message, code: error.code ?? null }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="subenai-export-${today}.json"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
};
