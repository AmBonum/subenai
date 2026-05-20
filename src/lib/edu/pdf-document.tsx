/**
 * E38 Phase E — React-PDF Document for the edu-test results export.
 *
 * Imported DYNAMICALLY from the /results route so @react-pdf/renderer
 * (~250 KB gzipped) lands in its own chunk that only downloads after
 * the author clicks "Stiahnuť PDF". Don't import this module at the
 * route's top level.
 *
 * Layout (one A4 page, with `wrap` so long row lists overflow cleanly
 * into N pages):
 *   1. Title block — creator label + generated timestamp
 *   2. GDPR caveat banner (red border, matches CSV/JSON disclosure)
 *   3. Aggregate stats grid (4 cells + threshold)
 *   4. Score-band histogram (text-only — no SVG; keeps the bundle small)
 *   5. Filter summary (when non-empty)
 *   6. Respondent table — header + filtered rows
 *   7. Page footer with page number + privacy reminder
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { PdfData } from "./pdf-data";

interface Props {
  data: PdfData;
}

// 11pt body / 8pt micro / A4 (default in React-PDF). Colors are sRGB
// because React-PDF's color parser doesn't understand oklch().
const PALETTE = {
  fg: "#0F172A",
  muted: "#64748B",
  accent: "#0F8A4D",
  warn: "#B91C1C",
  border: "#E2E8F0",
  cardBg: "#F8FAFC",
} as const;

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: PALETTE.fg,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 18,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  subtitle: {
    fontSize: 9,
    color: PALETTE.muted,
    marginBottom: 12,
  },
  caveat: {
    borderLeft: `2px solid ${PALETTE.warn}`,
    paddingLeft: 8,
    paddingVertical: 6,
    fontSize: 9,
    color: PALETTE.warn,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 14,
  },
  statCell: {
    width: "25%",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  statLabel: {
    fontSize: 7,
    color: PALETTE.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  histogramRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  histLabel: {
    width: 42,
    fontSize: 9,
    color: PALETTE.muted,
  },
  histBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: PALETTE.border,
    borderRadius: 3,
    marginHorizontal: 6,
    overflow: "hidden",
  },
  histBarFill: {
    height: 6,
    backgroundColor: PALETTE.accent,
  },
  histCount: {
    width: 24,
    fontSize: 9,
    textAlign: "right",
  },
  filterLine: {
    fontSize: 9,
    color: PALETTE.muted,
    marginBottom: 12,
    fontFamily: "Helvetica-Oblique",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: `1px solid ${PALETTE.fg}`,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottom: `0.5px solid ${PALETTE.border}`,
  },
  th: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  td: { fontSize: 9 },
  colName: { width: "26%", paddingRight: 4 },
  colEmail: { width: "28%", paddingRight: 4 },
  colScore: { width: "12%", textAlign: "right", paddingRight: 4 },
  colPass: { width: "10%", textAlign: "center" },
  colTime: { width: "10%", textAlign: "right", paddingRight: 4 },
  colDate: { width: "14%", textAlign: "right" },
  emptyRow: {
    fontSize: 9,
    color: PALETTE.muted,
    fontFamily: "Helvetica-Oblique",
    paddingVertical: 12,
    textAlign: "center",
  },
  rowCount: {
    fontSize: 8,
    color: PALETTE.muted,
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 7,
    color: PALETTE.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function ResultsPdf({ data }: Props) {
  const maxHistCount = Math.max(...data.histogram.map((b) => b.count), 1);
  const title = data.creatorLabel?.trim() || "Výsledky edu testu";

  return (
    <Document title={title}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{data.headerLine}</Text>

        <View style={styles.caveat}>
          <Text>{data.privacyLine}</Text>
        </View>

        <Text style={styles.sectionHeading}>Súhrnné štatistiky</Text>
        <View style={styles.statsGrid}>
          <StatCell label="Respondentov" value={data.aggregate.count} />
          <StatCell label="Priemer" value={data.aggregate.avg} />
          <StatCell label="Medián" value={data.aggregate.median} />
          <StatCell label="Min / Max" value={data.aggregate.minMax} />
          <StatCell
            label={`Vyhovelo (≥ ${data.aggregate.threshold} %)`}
            value={data.aggregate.passed}
          />
        </View>

        <Text style={styles.sectionHeading}>Distribúcia skóre</Text>
        <View style={{ marginBottom: 14 }}>
          {data.histogram.map((b) => (
            <View key={b.label} style={styles.histogramRow}>
              <Text style={styles.histLabel}>{b.label}</Text>
              <View style={styles.histBarTrack}>
                <View
                  style={[styles.histBarFill, { width: `${(b.count / maxHistCount) * 100}%` }]}
                />
              </View>
              <Text style={styles.histCount}>{b.count}</Text>
            </View>
          ))}
        </View>

        {data.filterSummary ? <Text style={styles.filterLine}>{data.filterSummary}</Text> : null}

        <Text style={styles.sectionHeading}>Respondenti</Text>
        <Text style={styles.rowCount}>
          {data.filteredOut
            ? `Zobrazené ${data.rows.length} z ${data.totalRowCount} (zúžené filtrom)`
            : `Spolu ${data.rows.length}`}
        </Text>
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.th, styles.colName]}>Meno</Text>
          <Text style={[styles.th, styles.colEmail]}>Email</Text>
          <Text style={[styles.th, styles.colScore]}>Skóre</Text>
          <Text style={[styles.th, styles.colPass]}>Vyhovel</Text>
          <Text style={[styles.th, styles.colTime]}>Čas (s)</Text>
          <Text style={[styles.th, styles.colDate]}>Dátum</Text>
        </View>
        {data.rows.length === 0 ? (
          <Text style={styles.emptyRow}>Žiadny respondent nevyhovuje nastaveným filtrom.</Text>
        ) : (
          data.rows.map((r) => (
            <View key={r.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.colName]}>{r.name}</Text>
              <Text style={[styles.td, styles.colEmail]}>{r.email}</Text>
              <Text style={[styles.td, styles.colScore]}>{r.score}</Text>
              <Text style={[styles.td, styles.colPass]}>{r.passed}</Text>
              <Text style={[styles.td, styles.colTime]}>{r.timeSec}</Text>
              <Text style={[styles.td, styles.colDate]}>{r.date}</Text>
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text>subenai.sk · OBSAHUJE OSOBNÉ ÚDAJE — spracuj v súlade s GDPR</Text>
          <Text render={({ pageNumber, totalPages }) => `Strana ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
