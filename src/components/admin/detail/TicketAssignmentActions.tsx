import { useState } from "react";
import { toast } from "sonner";
import { Plus, UserPlus, UserMinus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { AdminPicker } from "@/components/admin/common/AdminPicker";
import { AssigneeChip } from "@/components/admin/common/AssigneeChip";
import {
  useAssignAdminToTicket,
  useUnassignAdminFromTicket,
  type SupportTicketAssignee,
} from "@/lib/admin/queries-tickets";

interface TicketAssignmentActionsProps {
  ticketId: string;
  assignees: SupportTicketAssignee[];
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

function useCurrentUserProfile(userId: string | null) {
  return useQuery({
    queryKey: ["auth", "current-user-profile", userId],
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
    staleTime: 5 * 60_000,
  });
}

export function TicketAssignmentActions({ ticketId, assignees }: TicketAssignmentActionsProps) {
  const queryClient = useQueryClient();
  const { data: currentUserId } = useCurrentUserId();
  const { data: currentProfile } = useCurrentUserProfile(currentUserId ?? null);
  const assignMutation = useAssignAdminToTicket();
  const unassignMutation = useUnassignAdminFromTicket();

  // Optimistic local mirror of the assignees list. Server invalidation
  // refreshes the prop on the next render, but the user sees the chip
  // appear/disappear instantly on click.
  const [optimisticAssignees, setOptimisticAssignees] = useState<SupportTicketAssignee[] | null>(
    null,
  );
  const effectiveAssignees = optimisticAssignees ?? assignees;

  const [confirmSelfUnassign, setConfirmSelfUnassign] = useState(false);

  const isEmpty = effectiveAssignees.length === 0;
  const isCurrentUserAssigned =
    !!currentUserId && effectiveAssignees.some((a) => a.user_id === currentUserId);
  const selectedIds = effectiveAssignees.map((a) => a.user_id);

  async function handleAssign(userId: string) {
    const existing = effectiveAssignees.find((a) => a.user_id === userId);
    if (existing) return;

    // Optimistic add — synthesize a chip from the picker payload until
    // the server returns the canonical row.
    const synthetic: SupportTicketAssignee = {
      user_id: userId,
      email: userId === currentUserId ? (currentProfile?.email ?? "") : "",
      display_name:
        userId === currentUserId
          ? (currentProfile?.display_name ?? currentProfile?.email ?? null)
          : null,
      assigned_at: new Date().toISOString(),
    };
    setOptimisticAssignees([...effectiveAssignees, synthetic]);

    try {
      await assignMutation.mutateAsync({ ticketId, userId });
      toast.success("Admin bol pridelený k žiadosti.");
      setOptimisticAssignees(null);
    } catch (err) {
      setOptimisticAssignees(null);
      toast.error(err instanceof Error ? err.message : "Pridelenie zlyhalo.");
      queryClient.invalidateQueries({ queryKey: ["admin", "support_ticket", ticketId] });
    }
  }

  async function handleUnassign(userId: string) {
    const prev = effectiveAssignees;
    setOptimisticAssignees(prev.filter((a) => a.user_id !== userId));
    try {
      await unassignMutation.mutateAsync({ ticketId, userId });
      toast.success("Admin bol odobratý z pridelenia.");
      setOptimisticAssignees(null);
    } catch (err) {
      setOptimisticAssignees(prev);
      toast.error(err instanceof Error ? err.message : "Odobratie pridelenia zlyhalo.");
    }
  }

  async function handleSelfAssign() {
    if (!currentUserId) return;
    await handleAssign(currentUserId);
  }

  async function handleSelfUnassignConfirmed() {
    if (!currentUserId) return;
    await handleUnassign(currentUserId);
  }

  const addTrigger = (
    <Button
      type="button"
      size="sm"
      variant={isEmpty ? "default" : "outline"}
      className={isEmpty ? "w-full" : ""}
      disabled={assignMutation.isPending}
      data-testid="admin-ticket-assignment-add-trigger"
    >
      {isEmpty ? (
        <>
          <UserPlus className="mr-2 size-4" aria-hidden="true" />
          Prideliť admina
        </>
      ) : (
        <>
          <Plus className="mr-1 size-3.5" aria-hidden="true" />
          Pridať priradenia
        </>
      )}
    </Button>
  );

  return (
    <section
      className="rounded-md border border-border bg-card p-4"
      data-testid="admin-ticket-assignment-section"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pridelenie
        </h2>
        {!isEmpty ? (
          <span
            className="text-xs tabular-nums text-muted-foreground"
            data-testid="admin-ticket-assignees-count"
          >
            {effectiveAssignees.length}
          </span>
        ) : null}
      </div>

      {isEmpty ? (
        <div className="mt-3 space-y-3">
          <p
            className="text-sm text-muted-foreground"
            data-testid="admin-ticket-assignment-empty-label"
          >
            Tiket nikomu nepridelený
          </p>
          <AdminPicker
            trigger={addTrigger}
            selectedAdminIds={selectedIds}
            onSelect={handleAssign}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <ul
            className="flex flex-wrap gap-1.5"
            data-testid="admin-ticket-assignees-list"
            aria-label="Pridelení admini"
          >
            {effectiveAssignees.map((a) => (
              <li key={a.user_id}>
                <AssigneeChip
                  userId={a.user_id}
                  email={a.email}
                  displayName={a.display_name}
                  isCurrentUser={a.user_id === currentUserId}
                  onRemove={() => handleUnassign(a.user_id)}
                  disabled={unassignMutation.isPending}
                />
              </li>
            ))}
            <li className="flex items-center">
              <AdminPicker
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    disabled={assignMutation.isPending}
                    data-testid="admin-ticket-assignment-add-trigger"
                  >
                    <Plus className="mr-1 size-3.5" aria-hidden="true" />
                    Pridať priradenia
                  </Button>
                }
                selectedAdminIds={selectedIds}
                onSelect={handleAssign}
              />
            </li>
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
        {!isCurrentUserAssigned && currentUserId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={assignMutation.isPending}
            onClick={handleSelfAssign}
            data-testid="admin-ticket-assignment-self-assign"
          >
            <UserPlus className="mr-2 size-4" aria-hidden="true" />
            Prevziať
          </Button>
        ) : null}
        {isCurrentUserAssigned ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={unassignMutation.isPending}
            onClick={() => setConfirmSelfUnassign(true)}
            data-testid="admin-ticket-assignment-self-unassign"
          >
            <UserMinus className="mr-2 size-4" aria-hidden="true" />
            Odhlásiť sa z pridelenia
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmSelfUnassign}
        onOpenChange={setConfirmSelfUnassign}
        title="Odhlásiť sa z pridelenia?"
        description="Žiadosť ostane pridelená ostatným adminom v zozname. Môžete sa znova prihlásiť kedykoľvek."
        severity="info"
        confirmLabel="Odhlásiť sa"
        cancelLabel="Zrušiť"
        onConfirm={handleSelfUnassignConfirmed}
      />
    </section>
  );
}
