import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";

const PAGE_TITLE = "Zobrazenie žiadosti | subenai";
const PAGE_DESCRIPTION =
  "Read-only zobrazenie vašej žiadosti o podporu z e-mailu. Odkaz je viazaný na bezpečnostný token.";

interface SearchParams {
  token?: string;
}

export const Route = createFileRoute("/contact-form/ticket/$id")({
  validateSearch: (search): SearchParams => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_ORIGIN}/contact-form` }],
  }),
});
