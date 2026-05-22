// E48-v3 PR-ATTACHMENT-VIEWER — unit tests for the admin inline
// attachment viewer. Mocks `useAttachmentSignedUrl` so the RPC is not
// hit and the component renders synchronously against deterministic
// signed-URL strings.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { AttachmentViewer } from "@/components/admin/detail/AttachmentViewer";
import type { AttachmentItemAttachment } from "@/components/admin/detail/AttachmentItem";

// Per-test control of the signed-URL hook so we can simulate loading,
// success, and error states without spinning up a fake supabase client.
type HookResult = {
  data?: { signed_url: string; expires_at: string };
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};
const hookResults = new Map<string, HookResult>();

vi.mock("@/lib/admin/use-attachment-signed-url", () => ({
  useAttachmentSignedUrl: (id: string, options: { enabled: boolean; inline?: boolean }) => {
    const key = `${id}::${options.inline ? "inline" : "attachment"}`;
    rpcCalls.push({ id, inline: options.inline ?? false, enabled: options.enabled });
    return (
      hookResults.get(key) ?? {
        data: { signed_url: `https://signed.example/${key}`, expires_at: "2099-01-01" },
        isLoading: false,
        isError: false,
        refetch: () => {},
      }
    );
  },
}));

const rpcCalls: Array<{ id: string; inline: boolean; enabled: boolean }> = [];
const windowOpen = vi.fn();

beforeEach(() => {
  hookResults.clear();
  rpcCalls.length = 0;
  windowOpen.mockReset();
  vi.stubGlobal("open", windowOpen);
});

function img(id: string, filename = "photo.png"): AttachmentItemAttachment {
  return {
    id,
    filename,
    mime_type: "image/png",
    size_bytes: 12_345,
    scan_status: "clean",
  };
}

function pdf(id: string, filename = "doc.pdf"): AttachmentItemAttachment {
  return {
    id,
    filename,
    mime_type: "application/pdf",
    size_bytes: 50_000,
    scan_status: "clean",
  };
}

