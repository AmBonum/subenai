import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, ShieldX } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/billing";
import { formatSkDate } from "@/lib/billing/evidence-types";

const t = tFor("verify");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/overenie/$reportId")({
  head: () => ({
    meta: [{ title: t("meta_title") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { reportId } = Route.useParams();
  const valid = UUID_RE.test(reportId);
  const query = useQuery({
    queryKey: ["evidence-verify", reportId],
    enabled: valid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_evidence_report", { p_id: reportId });
      if (error) throw new Error(error.message);
      return data?.[0] ?? null;
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-12" data-testid="verify-main">
      <h1 className="text-2xl font-bold" data-testid="verify-title">
        {t("title")}
      </h1>
      <div className="mt-6" aria-live="polite">
        {valid && query.isPending ? (
          <p className="text-muted-foreground" data-testid="verify-loading">
            {t("loading")}
          </p>
        ) : valid && query.isError ? (
          <p role="alert" className="text-destructive" data-testid="verify-error">
            {t("error_text")}
          </p>
        ) : !valid || !query.data ? (
          <section
            className="rounded-2xl border border-destructive/50 p-6"
            data-testid="verify-invalid"
          >
            <h2 className="flex items-center gap-2 font-semibold text-destructive">
              <ShieldX className="h-5 w-5" aria-hidden /> {t("invalid_title")}
            </h2>
            <p className="mt-2 text-sm">{t("invalid_text")}</p>
          </section>
        ) : (
          <section
            className="space-y-4 rounded-2xl border border-emerald-600/40 p-6"
            data-testid="verify-valid"
          >
            <h2 className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" aria-hidden /> {t("valid_title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("valid_text")}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("org")}</dt>
              <dd data-testid="verify-org">{query.data.org_name}</dd>
              <dt className="text-muted-foreground">{t("test")}</dt>
              <dd data-testid="verify-test">
                {query.data.test_title} ({t("version", { version: query.data.test_version })})
              </dd>
              <dt className="text-muted-foreground">{t("issued")}</dt>
              <dd data-testid="verify-issued">{formatSkDate(query.data.created_at)}</dd>
              <dt className="text-muted-foreground">{t("respondents")}</dt>
              <dd data-testid="verify-counts">
                {query.data.respondent_count} ({t("passed")} {query.data.passed_count})
              </dd>
              <dt className="text-muted-foreground">{t("hash")}</dt>
              <dd className="break-all font-mono text-xs" data-testid="verify-hash">
                {query.data.content_sha256}
              </dd>
            </dl>
            <p className="text-xs text-muted-foreground">{t("privacy_note")}</p>
          </section>
        )}
      </div>
    </main>
  );
}
