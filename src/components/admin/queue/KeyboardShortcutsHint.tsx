import { useState } from "react";
import { Keyboard } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// E48-v2 PR-D — keyboard shortcut help. The footer shows the most-used
// shortcuts inline; the full sheet opens via the `?` shortcut (handled
// by the parent queue) or the small "Skratky" button.

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["/"], label: "Zaostriť vyhľadávanie" },
  { keys: ["j"], label: "Ďalší riadok" },
  { keys: ["k"], label: "Predchádzajúci riadok" },
  { keys: ["Enter"], label: "Otvoriť žiadosť" },
  { keys: ["x"], label: "Označiť / odznačiť riadok" },
  { keys: ["?"], label: "Tento prehľad" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHint({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="admin-tickets-shortcuts-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" aria-hidden="true" /> Klávesové skratky
          </DialogTitle>
          <DialogDescription>
            Skratky fungujú, keď nemáte zaostrený formulárový vstup.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <li key={s.keys.join("+")} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Zatvoriť
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Tiny footer hint that opens the dialog above on click. Stateful — the
// queue separately reacts to the `?` global shortcut by setting its own
// flag and rendering <KeyboardShortcutsHint open={...} ...> directly.
export function KeyboardShortcutsFooter() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="flex items-center justify-end gap-2 text-xs text-muted-foreground"
      data-testid="admin-tickets-shortcuts-footer"
    >
      <span className="hidden sm:inline">
        Skratky:{" "}
        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
          /
        </kbd>{" "}
        hľadať ·{" "}
        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
          j
        </kbd>
        /
        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
          k
        </kbd>{" "}
        navigácia ·{" "}
        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
          ?
        </kbd>{" "}
        viac
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
        data-testid="admin-tickets-shortcuts-trigger"
      >
        <Keyboard className="size-3" aria-hidden="true" />
        Skratky
      </button>
      <KeyboardShortcutsHint open={open} onOpenChange={setOpen} />
    </div>
  );
}
