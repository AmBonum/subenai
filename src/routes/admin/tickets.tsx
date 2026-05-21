import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/tickets")({
  head: () => ({
    meta: [{ title: "Žiadosti podpory · Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
