// E48-v3 PR-ATTACHMENT-VIEWER — TanStack Query wrapper that:
//   1. Calls `request_attachment_signed_url` RPC for the permission +
//      scan-status check (admin AAL2 only, clean files only). The RPC
//      returns `{storage_path, filename, mime_type, inline}` — NOT a
//      signed URL. plpgsql cannot issue Storage URLs.
//   2. Calls supabase.storage.createSignedUrl() on the returned path
//      with the disposition derived from `inline`.
//
// `inline` splits the cache so the same attachment id has two
// independent entries — one for the inline-viewer URL (renders inside
// <img>/<iframe>), one for the download URL (forces Content-Disposition:
// attachment with the original filename).

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface AttachmentSignedUrl {
  signed_url: string;
  expires_at: string;
  filename: string;
  mime_type: string;
}

export interface UseAttachmentSignedUrlOptions {
  enabled: boolean;
  inline?: boolean;
}

const STORAGE_BUCKET = "support-attachments";
// Storage signed URL TTL — kept ≤ the hook's staleTime (12 min) so we
// never hand a near-expired URL to an <img>/<iframe> that needs to
// fetch it. 15 min matches the comment in the RPC body.
const SIGNED_URL_TTL_SECONDS = 15 * 60;

interface AttachmentMetadata {
  storage_path: string;
  filename: string;
  mime_type: string;
  inline: boolean;
}

export function useAttachmentSignedUrl(
  attachmentId: string,
  options: UseAttachmentSignedUrlOptions,
) {
  const inline = options.inline ?? false;
  return useQuery<AttachmentSignedUrl>({
    queryKey: ["attachment-signed-url", attachmentId, inline ? "inline" : "attachment"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("request_attachment_signed_url", {
        p_attachment_id: attachmentId,
        p_inline: inline,
      });
      if (error) throw error;
      const meta = data as unknown as AttachmentMetadata;
      if (!meta?.storage_path) {
        throw new Error("Attachment metadata missing storage_path");
      }

      // download=false → Content-Disposition: inline (browser renders
      // <img>/<iframe> in place). download=<filename> → attachment +
      // original filename so the browser saves it under the right name.
      const { data: signed, error: signErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(meta.storage_path, SIGNED_URL_TTL_SECONDS, {
          download: inline ? false : meta.filename,
        });
      if (signErr) throw signErr;
      if (!signed?.signedUrl) {
        throw new Error("Storage did not return a signed URL");
      }

      return {
        signed_url: signed.signedUrl,
        expires_at: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
        filename: meta.filename,
        mime_type: meta.mime_type,
      };
    },
    enabled: options.enabled,
    staleTime: 12 * 60_000,
    gcTime: 14 * 60_000,
    refetchOnWindowFocus: false,
  });
}
