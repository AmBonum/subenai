import { createLazyFileRoute, useParams } from "@tanstack/react-router";

import { AcademyArchive } from "@/components/academy/AcademyArchive";
import { useAcademyAuthor, useAcademyList } from "@/lib/academy/queries";

export const Route = createLazyFileRoute("/academy/author/$slug")({
  component: AcademyAuthorRoute,
});

function AcademyAuthorRoute() {
  const { slug } = useParams({ from: "/academy/author/$slug" });
  const author = useAcademyAuthor(slug);
  const list = useAcademyList();
  const items = (list.data ?? []).filter((i) => i.author.slug === slug);
  return (
    <AcademyArchive
      heading={author.data?.display_name ?? "Autor"}
      description={author.data?.bio}
      items={items}
      isLoading={list.isLoading || author.isLoading}
    />
  );
}
