// E53.4 — police-report PDF template (React-PDF). Lazy-loaded chunk —
// import only from render.client.ts, never at a route's top level.
//
// Slovak glyphs (č ľ ť ň …) need a Unicode TTF; the 14 built-in PDF fonts
// are Latin-1 only. We register Noto Sans (public/fonts), the same family
// the DPA template uses.

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  SCAM_REPORT_DISCLAIMER,
  SCAM_REPORT_POLICE_LINE,
  SCAM_REPORT_TITLE,
  type ScamReportData,
} from "./report-data";

Font.register({ family: "NotoSans", src: "/fonts/NotoSans-Regular.ttf" });
Font.register({ family: "NotoSansBold", src: "/fonts/NotoSans-Bold.ttf" });

const PALETTE = {
  fg: "#0F172A",
  muted: "#64748B",
  accent: "#0F8A4D",
  warn: "#B91C1C",
  border: "#CBD5E1",
  cardBg: "#F8FAFC",
} as const;

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: PALETTE.fg, fontFamily: "NotoSans" },
  title: { fontSize: 18, marginBottom: 4, fontFamily: "NotoSansBold" },
  subtitle: { fontSize: 9, color: PALETTE.muted, marginBottom: 12 },
  riskBadge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 10,
    fontFamily: "NotoSansBold",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  police: {
    borderLeft: `2px solid ${PALETTE.warn}`,
    paddingLeft: 8,
    paddingVertical: 6,
    fontSize: 10,
    color: PALETTE.warn,
    fontFamily: "NotoSansBold",
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 9,
    fontFamily: "NotoSansBold",
    color: PALETTE.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 8,
  },
  listItem: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 12, fontSize: 10 },
  listText: { flex: 1, fontSize: 10 },
  empty: { fontSize: 9, color: PALETTE.muted, fontFamily: "NotoSans", marginBottom: 8 },
  photoRow: { flexDirection: "row", marginBottom: 10, marginTop: 4 },
  photoThumb: {
    width: 96,
    height: 96,
    objectFit: "cover",
    borderRadius: 4,
    border: `1px solid ${PALETTE.border}`,
    marginRight: 10,
  },
  photoFindings: { flex: 1, fontSize: 9, color: PALETTE.fg },
  disclaimer: {
    marginTop: 16,
    borderTop: `1px solid ${PALETTE.border}`,
    paddingTop: 8,
    fontSize: 8,
    color: PALETTE.muted,
    fontFamily: "NotoSans",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    fontSize: 7,
    color: PALETTE.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function riskColor(label: string): string {
  if (label.startsWith("Vysoké")) return PALETTE.warn;
  if (label.startsWith("Stredné")) return "#B45309";
  return PALETTE.accent;
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <Text style={styles.empty}>—</Text>;
  return (
    <>
      {items.map((item, i) => (
        <View key={i} style={styles.listItem} wrap={false}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

export interface ScamReportTemplateProps {
  data: ScamReportData;
}

export function ScamReportTemplate({ data }: ScamReportTemplateProps) {
  return (
    <Document title={SCAM_REPORT_TITLE}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{SCAM_REPORT_TITLE}</Text>
        <Text style={styles.subtitle}>Vygenerované: {data.generatedAtLabel} · subenai.sk</Text>

        <Text style={[styles.riskBadge, { backgroundColor: riskColor(data.riskLabel) }]}>
          {data.riskLabel}
        </Text>

        {data.recommendsPolice ? (
          <Text style={styles.police}>{SCAM_REPORT_POLICE_LINE}</Text>
        ) : null}

        <Text style={styles.sectionHeading}>Časová os udalostí</Text>
        <BulletList items={data.timeline} />

        <Text style={styles.sectionHeading}>Indikátory podvodu</Text>
        <BulletList items={data.indicators} />

        <Text style={styles.sectionHeading}>Zoznam dôkazov</Text>
        <BulletList items={data.evidence} />

        {data.photos.length > 0 ? (
          <View>
            {data.photos.map((photo, i) => (
              <View key={i} style={styles.photoRow} wrap={false}>
                <Image style={styles.photoThumb} src={photo.dataUrl} />
                <Text style={styles.photoFindings}>{photo.findings}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionHeading}>Odporúčané ďalšie kroky</Text>
        <BulletList items={data.nextSteps} />

        <Text style={styles.disclaimer}>{SCAM_REPORT_DISCLAIMER}</Text>

        <View style={styles.footer} fixed>
          <Text>subenai.sk · Podvodový poradca</Text>
          <Text render={({ pageNumber, totalPages }) => `Strana ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
