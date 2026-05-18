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
import { BRANCHES, branchLabel } from "@/lib/admin/branches";
import { cn } from "@/lib/utils";
import { tFor as tForQuestions } from "@/i18n/questions";
import { tFor as tForAdmin } from "@/i18n/admin";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function CategoryMultiSelect({ value, onChange, placeholder, className }: Props) {
  const tQ = tForQuestions("ai_generator");
  const tA = tForAdmin("categories");
  const ph = placeholder ?? tQ("category_multi_placeholder");
  const [open, setOpen] = useState(false);

  const toggle = (slug: string) => {
    onChange(value.includes(slug) ? value.filter((v) => v !== slug) : [...value, slug]);
  };

  return (
    <div data-testid="category-multiselect-root">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            data-testid="category-multi-select-trigger"
            className={cn(
              "h-auto min-h-10 w-full justify-between text-left font-normal",
              className,
            )}
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
                    data-testid={`category-multiselect-selected-tag-${slug}`}
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
            <CommandInput
              placeholder={tQ("category_search_placeholder")}
              data-testid="category-multiselect-search-input"
            />
            <CommandList>
              <CommandEmpty>{tQ("category_empty")}</CommandEmpty>
              <CommandGroup>
                {BRANCHES.map((b) => {
                  const selected = value.includes(b.slug);
                  return (
                    <CommandItem
                      key={b.slug}
                      onSelect={() => toggle(b.slug)}
                      data-testid={`category-multiselect-option-${b.slug}`}
                      aria-selected={selected}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")}
                      />
                      {b.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
            {value.length > 0 && (
              <div className="border-t border-border/40 p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  data-testid="category-multiselect-clear-button"
                  onClick={() => onChange([])}
                >
                  {tA("multiselect_clear")}
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
