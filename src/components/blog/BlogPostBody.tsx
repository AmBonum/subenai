import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Body is plain Markdown today (with GFM); the column keeps the `mdx`
// suffix because the schema will accept real MDX (with embedded React
// components) in a later epic. Per-element styles are inlined here
// because @tailwindcss/typography is not installed — gives full control
// over rendered output without pulling another dependency.
export function BlogPostBody({ mdx }: { mdx: string }) {
  return (
    <article className="mt-8 max-w-3xl text-base leading-relaxed" data-testid="blog-post-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 className="mt-12 text-3xl font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-8 text-2xl font-semibold">{children}</h3>,
          h4: ({ children }) => <h4 className="mt-6 text-xl font-semibold">{children}</h4>,
          p: ({ children }) => <p className="mt-4">{children}</p>,
          ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium underline underline-offset-2 hover:text-foreground"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-4 border-border pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{children}</code>
          ),
          hr: () => <hr className="mt-8 border-border" />,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {mdx}
      </ReactMarkdown>
    </article>
  );
}
