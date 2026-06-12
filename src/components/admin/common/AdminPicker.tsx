import type { JSX } from "react";
import { useState } from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useAdminUsersList } from "@/lib/admin/use-admin-users-list";

interface AdminPickerProps {
  trigger: React.ReactNode;
  selectedAdminIds: string[];
  onSelect: (adminId: string) => void;
  excludeIds?: string[];
  emptyLabel?: string;
  searchPlaceholder?: string;
  align?: "start" | "end" | "center";
  maxHeight?: number;
}

export function AdminPicker({
  trigger,
  selectedAdminIds,
  onSelect,
  excludeIds = [],
  emptyLabel = "Žiadne výsledky",
  searchPlaceholder = "Hľadať admina…",
  align = "start",
  maxHeight = 320,
}: AdminPickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: admins = [] } = useAdminUsersList();

  const filtered = admins.filter((a) => {
    if (excludeIds.includes(a.user_id)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return a.display_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  const selected = filtered.filter((a) => selectedAdminIds.includes(a.user_id));
  const unselected = filtered.filter((a) => !selectedAdminIds.includes(a.user_id));
  const ordered = [...selected, ...unselected];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild data-testid="admin-ticket-assignment-picker">
        {trigger as React.ReactElement}
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align={align}
        data-testid="admin-ticket-assignment-popover"
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            data-testid="admin-ticket-assignment-search"
          />
          <CommandList style={{ maxHeight }}>
            <CommandEmpty data-testid="admin-ticket-assignment-empty">{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {ordered.map((admin) => {
                const isSelected = selectedAdminIds.includes(admin.user_id);
                return (
                  <CommandItem
                    key={admin.user_id}
                    value={`${admin.display_name} ${admin.email}`}
                    onSelect={() => {
                      if (isSelected) return;
                      onSelect(admin.user_id);
                      setOpen(false);
                    }}
                    disabled={isSelected}
                    data-testid={`admin-ticket-assignment-option-${admin.user_id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1 truncate">{admin.display_name}</span>
                    {isSelected && (
                      <span className="ml-2 text-xs text-muted-foreground">pridelené</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
