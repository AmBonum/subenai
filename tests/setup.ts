import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement layout/scroll APIs that React components reach
// for during smooth-scroll UX (Element.scrollIntoView, Element.scrollTo).
// Stub them globally so a test that triggers an expand/scroll flow does
// not surface a TypeError from inside a setTimeout that runs after the
// assertion is already done.
if (typeof window !== "undefined") {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  // jsdom DOES define window.scrollTo, but its implementation logs
  // "Not implemented" to stderr — overwrite unconditionally so QuestionCard's
  // scroll-reset effect (and similar UX hooks) doesn't pollute test output.
  window.scrollTo = (() => {}) as typeof window.scrollTo;

  // Radix Popover / Select pull in @radix-ui/react-use-size which observes its
  // target via ResizeObserver. jsdom does not implement it, so any test that
  // renders a Select/Popover (e.g. QuestionEditor, library filters) throws on
  // layout commit. A no-op stub is enough for unit tests.
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  // Radix Select also calls hasPointerCapture on the trigger; jsdom Elements
  // don't implement Pointer Events. Stub the methods used by Radix.
  if (typeof Element.prototype.hasPointerCapture === "undefined") {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (typeof Element.prototype.releasePointerCapture === "undefined") {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (typeof Element.prototype.setPointerCapture === "undefined") {
    Element.prototype.setPointerCapture = () => {};
  }
}

afterEach(() => {
  cleanup();
});
