import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ALL_ACCEPTED,
  ALL_REJECTED,
  type ConsentCategories,
  type ConsentCategory,
  DEFAULT_CATEGORIES,
} from "@/lib/consent";
import { useConsent } from "@/hooks/useConsent";
import { tFor } from "@/i18n/marketing";

interface CategoryDescriptor {
  id: ConsentCategory;
  /** locked = always on, cannot be turned off (necessary). */
  locked?: boolean;
}

const CATEGORIES: CategoryDescriptor[] = [
  { id: "necessary", locked: true },
  { id: "preferences" },
  { id: "analytics" },
  { id: "marketing" },
];

/**
 * Granular preferences dialog. Opened from the banner ("Nastavenia") or
 * from any "Nastavenia cookies" link in the page footer.
 *
 * State machine: while the dialog is open we hold a *draft* of the
 * categories so the user can flip switches without persisting until
 * they click "Uložiť". This avoids accidental partial-consent records.
 */
export function ConsentPreferencesDialog() {
  const { record, preferencesOpen, closePreferences, saveCategories } = useConsent();
  const t = tFor("consent");

  const [draft, setDraft] = useState<ConsentCategories>(record?.categories ?? DEFAULT_CATEGORIES);

  // Reset draft to the persisted state every time the dialog opens.
  useEffect(() => {
    if (preferencesOpen) {
      setDraft(record?.categories ?? DEFAULT_CATEGORIES);
    }
  }, [preferencesOpen, record]);

  const toggle = (id: ConsentCategory, value: boolean) => {
    if (id === "necessary") return; // hard-locked
    setDraft((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <Dialog
      open={preferencesOpen}
      onOpenChange={(open) => {
        if (!open) closePreferences();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("dialog.description_prefix")}
            <DialogClose asChild>
              <Link to="/cookies" className="underline underline-offset-2 hover:text-foreground">
                {t("dialog.description_link_cookies")}
              </Link>
            </DialogClose>
            {t("dialog.description_and")}
            <DialogClose asChild>
              <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                {t("dialog.description_link_privacy")}
              </Link>
            </DialogClose>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 space-y-4">
          {CATEGORIES.map((cat, idx) => {
            const title = t(`dialog.categories.${cat.id}.title`);
            const description = t(`dialog.categories.${cat.id}.description`);
            return (
              <div key={cat.id}>
                {idx > 0 ? <Separator className="mb-4" /> : null}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor={`consent-${cat.id}`}
                      className="text-sm font-semibold text-foreground"
                    >
                      {title}
                      {cat.locked ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {t("dialog.always_active")}
                        </span>
                      ) : null}
                    </label>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <Switch
                    id={`consent-${cat.id}`}
                    checked={draft[cat.id]}
                    disabled={cat.locked}
                    onCheckedChange={(checked) => toggle(cat.id, checked)}
                    aria-label={title}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => saveCategories(ALL_REJECTED)}>
            {t("dialog.reject_all")}
          </Button>
          <Button variant="outline" onClick={() => saveCategories(ALL_ACCEPTED)}>
            {t("dialog.accept_all")}
          </Button>
          <Button onClick={() => saveCategories(draft)}>{t("dialog.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
