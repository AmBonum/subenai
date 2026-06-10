import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Registrácia · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
