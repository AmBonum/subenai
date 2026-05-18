import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// AH-11.1b swaps admin reads onto Supabase-backed TanStack Query hooks. Provide
// a default stub so admin tests that don't ship their own Supabase mock still
// render against seeded admin data. Tests that need a more specific stub
// (auth/role middleware, anything that exercises the real chainable shape)
// already `vi.mock("@/integrations/supabase/client", ...)` per-file, which
// hoists above this default and takes precedence.
vi.mock("@/integrations/supabase/client", async () => {
  const { makeAdminSupabaseStub } = await import("./utils/admin-supabase-mock");
  return { supabase: makeAdminSupabaseStub() };
});

// AH-11.1b also requires every render to sit under a QueryClientProvider so
// `useAdminX()` hooks can resolve. Mock @testing-library/react's `render` so
// every consumer (admin or not) is wrapped in a fresh QueryClient. Tests that
// pass an explicit `wrapper` option keep using their own — we layer the
// QueryClientProvider OUTSIDE the caller's wrapper so both apply.
vi.mock("@testing-library/react", async () => {
  const actual =
    await vi.importActual<typeof import("@testing-library/react")>("@testing-library/react");
  const { seedAdminQueryClient } = await import("./utils/admin-supabase-mock");
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "render") {
        return (
          ui: React.ReactElement,
          options?: Parameters<typeof actual.render>[1],
        ): ReturnType<typeof actual.render> => {
          const client = new QueryClient({
            defaultOptions: {
              queries: { retry: false, gcTime: 0, staleTime: 0 },
              mutations: { retry: false },
            },
          });
          // Pre-seed every admin query key with the same shape the production
          // hook would return. This means `useAdminX()` reads data SYNC on
          // first render and tests that assert on the table/list-state right
          // after `render(<Page />)` continue to find rows.
          seedAdminQueryClient(client);
          const InnerWrapper = options?.wrapper;
          const FullWrapper = ({ children }: { children: React.ReactNode }) =>
            React.createElement(
              QueryClientProvider,
              { client },
              InnerWrapper
                ? React.createElement(InnerWrapper, null, children)
                : (children as React.ReactNode),
            );
          return actual.render(ui, { ...options, wrapper: FullWrapper });
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
});

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
