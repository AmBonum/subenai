import { BlogPostBody } from "@/components/blog/BlogPostBody";
import { AcademyQuiz } from "@/components/academy/AcademyQuiz";
import { parseAcademyBody } from "@/lib/academy/shortcodes";

// E55.2 — renders an academy entry body: runs of Markdown via the shared
// BlogPostBody renderer, with interactive [[quiz:…]] widgets mounted inline
// between them. One responsibility: turn a parsed block list into elements.

export interface AcademyBodyProps {
  body: string;
}

export function AcademyBody({ body }: AcademyBodyProps) {
  const blocks = parseAcademyBody(body);
  return (
    <div data-testid="academy-body">
      {blocks.map((block, i) =>
        block.kind === "quiz" ? (
          <AcademyQuiz key={i} questionId={block.questionId} />
        ) : (
          <BlogPostBody key={i} mdx={block.text} />
        ),
      )}
    </div>
  );
}
