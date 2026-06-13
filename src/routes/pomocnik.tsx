// E53.3 — full-page scam-chat entry. The floating launcher mounts in
// __root.tsx; this route gives the assistant a dedicated, shareable URL.

import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { SITE_ORIGIN } from "@/config/site";
import { TurnstileWidget } from "@/components/common/TurnstileWidget";
import { ScamChatPanel } from "@/components/scam-chat/ScamChatPanel";
import { useScamChat } from "@/components/scam-chat/useScamChat";
import { tFor } from "@/i18n/scam-chat";

const t = tFor("scam-chat");

const PAGE_URL = `${SITE_ORIGIN}/pomocnik`;
const PAGE_TITLE = "Podvodový poradca | subenai";
const PAGE_DESCRIPTION =
  "AI poradca pre ochranu pred podvodmi. Opíšte situáciu a nechajte si preveriť podozrenie na podvod.";

export const Route = createFileRoute("/pomocnik")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:url", content: PAGE_URL },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: PomocnikRoute,
});

function PomocnikRoute() {
  const turnstileTokenRef = useRef<string | null>(null);
  const chat = useScamChat(() => turnstileTokenRef.current);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold" data-testid="pomocnik-title">
          {t("panel_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("panel_description")}</p>
      </header>
      <div className="flex min-h-[60vh] flex-col rounded-lg border border-border p-4">
        <ScamChatPanel chat={chat} />
      </div>
      <TurnstileWidget onToken={(tok) => (turnstileTokenRef.current = tok)} />
    </main>
  );
}
