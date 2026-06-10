import { createLazyFileRoute } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { AllSponsorsView } from "./-all-sponsors-view";
import type { PublicSponsor } from "./sponsors";

const FETCH_LIMIT = 500;

export const Route = createLazyFileRoute("/sponsors/all")({
  component: AllSponsorsPage,
});

function AllSponsorsPage() {
  return <AllSponsorsView fetchSponsors={fetchAllSponsors} />;
}

async function fetchAllSponsors(): Promise<PublicSponsor[]> {
  const { data, error } = await supabase
    .from("public_sponsors")
    .select("id, display_name, display_link, display_message, created_at, has_refund")
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);

  if (error) throw new Error(`public_sponsors fetch failed: ${error.message}`);
  return (data ?? []) as PublicSponsor[];
}
