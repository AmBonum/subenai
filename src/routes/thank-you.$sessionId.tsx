import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/thank-you/$sessionId")({
  head: () => ({
    meta: [
      { title: "Ďakujeme za podporu — subenai" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
