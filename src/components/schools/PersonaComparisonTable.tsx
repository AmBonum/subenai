import { Check } from "lucide-react";

import { tFor } from "@/i18n/marketing";

// E19.4 — three-column persona comparison.
//
// Same edu-mode product, three different consumer journeys. The table
// surfaces what's relevant to each persona without forcing them to
// read the whole page. Desktop = wide table, mobile = stacked persona
// cards (same data, layout-only switch via Tailwind responsive classes).

type Persona = "riaditel" | "itkoord" | "ucitel";
type Cell = string | "check" | "dash";

interface Row {
  key: string;
  label: string;
  values: Record<Persona, Cell>;
}

function CellContent({ cell }: { cell: Cell }) {
  if (cell === "check") {
    return (
      <span className="inline-flex items-center justify-center text-success" aria-label="áno">
        <Check className="size-5" aria-hidden="true" />
      </span>
    );
  }
  if (cell === "dash") {
    return (
      <span className="text-muted-foreground" aria-label="nie">
        —
      </span>
    );
  }
  return <span className="text-sm text-foreground">{cell}</span>;
}

export function PersonaComparisonTable() {
  const t = tFor("marketing");

  const rows: Row[] = [
    {
      key: "dashboard",
      label: t("skoly.comparison_row_dashboard"),
      values: { riaditel: "check", itkoord: "check", ucitel: "check" },
    },
    {
      key: "csv",
      label: t("skoly.comparison_row_csv"),
      values: { riaditel: "check", itkoord: "check", ucitel: "check" },
    },
    {
      key: "gdpr",
      label: t("skoly.comparison_row_gdpr"),
      values: {
        riaditel: t("skoly.comparison_row_gdpr_riaditel"),
        itkoord: t("skoly.comparison_row_gdpr_itkoord"),
        ucitel: t("skoly.comparison_row_gdpr_ucitel"),
      },
    },
    {
      key: "max",
      label: t("skoly.comparison_row_max"),
      values: {
        riaditel: t("skoly.comparison_row_max_value"),
        itkoord: t("skoly.comparison_row_max_value"),
        ucitel: t("skoly.comparison_row_max_value"),
      },
    },
    {
      key: "setup",
      label: t("skoly.comparison_row_setup"),
      values: {
        riaditel: t("skoly.comparison_row_setup_riaditel"),
        itkoord: t("skoly.comparison_row_setup_itkoord"),
        ucitel: t("skoly.comparison_row_setup_ucitel"),
      },
    },
    {
      key: "signoff",
      label: t("skoly.comparison_row_signoff"),
      values: {
        riaditel: t("skoly.comparison_row_signoff_riaditel"),
        itkoord: t("skoly.comparison_row_signoff_itkoord"),
        ucitel: t("skoly.comparison_row_signoff_ucitel"),
      },
    },
  ];

  const personas: Array<{ key: Persona; label: string }> = [
    { key: "riaditel", label: t("skoly.comparison_col_riaditel") },
    { key: "itkoord", label: t("skoly.comparison_col_itkoord") },
    { key: "ucitel", label: t("skoly.comparison_col_ucitel") },
  ];

  return (
    <section
      className="mt-12"
      aria-labelledby="schools-comparison-heading"
      data-testid="schools-persona-comparison"
    >
      <h2
        id="schools-comparison-heading"
        className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        data-testid="schools-persona-comparison-heading"
      >
        {t("skoly.comparison_heading")}
      </h2>
      <p
        className="mt-2 max-w-2xl text-sm text-muted-foreground"
        data-testid="schools-persona-comparison-subheading"
      >
        {t("skoly.comparison_subheading")}
      </p>

      {/* Desktop: wide table */}
      <div
        className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-card/40 md:block"
        data-testid="schools-persona-table-desktop"
      >
        <table className="w-full" data-testid="schools-persona-table">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">
                &nbsp;
              </th>
              {personas.map((p) => (
                <th
                  key={p.key}
                  className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-foreground"
                  data-testid={`schools-persona-col-${p.key}`}
                  scope="col"
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.key}
                className={idx % 2 === 0 ? "bg-transparent" : "bg-muted/20"}
                data-testid={`schools-persona-row-${row.key}`}
              >
                <th
                  scope="row"
                  className="px-4 py-3 text-left text-sm font-semibold text-foreground"
                >
                  {row.label}
                </th>
                {personas.map((p) => (
                  <td key={p.key} className="px-4 py-3 align-middle">
                    <CellContent cell={row.values[p.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked persona cards */}
      <div className="mt-6 space-y-4 md:hidden" data-testid="schools-persona-stack-mobile">
        {personas.map((p) => (
          <div
            key={p.key}
            className="rounded-2xl border border-border bg-card/40 p-5"
            data-testid={`schools-persona-card-${p.key}`}
          >
            <h3 className="text-base font-bold text-foreground">{p.label}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {rows.map((row) => (
                <div key={row.key} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-right text-foreground">
                    <CellContent cell={row.values[p.key]} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
