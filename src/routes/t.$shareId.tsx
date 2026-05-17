import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { Card, CardContent } from "@/components/ui/card";
import { TakeTestFlow } from "@/components/respondent/TakeTestFlow";
import { takeTestFn } from "@/lib/respondent/take-test.functions";
import { getTestByShareId } from "@/lib/respondent/mock-store";
import { tFor } from "@/i18n/respondent-flow";

export const Route = createFileRoute("/t/$shareId")({
  head: () => ({
    meta: [{ title: "SubenAI — vypĺňanie testu" }, { name: "robots", content: "noindex,nofollow" }],
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
    <TakeTestFlow test={safe} questionIds={test.question_ids} onClose={() => nav({ to: "/" })} />
  );
}
