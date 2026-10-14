import { BlogPostBody } from "@/components/blog/BlogPostBody";
import { SCENES_3D } from "@/components/three-d";
import { parseDocBody } from "@/lib/docs/doc-body";

// E66.5 — a docs body: Markdown runs via the shared BlogPostBody renderer with
// `[[scene3d:…]]` illustrations mounted between them.

export function DocBody({ body }: { body: string }) {
  return (
    <div data-testid="docs-body">
      {parseDocBody(body).map((block, i) => {
        if (block.kind === "md") return <BlogPostBody key={i} mdx={block.text} />;
        const Scene = SCENES_3D[block.name];
        return (
          <figure
            key={i}
            data-testid="docs-scene3d"
            data-scene={block.name}
            className="mx-auto mt-8 flex max-w-3xl justify-center"
          >
            <Scene caption={block.caption} />
          </figure>
        );
      })}
    </div>
  );
}
