import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import {
  useAdminNotificationPreferences,
  useUpdateAdminNotificationPreferences,
  getDefaultAdminNotificationPreferences,
  type AdminNotificationPreferences as Prefs,
  type DigestCadence,
  type SupportCategoryKey,
} from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

// E48.9 — Admin self-service notification preferences. RLS scopes the
// row to the current admin only; no admin can read or write another
// admin's prefs (matches PLAN D-5).
//
// The UI is "dirty-state with explicit save" rather than per-toggle
// auto-save: it keeps the Postgres write count bounded, lets admins
// preview the desired configuration before committing, and gives a
// clean rollback affordance ("Zahodiť zmeny").

const CATEGORY_LABEL_SK: Record<SupportCategoryKey, string> = {
  bug: "Chyby",
  question: "Otázky",
  feature_request: "Návrhy na funkcie",
  abuse_report: "Nahlásenie nevhodného obsahu",
  billing: "Platby a fakturácia",
  gdpr: "GDPR + ochrana údajov",
  other: "Iné",
};

const CADENCE_LABEL_SK: Record<DigestCadence, string> = {
  instant: "Okamžite",
  hourly: "Hodinový súhrn",
  daily: "Denný súhrn (09:00 Europe/Bratislava)",
  off: "Vypnuté",
};

const CATEGORIES: SupportCategoryKey[] = [
  "bug",
  "question",
  "feature_request",
  "abuse_report",
  "billing",
  "gdpr",
  "other",
];

const CADENCES: DigestCadence[] = ["instant", "hourly", "daily", "off"];

function prefsEqual(a: Prefs, b: Prefs): boolean {
  if (a.enabled !== b.enabled) return false;
  if (a.channels.email !== b.channels.email) return false;
  if (a.channels.in_app !== b.channels.in_app) return false;
  if (a.digest_cadence !== b.digest_cadence) return false;
  for (const cat of CATEGORIES) {
    if (a.per_category[cat] !== b.per_category[cat]) return false;
  }
  return true;
}