describe("AttachmentViewer (E48-v3 PR-ATTACHMENT-VIEWER)", () => {
  it("hides the section entirely when there are zero attachments", () => {
    render(<AttachmentViewer attachments={[]} />);
    expect(screen.queryByTestId("admin-ticket-attachment-viewer")).not.toBeInTheDocument();
  });

  it("renders header with count, total size, and toggle-all", () => {
    render(<AttachmentViewer attachments={[img("a"), pdf("b")]} />);
    expect(screen.getByTestId("admin-ticket-attachment-viewer-heading").textContent).toBe(
      "Prílohy (2)",
    );
    expect(screen.getByTestId("admin-ticket-attachment-viewer-total").textContent).toContain(
      "Spolu:",
    );
    expect(screen.getByTestId("admin-ticket-attachment-viewer-toggle-all")).toBeInTheDocument();
  });

  it("renders 1 image attachment with an <img> and opens lightbox on click", async () => {
    render(<AttachmentViewer attachments={[img("img-1", "screen.png")]} />);
    const trigger = screen.getByTestId("admin-ticket-attachment-image-img-1");
    expect(trigger).toBeInTheDocument();
    const inner = trigger.querySelector("img");
    expect(inner).not.toBeNull();
    expect(inner!.getAttribute("alt")).toBe("Príloha: screen.png");
    fireEvent.click(trigger);
    expect(await screen.findByTestId("admin-ticket-attachment-lightbox")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ticket-attachment-lightbox-image")).toBeInTheDocument();
  });

  it("closes the lightbox on Escape", async () => {
    render(<AttachmentViewer attachments={[img("img-2", "screen.png")]} />);
    fireEvent.click(screen.getByTestId("admin-ticket-attachment-image-img-2"));
    expect(await screen.findByTestId("admin-ticket-attachment-lightbox")).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
    await waitFor(() =>
      expect(screen.queryByTestId("admin-ticket-attachment-lightbox")).not.toBeInTheDocument(),
    );
  });

  it("renders a PDF as a sandboxed <iframe> with descriptive title", () => {
    render(<AttachmentViewer attachments={[pdf("pdf-1", "invoice.pdf")]} />);
    const iframe = screen.getByTestId("admin-ticket-attachment-pdf-pdf-1") as HTMLIFrameElement;
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe.getAttribute("title")).toBe("Príloha PDF: invoice.pdf");
    const sandbox = iframe.getAttribute("sandbox") ?? "";
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).toContain("allow-same-origin");
    expect(iframe.getAttribute("loading")).toBe("lazy");
  });

  it("expands the first attachment by default and collapses the rest", () => {
    render(<AttachmentViewer attachments={[img("a"), img("b"), pdf("c")]} />);
    expect(screen.getByTestId("admin-ticket-attachment-body-a")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-ticket-attachment-body-b")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-ticket-attachment-body-c")).not.toBeInTheDocument();
  });

  it("toggles an attachment when its header button is clicked", () => {
    render(<AttachmentViewer attachments={[img("a"), pdf("b")]} />);
    const toggleB = screen.getByTestId("admin-ticket-attachment-toggle-b");
    fireEvent.click(toggleB);
    expect(screen.getByTestId("admin-ticket-attachment-body-b")).toBeInTheDocument();
    fireEvent.click(toggleB);
    expect(screen.queryByTestId("admin-ticket-attachment-body-b")).not.toBeInTheDocument();
  });

  it("renders loading skeleton while signed URL is in flight", () => {
    hookResults.set("loading-1::inline", {
      isLoading: true,
      isError: false,
      refetch: () => {},
    });
    render(<AttachmentViewer attachments={[img("loading-1")]} />);
    expect(
      screen.getByTestId("admin-ticket-attachment-image-loading-loading-1"),
    ).toBeInTheDocument();
  });

  it("renders error state with retry button when RPC fails", () => {
    const refetch = vi.fn();
    hookResults.set("err-1::inline", { isLoading: false, isError: true, refetch });
    render(<AttachmentViewer attachments={[img("err-1")]} />);
    const errBox = screen.getByTestId("admin-ticket-attachment-image-error-err-1");
    expect(errBox.textContent).toContain("Súbor sa nepodarilo načítať");
    fireEvent.click(screen.getByTestId("admin-ticket-attachment-image-retry-err-1"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("download button triggers an inline:false signed-URL request and opens the URL", async () => {
    render(<AttachmentViewer attachments={[img("dl-1", "file.png")]} />);
    rpcCalls.length = 0;
    fireEvent.click(screen.getByTestId("admin-ticket-attachment-download-dl-1"));
    await waitFor(() => {
      expect(rpcCalls.some((c) => c.id === "dl-1" && c.inline === false && c.enabled)).toBe(true);
    });
    await waitFor(() => {
      expect(windowOpen).toHaveBeenCalledWith(
        "https://signed.example/dl-1::attachment",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  it("renders the scan-status badge with the right Slovak label per status", () => {
    const variants: AttachmentItemAttachment[] = [
      { ...img("p"), scan_status: "pending" },
      { ...img("c"), scan_status: "clean" },
      { ...img("i"), scan_status: "infected" },
      { ...img("e"), scan_status: "error" },
    ];
    render(<AttachmentViewer attachments={variants} />);
    expect(screen.getByTestId("admin-ticket-attachment-scan-p").textContent).toBe("Sken prebieha");
    expect(screen.getByTestId("admin-ticket-attachment-scan-c").textContent).toBe("Bezpečné");
    expect(screen.getByTestId("admin-ticket-attachment-scan-i").textContent).toBe("Škodlivé");
    expect(screen.getByTestId("admin-ticket-attachment-scan-e").textContent).toBe("Sken zlyhal");
  });

  it("blocks rendering and shows an infected warning for scan_status=infected", () => {
    const att: AttachmentItemAttachment = { ...img("inf-1"), scan_status: "infected" };
    render(<AttachmentViewer attachments={[att]} />);
    expect(screen.getByTestId("admin-ticket-attachment-infected-inf-1")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-ticket-attachment-image-inf-1")).not.toBeInTheDocument();
  });

  it("lightbox supports prev/next navigation between sibling images (PDFs excluded)", async () => {
    render(
      <AttachmentViewer
        attachments={[img("i1", "a.png"), pdf("p1"), img("i2", "b.png"), img("i3", "c.png")]}
      />,
    );
    // Open lightbox from the first image.
    fireEvent.click(screen.getByTestId("admin-ticket-attachment-image-i1"));
    expect(await screen.findByTestId("admin-ticket-attachment-lightbox")).toBeInTheDocument();
    // Three image siblings → counter shows "1 / 3".
    expect(screen.getByTestId("admin-ticket-attachment-lightbox-counter").textContent).toBe(
      "1 / 3",
    );
    fireEvent.click(screen.getByTestId("admin-ticket-attachment-lightbox-next"));
    expect(screen.getByTestId("admin-ticket-attachment-lightbox-counter").textContent).toBe(
      "2 / 3",
    );
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByTestId("admin-ticket-attachment-lightbox-counter").textContent).toBe(
      "3 / 3",
    );
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByTestId("admin-ticket-attachment-lightbox-counter").textContent).toBe(
      "2 / 3",
    );
  });
});
