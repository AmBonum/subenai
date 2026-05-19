import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BlogPostSource } from "@/lib/blog/queries";

// Controlled editor for the structured citation list on a blog post.
// Parent owns the array; this component renders editable rows and emits
// a new array via `onChange` on every keystroke / add / remove.
export function SourcesEditor({
  value,
  onChange,
}: {
  value: BlogPostSource[];
  onChange: (next: BlogPostSource[]) => void;
}) {
  const update = (index: number, patch: Partial<BlogPostSource>) => {
    const next = value.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  };
  const add = () => {
    onChange([...value, { label: "", url: "" }]);
  };
  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4" data-testid="admin-blog-sources-editor">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-blog-sources-editor-empty">
          žiadne zdroje — pridaj prvý cez tlačidlo nižšie.
        </p>
      )}

      {value.map((source, index) => (
        <div
          key={index}
          className="space-y-3 rounded-lg border border-border p-4"
          data-testid={`admin-blog-sources-row-${index + 1}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">[{index + 1}]</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              data-testid={`admin-blog-sources-remove-${index + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div>
            <Label htmlFor={`source-label-${index}`}>Názov</Label>
            <Input
              id={`source-label-${index}`}
              value={source.label}
              onChange={(e) => update(index, { label: e.target.value })}
              placeholder="SK-CERT: aktívna phishingová kampaň…"
              data-testid={`admin-blog-sources-label-${index + 1}`}
            />
          </div>
          <div>
            <Label htmlFor={`source-url-${index}`}>URL</Label>
            <Input
              id={`source-url-${index}`}
              value={source.url}
              onChange={(e) => update(index, { url: e.target.value })}
              placeholder="https://skcert.sk/…"
              data-testid={`admin-blog-sources-url-${index + 1}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`source-publisher-${index}`}>Vydavateľ</Label>
              <Input
                id={`source-publisher-${index}`}
                value={source.publisher ?? ""}
                onChange={(e) => update(index, { publisher: e.target.value || undefined })}
                placeholder="SK-CERT"
                data-testid={`admin-blog-sources-publisher-${index + 1}`}
              />
            </div>
            <div>
              <Label htmlFor={`source-accessed-${index}`}>Navštívené (YYYY-MM-DD)</Label>
              <Input
                id={`source-accessed-${index}`}
                value={source.accessed_at ?? ""}
                onChange={(e) => update(index, { accessed_at: e.target.value || undefined })}
                placeholder="2026-05-19"
                data-testid={`admin-blog-sources-accessed-${index + 1}`}
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={add} data-testid="admin-blog-sources-add">
        <Plus className="mr-2 size-4" />
        Pridať zdroj
      </Button>
    </div>
  );
}
