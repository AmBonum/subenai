import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss(), TanStackRouterVite(), react()],
  server: {
    watch: {
      // Prevent infinite HMR loop: the router plugin writes routeTree.gen.ts,
      // which Vite would re-detect and trigger another generation cycle.
      // The plugin invalidates the module itself — external watch causes the loop.
      ignored: ["**/routeTree.gen.ts"],
    },
    // Local dev: forward /api/* to `wrangler pages dev` running in a second
    // terminal on port 8788. Without this, Vite returns 404 for API calls
    // (functions/api/*.ts only run inside the CF Pages runtime, not Vite).
    // Start order: 1) `npm run dev:api` (wrangler), 2) `npm run dev` (vite).
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) {
            if (id.includes("/src/lib/quiz/questions")) return "quiz-questions";
            if (id.includes("/src/content/courses/")) return "courses-content";
            return undefined;
          }
          // React ecosystem MUST stay together. `scheduler` and
          // `use-sync-external-store` are internal deps that React
          // touches at module init — if they end up in a different chunk
          // (vendor-misc) the cross-chunk load order breaks
          // (TypeError: Cannot set properties of undefined setting "Activity").
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("use-sync-external-store") ||
            id.includes("/react-is/")
          ) {
            return "vendor-react";
          }
          // Pin the tiny className utilities next to React. Without an
          // explicit bucket Rollup colocated them into vendor-charts,
          // chaining the 400KB recharts chunk into every page load.
          if (
            id.includes("/clsx/") ||
            id.includes("tailwind-merge") ||
            id.includes("class-variance-authority")
          ) {
            return "vendor-react";
          }
          if (id.includes("@tanstack/")) return "vendor-tanstack";
          if (id.includes("@supabase/")) return "vendor-supabase";
          if (id.includes("@radix-ui/")) return "vendor-radix";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("zod") || id.includes("react-hook-form") || id.includes("@hookform/"))
            return "vendor-forms";
          // No `vendor-misc` catch-all. The catch-all caused a circular
          // chunk (vendor-misc -> vendor-react -> vendor-misc) because some
          // React-adjacent modules (transitively imported by libraries we
          // didn't explicitly bucket) ended up in vendor-misc with
          // top-level `useLayoutEffect`-type calls, racing the vendor-react
          // chunk at runtime and throwing
          // `Cannot read properties of undefined (reading 'useLayoutEffect')`.
          // Returning undefined lets Rollup decide — per-route async
          // chunks remain async, and any remaining vendor dependency lands
          // in the route entry that imports it. Trade-off: slightly larger
          // initial bundle when many small libs flow into the main chunk.
          return undefined;
        },
      },
    },
  },
});
