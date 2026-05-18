import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { tFor } from "@/i18n/quiz";

const TestFlow = lazy(() =>
  import("@/components/quiz/flow/TestFlow").then((m) => ({ default: m.TestFlow })),
);

export const Route = createFileRoute("/test/")({
  head: () => {
    const t = tFor("take");
    return {
      meta: [
        { title: t("meta_title") },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: TestPage,
});

function TestPage() {
  const t = tFor("take");
  return (
    <div className="min-h-screen bg-hero">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
            {t("loading")}
          </div>
        }
      >
        <TestFlow />
      </Suspense>
    </div>
  );
}
