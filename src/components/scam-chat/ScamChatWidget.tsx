// E53.3 — floating launcher + Sheet panel. Mounted once in __root.tsx so
// it rides every public route and the /app shell (NOT /admin — see the
// gate in __root). The Sheet (Radix Dialog) gives us a focus trap and
// Escape-to-close for free; aria-live for incoming messages lives in the
// panel.

import { useRef, useState } from "react";
import { MessageCircleWarning } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TurnstileWidget } from "@/components/common/TurnstileWidget";
import { tFor } from "@/i18n/scam-chat";

import { ScamChatPanel } from "./ScamChatPanel";
import { useScamChat } from "./useScamChat";

const t = tFor("scam-chat");

export function ScamChatWidget() {
  const [open, setOpen] = useState(false);
  const turnstileTokenRef = useRef<string | null>(null);
  const chat = useScamChat(() => turnstileTokenRef.current);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("launcher_aria")}
          data-testid="scam-chat-launcher"
          // E56 — sit above the mobile bottom-nav (raised on small screens so
          // the launcher never overlaps the Menu tab); back to bottom-4 from lg.
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 lg:bottom-4"
        >
          <MessageCircleWarning className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">{t("launcher_label")}</span>
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col sm:max-w-md"
          closeTestId="scam-chat-close"
          data-testid="scam-chat-panel"
        >
          <SheetHeader>
            <SheetTitle data-testid="scam-chat-title">{t("panel_title")}</SheetTitle>
            <SheetDescription>{t("panel_description")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <ScamChatPanel chat={chat} />
          </div>
          {/* Turnstile only needs to run once per session (gateway verifies
              on empty history). Rendered when the panel is open; resolves a
              token the first send picks up. */}
          <div className="pt-2">
            <TurnstileWidget onToken={(tok) => (turnstileTokenRef.current = tok)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
