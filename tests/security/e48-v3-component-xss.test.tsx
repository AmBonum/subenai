// E48-v3 security regression: XSS battery against admin UI components.
//
// React renders string children as text nodes — the DOM cannot interpret them
// as HTML. These tests lock that contract for every E48-v3 component that
// surfaces user-supplied strings (display_name, attachment filename) in the
// admin panel. window.__pwn is the canary: any script execution would set it.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { AssigneeChip } from "@/components/admin/common/AssigneeChip";
import { AdminPicker } from "@/components/admin/common/AdminPicker";
import { AssigneesCell } from "@/components/admin/queue/AssigneesCell";
import { AttachmentItem } from "@/components/admin/detail/AttachmentItem";

import {
  ADMIN_DISPLAY_NAME_PAYLOADS,
  PICKER_SEARCH_PAYLOADS,
  ATTACHMENT_FILENAME_PAYLOADS,
} from "./e48-payloads";

// Mock the signed-URL hook so AttachmentItem/ImagePreview/PdfPreview render
// synchronously without hitting Supabase.
vi.mock("@/lib/admin/use-attachment-signed-url", () => ({
  useAttachmentSignedUrl: (_id: string, opts: { enabled: boolean; inline?: boolean }) => ({
    data: {
      signed_url: `https://storage.supabase.co/signed/${_id}`,
      expires_at: "2099-01-01T00:00:00Z",
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...(opts.enabled === false ? { data: undefined } : {}),
  }),
}));

// Mock useAdminUsersList so AdminPicker renders without Supabase.
// The mock admins list is built per-test in describe scope.
const MOCK_ADMINS = ADMIN_DISPLAY_NAME_PAYLOADS.map((p, i) => ({
  user_id: `xss-admin-${i}`,
  email: `admin${i}@test.sk`,
  display_name: p,
}));

vi.mock("@/lib/admin/use-admin-users-list", () => ({
  useAdminUsersList: () => ({ data: MOCK_ADMINS }),
}));

beforeEach(() => {
  // Reset the canary before every test so prior executions don't mask failure.
  if (typeof window !== "undefined") {
    delete (window as unknown as Record<string, unknown>).__pwn;
  }
});

function noPwn() {
  expect((window as unknown as Record<string, unknown>).__pwn).toBeUndefined();
}

// ---------------------------------------------------------------------------
// AssigneeChip display_name XSS
// ---------------------------------------------------------------------------

describe("E48-v3 admin display_name XSS — AssigneeChip", () => {
  it.each(ADMIN_DISPLAY_NAME_PAYLOADS)(
    "chip renders payload as text, no script execution: %s",
    (payload) => {
      render(
        <AssigneeChip userId="u-xss" email="x@test.sk" displayName={payload} onRemove={() => {}} />,
      );
      noPwn();
      const chip = screen.getByTestId("admin-ticket-assignee-chip-u-xss");
      // The text content must contain the raw payload string literally, not
      // any browser-parsed derivative (e.g. empty string from a stripped tag).
      expect(chip.textContent).toContain(payload);
      // The DOM must NOT have an executable child element spawned by the payload.
      expect(chip.querySelector("script")).toBeNull();
      expect(chip.querySelector("img[onerror]")).toBeNull();
    },
  );
});

// ---------------------------------------------------------------------------
// AdminPicker display_name XSS — option labels
// ---------------------------------------------------------------------------

describe("E48-v3 admin display_name XSS — AdminPicker option labels", () => {
  it.each(ADMIN_DISPLAY_NAME_PAYLOADS)(
    "option renders payload as text, no script execution: %s",
    async (payload) => {
      const admin = MOCK_ADMINS.find((a) => a.display_name === payload)!;
      render(
        <AdminPicker trigger={<button>Open</button>} selectedAdminIds={[]} onSelect={() => {}} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Open" }));
      await waitFor(() => {
        expect(
          screen.getByTestId(`admin-ticket-assignment-option-${admin.user_id}`),
        ).toBeInTheDocument();
      });
      noPwn();
      const option = screen.getByTestId(`admin-ticket-assignment-option-${admin.user_id}`);
      expect(option.textContent).toContain(payload);
      expect(option.querySelector("script")).toBeNull();
    },
  );
});

// ---------------------------------------------------------------------------
// AdminPicker search input XSS
// ---------------------------------------------------------------------------

describe("E48-v3 admin display_name XSS — AdminPicker search input", () => {
  it.each(PICKER_SEARCH_PAYLOADS)(
    "typing payload into search causes no script execution: %s",
    async (payload) => {
      render(
        <AdminPicker
          trigger={<button>Open picker</button>}
          selectedAdminIds={[]}
          onSelect={() => {}}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Open picker" }));
      const input = await screen.findByTestId("admin-ticket-assignment-search");
      fireEvent.change(input, { target: { value: payload } });
      noPwn();
      // The search input value must be the raw string, not an executed payload.
      expect((input as HTMLInputElement).value).toBe(payload);
    },
  );
});

// ---------------------------------------------------------------------------
// AssigneesCell tooltip display_name XSS
// ---------------------------------------------------------------------------

describe("E48-v3 admin display_name XSS — AssigneesCell tooltip", () => {
  it.each(ADMIN_DISPLAY_NAME_PAYLOADS)(
    "tooltip aria-label contains payload as text: %s",
    (payload) => {
      const ticketId = "tkt-xss-cell";
      render(
        <AssigneesCell
          ticketId={ticketId}
          assignees={[
            { user_id: "u-cell", email: "cell@test.sk", display_name: payload },
            { user_id: "u-cell-2", email: "cell2@test.sk", display_name: "Normal Admin" },
          ]}
        />,
      );
      noPwn();
      const cell = screen.getByTestId(`admin-tickets-row-assigned-${ticketId}`);
      // aria-label is plain text (attribute) — cannot be HTML-injected.
      const label = cell.getAttribute("aria-label") ?? "";
      expect(label).toContain(payload);
      expect(cell.querySelector("script")).toBeNull();
    },
  );
});

// ---------------------------------------------------------------------------
// AttachmentItem filename XSS
// ---------------------------------------------------------------------------

describe("E48-v3 attachment filename XSS — AttachmentItem", () => {
  it.each(ATTACHMENT_FILENAME_PAYLOADS)(
    "filename renders as text, no script execution: %s",
    async (payload) => {
      const { rerender } = render(
        <AttachmentItem
          attachment={{
            id: "att-xss",
            filename: payload,
            mime_type: "image/png",
            size_bytes: 1024,
            scan_status: "clean",
          }}
          expanded={false}
          onToggle={() => {}}
          imageSiblings={[]}
        />,
      );
      noPwn();
      const filenameEl = screen.getByTestId("admin-ticket-attachment-filename-att-xss");
      expect(filenameEl.textContent).toBe(payload);
      expect(filenameEl.querySelector("script")).toBeNull();

      // Also verify the alt text when expanded (image preview rendered).
      rerender(
        <AttachmentItem
          attachment={{
            id: "att-xss",
            filename: payload,
            mime_type: "image/png",
            size_bytes: 1024,
            scan_status: "clean",
          }}
          expanded={true}
          onToggle={() => {}}
          imageSiblings={[{ id: "att-xss", filename: payload, mime_type: "image/png" }]}
        />,
      );
      noPwn();
      const img = document.querySelector<HTMLImageElement>(
        "[data-testid='admin-ticket-attachment-image-att-xss'] img",
      );
      if (img) {
        // alt is a plain attribute — browsers never execute it as markup.
        expect(img.getAttribute("alt")).toBe(`Príloha: ${payload}`);
        // Confirm the src is the safe mocked URL, not a javascript: URL.
        expect(img.getAttribute("src") ?? "").not.toMatch(/^javascript:/i);
      }
    },
  );
});
