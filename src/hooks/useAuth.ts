// Lightweight client-side auth context for header/footer gating.
//
// Subscribes to the Supabase auth session and verifies admin membership
// via the `has_role(user_id, 'admin')` security-definer RPC (AH-1.1).
// Reading `user_roles` directly is blocked by RLS — has_role is the only
// safe path. SSR-safe: returns the unauthenticated shape on the server,
// then rehydrates after mount so anonymous renders stay stable.
//
// `isAdmin` starts `false` even for an authenticated user and only flips
// `true` after the RPC resolves. This is intentional — UI gates default
// to the more restrictive state during the resolve window so an admin
// link can never render before its check completes.

import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const UNAUTH: AuthState = { isAuthenticated: false, isAdmin: false };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(UNAUTH);

  useEffect(() => {
    let cancelled = false;

    const apply = async (session: Session | null) => {
      if (cancelled) return;
      if (!session?.user) {
        setState(UNAUTH);
        return;
      }
      // Reveal authenticated first; admin probe runs in parallel.
      setState({ isAuthenticated: true, isAdmin: false });
      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        });
        if (cancelled) return;
        setState({ isAuthenticated: true, isAdmin: !error && data === true });
      } catch {
        if (cancelled) return;
        setState({ isAuthenticated: true, isAdmin: false });
      }
    };

    // Defensive: in test mocks `supabase.auth` may be undefined.
    const auth = (supabase as { auth?: typeof supabase.auth }).auth;
    if (!auth?.getSession) {
      void apply(null);
      return () => {
        cancelled = true;
      };
    }

    auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch(() => apply(null));

    const { data: sub } = auth.onAuthStateChange((_event, session) => {
      void apply(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
