import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAssignToMe } from "@/lib/admin/queries-tickets";

interface TicketAssignmentActionsProps {
  ticketId: string;
  assignedTo: string | null;
}

function useCurrentUserId() {
  return useQuery({
    queryKey: ["auth", "current-user-id"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

function useAssigneeProfile(userId: string | null) {
  return useQuery({
    queryKey: ["admin", "ticket-assignee", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .eq("id", userId)
        .maybeSingle();
      return data as { id: string; display_name: string | null; email: string | null } | null;
    },
    enabled: !!userId,
  });
}

function useUnassign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to: null, updated_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "support_tickets"] });
    },
  });
}

export function TicketAssignmentActions({ ticketId, assignedTo }: TicketAssignmentActionsProps) {
  const { data: currentUserId } = useCurrentUserId();
  const { data: assignee } = useAssigneeProfile(assignedTo);
  const assignToMe = useAssignToMe();
  const unassign = useUnassign();
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [optimisticAssigned, setOptimisticAssigned] = useState<string | null>(assignedTo);

  // Sync local optimistic state when the prop refreshes from the server.
  useEffect(() => {
    setOptimisticAssigned(assignedTo);
  }, [assignedTo]);

  const isAssignedToMe =
    !!currentUserId && optimisticAssigned !== null && optimisticAssigned === currentUserId;
  const isUnassigned = optimisticAssigned === null;

  const assigneeLabel = isUnassigned
    ? "Nepridelené"
    : assignee?.display_name || assignee?.email || optimisticAssigned;

  async function handleAssignToMe() {
    try {
      await assignToMe.mutateAsync(ticketId);
      if (currentUserId) setOptimisticAssigned(currentUserId);
      toast.success("Žiadosť bola pridelená vám.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pridelenie zlyhalo.");
    }
  }

  async function handleUnassign() {
    try {
      await unassign.mutateAsync(ticketId);
      setOptimisticAssigned(null);
      toast.success("Žiadosť bola odpridelená.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Odpridelenie zlyhalo.");
    }
  }

  return (
    <section
      className="rounded-md border border-border bg-card p-4"
      data-testid="admin-ticket-assignment-actions"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pridelenie
      </h2>
      <p
        className="mt-1 break-words text-sm text-foreground"
        data-testid="admin-ticket-assignment-current"
      >
        {assigneeLabel}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {!isAssignedToMe && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={assignToMe.isPending}
            onClick={handleAssignToMe}
            data-testid="admin-ticket-assignment-take"
          >
            Prevziať
          </Button>
        )}
        {!isUnassigned && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={unassign.isPending}
            onClick={() => setConfirmUnassign(true)}
            data-testid="admin-ticket-assignment-unassign"
          >
            Odpridliť
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmUnassign}
        onOpenChange={setConfirmUnassign}
        title="Odpridliť žiadosť?"
        description="Žiadosť stratí priradeného admina a zostane bez vlastníka."
        severity="warning"
        confirmLabel="Odpridliť"
        cancelLabel="Zrušiť"
        onConfirm={handleUnassign}
      />
    </section>
  );
}
