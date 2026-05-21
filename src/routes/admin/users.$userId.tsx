import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users/$userId")({
  head: () => ({
    meta: [
      { title: "Dossier používateľa · Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
