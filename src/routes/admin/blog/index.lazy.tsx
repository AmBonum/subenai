import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { BlogListTable } from "@/components/admin/blog/BlogListTable";
import { Button } from "@/components/ui/button";
import { useAdminBlogPostList } from "@/lib/blog/admin-queries";

export const Route = createLazyFileRoute("/admin/blog/")({
  component: AdminBlogListPage,
});

function AdminBlogListPage() {
  const query = useAdminBlogPostList();

  if (query.error) {
    return <AdminListError error={query.error as Error} testId="admin-blog-list-error" />;
  }

  const posts = query.data ?? [];

  return (
    <div className="space-y-6" data-testid="admin-blog-list-root">
      <PageHeader
        title="Blog"
        description="Spravuj články: drafty, publikované, archivované."
        actions={
          <Button asChild data-testid="admin-blog-list-new">
            <Link to="/admin/blog/new">
              <Plus className="mr-2 size-4" />
              <AdminPageExplainer pageKey="blog" />
              Nový článok
            </Link>
          </Button>
        }
      />

      {query.isLoading && <AdminListLoading testId="admin-blog-list-loading" />}

      {!query.isLoading && posts.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-blog-list-empty">
          Zatiaľ žiadne články. Vytvor prvý cez tlačidlo „Nový článok".
        </p>
      )}

      {posts.length > 0 && <BlogListTable posts={posts} />}
    </div>
  );
}
