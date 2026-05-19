import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SourcesEditor } from "@/components/admin/blog/SourcesEditor";
import { RelatedCoursePicker } from "@/components/admin/blog/RelatedCoursePicker";
import type { BlogPostSource } from "@/lib/blog/queries";
import {
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  usePublishBlogPost,
  useUnpublishBlogPost,
  useArchiveBlogPost,
  useBlogCategoriesList,
  useBlogAuthorsList,
  type AdminBlogPostDetail,
  type AdminBlogPostInput,
  type BlogPostStatus,
} from "@/lib/blog/admin-queries";

type FormState = {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  body_mdx: string;
  category_id: string;
  author_id: string;
  hero_image_url: string;
  og_image_url: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  primary_keyword: string;
  search_intent: string;
  reading_minutes: string;
  sources: BlogPostSource[];
  related_course_slug: string;
  status: BlogPostStatus;
};

function detailToForm(post: AdminBlogPostDetail): FormState {
  return {
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle ?? "",
    excerpt: post.excerpt,
    body_mdx: post.body_mdx,
    category_id: post.category_id,
    author_id: post.author_id,
    hero_image_url: post.hero_image_url ?? "",
    og_image_url: post.og_image_url ?? "",
    seo_title: post.seo_title ?? "",
    seo_description: post.seo_description ?? "",
    canonical_url: post.canonical_url ?? "",
    primary_keyword: post.primary_keyword ?? "",
    search_intent: post.search_intent ?? "",
    reading_minutes: post.reading_minutes != null ? String(post.reading_minutes) : "",
    sources: post.sources_jsonb,
    related_course_slug: post.related_course_slug ?? "",
    status: post.status,
  };
}

function emptyForm(categoryId: string, authorId: string): FormState {
  return {
    slug: "",
    title: "",
    subtitle: "",
    excerpt: "",
    body_mdx: "",
    category_id: categoryId,
    author_id: authorId,
    hero_image_url: "",
    og_image_url: "",
    seo_title: "",
    seo_description: "",
    canonical_url: "",
    primary_keyword: "",
    search_intent: "",
    reading_minutes: "",
    sources: [],
    related_course_slug: "",
    status: "draft",
  };
}

function formToInput(state: FormState): AdminBlogPostInput {
  return {
    slug: state.slug.trim(),
    title: state.title.trim(),
    subtitle: state.subtitle.trim() || null,
    excerpt: state.excerpt.trim(),
    body_mdx: state.body_mdx,
    category_id: state.category_id,
    author_id: state.author_id,
    pillar_post_id: null,
    hero_image_url: state.hero_image_url.trim() || null,
    og_image_url: state.og_image_url.trim() || null,
    seo_title: state.seo_title.trim() || null,
    seo_description: state.seo_description.trim() || null,
    canonical_url: state.canonical_url.trim() || null,
    primary_keyword: state.primary_keyword.trim() || null,
    search_intent: state.search_intent.trim() || null,
    reading_minutes:
      state.reading_minutes.trim().length > 0 ? Number.parseInt(state.reading_minutes, 10) : null,
    sources_jsonb: state.sources,
    related_course_slug: state.related_course_slug.trim() || null,
    status: state.status,
    published_at: state.status === "published" ? new Date().toISOString() : null,
  };
}

