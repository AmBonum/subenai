// React-PDF template for the training-evidence report. Lazy-loaded chunk —
// import only from evidence-pdf.client.ts. Noto Sans because the built-in
// PDF fonts are Latin-1 only and cannot render č ľ ť ň.

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatSkDate, verifyUrl, type EvidenceReport } from "./evidence-types";

Font.register({ family: "NotoSans", src: "/fonts/NotoSans-Regular.ttf" });
Font.register({ family: "NotoSansBold", src: "/fonts/NotoSans-Bold.ttf" });

const C = {
  fg: "#0F172A",
  muted: "#64748B",
  ok: "#0F8A4D",
  bad: "#B91C1C",
  border: "#CBD5E1",
  soft: "#F1F5F9",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: C.fg, fontFamily: "NotoSans" },
  brand: { fontSize: 9, color: C.muted, marginBottom: 18 },
  title: { fontSize: 20, fontFamily: "NotoSansBold", marginBottom: 4 },
  sub: { fontSize: 10, color: C.muted, marginBottom: 16 },
  grid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: C.soft, borderRadius: 4, padding: 8 },
  statValue: { fontSize: 16, fontFamily: "NotoSansBold" },
  statLabel: { fontSize: 8, color: C.muted },
  h: {
    fontSize: 9,
    fontFamily: "NotoSansBold",
    color: C.muted,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 6,
  },
  row: { flexDirection: "row", borderBottom: `1px solid ${C.border}`, paddingVertical: 4 },
  head: { fontFamily: "NotoSansBold" },
  cNo: { width: 24 },
  cName: { flex: 3 },
  cDate: { flex: 1.4 },
  cScore: { width: 44, textAlign: "right" },
  cRes: { width: 70, textAlign: "right" },
  legal: { fontSize: 8, color: C.muted, marginTop: 14, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: C.muted },
  cert: { padding: 56, fontFamily: "NotoSans", color: C.fg, justifyContent: "center" },
  certFrame: { border: `2px solid ${C.ok}`, borderRadius: 8, padding: 40, alignItems: "center" },
  certKicker: {
    fontSize: 10,
    color: C.ok,
    fontFamily: "NotoSansBold",
    letterSpacing: 2,
    marginBottom: 18,
  },
  certName: { fontSize: 26, fontFamily: "NotoSansBold", marginBottom: 12, textAlign: "center" },
  certText: { fontSize: 11, textAlign: "center", lineHeight: 1.5, marginBottom: 6 },
});

function respondentLabel(name: string, index: number): string {
  return name || `Respondent č. ${index + 1}`;
}

export function EvidenceReportPdf({ report, origin }: { report: EvidenceReport; origin: string }) {
  const url = verifyUrl(origin, report.id);
  const footer = `Overenie: ${url} · SHA-256 ${report.sha256}`;
  const certified = report.respondents.filter((r) => r.passed && r.name);
  return (
    <Document title={`Doklad o preškolení — ${report.orgName}`} author="subenai.sk" language="sk">
      <Page size="A4" style={s.page} wrap>
        <Text style={s.brand}>subenai.sk · Doklad o preškolení zamestnancov</Text>
        <Text style={s.title}>Doklad o preškolení</Text>
        <Text style={s.sub}>
          {report.orgName} · {report.testTitle} (verzia {report.testVersion}) · vystavené{" "}
          {formatSkDate(report.generatedAt)}
        </Text>
        <View style={s.grid}>
          <View style={s.stat}>
            <Text style={s.statValue}>{report.respondentCount}</Text>
            <Text style={s.statLabel}>absolvovalo</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statValue}>{report.passedCount}</Text>
            <Text style={s.statLabel}>úspešne (≥ {report.passScore} %)</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statValue}>{report.averageScore} %</Text>
            <Text style={s.statLabel}>priemerné skóre</Text>
          </View>
        </View>
        <Text style={s.h}>Zoznam absolventov</Text>
        <View style={[s.row, s.head]} fixed>
          <Text style={s.cNo}>#</Text>
          <Text style={s.cName}>Meno / e-mail</Text>
          <Text style={s.cDate}>Dokončené</Text>
          <Text style={s.cScore}>Skóre</Text>
          <Text style={s.cRes}>Výsledok</Text>
        </View>
        {report.respondents.map((r, i) => (
          <View style={s.row} key={r.sessionId} wrap={false}>
            <Text style={s.cNo}>{i + 1}</Text>
            <Text style={s.cName}>
              {respondentLabel(r.name, i)}
              {r.email ? ` · ${r.email}` : ""}
            </Text>
            <Text style={s.cDate}>{formatSkDate(r.finishedAt)}</Text>
            <Text style={s.cScore}>{r.score} %</Text>
            <Text style={[s.cRes, { color: r.passed ? C.ok : C.bad }]}>
              {r.passed ? "úspešne" : "zopakovať"}
            </Text>
          </View>
        ))}
        <Text style={s.legal}>
          Doklad slúži ako podklad k preukázaniu vzdelávania a zvyšovania povedomia o kybernetickej
          bezpečnosti (napr. podľa vyhlášky NBÚ č. 227/2025 Z. z., príloha 1). Nie je certifikáciou
          systému riadenia informačnej bezpečnosti. Pravosť overíte na adrese {url} — kontrolný
          odtlačok SHA-256 sa musí zhodovať s odtlačkom uvedeným v päte.
        </Text>
        <Text style={s.footer} fixed>
          {footer}
        </Text>
      </Page>
      {certified.map((r) => (
        <Page size="A4" orientation="landscape" style={s.cert} key={`cert-${r.sessionId}`}>
          <View style={s.certFrame}>
            <Text style={s.certKicker}>CERTIFIKÁT O ABSOLVOVANÍ</Text>
            <Text style={s.certName}>{r.name}</Text>
            <Text style={s.certText}>
              úspešne absolvoval(a) školenie „{report.testTitle}“ dňa {formatSkDate(r.finishedAt)}{" "}
              so skóre {r.score} %.
            </Text>
            <Text style={s.certText}>Organizácia: {report.orgName}</Text>
            <Text style={[s.certText, { fontSize: 8, color: C.muted, marginTop: 18 }]}>
              {footer}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
