import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { BRANCHES, branchLabel } from "@/lib/admin/mock-data";
import { cn } from "@/lib/utils";
import { tFor } from "@/i18n/questions";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function CategoryMultiSelect({ value, onChange, placeholder, className }: Props) {
  const t = tFor("ai_generator");
  const ph = placeholder ?? t("category_multi_placeholder");
  const [open, setOpen] = useState(false);

  const toggle = (slug: string) => {
    onChange(value.includes(slug) ? value.filter((v) => v !== slug) : [...value, slug]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          data-testid="category-multi-select-trigger"
          className={cn("h-auto min-h-10 w-full justify-between text-left font-normal", className)}
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{ph}</span>
            ) : (
              value.map((slug) => (
                <Badge
                  key={slug}
                  variant="secondary"
                  className="gap-1 pr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(slug);
                  }}
                >
                  {branchLabel(slug)}
                  <X className="h-3 w-3 opacity-60" />
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("category_search_placeholder")} />
          <CommandList>
            <CommandEmpty>{t("category_empty")}</CommandEmpty>
            <CommandGroup>
              {BRANCHES.map((b) => {
                const selected = value.includes(b.slug);
                return (
                  <CommandItem key={b.slug} onSelect={() => toggle(b.slug)}>
                    <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                    {b.name}
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
