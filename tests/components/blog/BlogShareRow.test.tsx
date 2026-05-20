import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/browser/clipboard", () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock("@/lib/analytics/blog-events", () => ({
  trackBlogShareClick: vi.fn(),
}));

import { BlogShareRow } from "@/components/blog/BlogShareRow";
import { copyToClipboard } from "@/lib/browser/clipboard";
import { trackBlogShareClick } from "@/lib/analytics/blog-events";

const copyToClipboardMock = copyToClipboard as unknown as ReturnType<typeof vi.fn>;
const trackBlogShareClickMock = trackBlogShareClick as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  copyToClipboardMock.mockReset();
  trackBlogShareClickMock.mockReset();
});

describe("BlogShareRow", () => {
  it("renders the three external share intents + the copy button", () => {
    render(<BlogShareRow url="https://subenai.sk/blog/x" title="X" />);
    expect(screen.getByTestId("blog-share-twitter")).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByTestId("blog-share-facebook")).toBeInTheDocument();
    expect(screen.getByTestId("blog-share-linkedin")).toBeInTheDocument();
    expect(screen.getByTestId("blog-share-copy")).toHaveTextContent(/kopírovať odkaz/);
  });

  it("successful copy flips the button label to 'skopírované ✓' and emits analytics", async () => {
    copyToClipboardMock.mockResolvedValue(true);
    render(<BlogShareRow url="https://subenai.sk/blog/y" title="Y" postSlug="y" />);
    fireEvent.click(screen.getByTestId("blog-share-copy"));
    await waitFor(() => {
      expect(screen.getByTestId("blog-share-copy")).toHaveTextContent(/skopírované ✓/);
    });
    expect(trackBlogShareClickMock).toHaveBeenCalledWith({
      post_slug: "y",
      platform: "copy_link",
    });
    // The manual fallback must NOT appear when copy worked.
    expect(screen.queryByTestId("blog-share-copy-fallback")).toBeNull();
  });

  it("clipboard failure surfaces the inline readonly input (no window.prompt)", async () => {
    copyToClipboardMock.mockResolvedValue(false);
    const promptSpy = vi.spyOn(window, "prompt");
    render(<BlogShareRow url="https://subenai.sk/blog/z" title="Z" />);
    fireEvent.click(screen.getByTestId("blog-share-copy"));
    const fallback = await screen.findByTestId("blog-share-copy-fallback");
    expect(fallback).toHaveAttribute("role", "status");
    expect(fallback).toHaveAttribute("aria-live", "polite");
    const input = screen.getByTestId("blog-share-copy-fallback-input") as HTMLInputElement;
    expect(input.value).toBe("https://subenai.sk/blog/z");
    expect(input.readOnly).toBe(true);
    // Native prompt MUST stay un-called — that's the whole point of
    // this refactor.
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it("dismissing the fallback removes it from the DOM", async () => {
    copyToClipboardMock.mockResolvedValue(false);
    render(<BlogShareRow url="https://subenai.sk/blog/q" title="Q" />);
    fireEvent.click(screen.getByTestId("blog-share-copy"));
    await screen.findByTestId("blog-share-copy-fallback");
    fireEvent.click(screen.getByTestId("blog-share-copy-fallback-dismiss"));
    expect(screen.queryByTestId("blog-share-copy-fallback")).toBeNull();
  });
});
