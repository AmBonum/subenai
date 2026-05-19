import { createLazyFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { BlogPostEditor } from "@/components/admin/blog/BlogPostEditor";

export const Route = createLazyFileRoute("/admin/blog/new")({
  component: AdminBlogNewPage,
});

function AdminBlogNewPage() {
  return (
    <div className="space-y-6" data-testid="admin-blog-new-root">
      <PageHeader title="Nový článok" description="Vyplň základné polia, ulož a potom publikuj." />
      <BlogPostEditor mode="create" />
    </div>
  );
}
