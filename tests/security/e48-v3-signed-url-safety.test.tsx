// E48-v3 security regression: signed URL injection safety.
//
// Behavior under test:
//   - React does NOT sanitize <img src> or <iframe src> (only <a href> is
//     blocked). A malicious signed URL therefore reaches the DOM attribute.
//   - jsdom evaluates javascript: src on iframes via its loadFrame path and
//     React logs "React has blocked a javascript: URL" to console.error for
//     <a href> only. For <img>/<iframe> React is silent but the URL is set.
//   - Our threat model: no user-controlled JS executes. window.__pwn is the
//     canary. If a payload like `javascript:window.__pwn=1` were executed, the
//     canary would be set. We assert it is not.
//   - Iframe sandbox ("allow-scripts allow-same-origin allow-popups") is the
//     correct mitigation; CSP frame-src is the network-level backstop.
//     These tests lock the sandbox attributes as a contract.
//
// console.error is silenced during these tests to keep the output clean; the
// "React has blocked a javascript: URL" message is expected and not a failure.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { AttachmentImagePreview } from "@/components/admin/detail/AttachmentImagePreview";
import { AttachmentPdfPreview } from "@/components/admin/detail/AttachmentPdfPreview";

type HookReturn = {
  data?: { signed_url: string; expires_at: string };
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const hookReturn: { current: HookReturn } = {
  current: {
    data: { signed_url: "https://storage.supabase.co/safe", expires_at: "2099-01-01" },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
};

vi.mock("@/lib/admin/use-attachment-signed-url", () => ({
  useAttachmentSignedUrl: () => hookReturn.current,
}));

const safeDefault = (): HookReturn => ({
  data: { signed_url: "https://storage.supabase.co/safe", expires_at: "2099-01-01" },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

beforeEach(() => {
  hookReturn.current = safeDefault();
  if (typeof window !== "undefined") {
    delete (window as Record<string, unknown>).__pwn;
  }
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Payloads that would execute JS if not blocked. The canary `__pwn` is set by
// the payload if execution occurs; we assert it remains undefined after render.
const EXEC_PAYLOADS = [
  "javascript:window.__pwn=1",
  "JAVASCRIPT:window.__pwn=1",
  // Tab-mangled variant (whitespace tricks)
  "javascript\t:window.__pwn=1",
];

// Additional non-executable malicious URLs that should not crash the component.
const MALICIOUS_NON_EXEC = [
  "data:text/html,<script>alert(1)</script>",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "vbscript:msgbox(1)",
];

// ---------------------------------------------------------------------------
// AttachmentImagePreview
// ---------------------------------------------------------------------------

describe("E48-v3 signed URL safety — AttachmentImagePreview", () => {
  it.each(EXEC_PAYLOADS)(
    "canary is not set when javascript: URL is supplied as signed URL: %s",
    (url) => {
      hookReturn.current = {
        data: { signed_url: url, expires_at: "2099-01-01" },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
      render(
        <AttachmentImagePreview
          attachmentId="att-safe"
          filename="photo.png"
          siblings={[{ id: "att-safe", filename: "photo.png" }]}
        />,
      );
      // Primary assertion: no code executed from the URL.
      expect((window as Record<string, unknown>).__pwn).toBeUndefined();
    },
  );

  it.each(MALICIOUS_NON_EXEC)(
    "component renders without crashing for non-exec malicious URL: %s",
    (url) => {
      hookReturn.current = {
        data: { signed_url: url, expires_at: "2099-01-01" },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
      // Must not throw — component renders an <img> with the URL as src.
      expect(() =>
        render(
          <AttachmentImagePreview
            attachmentId="att-data"
            filename="photo.png"
            siblings={[{ id: "att-data", filename: "photo.png" }]}
          />,
        ),
      ).not.toThrow();
      expect((window as Record<string, unknown>).__pwn).toBeUndefined();
    },
  );

  it("renders error state when hook returns no data", () => {
    hookReturn.current = { isLoading: false, isError: true, refetch: vi.fn() };
    render(<AttachmentImagePreview attachmentId="att-err" filename="photo.png" siblings={[]} />);
    expect(screen.getByTestId("admin-ticket-attachment-image-error-att-err")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AttachmentPdfPreview — iframe sandbox contract
// ---------------------------------------------------------------------------

describe("E48-v3 signed URL safety — AttachmentPdfPreview", () => {
  it("iframe sandbox allows only the minimum required permissions for PDF.js", () => {
    render(<AttachmentPdfPreview attachmentId="att-pdf-sandbox" filename="doc.pdf" />);
    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    const sandbox = iframe!.getAttribute("sandbox") ?? "";
    // Required for PDF.js native renderer.
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).toContain("allow-same-origin");
    expect(sandbox).toContain("allow-popups");
    // Must NOT grant broader permissions.
    expect(sandbox).not.toContain("allow-top-navigation");
    expect(sandbox).not.toContain("allow-forms");
    expect(sandbox).not.toContain("allow-pointer-lock");
    expect(sandbox).not.toContain("allow-modals");
  });

  it.each(EXEC_PAYLOADS)(
    "canary is not set when javascript: URL is supplied as signed URL: %s",
    (url) => {
      hookReturn.current = {
        data: { signed_url: url, expires_at: "2099-01-01" },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
      render(<AttachmentPdfPreview attachmentId="att-pdf-exec" filename="doc.pdf" />);
      // jsdom may try to evaluate the iframe src but must not execute __pwn.
      expect((window as Record<string, unknown>).__pwn).toBeUndefined();
    },
  );

  it.each(MALICIOUS_NON_EXEC)(
    "component renders without crashing for non-exec malicious URL: %s",
    (url) => {
      hookReturn.current = {
        data: { signed_url: url, expires_at: "2099-01-01" },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
      expect(() =>
        render(<AttachmentPdfPreview attachmentId="att-pdf-data" filename="doc.pdf" />),
      ).not.toThrow();
      expect((window as Record<string, unknown>).__pwn).toBeUndefined();
    },
  );

  it("renders error state when hook returns no data", () => {
    hookReturn.current = { isLoading: false, isError: true, refetch: vi.fn() };
    render(<AttachmentPdfPreview attachmentId="att-pdf-err" filename="doc.pdf" />);
    expect(screen.getByTestId("admin-ticket-attachment-pdf-error-att-pdf-err")).toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
  });
});
