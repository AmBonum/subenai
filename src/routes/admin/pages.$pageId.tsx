import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { BlockKind, CmsBlock, CmsPage } from "@/lib/admin/cms-mock-store";
import { useCmsPages, usePublishCmsPage, useUpdateCmsPage } from "@/lib/admin/queries";
import { tFor } from "@/i18n/cms";

const newId = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 8)}`;

export const Route = createFileRoute("/admin/pages/$pageId")({
  component: PageEditor,
});

const SLUG_RE = /^[a-z0-9-]+$/;

function PageEditor() {
  const t = tFor("pageEditor");
  const tList = tFor("pagesList");
  const { pageId } = Route.useParams();
  const qc = useQueryClient();
  const pagesQuery = useCmsPages();
  const updateCmsPage = useUpdateCmsPage();
  const publishCmsPage = usePublishCmsPage();
  const page = useMemo(
    () => (pagesQuery.data ?? []).find((p) => p.id === pageId),
    [pagesQuery.data, pageId],
  );
  const navigate = useNavigate();

  const [addKind, setAddKind] = useState<BlockKind>("heading");

  if (!page) {
    return (
      <div className="space-y-4" data-testid="cms-page-editor-not-found">
        <PageHeader title={t("not_found")} />
        <Button asChild variant="outline">
          <Link to="/admin/pages">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
      </div>
    );
  }

  const slugInvalid = page.slug.length === 0 || !SLUG_RE.test(page.slug);
  const titleInvalid = page.title.trim().length === 0;
  const disabled = slugInvalid || titleInvalid;

  const mutateError = (e: unknown) => toast.error((e as Error).message);

  const patch = (p: Partial<CmsPage>) => {
    const id = page.id;
    qc.setQueryData<CmsPage[]>(["admin", "cms", "pages"], (prev) =>
      (prev ?? []).map((row) =>
        row.id === id ? { ...row, ...p, updated_at: new Date().toISOString() } : row,
      ),
    );
    updateCmsPage.mutate({ id, patch: p }, { onError: mutateError });
  };

  const patchBlock = (id: string, p: Partial<CmsBlock>) =>
    patch({
      content_blocks: page.content_blocks.map((b) => (b.id === id ? { ...b, ...p } : b)),
    });

  const removeBlock = (id: string) =>
    patch({ content_blocks: page.content_blocks.filter((b) => b.id !== id) });

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= page.content_blocks.length) return;
    const arr = [...page.content_blocks];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    patch({ content_blocks: arr });
  };

  const addBlock = () => {
    const b: CmsBlock = { id: newId("blk"), kind: addKind };
    patch({ content_blocks: [...page.content_blocks, b] });
  };

  const onSave = () => {
    if (disabled) return;
    toast.success(t("save"));
  };

  const applyPublishSync = (id: string, publish: boolean) => {
    const patchValues: Partial<CmsPage> = publish
      ? { status: "published", published_at: new Date().toISOString() }
      : { status: "draft", published_at: null };
    qc.setQueryData<CmsPage[]>(["admin", "cms", "pages"], (prev) =>
      (prev ?? []).map((row) => (row.id === id ? { ...row, ...patchValues } : row)),
    );
  };

  const onPublish = () => {
    applyPublishSync(page.id, true);
    publishCmsPage.mutate(
      { id: page.id, publish: true },
      { onSuccess: () => toast.success(t("publish")), onError: mutateError },
    );
  };

  const onUnpublish = () => {
    applyPublishSync(page.id, false);
    publishCmsPage.mutate(
      { id: page.id, publish: false },
      { onSuccess: () => toast.success(t("unpublish")), onError: mutateError },
    );
  };

  return (
    <div className="space-y-6" data-testid="cms-page-editor-root">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/admin/pages" data-testid="cms-page-editor-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
        <PageHeader
          title={page.title || t("title")}
          description={page.slug}
          actions={
            <>
              {page.status === "published" ? (
                <Button
                  variant="outline"
                  onClick={onUnpublish}
                  data-testid="cms-page-editor-unpublish"
                >
                  {t("unpublish")}
                </Button>
              ) : (
                <Button onClick={onPublish} data-testid="cms-page-editor-publish">
                  {t("publish")}
                </Button>
              )}
              <Button onClick={onSave} disabled={disabled} data-testid="cms-page-editor-save">
                {t("save")}
              </Button>
            </>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="cms-title-input">{t("title_label")}</Label>
            <Input
              id="cms-title-input"
              value={page.title}
              onChange={(e) => patch({ title: e.target.value })}
              data-testid="cms-page-editor-title-input"
            />
            {titleInvalid && (
              <p className="text-xs text-destructive" data-testid="cms-page-editor-title-error">
                {t("title_required")}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cms-slug-input">{t("slug_label")}</Label>
            <Input
              id="cms-slug-input"
              value={page.slug}
              onChange={(e) => patch({ slug: e.target.value })}
              data-testid="cms-page-editor-slug-input"
            />
            {slugInvalid && (
              <p className="text-xs text-destructive" data-testid="cms-page-editor-slug-error">
                {t("slug_invalid")}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cms-desc-input">{t("description_label")}</Label>
            <Textarea
              id="cms-desc-input"
              rows={3}
              value={page.seo_description}
              onChange={(e) => patch({ seo_description: e.target.value })}
              data-testid="cms-page-editor-description-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("blocks_heading")}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={addKind} onValueChange={(v) => setAddKind(v as BlockKind)}>
              <SelectTrigger className="w-[180px]" data-testid="cms-page-editor-block-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heading">{t("block_type_heading")}</SelectItem>
                <SelectItem value="paragraph">{t("block_type_paragraph")}</SelectItem>
                <SelectItem value="image">{t("block_type_image")}</SelectItem>
                <SelectItem value="cta">{t("block_type_cta")}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addBlock} data-testid="cms-page-editor-add-block">
              <Plus className="mr-2 h-4 w-4" />
              {t("add_block")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {page.content_blocks.length === 0 ? (
            <p
              className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground"
              data-testid="cms-page-editor-blocks-empty"
            >
              {tList("empty")}
            </p>
          ) : (
            page.content_blocks.map((block, idx) => (
              <BlockRow
                key={block.id}
                block={block}
                index={idx}
                total={page.content_blocks.length}
                onChange={(p) => patchBlock(block.id, p)}
                onRemove={() => removeBlock(block.id)}
                onMove={(d) => moveBlock(idx, d)}
                t={t}
              />
            ))
          )}
        </CardContent>
      </Card>

      <div className="hidden" data-testid="cms-page-editor-status">
        {page.status}
      </div>
      <div className="hidden" data-testid="cms-page-editor-published-at">
        {page.published_at ?? ""}
      </div>
      <button
        type="button"
        className="hidden"
        onClick={() => navigate({ to: "/admin/pages" })}
        data-testid="cms-page-editor-navigate-back"
      />
    </div>
  );
}

interface BlockRowProps {
  block: CmsBlock;
  index: number;
  total: number;
  onChange: (p: Partial<CmsBlock>) => void;
  onRemove: () => void;
  onMove: (d: -1 | 1) => void;
  t: (k: string) => string;
}

function BlockRow({ block, index, total, onChange, onRemove, onMove, t }: BlockRowProps) {
  return (
    <div className="rounded-md border bg-card p-3" data-testid={`cms-page-editor-block-${index}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">
          #{index + 1} · {block.kind}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title={t("block_move_up")}
            data-testid={`cms-page-editor-block-${index}-move-up`}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title={t("block_move_down")}
            data-testid={`cms-page-editor-block-${index}-move-down`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
            title={t("block_remove")}
            data-testid={`cms-page-editor-block-${index}-remove`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <BlockFields block={block} onChange={onChange} index={index} t={t} />
    </div>
  );
}

