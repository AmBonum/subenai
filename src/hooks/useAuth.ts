// Lightweight client-side auth context for header/footer gating.
//
// AH-9.8 — mock-only in this epic. Subscribes to the Supabase auth
// session on the client and exposes `{ isAuthenticated, isAdmin }`.
// SSR-safe: returns the unauthenticated shape on the server, then
// rehydrates after mount so anonymous renders stay stable.
//
// TODO(AH-11): swap inner subscription to read the actual `app_roles`
// table via has_role() RPC instead of the user metadata fallback used
// here as a placeholder.

import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const UNAUTH: AuthState = { isAuthenticated: false, isAdmin: false };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(UNAUTH);

  useEffect(() => {
    let cancelled = false;

    const apply = (session: { user?: { app_metadata?: { role?: string } } } | null) => {
      if (cancelled) return;
      if (!session?.user) {
        setState(UNAUTH);
        return;
      }
      const role = session.user.app_metadata?.role;
      setState({ isAuthenticated: true, isAdmin: role === "admin" });
    };

    // Defensive: in test mocks `supabase.auth` may be undefined.
    const auth = (supabase as { auth?: typeof supabase.auth }).auth;
    if (!auth?.getSession) {
      apply(null);
      return () => {
        cancelled = true;
      };
    }

    auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch(() => apply(null));

    const { data: sub } = auth.onAuthStateChange((_event, session) => apply(session));

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
