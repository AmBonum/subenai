import { useId } from "react";

interface BlogSearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

// Lightweight client-side search input. Filters the already-loaded
// post list — no fetch on keystroke (the index page caches the full
// list anyway). Behaviour reads from + writes to a parent-owned string
// so a query persists when the user clicks a category chip.
export function BlogSearchInput({
  value,
  onChange,
  placeholder = "hľadať v článkoch…",
}: BlogSearchInputProps) {
  const id = useId();
  return (
    <div className="relative w-full max-w-sm" data-testid="blog-search-root">
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        🔍
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        data-testid="blog-search-input"
      />
    </div>
  );
}
