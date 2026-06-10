import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Prihlásenie · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
