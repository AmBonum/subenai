import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

      {posts.length > 0 && (
        <div className="rounded-lg border border-border" data-testid="admin-blog-list-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulok</TableHead>
                <TableHead>Kategória</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Publikované</TableHead>
                <TableHead>Aktualizované</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id} data-testid={`admin-blog-list-row-${post.slug}`}>
                  <TableCell>
                    <Link
                      to="/admin/blog/$id"
                      params={{ id: post.id }}
                      className="font-medium underline-offset-2 hover:underline"
                      data-testid={`admin-blog-list-row-link-${post.slug}`}
                    >
                      {post.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{post.slug}</p>
                  </TableCell>
                  <TableCell>{post.category.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={post.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("sk-SK")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(post.updated_at).toLocaleDateString("sk-SK")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
