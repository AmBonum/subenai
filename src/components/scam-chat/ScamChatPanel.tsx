// E53.3 — the scam-chat conversation surface. Used both inside the
// floating Sheet and on the full-page /pomocnik route. Pure presentational
// over the useScamChat hook; all interactive elements carry data-testids
// per CLAUDE.md.

import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Send, ImagePlus, ShieldQuestion, X, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { tFor } from "@/i18n/scam-chat";
import { renderScamReportPdfBlob } from "@/lib/scam-report/render.client";
import { buildScamReportFilename } from "@/lib/scam-report/report-data";
import type { TriageAssessment } from "@/lib/scam-chat/client";

import type { ChatMessage, PhotoEvidence, UseScamChat } from "./useScamChat";

const t = tFor("scam-chat");

interface ScamChatPanelProps {
  chat: UseScamChat;
}

export function ScamChatPanel({ chat }: ScamChatPanelProps) {
  const { messages, photos, status, degraded, photoError, send, addPhoto, removePhoto } = chat;
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const sending = status === "sending";

  function submit(mode?: "chat" | "triage") {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void send(text, mode ? { mode } : undefined);
  }

  if (status === "quota") {
    return <QuotaState />;
  }

  return (
    <div className="flex h-full flex-col gap-3" data-testid="scam-chat-panel-body">
      <p
        className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
        data-testid="scam-chat-notice"
      >
        {t("notice")}
      </p>

      {degraded && (
        <Alert data-testid="scam-chat-degraded-notice">
          <AlertDescription>{t("degraded_notice")}</AlertDescription>
        </Alert>
      )}

      <div
        className="flex-1 space-y-3 overflow-y-auto"
        aria-live="polite"
        aria-atomic="false"
        data-testid="scam-chat-messages"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="scam-chat-empty">
            {t("empty_state")}
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} photos={photos} />)
        )}
        {sending && (
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-testid="scam-chat-typing"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("assistant_typing")}
          </p>
        )}
        {status === "error" && (
          <Alert variant="destructive" data-testid="scam-chat-error">
            <AlertDescription>{t("error_generic")}</AlertDescription>
          </Alert>
        )}
      </div>

      {photos.length > 0 && <PhotoStrip photos={photos} onRemove={removePhoto} />}

      {photoError && (
        <p className="text-xs text-destructive" data-testid="scam-chat-photo-error">
          {photoError === "cap"
            ? t("photo_cap")
            : photoError === "too_large"
              ? t("photo_too_large")
              : t("photo_bad_type")}
        </p>
      )}

      <div className="space-y-2">
        <label htmlFor="scam-chat-input" className="sr-only">
          {t("input_label")}
        </label>
        <Textarea
          id="scam-chat-input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t("input_placeholder")}
          disabled={sending}
          data-testid="scam-chat-input"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => submit()}
            disabled={sending || !draft.trim()}
            data-testid="scam-chat-send"
          >
            {sending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="mr-1.5 size-4" aria-hidden="true" />
            )}
            {sending ? t("sending") : t("send")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => submit("triage")}
            disabled={sending || !draft.trim()}
            data-testid="scam-chat-triage"
          >
            <ShieldQuestion className="mr-1.5 size-4" aria-hidden="true" />
            {t("triage_cta")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label={t("photo_aria")}
            data-testid="scam-chat-photo-add"
          >
            <ImagePlus className="mr-1.5 size-4" aria-hidden="true" />
            {t("photo_add")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            data-testid="scam-chat-photo-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void addPhoto(file);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, photos }: { message: ChatMessage; photos: PhotoEvidence[] }) {
  const isUser = message.role === "user";
  return (
    <div
      className={isUser ? "flex justify-end" : "flex justify-start"}
      data-testid={isUser ? "scam-chat-message-user" : "scam-chat-message-assistant"}
    >
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            : "max-w-[85%] space-y-2 rounded-lg bg-muted px-3 py-2 text-sm"
        }
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.triage && <TriageBlock triage={message.triage} photos={photos} />}
      </div>
    </div>
  );
}

function TriageBlock({ triage, photos }: { triage: TriageAssessment; photos: PhotoEvidence[] }) {
  const [generating, setGenerating] = useState(false);
  const riskLabel =
    triage.risk === "high"
      ? t("risk_high")
      : triage.risk === "medium"
        ? t("risk_medium")
        : t("risk_low");

  async function downloadPdf() {
    setGenerating(true);
    try {
      const blob = await renderScamReportPdfBlob({
        risk: triage.risk,
        indicators: triage.indicators,
        timeline: triage.timeline,
        evidence: triage.evidence,
        nextSteps: triage.next_steps,
        photos: photos
          .filter((p) => p.status === "done")
          // Full-res original for the report; chat keeps the downscaled thumb.
          .map((p) => ({ dataUrl: p.originalDataUrl, findings: p.findings ?? "" })),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildScamReportFilename();
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-2" data-testid="scam-chat-triage-result">
      <span
        className={
          triage.risk === "high"
            ? "inline-block rounded bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground"
            : "inline-block rounded bg-secondary px-2 py-0.5 text-xs font-semibold"
        }
        data-testid="scam-chat-triage-risk"
      >
        {riskLabel}
      </span>
      <TriageList label={t("triage_timeline")} items={triage.timeline} />
      <TriageList label={t("triage_indicators")} items={triage.indicators} />
      <TriageList label={t("triage_evidence")} items={triage.evidence} />
      <TriageList label={t("triage_next_steps")} items={triage.next_steps} />
      {triage.risk === "high" && (
        <Button
          type="button"
          size="sm"
          onClick={() => void downloadPdf()}
          disabled={generating}
          data-testid="scam-chat-download-pdf"
        >
          <FileDown className="mr-1.5 size-4" aria-hidden="true" />
          {generating ? t("generating_pdf") : t("download_pdf")}
        </Button>
      )}
    </div>
  );
}

function TriageList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <ul className="ml-4 list-disc text-xs">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PhotoStrip({
  photos,
  onRemove,
}: {
  photos: PhotoEvidence[];
  onRemove: (id: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-2" data-testid="scam-chat-photos">
      {photos.map((p) => (
        <li key={p.id} className="relative" data-testid="scam-chat-photo-thumb">
          <img src={p.dataUrl} alt="" className="size-14 rounded object-cover" />
          {p.status === "analyzing" && (
            <span className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
              <Loader2 className="size-4 animate-spin text-white" aria-hidden="true" />
              <span className="sr-only">{t("photo_analyzing")}</span>
            </span>
          )}
          {p.status === "skipped" && (
            <span
              className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-0.5 text-[8px] text-white"
              data-testid="scam-chat-photo-skipped"
            >
              {t("photo_degraded")}
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(p.id)}
            aria-label={t("photo_remove")}
            data-testid="scam-chat-photo-remove"
            className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function QuotaState() {
  return (
    <div className="flex h-full flex-col justify-center gap-4" data-testid="scam-chat-quota">
      <p className="text-sm" data-testid="scam-chat-quota-message">
        {t("quota_message")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link to="/courses" data-testid="scam-chat-quota-courses">
            {t("quota_courses")}
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/contact-form" data-testid="scam-chat-quota-contact">
            {t("quota_contact")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
