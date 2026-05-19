import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { trackEvent, trackPageView } from "@/lib/analytics/gtag";

describe("gtag wrapper", () => {
  let gtagSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gtagSpy = vi.fn();
    (window as unknown as { gtag: typeof gtagSpy }).gtag = gtagSpy;
  });

  afterEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it("forwards event name + params to gtag", () => {
    trackEvent("test_event", { foo: "bar", count: 3 });
    expect(gtagSpy).toHaveBeenCalledWith("event", "test_event", { foo: "bar", count: 3 });
  });

  it("forwards an empty object when no params provided", () => {
    trackEvent("no_params");
    expect(gtagSpy).toHaveBeenCalledWith("event", "no_params", {});
  });

  it("is a no-op when window.gtag is missing", () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    expect(() => trackEvent("orphan")).not.toThrow();
    expect(gtagSpy).not.toHaveBeenCalled();
  });

  it("swallows errors thrown by gtag (privacy extension etc.)", () => {
    gtagSpy.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => trackEvent("crash_test")).not.toThrow();
  });

  it("trackPageView fires page_view with path + title + location", () => {
    trackPageView({ path: "/blog", title: "Blog", location: "https://example.test/blog" });
    expect(gtagSpy).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/blog",
      page_title: "Blog",
      page_location: "https://example.test/blog",
    });
  });
});
