import { Link } from "@tanstack/react-router";
import {
  Copy,
  ExternalLink,
  Layers,
  MoreVertical,
  Pencil,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { tFor } from "@/i18n/tests";
import type { Template, TemplateAgeRating } from "@/lib/platform/types";

export type TemplateCardMode = "public" | "mine";

interface TemplateCardProps {
  template: Template;
  mode: TemplateCardMode;
  currentUserId: string | null;
  onUse: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  onSubmitPublic?: (template: Template) => void;
}

function pluralKey(
  count: number,
): "questions_count_one" | "questions_count_few" | "questions_count_many" {
  if (count === 1) return "questions_count_one";
  if (count >= 2 && count <= 4) return "questions_count_few";
  return "questions_count_many";
}

const AGE_KEY: Record<TemplateAgeRating, string | null> = {
  all: null,
  thirteen_plus: "age_rating_13",
  sixteen_plus: "age_rating_16",
  eighteen_plus: "age_rating_18",
};

const AGE_CLASS: Record<TemplateAgeRating, string> = {
  all: "",
  thirteen_plus: "border-success/40 bg-success/15 text-success",
  sixteen_plus: "border-warning/40 bg-warning/15 text-warning",
  eighteen_plus: "border-destructive/40 bg-destructive/15 text-destructive",
};

export function TemplateCard({
  template,
  mode,
  currentUserId,
  onUse,
  onDuplicate,
  onEdit,
  onDelete,
  onSubmitPublic,
}: TemplateCardProps) {
  const t = tFor("templates");
  const id = template.id;
  const isOwned = !!currentUserId && template.owner_id === currentUserId;
  const isDefault = template.owner_id === null;

  let ownershipLabel: string;
  let ownershipClass: string;
  if (isDefault) {
    ownershipLabel = t("ownership_default");
    ownershipClass = "bg-secondary text-secondary-foreground border-transparent";
  } else if (isOwned && template.fork_of) {
    ownershipLabel = t("ownership_my_copy");
    ownershipClass = "border border-primary/30 bg-primary/15 text-primary";
  } else if (isOwned) {
    ownershipLabel = t("ownership_mine");
    ownershipClass = "border border-primary/30 bg-primary/15 text-primary";
  } else {
    ownershipLabel = t("ownership_public");
    ownershipClass = "border border-success/40 bg-transparent text-success";
  }

  const ageKey = AGE_KEY[template.age_rating];
  const ageClass = AGE_CLASS[template.age_rating];

  const author = template.author_display_name?.trim();
  const licenseLine = isDefault
    ? t("license_default_author")
    : author
      ? t("license_cc_by", { author })
      : t("license_cc_by_unknown_author");

  const questionsCount = template.question_ids.length;
  const questionsLabel = t(pluralKey(questionsCount), { count: questionsCount });
  const purposeLabel = t(`purposes.${template.gdpr_purpose}`);

  return (
    <Card
      data-testid={`templates-card-${id}`}
      data-template-card="root"
      className="flex min-h-[10.5rem] flex-col border-border/60 transition-colors hover:border-primary/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
    >
      <CardContent className="flex flex-1 flex-col gap-3 p-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <h3
              data-testid={`templates-card-${id}-title`}
              className="line-clamp-2 text-sm font-semibold leading-snug text-foreground"
            >
              {template.title}
            </h3>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge
              data-testid={`templates-card-${id}-ownership-badge`}
              className={cn("text-[10px] font-medium", ownershipClass)}
            >
              {ownershipLabel}
            </Badge>
            <Badge
              variant="secondary"
              data-testid={`templates-card-${id}-questions-count`}
              className="text-[10px] font-medium"
            >
              {questionsLabel}
            </Badge>
          </div>
        </div>

        <p
          data-testid={`templates-card-${id}-description`}
          className="line-clamp-2 text-xs text-muted-foreground sm:line-clamp-2 max-sm:line-clamp-3"
        >
          {template.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          <Badge
            variant="outline"
            data-testid={`templates-card-${id}-purpose-badge`}
            className="text-[10px] font-normal"
          >
            {purposeLabel}
          </Badge>
          {ageKey && (
            <Badge
              data-testid={`templates-card-${id}-age-rating-badge`}
              className={cn("border text-[10px] font-medium", ageClass)}
            >
              {t(ageKey)}
            </Badge>
          )}
          <span
            data-testid={`templates-card-${id}-author-line`}
            className="ml-auto truncate text-[10px] text-muted-foreground"
          >
            {licenseLine}
          </span>
        </div>

        {mode === "public" && template.slug && (
          <Link
            to="/sablony/$slug"
            params={{ slug: template.slug }}
            data-testid={`templates-card-${id}-public-page-link`}
            className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {t("public_page_link")}
          </Link>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            onClick={() => onUse(template)}
            data-testid={`templates-card-${id}-use-button`}
            className="flex-1 max-sm:h-11"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>{t("row_use")}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("action_menu_label", { title: template.title })}
                data-testid={`templates-card-${id}-action-menu-trigger`}
                className="h-9 w-9 max-sm:h-11 max-sm:w-11"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              <DropdownMenuItem
                data-testid={`templates-card-${id}-action-duplicate`}
                onSelect={() => onDuplicate(template)}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>{t("action_duplicate")}</span>
                <DropdownMenuShortcut>D</DropdownMenuShortcut>
              </DropdownMenuItem>
              {isOwned && onEdit && (
                <DropdownMenuItem
                  data-testid={`templates-card-${id}-action-edit`}
                  onSelect={() => onEdit(template)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  <span>{t("action_edit")}</span>
                  <DropdownMenuShortcut>E</DropdownMenuShortcut>
                </DropdownMenuItem>
              )}
              {isOwned && onSubmitPublic && template.visibility !== "public" && (
                <DropdownMenuItem
                  data-testid={`templates-card-${id}-action-submit`}
                  onSelect={() => onSubmitPublic(template)}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{t("row_action_submit_public")}</span>
                </DropdownMenuItem>
              )}
              {isOwned && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    data-testid={`templates-card-${id}-action-delete`}
                    onSelect={() => onDelete(template)}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>{t("action_delete")}</span>
                    <DropdownMenuShortcut>Del</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
