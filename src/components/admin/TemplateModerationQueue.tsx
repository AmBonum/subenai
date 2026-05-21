import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Eye, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  useAdminPendingTemplateSubmissions,
  useApproveTemplateSubmission,
  useRejectTemplateSubmission,
  type AdminTemplateSubmissionRow,
  type TemplateAgeRating,
} from "@/lib/admin/queries";

const AGE_RATING_LABEL: Record<TemplateAgeRating, string> = {
  all: "Pre všetkých",
  thirteen_plus: "13+",
  sixteen_plus: "16+",
  eighteen_plus: "18+",
};

function formatSubmittedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sk-SK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TemplateModerationQueue() {
  const { data, isLoading, isError, error } = useAdminPendingTemplateSubmissions();
  const approve = useApproveTemplateSubmission();
  const reject = useRejectTemplateSubmission();

  // Three independent UI states: a precheck-JSON viewer, an approve
  // confirm, a reject form. Each tracks a single submission row.
  const [viewing, setViewing] = useState<AdminTemplateSubmissionRow | null>(null);
  const [approving, setApproving] = useState<AdminTemplateSubmissionRow | null>(null);
  const [rejecting, setRejecting] = useState<AdminTemplateSubmissionRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const rows = data ?? [];

  function onApprove() {
    if (!approving) return;
    const row = approving;
    approve.mutate(
      { submissionId: row.id },
      {
        onSuccess: () => {
          toast.success(`Šablóna "${row.template?.title ?? "(bez názvu)"}" zverejnená`);
          setApproving(null);
        },
        onError: (e) => {
          toast.error(`Schválenie zlyhalo: ${e instanceof Error ? e.message : String(e)}`);
        },
      },
    );
  }

  function onReject() {
    if (!rejecting) return;
    const row = rejecting;
    const reason = rejectionReason.trim();
    if (reason.length < 3) {
      toast.error("Dôvod musí mať aspoň 3 znaky");
      return;
    }
    reject.mutate(
      { submissionId: row.id, reason },
      {
        onSuccess: () => {
          toast.success(`Šablóna "${row.template?.title ?? "(bez názvu)"}" zamietnutá`);
          setRejecting(null);
          setRejectionReason("");
        },
        onError: (e) => {
          toast.error(`Zamietnutie zlyhalo: ${e instanceof Error ? e.message : String(e)}`);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span data-testid="admin-templates-loading">Načítavam…</span>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent
          className="py-12 text-center text-destructive"
          data-testid="admin-templates-error"
        >
          Chyba pri načítaní: {error instanceof Error ? error.message : "neznáma chyba"}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent
          className="py-16 text-center text-muted-foreground"
          data-testid="admin-templates-empty"
        >
          <p className="text-base">Žiadne šablóny nečakajú na schválenie.</p>
          <p className="mt-2 text-sm">
            Keď používateľ odošle šablónu na zverejnenie, objaví sa tu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table data-testid="admin-templates-queue-table">
            <TableHeader>
              <TableRow>
                <TableHead>Šablóna</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Veková kategória</TableHead>
                <TableHead>AI precheck</TableHead>
                <TableHead>Odoslané</TableHead>
                <TableHead className="text-right">Akcie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} data-testid={`admin-templates-row-${row.id}`}>
                  <TableCell>
                    <div
                      className="font-medium"
                      data-testid={`admin-templates-row-${row.id}-title`}
                    >
                      {row.template?.title ?? "(bez názvu)"}
                    </div>
                    {row.template?.description ? (
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {row.template.description}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{row.author_display_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{AGE_RATING_LABEL[row.age_rating_declared]}</Badge>
                  </TableCell>
                  <TableCell>
                    {row.precheck_passed === true ? (
                      <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700">
                        Prešlo
                      </Badge>
                    ) : row.precheck_passed === false ? (
                      <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-700">
                        Na ručné posúdenie
                      </Badge>
                    ) : (
                      <Badge variant="outline">Bez prechecku</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatSubmittedAt(row.submitted_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewing(row)}
                        data-testid={`admin-templates-row-${row.id}-view-precheck`}
                        aria-label="Zobraziť AI precheck"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejecting(row)}
                        data-testid={`admin-templates-row-${row.id}-reject`}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Zamietnuť
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setApproving(row)}
                        data-testid={`admin-templates-row-${row.id}-approve`}
                        className="bg-emerald-600 text-emerald-50 hover:bg-emerald-600/90"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Schváliť
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(approving)}
        onOpenChange={(open) => !open && setApproving(null)}
        severity="success"
        title="Zverejniť šablónu?"
        description={
          approving ? (
            <>
              Šablóna <strong>{approving.template?.title ?? "(bez názvu)"}</strong> autora{" "}
              <strong>{approving.author_display_name}</strong> sa zaradí do verejnej knižnice pod
              licenciou CC BY 4.0. Akciu nie je možné spätne vrátiť cez UI.
            </>
          ) : null
        }
        confirmLabel="Zverejniť"
        onConfirm={onApprove}
      />

      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent data-testid="admin-templates-reject-dialog">
          <DialogHeader>
            <DialogTitle>Zamietnuť šablónu</DialogTitle>
            <DialogDescription>
              {rejecting ? (
                <>
                  Šablóna <strong>{rejecting.template?.title ?? "(bez názvu)"}</strong>. Autor uvidí
                  zhrnutie tvojho dôvodu a môže po 24 h podať opravenú verziu.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-templates-reject-reason">Dôvod (povinné, 3+ znakov)</Label>
            <Textarea
              id="admin-templates-reject-reason"
              data-testid="admin-templates-reject-reason"
              rows={4}
              placeholder="Napr.: Otázky obsahujú osobné údaje (mená reálnych firiem). Prepíš ich na anonymné a podaj znova."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRejecting(null);
                setRejectionReason("");
              }}
            >
              Zrušiť
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={rejectionReason.trim().length < 3 || reject.isPending}
              data-testid="admin-templates-reject-confirm"
            >
              {reject.isPending ? "Zamietam…" : "Zamietnuť"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl" data-testid="admin-templates-precheck-dialog">
          <DialogHeader>
            <DialogTitle>AI precheck — {viewing?.template?.title ?? "(bez názvu)"}</DialogTitle>
            <DialogDescription>
              Štruktúrovaná odpoveď z Claude Haiku 4.5. Slúži ako odporúčanie, nie ako verdikt —
              vlastné posúdenie má prednosť.
            </DialogDescription>
          </DialogHeader>
          {viewing?.precheck ? (
            <pre
              className="max-h-[60vh] overflow-auto rounded-md border bg-muted/30 p-3 text-xs"
              data-testid="admin-templates-precheck-json"
            >
              {JSON.stringify(viewing.precheck, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pre túto šablónu nie je k dispozícii precheck JSON (možno bola odoslaná pred E44.7).
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setViewing(null)}>
              Zavrieť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
