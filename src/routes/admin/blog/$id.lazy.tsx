import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { BlogPostEditor } from "@/components/admin/blog/BlogPostEditor";
import { useAdminBlogPost } from "@/lib/blog/admin-queries";

export const Route = createLazyFileRoute("/admin/blog/$id")({
  component: AdminBlogEditPage,
});

function AdminBlogEditPage() {
  const { id } = useParams({ from: "/admin/blog/$id" });
  const query = useAdminBlogPost(id);

  if (query.isLoading) {
    return <AdminListLoading testId="admin-blog-edit-loading" />;
  }

  if (query.isError) {
    return <AdminListError error={query.error as Error} testId="admin-blog-edit-error" />;
  }

  const post = query.data;
  if (!post) {
    return (
      <div className="space-y-4" data-testid="admin-blog-edit-not-found">
        <p>Článok neexistuje.</p>
        <Link to="/admin/blog" className="underline">
          Späť na zoznam
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-blog-edit-root">
      <PageHeader
        title={post.title || "Bez názvu"}
        description={`Slug: ${post.slug} · Kategória: ${post.category.name}`}
      />
      <BlogPostEditor mode="edit" existing={post} />
    </div>
  );
}
