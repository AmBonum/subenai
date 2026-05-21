import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/templates")({
  head: () => ({
    meta: [
      { title: "Šablóny — moderation · Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