export function AdminNotificationPreferences() {
  const prefsQ = useAdminNotificationPreferences();
  const updateMut = useUpdateAdminNotificationPreferences();

  const serverPrefs = useMemo<Prefs>(
    () => prefsQ.data ?? getDefaultAdminNotificationPreferences(),
    [prefsQ.data],
  );

  const [draft, setDraft] = useState<Prefs>(() => getDefaultAdminNotificationPreferences());

  // Re-seed local state when the server snapshot arrives or refreshes.
  useEffect(() => {
    if (prefsQ.data) setDraft(structuredClone(prefsQ.data));
  }, [prefsQ.data]);

  const isDirty = !prefsEqual(draft, serverPrefs);

  async function handleSave() {
    try {
      await updateMut.mutateAsync(draft);
      toast.success("Nastavenia upozornení boli uložené.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Uloženie zlyhalo.";
      toast.error(msg);
    }
  }

  function handleDiscard() {
    setDraft(structuredClone(serverPrefs));
  }

  if (prefsQ.isLoading) {
    return (
      <div
        data-testid="admin-notif-loading"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Načítavam nastavenia upozornení…
      </div>
    );
  }

  if (prefsQ.isError) {
    return (
      <p data-testid="admin-notif-error" className="text-sm text-destructive">
        Nastavenia upozornení sa nepodarilo načítať. Skúste obnoviť stránku.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-notif-root">
      <section
        className="rounded-md border border-border bg-card p-5"
        data-testid="admin-notif-master-section"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Dostávať upozornenia z podpory
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hlavný vypínač. Ak je vypnutý, nepošleme vám e-mail ani interné upozornenie pre žiadnu
              kategóriu.
            </p>
          </div>
          <Switch
            data-testid="admin-notif-master-toggle"
            checked={draft.enabled}
            onCheckedChange={(checked) => setDraft({ ...draft, enabled: checked })}
            aria-label="Hlavný prepínač upozornení"
          />
        </div>
      </section>

      <section
        className="space-y-4 rounded-md border border-border bg-card p-5"
        data-testid="admin-notif-channels-section"
      >
        <header>
          <h2 className="text-base font-semibold text-foreground">Kanály doručenia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            E-mail prichádza na vašu admin adresu. Interné upozornenie sa zobrazí v hornej lište
            administrácie.
          </p>
        </header>

        <div
          className="flex items-center justify-between"
          data-testid="admin-notif-channel-email-row"
        >
          <Label
            htmlFor="admin-notif-channel-email"
            className="text-sm font-medium text-foreground"
          >
            E-mail
          </Label>
          <Switch
            id="admin-notif-channel-email"
            data-testid="admin-notif-channel-email"
            checked={draft.channels.email}
            disabled={!draft.enabled}
            onCheckedChange={(checked) =>
              setDraft({ ...draft, channels: { ...draft.channels, email: checked } })
            }
          />
        </div>

        <div
          className="flex items-center justify-between"
          data-testid="admin-notif-channel-inapp-row"
        >
          <Label
            htmlFor="admin-notif-channel-inapp"
            className="text-sm font-medium text-foreground"
          >
            V aplikácii
          </Label>
          <Switch
            id="admin-notif-channel-inapp"
            data-testid="admin-notif-channel-inapp"
            checked={draft.channels.in_app}
            disabled={!draft.enabled}
            onCheckedChange={(checked) =>
              setDraft({ ...draft, channels: { ...draft.channels, in_app: checked } })
            }
          />
        </div>
      </section>

      <section
        className="space-y-4 rounded-md border border-border bg-card p-5"
        data-testid="admin-notif-cadence-section"
      >
        <header>
          <h2 className="text-base font-semibold text-foreground">Frekvencia e-mailov</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Týka sa iba e-mailov. Interné upozornenia sú vždy okamžité.
          </p>
        </header>

        <RadioGroup
          value={draft.digest_cadence}
          onValueChange={(value) => setDraft({ ...draft, digest_cadence: value as DigestCadence })}
          disabled={!draft.enabled || !draft.channels.email}
          className="grid gap-3"
        >
          {CADENCES.map((cadence) => (
            <div key={cadence} className="flex items-center gap-2">
              <RadioGroupItem
                id={`admin-notif-cadence-${cadence}`}
                value={cadence}
                data-testid={`admin-notif-cadence-${cadence}`}
              />
              <Label
                htmlFor={`admin-notif-cadence-${cadence}`}
                className="text-sm font-normal text-foreground"
              >
                {CADENCE_LABEL_SK[cadence]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </section>

      <section
        className="space-y-4 rounded-md border border-border bg-card p-5"
        data-testid="admin-notif-categories-section"
      >
        <header>
          <h2 className="text-base font-semibold text-foreground">Kategórie žiadostí</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vypnite kategórie, ktoré sa vás netýkajú. Aspoň jedna by mala zostať zapnutá, inak vám
            neprídu žiadne upozornenia.
          </p>
        </header>

        <Separator />

        <div className="grid gap-3">
          {CATEGORIES.map((cat) => (
            <div
              key={cat}
              className="flex items-center justify-between"
              data-testid={`admin-notif-cat-${cat}-row`}
            >
              <Label
                htmlFor={`admin-notif-cat-${cat}-toggle`}
                className="text-sm font-medium text-foreground"
              >
                {CATEGORY_LABEL_SK[cat]}
              </Label>
              <Switch
                id={`admin-notif-cat-${cat}-toggle`}
                data-testid={`admin-notif-cat-${cat}-toggle`}
                checked={draft.per_category[cat]}
                disabled={!draft.enabled}
                onCheckedChange={(checked) =>
                  setDraft({
                    ...draft,
                    per_category: { ...draft.per_category, [cat]: checked },
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>

      {isDirty && (
        <div
          className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-50/80 p-4 shadow-md dark:bg-amber-950/40"
          data-testid="admin-notif-dirty-bar"
        >
          <p className="text-sm text-amber-900 dark:text-amber-100">Máte neuložené zmeny.</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscard}
              data-testid="admin-notif-discard"
              disabled={updateMut.isPending}
            >
              Zahodiť zmeny
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              data-testid="admin-notif-save"
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Ukladám…
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" aria-hidden="true" />
                  Uložiť zmeny
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
