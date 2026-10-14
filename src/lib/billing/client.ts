import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import { isActiveSubscription, type OrgSubscription } from "./plans";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; data: Record<string, unknown> };

export async function callBillingApi<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) return { ok: false, status: 401, error: "not_signed_in", data: {} };
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, error: "network_error", data: {} };
  }
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON body (e.g. an edge error page) — the status code still tells the story.
  }
  if (!res.ok) {
    const error = typeof data.error === "string" ? data.error : `http_${res.status}`;
    return { ok: false, status: res.status, error, data };
  }
  return { ok: true, data: data as T };
}

export interface OrgBillingState {
  subscription: (OrgSubscription & { cancel_at_period_end: boolean }) | null;
  usedInPeriod: number;
}

export const orgBillingQueryKey = ["billing", "org-subscription"] as const;

const POLL_MS = 3000;
const POLL_MAX_UPDATES = 40;

/** pollUntilActive: right after Stripe checkout, until the webhook has written the row. */
export function useOrgBilling(options: { pollUntilActive?: boolean } = {}) {
  return useQuery<OrgBillingState>({
    queryKey: orgBillingQueryKey,
    refetchInterval: (query) => {
      if (!options.pollUntilActive || query.state.dataUpdateCount > POLL_MAX_UPDATES) return false;
      return isActiveSubscription(query.state.data?.subscription ?? null, new Date())
        ? false
        : POLL_MS;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_subscriptions")
        .select(
          "plan, status, respondent_cap, current_period_start, current_period_end, cancel_at_period_end",
        )
        .order("current_period_end", { ascending: false })
        .limit(1);
      if (error) throw new Error(error.message);
      const subscription = data?.[0] ?? null;
      if (!subscription) return { subscription: null, usedInPeriod: 0 };
      const { data: reports, error: repErr } = await supabase
        .from("evidence_reports")
        .select("session_ids")
        .gte("created_at", subscription.current_period_start);
      if (repErr) throw new Error(repErr.message);
      const counted = new Set((reports ?? []).flatMap((r) => r.session_ids));
      return { subscription, usedInPeriod: counted.size };
    },
  });
}
