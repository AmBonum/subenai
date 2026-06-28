import { BlogPostBody } from "@/components/blog/BlogPostBody";
import { AcademyQuiz } from "@/components/academy/AcademyQuiz";
import { VisualBlock } from "@/components/quiz/flow/VisualBlock";
import { parseAcademyBody } from "@/lib/academy/shortcodes";

// E55.2 / E55.4 — renders an academy entry body: runs of Markdown via the
// shared BlogPostBody renderer, with interactive [[quiz:…]] widgets and
// realistic [[visual:…]] scam mockups mounted inline between them. One
// responsibility: turn a parsed block list into elements.

export interface AcademyBodyProps {
  body: string;
}

export function AcademyBody({ body }: AcademyBodyProps) {
  const blocks = parseAcademyBody(body);
  return (
    <div data-testid="academy-body">
      {blocks.map((block, i) => {
        if (block.kind === "quiz") return <AcademyQuiz key={i} questionId={block.questionId} />;
        if (block.kind === "visual")
          return (
            <div key={i} data-testid="academy-visual" className="mt-6">
              <VisualBlock visual={block.visual} />
            </div>
          );
        return <BlogPostBody key={i} mdx={block.text} />;
      })}
    </div>
  );
}
