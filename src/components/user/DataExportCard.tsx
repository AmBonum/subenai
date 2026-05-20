// E42 / P-18 + P-28 — GDPR Art. 15 + 20 self-service export UI.
//
// Renders a card on /app/account/profile with a single button that
// downloads a JSON snapshot of the user's data via /api/account/export-data.
//
// The button:
//   1. Reads the current Supabase session token.
//   2. POSTs to /api/account/export-data with Authorization: Bearer.
//   3. If 200, the response body (JSON) becomes a Blob and triggers
//      a save-as on the browser (no server-side filename surface).
//   4. Errors surface via sonner toast.
//
// The component is intentionally minimal — no progress bar, no
// historical-export listing. Each click is a fresh request; the
// server returns the snapshot, the user gets a file.

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/app-shell";

const t = tFor("account.data_export");

export function DataExportCard() {
  const [pending, setPending] = useState(false);

  async function handleExport() {
    setPending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error(t("error_unauthorized"));
        return;
      }

      const response = await fetch("/api/account/export-data", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        toast.error(t("error_unauthorized"));
        return;
      }
      if (!response.ok) {
        toast.error(t("error_generic"));
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const link = document.createElement("a");
      link.href = url;
      link.download = `subenai-export-${today}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("success_toast"));
    } catch {
      toast.error(t("error_generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card data-testid="data-export-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="size-5" aria-hidden="true" />
          {t("card_title")}
        </CardTitle>
        <CardDescription>{t("card_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          data-testid="data-export-button"
          onClick={handleExport}
          disabled={pending}
          variant="secondary"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {t("downloading")}
            </>
          ) : (
            <>
              <Download className="mr-2 size-4" aria-hidden="true" />
              {t("button")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