function BlockFields({
  block,
  onChange,
  index,
  t,
}: {
  block: CmsBlock;
  onChange: (p: Partial<CmsBlock>) => void;
  index: number;
  t: (k: string) => string;
}) {
  if (block.kind === "heading" || block.kind === "paragraph") {
    return (
      <div className="grid gap-2">
        <Label>{t("block_text")}</Label>
        {block.kind === "paragraph" ? (
          <Textarea
            rows={3}
            value={block.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            data-testid={`cms-page-editor-block-${index}-text`}
          />
        ) : (
          <Input
            value={block.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            data-testid={`cms-page-editor-block-${index}-text`}
          />
        )}
      </div>
    );
  }

  if (block.kind === "image") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>{t("block_url")}</Label>
          <Input
            value={block.url ?? ""}
            onChange={(e) => onChange({ url: e.target.value })}
            data-testid={`cms-page-editor-block-${index}-url`}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("block_alt")}</Label>
          <Input
            value={block.alt ?? ""}
            onChange={(e) => onChange({ alt: e.target.value })}
            data-testid={`cms-page-editor-block-${index}-alt`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label>{t("block_label")}</Label>
        <Input
          value={block.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          data-testid={`cms-page-editor-block-${index}-label`}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t("block_url")}</Label>
        <Input
          value={block.url ?? ""}
          onChange={(e) => onChange({ url: e.target.value })}
          data-testid={`cms-page-editor-block-${index}-url`}
        />
      </div>
    </div>
  );
}
