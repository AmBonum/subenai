import { useEffect, useState } from "react";

// Thin top-of-page progress bar that fills as the user scrolls through
// the article. Pure scroll math — measures the <main> the article is
// inside via [data-testid="blog-post-root"] so it survives layout
// changes without re-querying every scroll event.
//
// SSR-safe: state defaults to 0 and the effect runs only client-side.
// Cleanup removes listener + ResizeObserver on unmount.
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-testid="blog-post-root"]');
    if (!root) return undefined;
    let cached = root.getBoundingClientRect().height;
    const recalc = () => {
      cached = root.getBoundingClientRect().height;
    };
    const onScroll = () => {
      const top = root.getBoundingClientRect().top;
      const total = cached - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const scrolled = Math.min(Math.max(-top, 0), total);
      setProgress((scrolled / total) * 100);
    };
    const ro = new ResizeObserver(recalc);
    ro.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recalc);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recalc);
      ro.disconnect();
    };
  }, []);
  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-40 h-1 bg-transparent"
      data-testid="blog-reading-progress"
    >
      <div
        className="h-full bg-primary transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
