# Courses — `/courses` + `/courses/$slug` — test plan

**Area:** `specs/quiz/`
**Routes:** `/courses` (catalog), `/courses/$slug` (detail)
**Components:** `src/routes/courses.index.tsx`, `src/routes/courses.$slug.tsx`, `src/components/courses/{CourseCard,CourseHero}.tsx`
**Data:** static bundle `src/content/courses/` (no DB read)
**Source stories:** _Phase 5 of `/app + header redesign` (course recommendations) + course catalog content epic_
**Last updated:** 2026-05-19

---

## Context

Anon, static content surface. `/courses` lists every course in the
imported `COURSES` bundle as a grid of `CourseCard`s, with a search
input + topic filter chips. Both filter mechanisms are client-side
(no PostgREST fetch). `/courses/$slug` renders the full course
detail — hero + sections + CTAs + related courses. Invalid slug
throws `notFound()` which the `__root` route catches and renders
the global 404 component.

## Out of scope

- The `RelatedCourses` recommender ranking algorithm.
- The `RelatedAcademyArticleCard` cross-link (E17.3, separate plan).
- JSON-LD content correctness (covered by `tests/lib/seo/`).
- Print-only CTA hiding (`print:hidden`).

---

## TC-01: Catalog renders with heading, search input, and course grid

**Prerequisites**: anon visit to `/courses`, viewport 1280×800.
**When** the page mounts
**Then** the root + heading + search input are visible
**and** the grid is visible with at least 4 course cards (the bundle has 8+).

## TC-02: Search query narrows the grid to matching titles

**Prerequisites**: on `/courses`.
**When** the user types `"phishing"` into the search input
**Then** at least one course card matching `phishing-101` remains visible
**and** the total visible card count drops below the unfiltered count.

## TC-03: Search query with no match shows empty state

**Prerequisites**: on `/courses`.
**When** the user types `"xxxx-nonsense-zzzz"`
**Then** the grid is absent and the empty-state region is visible.

## TC-04: Valid slug renders course detail with hero + title + tagline

**Prerequisites**: anon visit to `/courses/phishing-101` (a known bundle slug).
**Then** the detail root is visible
**and** the title + tagline elements render the seeded course's text.

## TC-05: Invalid slug renders the global 404 component

**Prerequisites**: anon visit to `/courses/no-such-course-9999`.
**Then** the global 404 root (`not-found-root` or `app-shell-not-found`) renders
**and** the course-detail root is NOT in the DOM.
