import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Nastavenia upozornení · Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
