import { createFileRoute } from "@tanstack/react-router";

// E33 hotfix (2026-05-20) — pathless layout for the `/test/builder` subtree.
//
// Why this file exists: TanStack file-based routing auto-nests routes by
// shared file-name prefix. When Phase 0 renamed `/test/zostav` (composer)
// and `/test/zostava/$id` (respondent) into a shared `/test/builder` stem,
// `test.builder.$id.tsx` became a CHILD of `test.builder.tsx`. The previous
// composer leaf rendered no `<Outlet />`, so the child never mounted — a
// respondent visiting `/test/builder/$id` silently saw the composer UI
// instead of the intake form. Same regression class that hit the $id level
// on 2026-05-19; see `test.builder.$id.lazy.tsx` lines 7-11 for the
// documented precedent.
//
// The composer itself moved to `test.builder.index.tsx` / `.lazy.tsx`
// (route `/test/builder/`), matching the existing `tests.index.tsx`
// convention. This file is now pure structure: route config in `.tsx`,
// `<Outlet />` in `.lazy.tsx`.

export const Route = createFileRoute("/test/builder")({});
