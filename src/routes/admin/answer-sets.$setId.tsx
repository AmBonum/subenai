import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/answer-sets/$setId")({
  loader: ({ params }) => ({ setId: params.setId }),
});
