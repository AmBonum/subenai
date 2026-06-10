// Regression test for the 2026-05-22 incident: admin ticket detail
// rendered broken-image icons because the hook treated the RPC response
// as if it contained a `signed_url` field. The RPC actually returns
// `{storage_path, filename, mime_type, inline}` — signing the URL is a
// separate Storage client call. The hook must do both steps.
//
// What this test pins down:
//   1. The hook calls `supabase.rpc('request_attachment_signed_url',
//      { p_attachment_id, p_inline })`.
//   2. After receiving the RPC metadata, the hook calls
//      `supabase.storage.from('support-attachments').createSignedUrl(
//      storage_path, ttl, { download })` with disposition derived from
//      `inline` (false → download=false; true-download → filename).
//   3. The hook returns the `signedUrl` from the Storage client, NOT
//      anything from the RPC payload. (The bug was treating the RPC
//      payload as the signed URL.)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAttachmentSignedUrl } from "@/lib/admin/use-attachment-signed-url";

const rpcMock = vi.fn();
const createSignedUrlMock = vi.fn();
const fromMock = vi.fn((_bucket: string) => ({ createSignedUrl: createSignedUrlMock }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    storage: {
      from: (bucket: string) => fromMock(bucket),
    },
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ATT_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  rpcMock.mockReset();
  createSignedUrlMock.mockReset();
  fromMock.mockClear();
});

describe("useAttachmentSignedUrl — two-step RPC + Storage signing", () => {
  it("inline=true: signs URL with download=false and returns Storage signedUrl", async () => {
    rpcMock.mockResolvedValue({
      data: {
        storage_path: "tickets/t1/img.png",
        filename: "img.png",
        mime_type: "image/png",
        inline: true,
      },
      error: null,
    });
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://signed.example/inline.png?token=abc" },
      error: null,
    });

    const { result } = renderHook(
      () => useAttachmentSignedUrl(ATT_ID, { enabled: true, inline: true }),
      {
        wrapper,
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rpcMock).toHaveBeenCalledWith("request_attachment_signed_url", {
      p_attachment_id: ATT_ID,
      p_inline: true,
    });
    expect(fromMock).toHaveBeenCalledWith("support-attachments");
    expect(createSignedUrlMock).toHaveBeenCalledWith("tickets/t1/img.png", 15 * 60, {
      download: false,
    });
    expect(result.current.data?.signed_url).toBe("https://signed.example/inline.png?token=abc");
    expect(result.current.data?.filename).toBe("img.png");
    expect(result.current.data?.mime_type).toBe("image/png");
  });

  it("inline=false (download): signs URL with download=<filename>", async () => {
    rpcMock.mockResolvedValue({
      data: {
        storage_path: "tickets/t1/doc.pdf",
        filename: "doc.pdf",
        mime_type: "application/pdf",
        inline: false,
      },
      error: null,
    });
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://signed.example/dl.pdf?token=def" },
      error: null,
    });

    const { result } = renderHook(
      () => useAttachmentSignedUrl(ATT_ID, { enabled: true, inline: false }),
      {
        wrapper,
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rpcMock).toHaveBeenCalledWith("request_attachment_signed_url", {
      p_attachment_id: ATT_ID,
      p_inline: false,
    });
    expect(createSignedUrlMock).toHaveBeenCalledWith("tickets/t1/doc.pdf", 15 * 60, {
      download: "doc.pdf",
    });
    expect(result.current.data?.signed_url).toBe("https://signed.example/dl.pdf?token=def");
  });

  it("throws when RPC errors (admin/AAL2 gate, scan_status check, etc.)", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "not_authorized: aal2 required", code: "P0001" },
    });

    const { result } = renderHook(
      () => useAttachmentSignedUrl(ATT_ID, { enabled: true, inline: true }),
      {
        wrapper,
      },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it("throws when RPC returns metadata without storage_path", async () => {
    rpcMock.mockResolvedValue({
      data: { filename: "img.png", mime_type: "image/png", inline: true },
      error: null,
    });

    const { result } = renderHook(
      () => useAttachmentSignedUrl(ATT_ID, { enabled: true, inline: true }),
      {
        wrapper,
      },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it("throws when Storage signing fails", async () => {
    rpcMock.mockResolvedValue({
      data: {
        storage_path: "tickets/t1/img.png",
        filename: "img.png",
        mime_type: "image/png",
        inline: true,
      },
      error: null,
    });
    createSignedUrlMock.mockResolvedValue({
      data: null,
      error: { message: "storage failure" },
    });

    const { result } = renderHook(
      () => useAttachmentSignedUrl(ATT_ID, { enabled: true, inline: true }),
      {
        wrapper,
      },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("regression: does NOT treat RPC response as the signed URL", async () => {
    // The pre-fix bug: hook cast `data` as `AttachmentSignedUrl` and
    // returned it, so `q.data.signed_url` ended up undefined. This
    // assertion locks down that the hook reads from the Storage layer,
    // not the RPC layer.
    rpcMock.mockResolvedValue({
      data: {
        storage_path: "tickets/t1/img.png",
        filename: "img.png",
        mime_type: "image/png",
        inline: true,
        // Even if a (mistaken) signed_url field appeared in the RPC
        // payload, the hook MUST ignore it and use the Storage result.
        signed_url: "https://leak.example/should-not-be-used",
      },
      error: null,
    });
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://signed.example/correct.png" },
      error: null,
    });

    const { result } = renderHook(
      () => useAttachmentSignedUrl(ATT_ID, { enabled: true, inline: true }),
      {
        wrapper,
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.signed_url).toBe("https://signed.example/correct.png");
    expect(result.current.data?.signed_url).not.toContain("leak.example");
  });
});
