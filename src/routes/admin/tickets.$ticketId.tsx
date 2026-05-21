import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/tickets/$ticketId")({
  head: () => ({
    meta: [{ title: "Detail žiadosti · Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
