// E48-v3 PR-ATTACHMENT-VIEWER — TanStack Query wrapper around the
// `request_attachment_signed_url` RPC. Caches the URL for 12 minutes
// (signed URLs are issued by the RPC with a 15-minute TTL — staleTime
// stays comfortably under that so we never hand a near-expired URL to
// an <img>/<iframe> that needs to fetch it).
//
// The `inline` flag splits the cache: the same attachment ID has two
// independent entries — one for the inline-viewer URL (Content-
// Disposition: inline) and one for the download URL (attachment;
// filename=...). Both come from the SAME RPC but request a different
// Storage transform; the RPC contract is documented in
// supabase/migrations/20260522170000_e48_v3_multi_assignment.sql.

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface AttachmentSignedUrl {
  signed_url: string;
  expires_at: string;
}

export interface UseAttachmentSignedUrlOptions {
  enabled: boolean;
  inline?: boolean;
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
      return data as unknown as AttachmentSignedUrl;
    },
    enabled: options.enabled,
    staleTime: 12 * 60_000,
    gcTime: 14 * 60_000,
    refetchOnWindowFocus: false,
  });
}
