import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/dsr")({
  head: () => ({
    meta: [{ title: "DSR queue · Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
