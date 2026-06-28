import { createLazyFileRoute, useParams } from "@tanstack/react-router";

import { AcademyArchive } from "@/components/academy/AcademyArchive";
import { useAcademyCategory, useAcademyList } from "@/lib/academy/queries";

export const Route = createLazyFileRoute("/academy/category/$slug")({
  component: AcademyCategoryRoute,
});

function AcademyCategoryRoute() {
  const { slug } = useParams({ from: "/academy/category/$slug" });
  const category = useAcademyCategory(slug);
  const list = useAcademyList();
  const items = (list.data ?? []).filter((i) => i.category.slug === slug);
  return (
    <AcademyArchive
      heading={category.data?.name ?? "Kategória"}
      description={category.data?.description}
      items={items}
      isLoading={list.isLoading || category.isLoading}
    />
  );
}
