import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/dpa-requests")({
  head: () => ({
    meta: [{ title: "DPA žiadosti · Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
