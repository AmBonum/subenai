import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUser {
  user_id: string;
  email: string;
  display_name: string;
}

export function useAdminUsersList() {
  return useQuery({
    queryKey: ["admin", "list_admin_users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.rpc("list_admin_users");
      if (error) {
        console.warn("list_admin_users failed", error);
        return [];
      }
      return (data ?? []) as AdminUser[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
