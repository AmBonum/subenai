import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { TakeTestFlow } from "@/components/respondent/TakeTestFlow";
import { RespondentPasswordGate } from "@/components/respondent/RespondentPasswordGate";
import { takeTestFn } from "@/lib/respondent/take-test.functions";
import { getTestByShareId } from "@/lib/respondent/mock-store";
import { tFor } from "@/i18n/respondent-flow";
import { tFor as tQuiz } from "@/i18n/quiz";

const tRoutes = tQuiz("route_titles");

type PreflightState =
  | { status: "loading" }
  | { status: "open" }
  | { status: "gated"; reason: string | null }
  | { status: "verified" };

/**
 * Preflight against /api/tests/check-password — tells us whether this
 * test is password-locked AND whether we already hold a valid cookie.
 * Fail-open on network errors: if the preflight 500s we'd rather render
 * the gate (and let the user enter the password) than block the test
 * entirely. The verify endpoint itself is the security boundary.
 */
function usePasswordPreflight(shareId: string): PreflightState {
  const [state, setState] = useState<PreflightState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void (async () => {
      try {
        const res = await fetch(
          `/api/tests/check-password?share_id=${encodeURIComponent(shareId)}`,
          { credentials: "include" },
        );
        if (cancelled) return;
        if (!res.ok) {
          // Open by default on preflight 5xx — verify endpoint still gates writes.
          setState({ status: "open" });
          return;
        }
        const body = (await res.json()) as {
          has_password?: boolean;
          gated?: boolean;
          reason?: string;
        };
        if (cancelled) return;
        if (!body.has_password) {
          setState({ status: "open" });
        } else if (body.gated) {
          setState({ status: "gated", reason: body.reason ?? null });
        } else {
          setState({ status: "verified" });
        }
      } catch {
        if (!cancelled) setState({ status: "open" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  return state;
}

export const Route = createFileRoute("/t/$shareId")({
  head: () => ({
    meta: [{ title: tRoutes("take") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: PublicTakeTestPage,
});

function PublicTakeTestPage() {
  const { shareId } = Route.useParams();
  const nav = useNavigate();
  const tErr = tFor("errors");

  // Two-step lookup so we exercise the safe-column projection in the same
  // path AH-11 will swap to. `takeTestFn` is the boundary that becomes the
  // supabaseAdmin call; the platform mock-store gives us question_ids for
  // render (AH-11 returns them in the safe projection too).
  if (shareId.length < 8 || shareId.length > 64) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        data-testid="respondent-flow-error-not-found"
      >
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p>{tErr("not_found")}</p>
            <Link to="/" className="text-primary underline">
              {tErr("back_home")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  let safe;
  try {
    safe = takeTestFn({ shareId });
  } catch {
    safe = null;
  }
  const test = safe ? getTestByShareId(shareId) : null;
  if (!safe || !test) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        data-testid="respondent-flow-error-not-found"
      >
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <p>{tErr("not_found")}</p>
            <Link to="/" className="text-primary underline">
              {tErr("back_home")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PasswordGuardedTake
      shareId={shareId}
      safe={safe}
      questionIds={test.question_ids}
      onClose={() => nav({ to: "/" })}
    />
  );
}

function PasswordGuardedTake({
  shareId,
  safe,
  questionIds,
  onClose,
}: {
  shareId: string;
  safe: ReturnType<typeof takeTestFn>;
  questionIds: string[];
  onClose: () => void;
}) {
  const preflight = usePasswordPreflight(shareId);
  const [optimisticVerified, setOptimisticVerified] = useState(false);

  if (preflight.status === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        data-testid="respondent-flow-preflight-loading"
        aria-busy="true"
      >
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">…</CardContent>
        </Card>
      </div>
    );
  }

  if (preflight.status === "gated" && !optimisticVerified) {
    return (
      <RespondentPasswordGate
        shareId={shareId}
        reason={preflight.reason}
        onVerified={() => setOptimisticVerified(true)}
      />
    );
  }

  if (!safe) {
    return null;
  }

  return <TakeTestFlow test={safe} questionIds={questionIds} shareId={shareId} onClose={onClose} />;
}
