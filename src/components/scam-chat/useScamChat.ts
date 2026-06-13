// E53.3/E53.5 — conversation state for the scam-chat widget.
//
// History lives ONLY in React state (no local/sessionStorage — asserted in
// a test). Photo thumbnails are object-URL-free data URLs kept here for the
// chat + the client-side PDF; any object URLs we create during downscale
// are revoked inside the downscale helper. On unmount nothing persists.

import { useCallback, useRef, useState } from "react";

import {
  sendChatMessage,
  uploadPhoto,
  type ChatTurn,
  type TriageAssessment,
} from "@/lib/scam-chat/client";
import {
  downscalePhoto,
  precheckPhoto,
  PHOTO_SESSION_CAP,
  type PhotoPrecheckError,
} from "@/lib/scam-chat/photo-client";

export type ChatStatus = "idle" | "sending" | "quota" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  triage?: TriageAssessment | null;
}

export interface PhotoEvidence {
  id: string;
  dataUrl: string;
  findings: string | null;
  status: "analyzing" | "done" | "error" | "skipped";
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `m${counter}`;
}

export interface UseScamChat {
  messages: ChatMessage[];
  photos: PhotoEvidence[];
  status: ChatStatus;
  degraded: boolean;
  photoError: PhotoPrecheckError | "cap" | null;
  send: (text: string, opts?: { mode?: "chat" | "triage" }) => Promise<void>;
  addPhoto: (file: File) => Promise<void>;
  removePhoto: (id: string) => void;
  reset: () => void;
}

// Turnstile token: resolved once on session start, then memoized so later
// turns skip the challenge (the gateway only verifies on empty history).
export function useScamChat(getTurnstileToken: () => string | null): UseScamChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [photos, setPhotos] = useState<PhotoEvidence[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [degraded, setDegraded] = useState(false);
  const [photoError, setPhotoError] = useState<PhotoPrecheckError | "cap" | null>(null);
  const historyRef = useRef<ChatTurn[]>([]);

  const send = useCallback(
    async (text: string, opts?: { mode?: "chat" | "triage" }) => {
      const trimmed = text.trim();
      if (!trimmed || status === "sending") return;
      setStatus("sending");
      setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }]);
      const sessionStart = historyRef.current.length === 0;
      const photoFindings = photos
        .map((p) => p.findings)
        .filter((f): f is string => typeof f === "string" && f.length > 0);

      const result = await sendChatMessage({
        message: trimmed,
        history: historyRef.current,
        turnstileToken: sessionStart ? getTurnstileToken() : undefined,
        mode: opts?.mode,
        photoFindings: photoFindings.length > 0 ? photoFindings : undefined,
      });

      if (result.kind === "quota") {
        setStatus("quota");
        return;
      }
      if (result.kind === "error") {
        setStatus("error");
        return;
      }

      const { data } = result;
      setDegraded(data.degraded);
      const nextHistory: ChatTurn[] = [
        ...historyRef.current,
        { role: "user", content: trimmed },
        { role: "assistant", content: data.reply },
      ];
      historyRef.current = nextHistory.slice(-12);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: data.reply,
          citations: data.citations,
          triage: data.triage ?? null,
        },
      ]);
      setStatus("idle");
    },
    [status, photos, getTurnstileToken],
  );

  const addPhoto = useCallback(
    async (file: File) => {
      setPhotoError(null);
      if (photos.length >= PHOTO_SESSION_CAP) {
        setPhotoError("cap");
        return;
      }
      const pre = precheckPhoto(file);
      if (pre) {
        setPhotoError(pre);
        return;
      }
      const index = photos.length;
      let downscaled;
      try {
        downscaled = await downscalePhoto(file);
      } catch {
        setPhotoError("bad_type");
        return;
      }
      const id = nextId();
      setPhotos((prev) => [
        ...prev,
        { id, dataUrl: downscaled.dataUrl, findings: null, status: "analyzing" },
      ]);
      const res = await uploadPhoto(downscaled.blob, index);
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          if (res.kind !== "ok") return { ...p, status: "error" };
          if (!res.analyzed) return { ...p, status: "skipped" };
          return { ...p, findings: res.findings, status: "done" };
        }),
      );
      if (res.kind === "ok" && res.degraded) setDegraded(true);
    },
    [photos],
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setPhotos([]);
    setStatus("idle");
    setDegraded(false);
    setPhotoError(null);
    historyRef.current = [];
  }, []);

  return { messages, photos, status, degraded, photoError, send, addPhoto, removePhoto, reset };
}
