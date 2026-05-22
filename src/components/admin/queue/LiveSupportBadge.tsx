import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function LiveSupportBadge() {
  const { data: count } = useQuery({
    queryKey: ["admin", "support_tickets", "needing-attention-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "reopened"])
        .is("deleted_at", null)
        .is("archived_at", null);
      if (error) {
        console.warn("LiveSupportBadge count failed", error);
        return 0;
      }
      return count ?? 0;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  if (!count || count <= 0) return null;

  const display = count > 99 ? "99+" : String(count);

  return (
    <span
      data-testid="admin-shell-sidebar-support-badge"
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold tabular-nums text-destructive-foreground group-data-[collapsible=icon]:hidden"
      aria-label={`${count} žiadostí potrebuje pozornosť`}
    >
      {display}
    </span>
  );
}
