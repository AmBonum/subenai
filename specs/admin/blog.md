# Admin blog routes — test plan

**Routes under test:** `/admin/blog`, `/admin/blog/new`, `/admin/blog/$id`

**Component(s) under test:**
- `src/routes/admin/blog/index.lazy.tsx`
- `src/routes/admin/blog/new.lazy.tsx`
- `src/routes/admin/blog/$id.lazy.tsx`
- `src/components/admin/blog/BlogListTable.tsx`
- `src/components/admin/blog/BlogPostEditor.tsx`

**Spec file:** `e2e/specs/admin/blog.spec.ts`

**POM:** `e2e/poms/admin/AdminBlogPage.ts`

---

## Stub detection

- `/admin/blog` — REAL. Renders a full `BlogListTable` with toolbar, search, filters, and the "Nový článok" CTA button.
- `/admin/blog/new` — REAL (not a stub). Renders `BlogPostEditor mode="create"` with a complete multi-field form. The `PageHeader` title is "Nový článok".
- `/admin/blog/$id` — REAL. Renders `BlogPostEditor mode="edit"` for a seeded post, or a not-found state when the id is unknown.

---

## Happy paths

### TC-01: `/admin/blog` empty state — no posts seeded

**Prerequisites:** Admin session. `blog_posts` table seeded with zero rows. `blog_categories` and `blog_authors` empty.

**When** the user navigates to `/admin/blog`.

**Then** the page root (`admin-blog-list-root`) is visible.

**and** the empty-state paragraph (`admin-blog-list-empty`) is visible with text "Zatiaľ žiadne články. Vytvor prvý cez tlačidlo „Nový článok"."

**and** the "Nový článok" button (`admin-blog-list-new`) is visible.

---

### TC-02: `/admin/blog` populated list — post rows render

**Prerequisites:** Admin session. `blog_posts` seeded with one draft post (slug `test-artikel`, title "Test Artikel"). `blog_categories` seeded with one category. `blog_authors` seeded with one author.

**When** the user navigates to `/admin/blog`.

**Then** the table root (`admin-blog-table-root`) is visible.

**and** the row for slug `test-artikel` (`admin-blog-list-row-test-artikel`) is visible.

**and** the row link (`admin-blog-list-row-link-test-artikel`) has text "Test Artikel".

**and** the result count paragraph (`admin-blog-result-count`) contains text "Zobrazených 1 článkov".

---

### TC-03: `/admin/blog/new` renders the create form

**Prerequisites:** Admin session. `blog_categories` seeded with one category (id `cat-1`, name "AI"). `blog_authors` seeded with one author (id `aut-1`, display_name "Jana").

**When** the user navigates to `/admin/blog/new`.

**Then** the page root (`admin-blog-new-root`) is visible.

**and** the page-header title (`admin-page-header-title`) has text "Nový článok".

**and** the editor root (`admin-blog-editor-root`) is visible.

**and** the title input (`admin-blog-editor-title`) is visible and empty.

**and** the slug input (`admin-blog-editor-slug`) is visible and empty.

**and** the "Vytvoriť" save button (`admin-blog-editor-save`) is visible.

---

### TC-04: `/admin/blog/$id` renders a seeded post

**Prerequisites:** Admin session. `blog_posts` seeded with one published post (id `post-1`, title "Živý článok", slug `zivy-artikel`). `blog_categories` seeded. `blog_authors` seeded.

**When** the user navigates to `/admin/blog/post-1`.

**Then** the edit page root (`admin-blog-edit-root`) is visible.

**and** the page-header title (`admin-page-header-title`) has text "Živý článok".

**and** the editor root (`admin-blog-editor-root`) is visible.

**and** the title input (`admin-blog-editor-title`) has value "Živý článok".

**and** the status label (`admin-blog-editor-status-label`) contains text "publikované".

---

## Edge cases

### TC-05: "Nový článok" CTA on `/admin/blog` navigates to `/admin/blog/new`

**Prerequisites:** Admin session. `blog_posts` empty. `blog_categories` and `blog_authors` empty.

**When** the user navigates to `/admin/blog` and sees the empty state.

**and** clicks the "Nový článok" button (`admin-blog-list-new`).

**Then** the URL changes to `/admin/blog/new`.
