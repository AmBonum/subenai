import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { tFor } from "@/i18n/quiz";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface CourseBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function CourseBreadcrumb({ items }: CourseBreadcrumbProps) {
  const t = tFor("skolenia");
  return (
    <nav
      data-testid="course-detail-breadcrumb"
      aria-label={t("breadcrumb_aria")}
      className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1.5">
            {item.to && !isLast ? (
              <Link
                to={item.to}
                data-testid={`course-detail-breadcrumb-${idx}`}
                className="rounded transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span
                data-testid={`course-detail-breadcrumb-${idx}`}
                className={isLast ? "text-foreground" : ""}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}