export function BlogPostEditor({
  mode,
  existing,
}: {
  mode: "create" | "edit";
  existing?: AdminBlogPostDetail;
}) {
  const categoriesQuery = useBlogCategoriesList();
  const authorsQuery = useBlogAuthorsList();
  const create = useCreateBlogPost();
  const update = useUpdateBlogPost();
  const remove = useDeleteBlogPost();
  const publish = usePublishBlogPost();
  const unpublish = useUnpublishBlogPost();
  const archive = useArchiveBlogPost();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const defaultCategoryId = categoriesQuery.data?.[0]?.id ?? "";
  const defaultAuthorId = authorsQuery.data?.[0]?.id ?? "";

  const [form, setForm] = useState<FormState>(() =>
    existing ? detailToForm(existing) : emptyForm(defaultCategoryId, defaultAuthorId),
  );

  if (categoriesQuery.isLoading || authorsQuery.isLoading) {
    return <p data-testid="admin-blog-editor-loading">Načítavam…</p>;
  }

  if (mode === "create" && !form.category_id && defaultCategoryId) {
    setForm((s) => ({ ...s, category_id: defaultCategoryId, author_id: defaultAuthorId }));
  }

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((s) => ({ ...s, [key]: value }));

  const handleSave = async () => {
    try {
      if (mode === "create") {
        const result = await create.mutateAsync(formToInput(form));
        toast.success("Článok vytvorený.");
        navigate({ to: "/admin/blog/$id", params: { id: result.id } });
      } else if (existing) {
        await update.mutateAsync({ id: existing.id, patch: formToInput(form) });
        toast.success("Zmeny uložené.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uloženie zlyhalo.");
    }
  };

  const handlePublish = async () => {
    if (!existing) return;
    await publish.mutateAsync(existing.id);
    setForm((s) => ({ ...s, status: "published" }));
    toast.success("Článok publikovaný.");
  };

  const handleUnpublish = async () => {
    if (!existing) return;
    await unpublish.mutateAsync(existing.id);
    setForm((s) => ({ ...s, status: "draft" }));
    toast.success("Vrátené do draftu.");
  };

  const handleArchive = async () => {
    if (!existing) return;
    await archive.mutateAsync(existing.id);
    setForm((s) => ({ ...s, status: "archived" }));
    toast.success("Článok archivovaný.");
  };

  const handleDelete = async () => {
    if (!existing) return;
    await remove.mutateAsync(existing.id);
    toast.success("Článok vymazaný.");
    navigate({ to: "/admin/blog" });
  };

  return (
    <div className="space-y-8" data-testid="admin-blog-editor-root">
      <section className="space-y-4">
        <div>
          <Label htmlFor="title">Titulok</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => set("title")(e.target.value)}
            data-testid="admin-blog-editor-title"
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) => set("slug")(e.target.value)}
            data-testid="admin-blog-editor-slug"
          />
        </div>
        <div>
          <Label htmlFor="subtitle">Podtitulok</Label>
          <Input
            id="subtitle"
            value={form.subtitle}
            onChange={(e) => set("subtitle")(e.target.value)}
            data-testid="admin-blog-editor-subtitle"
          />
        </div>
        <div>
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            rows={3}
            value={form.excerpt}
            onChange={(e) => set("excerpt")(e.target.value)}
            data-testid="admin-blog-editor-excerpt"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Kategória</Label>
            <Select value={form.category_id} onValueChange={set("category_id")}>
              <SelectTrigger id="category" data-testid="admin-blog-editor-category">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {(categoriesQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="author">Autor</Label>
            <Select value={form.author_id} onValueChange={set("author_id")}>
              <SelectTrigger id="author" data-testid="admin-blog-editor-author">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {(authorsQuery.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <Label htmlFor="body">Telo článku (Markdown)</Label>
        <Textarea
          id="body"
          rows={20}
          value={form.body_mdx}
          onChange={(e) => set("body_mdx")(e.target.value)}
          className="font-mono text-sm"
          data-testid="admin-blog-editor-body"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Zdroje</h2>
        <SourcesEditor value={form.sources} onChange={set("sources")} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cross-linky</h2>
        <RelatedCoursePicker
          value={form.related_course_slug}
          onChange={set("related_course_slug")}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">SEO a metadata</h2>
        <div>
          <Label htmlFor="seo_title">SEO titulok (≤60 znakov)</Label>
          <Input
            id="seo_title"
            value={form.seo_title}
            onChange={(e) => set("seo_title")(e.target.value)}
            maxLength={60}
            data-testid="admin-blog-editor-seo-title"
          />
        </div>
        <div>
          <Label htmlFor="seo_description">SEO popis (140–160 znakov)</Label>
          <Textarea
            id="seo_description"
            rows={2}
            value={form.seo_description}
            onChange={(e) => set("seo_description")(e.target.value)}
            maxLength={160}
            data-testid="admin-blog-editor-seo-description"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primary_keyword">Primárny keyword</Label>
            <Input
              id="primary_keyword"
              value={form.primary_keyword}
              onChange={(e) => set("primary_keyword")(e.target.value)}
              data-testid="admin-blog-editor-primary-keyword"
            />
          </div>
          <div>
            <Label htmlFor="reading_minutes">Čas čítania (min)</Label>
            <Input
              id="reading_minutes"
              type="number"
              value={form.reading_minutes}
              onChange={(e) => set("reading_minutes")(e.target.value)}
              data-testid="admin-blog-editor-reading-minutes"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hero_image_url">Hero obrázok URL</Label>
            <Input
              id="hero_image_url"
              value={form.hero_image_url}
              onChange={(e) => set("hero_image_url")(e.target.value)}
              data-testid="admin-blog-editor-hero-image-url"
            />
          </div>
          <div>
            <Label htmlFor="og_image_url">OG obrázok URL</Label>
            <Input
              id="og_image_url"
              value={form.og_image_url}
              onChange={(e) => set("og_image_url")(e.target.value)}
              data-testid="admin-blog-editor-og-image-url"
            />
          </div>
        </div>
      </section>

      <section
        className="flex flex-wrap items-center gap-3 border-t border-border pt-6"
        data-testid="admin-blog-editor-actions"
      >
        <Button
          onClick={handleSave}
          disabled={create.isPending || update.isPending}
          data-testid="admin-blog-editor-save"
        >
          {mode === "create" ? "Vytvoriť" : "Uložiť zmeny"}
        </Button>

        {existing && form.status !== "published" && (
          <Button
            variant="default"
            onClick={handlePublish}
            disabled={publish.isPending}
            data-testid="admin-blog-editor-publish"
          >
            Publikovať
          </Button>
        )}

        {existing && form.status === "published" && (
          <Button
            variant="outline"
            onClick={handleUnpublish}
            disabled={unpublish.isPending}
            data-testid="admin-blog-editor-unpublish"
          >
            Vrátiť do draftu
          </Button>
        )}

        {existing && form.status !== "archived" && (
          <Button
            variant="outline"
            onClick={handleArchive}
            disabled={archive.isPending}
            data-testid="admin-blog-editor-archive"
          >
            Archivovať
          </Button>
        )}

        {existing && (
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={remove.isPending}
            data-testid="admin-blog-editor-delete"
          >
            Vymazať
          </Button>
        )}

        <span
          className="ml-auto text-sm text-muted-foreground"
          data-testid="admin-blog-editor-status-label"
        >
          stav:{" "}
          {form.status === "draft"
            ? "draft"
            : form.status === "published"
              ? "publikované"
              : "archivované"}
        </span>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Vymazať článok?"
        description="Vymazanie je nevratné. Článok zmizne z DB aj zo /blog."
        confirmLabel="Vymazať"
        onConfirm={handleDelete}
      />
    </div>
  );
}
