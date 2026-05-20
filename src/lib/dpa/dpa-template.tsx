/**
 * E40.3 — Slovak Art. 28 GDPR DPA template (v0.1 DRAFT).
 *
 * Imported DYNAMICALLY from SchoolsDpaForm so @react-pdf/renderer
 * (~250 KB gz) lands in its own chunk that only downloads when a
 * school actually submits the form. Don't import this at any route's
 * top level.
 *
 * Mandatory clauses per Art. 28(3) GDPR (a–k):
 *   (a) predmet, doba, povaha a účel spracúvania
 *   (b) typ osobných údajov a kategórie dotknutých osôb
 *   (c) povinnosti a práva prevádzkovateľa
 *   (d) spracovanie iba na základe pokynov prevádzkovateľa
 *   (e) mlčanlivosť poverených osôb
 *   (f) bezpečnostné opatrenia (čl. 32)
 *   (g) zapájanie sub-sprostredkovateľov
 *   (h) súčinnosť pri uplatňovaní práv dotknutých osôb
 *   (i) súčinnosť pri bezpečnostných incidentoch + DPIA
 *   (j) vrátenie / výmaz údajov po ukončení
 *   (k) audit + inšpekcia
 *
 * Slovak terminology follows Zákon č. 18/2018 Z.z. (Slovak GDPR
 * implementation):
 *   - prevádzkovateľ  = controller (the school)
 *   - sprostredkovateľ = processor (am.bonum s. r. o.)
 *
 * IMPORTANT: v0.1 is a DRAFT. The diagonal watermark "DRAFT —
 * NEZAVÄZUJÚCA UKÁŽKA · NEPODPISOVAŤ" renders on every page when
 * `isDraft=true`. Operator flips the watermark off (and bumps the
 * version) only AFTER qualified Slovak GDPR counsel reviews this
 * file. See tasks/E40-runbook.md for the sign-off log.
 */

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { SUB_PROCESSORS } from "./sub-processors";

export interface DpaTemplateProps {
  schoolName: string;
  contactName: string;
  contactEmail: string;
  requestId: string;
  generatedAt: Date;
  version: string;
  isDraft: boolean;
}

// React-PDF parses sRGB colors only — keep oklch() out.
const PALETTE = {
  fg: "#0F172A",
  muted: "#64748B",
  accent: "#0F8A4D",
  warn: "#B91C1C",
  border: "#CBD5E1",
  watermark: "#DC2626",
} as const;

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    color: PALETTE.fg,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: PALETTE.muted,
    textAlign: "center",
    marginBottom: 18,
  },
  partyBox: {
    border: `1px solid ${PALETTE.border}`,
    padding: 10,
    marginBottom: 10,
  },
  partyLabel: {
    fontSize: 8,
    color: PALETTE.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  partyMeta: {
    fontSize: 9,
    color: PALETTE.muted,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 6,
  },
  clauseHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    marginBottom: 6,
    textAlign: "justify",
  },
  bullet: {
    marginLeft: 12,
    marginBottom: 4,
  },
  emph: {
    fontFamily: "Helvetica-Bold",
  },
  smallNote: {
    fontSize: 8,
    color: PALETTE.muted,
    marginTop: 6,
    fontStyle: "italic",
  },
  signatureRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 24,
  },
  signatureBox: {
    flex: 1,
    border: `1px solid ${PALETTE.border}`,
    padding: 12,
    minHeight: 100,
  },
  signatureLabel: {
    fontSize: 8,
    color: PALETTE.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  signatureLine: {
    borderBottom: `1px solid ${PALETTE.fg}`,
    marginTop: 24,
    marginBottom: 4,
    height: 1,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: PALETTE.muted,
  },
  watermarkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkText: {
    fontSize: 56,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.watermark,
    opacity: 0.18,
    transform: "rotate(-30deg)",
    letterSpacing: 4,
  },
  annexTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  table: {
    border: `1px solid ${PALETTE.border}`,
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderBottom: `1px solid ${PALETTE.border}`,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: `1px solid ${PALETTE.border}`,
  },
  tableCellHead: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  tableCell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
  },
});

function Watermark() {
  return (
    <View style={styles.watermarkOverlay} fixed>
      <Text style={styles.watermarkText}>DRAFT</Text>
      <Text style={[styles.watermarkText, { fontSize: 14, marginTop: 4 }]}>
        NEZAVÄZUJÚCA UKÁŽKA · NEPODPISOVAŤ
      </Text>
    </View>
  );
}

function Footer({ version, requestId }: { version: string; requestId: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        subenai DPA {version} · žiadosť {requestId.slice(0, 8)}
      </Text>
      <Text
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `strana ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("sk-SK", { year: "numeric", month: "long", day: "numeric" });
}

export function DpaTemplate(props: DpaTemplateProps) {
  const { schoolName, contactName, contactEmail, requestId, generatedAt, version, isDraft } = props;

  return (
    <Document
      title={`DPA — subenai · ${schoolName}`}
      author="am.bonum s. r. o."
      subject="Zmluva o spracúvaní osobných údajov (Art. 28 GDPR)"
      keywords="DPA, GDPR, čl. 28, subenai, spracúvanie osobných údajov"
    >
      {/* ===================== STRANA 1 — Preambula ===================== */}
      <Page size="A4" style={styles.page} wrap>
        {isDraft ? <Watermark /> : null}

        <Text style={styles.title}>Zmluva o spracúvaní osobných údajov{"\n"}podľa čl. 28 GDPR</Text>
        <Text style={styles.subtitle}>
          uzavretá v zmysle Nariadenia (EÚ) 2016/679 (GDPR) a Zákona č. 18/2018 Z.z. o ochrane
          osobných údajov · vyhotovené {formatDate(generatedAt)} · ID žiadosti{" "}
          {requestId.slice(0, 8)}
        </Text>

        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Prevádzkovateľ (čl. 4 ods. 7 GDPR)</Text>
          <Text style={styles.partyName}>{schoolName}</Text>
          <Text style={styles.partyMeta}>
            Kontakt: {contactName} · {contactEmail}
          </Text>
          <Text style={styles.partyMeta}>
            Sídlo, IČO a štatutárny orgán: __________________________________________
          </Text>
          <Text style={styles.smallNote}>
            (doplniť pri podpise — slúži na identifikáciu prevádzkovateľa ako právnickej osoby)
          </Text>
        </View>

        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Sprostredkovateľ (čl. 28 GDPR)</Text>
          <Text style={styles.partyName}>am.bonum s. r. o.</Text>
          <Text style={styles.partyMeta}>Slovenská republika · prevádzka projektu subenai</Text>
          <Text style={styles.partyMeta}>
            IČO, sídlo a štatutárny orgán: __________________________________________
          </Text>
          <Text style={styles.smallNote}>(doplnené v zaslanej finálnej verzii zmluvy)</Text>
        </View>

        <Text style={styles.sectionHeading}>Preambula</Text>
        <Text style={styles.paragraph}>
          Prevádzkovateľ poveruje sprostredkovateľa spracúvaním osobných údajov v rozsahu nutnom na
          poskytovanie služby <Text style={styles.emph}>subenai</Text> (online testovanie zamerané
          na rozpoznávanie online podvodov, edukačné funkcie typu &quot;edu mód&quot; podľa
          /schools), a to za podmienok stanovených touto zmluvou.
        </Text>
        <Text style={styles.paragraph}>
          Sprostredkovateľ vyhlasuje, že poskytuje dostatočné záruky v zmysle čl. 28 ods. 1 GDPR na
          to, aby spracúvanie zodpovedalo požiadavkám tohto Nariadenia a aby boli chránené práva
          dotknutých osôb.
        </Text>

        <Footer version={version} requestId={requestId} />
      </Page>

      {/* ===================== STRANA 2 — Čl. 28(3)(a)–(e) ===================== */}
      <Page size="A4" style={styles.page} wrap>
        {isDraft ? <Watermark /> : null}

        <Text style={styles.sectionHeading}>
          1. Predmet, doba, povaha a účel spracúvania [čl. 28(3)(a)]
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.emph}>Predmet</Text>: hosting, prevádzkovanie a údržba služby subenai
          pre potreby vzdelávacej činnosti prevádzkovateľa, najmä tvorba testov pre
          žiakov/respondentov a evidencia ich odpovedí.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.emph}>Doba</Text>: po dobu trvania zmluvného vzťahu medzi stranami,
          najdlhšie však po dobu 12 mesiacov od vytvorenia záznamu o respondentovi, po ktorej
          dochádza k automatickej anonymizácii mena a e-mailu (skóre a odpovede zostávajú
          anonymizované pre účely štatistiky prevádzkovateľa).
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.emph}>Povaha</Text>: automatizované spracúvanie údajov v informačnom
          systéme sprostredkovateľa, vrátane ukladania v databáze, generovania štatistických
          prehľadov, export do CSV/PDF/JSON formátov na pokyn prevádzkovateľa.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.emph}>Účel</Text>: výlučne poskytovanie služby subenai
          prevádzkovateľovi; sprostredkovateľ nespracúva údaje pre vlastné účely, neposkytuje ich
          tretím osobám okrem sub-sprostredkovateľov uvedených v Prílohe B, a nepoužíva ich na
          profilovanie ani na priamy marketing.
        </Text>

        <Text style={styles.sectionHeading}>
          2. Typ osobných údajov a kategórie dotknutých osôb [čl. 28(3)(b)]
        </Text>
        <Text style={styles.paragraph}>
          Bližšia identifikácia v <Text style={styles.emph}>Prílohe A</Text>. Zhrnutie: spracúvajú
          sa identifikačné údaje (meno, e-mail) a údaje o správaní v aplikácii (odpovede, skóre,
          časové známky, anti-cheat metadáta). Dotknutými osobami sú respondenti testov vytvorených
          prevádzkovateľom — žiaci, učitelia alebo zamestnanci podľa kontextu nasadenia.
        </Text>

        <Text style={styles.sectionHeading}>
          3. Povinnosti a práva prevádzkovateľa [čl. 28(3)(c)]
        </Text>
        <Text style={styles.paragraph}>
          Prevádzkovateľ je povinný vydávať sprostredkovateľovi zdokumentované pokyny (čl. 28 ods. 3
          písm. a) GDPR), zabezpečiť plnenie informačnej povinnosti voči dotknutým osobám (čl. 13,
          14 GDPR) a vykonávať posúdenie vplyvu (DPIA) tam, kde to vyžaduje čl. 35 GDPR.
        </Text>

        <Text style={styles.sectionHeading}>4. Pokyny prevádzkovateľa [čl. 28(3)(d)]</Text>
        <Text style={styles.paragraph}>
          Sprostredkovateľ spracúva osobné údaje výlučne na základe zdokumentovaných pokynov
          prevádzkovateľa, vrátane prenosov osobných údajov do tretej krajiny alebo medzinárodnej
          organizácie, ak takéto spracúvanie nevyžadujú právne predpisy Únie alebo členského štátu.
          V takom prípade sprostredkovateľ oznámi prevádzkovateľovi túto právnu požiadavku pred
          spracúvaním, ak právne predpisy oznámenie nezakazujú.
        </Text>

        <Text style={styles.sectionHeading}>5. Mlčanlivosť [čl. 28(3)(e)]</Text>
        <Text style={styles.paragraph}>
          Sprostredkovateľ zabezpečí, aby osoby oprávnené spracúvať osobné údaje boli zaviazané
          mlčanlivosťou alebo aby sa na ne vzťahovala zákonná povinnosť mlčanlivosti, a aby táto
          povinnosť pretrvávala aj po skončení pracovného vzťahu alebo poverenia.
        </Text>

        <Footer version={version} requestId={requestId} />
      </Page>

      {/* ===================== STRANA 3 — Čl. 28(3)(f)–(k) ===================== */}
      <Page size="A4" style={styles.page} wrap>
        {isDraft ? <Watermark /> : null}

        <Text style={styles.sectionHeading}>6. Bezpečnostné opatrenia [čl. 28(3)(f) + čl. 32]</Text>
        <Text style={styles.paragraph}>
          Sprostredkovateľ zaviedol primerané technické a organizačné opatrenia s ohľadom na stav
          techniky, náklady na vykonanie a povahu, rozsah, kontext a účely spracúvania, ako aj
          riziká pre práva a slobody fyzických osôb. Konkrétne opatrenia sú detailne uvedené v{" "}
          <Text style={styles.emph}>Prílohe B</Text>.
        </Text>

        <Text style={styles.sectionHeading}>
          7. Sub-sprostredkovatelia [čl. 28(3)(g) + čl. 28 ods. 2 a 4]
        </Text>
        <Text style={styles.paragraph}>
          Prevádzkovateľ udeľuje sprostredkovateľovi všeobecné písomné povolenie zapojiť do
          spracúvania ďalších sprostredkovateľov uvedených v Prílohe B (sub-procesory). Ak
          sprostredkovateľ plánuje pridať alebo nahradiť sub-procesora, oznámi to prevádzkovateľovi
          vopred (publikovaním aktualizovanej Prílohy B na podstránke{" "}
          <Text style={styles.emph}>/privacy</Text> a/alebo notifikáciou na uvedený e-mail).
          Prevádzkovateľ má právo voči zmene namietnuť; v takom prípade sa strany dohodnú na riešení
          vrátane prípadného ukončenia zmluvy.
        </Text>

        <Text style={styles.sectionHeading}>
          8. Súčinnosť pri uplatňovaní práv dotknutých osôb [čl. 28(3)(h)]
        </Text>
        <Text style={styles.paragraph}>
          Sprostredkovateľ poskytne prevádzkovateľovi súčinnosť pomocou primeraných technických a
          organizačných opatrení pri plnení povinnosti reagovať na žiadosti o uplatňovanie práv
          dotknutej osoby (čl. 15–22 GDPR), a to v rozumnom čase a spravidla bez ďalšieho poplatku.
          Prevádzkovateľ môže žiadosti realizovať samostatne cez admin panel služby alebo
          prostredníctvom kontaktu uvedeného v týchto bodoch:
        </Text>
        <Text style={styles.bullet}>
          • Vymazanie respondenta jedným kliknutím v admin paneli /admin/respondents.
        </Text>
        <Text style={styles.bullet}>
          • Export údajov respondenta cez funkciu exportu (CSV/JSON).
        </Text>
        <Text style={styles.bullet}>
          • Eskalácia mimoriadnych žiadostí na e-mail uvedený v záhlaví zmluvy.
        </Text>

        <Text style={styles.sectionHeading}>9. Incidenty a DPIA [čl. 28(3)(i) + čl. 33–35]</Text>
        <Text style={styles.paragraph}>
          Sprostredkovateľ oznámi prevádzkovateľovi akýkoľvek bezpečnostný incident (porušenie
          ochrany osobných údajov) bez zbytočného odkladu, najneskôr do 24 hodín od jeho zistenia, a
          to s detailmi nevyhnutnými na splnenie oznamovacej povinnosti prevádzkovateľa voči
          dozornému orgánu (čl. 33) a dotknutým osobám (čl. 34). Sprostredkovateľ ďalej poskytne
          primeranú súčinnosť pri prípadnom posudzovaní vplyvu (DPIA podľa čl. 35) a pri konzultácii
          s dozorným orgánom (čl. 36).
        </Text>

        <Text style={styles.sectionHeading}>
          10. Vrátenie a výmaz údajov po ukončení [čl. 28(3)(j)]
        </Text>
        <Text style={styles.paragraph}>
          Po ukončení poskytovania služby sprostredkovateľ vymaže všetky osobné údaje dotknutých
          osôb alebo ich vráti prevádzkovateľovi (podľa voľby prevádzkovateľa) a vymaže existujúce
          kópie, ak právo Únie alebo členského štátu nevyžaduje ich ďalšie uchovávanie. Bežná
          12-mesačná auto-anonymizácia (bod 1) prebieha priebežne aj počas trvania zmluvy.
        </Text>

        <Text style={styles.sectionHeading}>11. Audit a inšpekcia [čl. 28(3)(k)]</Text>
        <Text style={styles.paragraph}>
          Sprostredkovateľ poskytne prevádzkovateľovi všetky informácie potrebné na preukázanie
          plnenia povinností podľa čl. 28 GDPR a umožní audity vykonávané prevádzkovateľom alebo
          iným audítorom povereným prevádzkovateľom, ako aj k nim prispeje. Strany dohodnú konkrétne
          podmienky auditu (rozsah, predmet, čas) tak, aby audit minimálne narušil bežnú prevádzku
          služby.
        </Text>

        <Footer version={version} requestId={requestId} />
      </Page>

      {/* ===================== STRANA 4 — Závery + Podpisy ===================== */}
      <Page size="A4" style={styles.page} wrap>
        {isDraft ? <Watermark /> : null}

        <Text style={styles.sectionHeading}>12. Záverečné ustanovenia</Text>
        <Text style={styles.paragraph}>
          Táto zmluva nadobúda platnosť a účinnosť dňom podpisu oboma stranami a uzatvára sa na dobu
          trvania poskytovania služby subenai prevádzkovateľovi. Akékoľvek zmeny alebo doplnky tejto
          zmluvy je možné vykonať len v písomnej forme podpísanej oboma stranami.
        </Text>
        <Text style={styles.paragraph}>
          Zmluva je vyhotovená v slovenskom jazyku. V prípade rozporu s anglickou alebo inojazyčnou
          verziou prevažuje slovenské znenie.
        </Text>
        <Text style={styles.paragraph}>
          Strany prehlasujú, že si zmluvu prečítali, jej obsahu rozumejú, súhlasia s ňou a podpisujú
          ju zo slobodnej vôle.
        </Text>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Za prevádzkovateľa</Text>
            <Text style={styles.partyName}>{schoolName}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.partyMeta}>Meno, funkcia, dátum</Text>
            <View style={[styles.signatureLine, { marginTop: 32 }]} />
            <Text style={styles.partyMeta}>Podpis</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Za sprostredkovateľa</Text>
            <Text style={styles.partyName}>am.bonum s. r. o.</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.partyMeta}>Meno, funkcia, dátum</Text>
            <View style={[styles.signatureLine, { marginTop: 32 }]} />
            <Text style={styles.partyMeta}>Podpis</Text>
          </View>
        </View>

        <Footer version={version} requestId={requestId} />
      </Page>

      {/* ===================== STRANA 5 — Príloha A: Kategórie údajov ===================== */}
      <Page size="A4" style={styles.page} wrap>
        {isDraft ? <Watermark /> : null}

        <Text style={styles.annexTitle}>
          Príloha A — Kategórie osobných údajov a dotknutých osôb
        </Text>
        <Text style={styles.paragraph}>
          Tabuľka nižšie podrobne identifikuje rozsah spracúvania podľa čl. 28(3)(b) GDPR. Zoznam
          zodpovedá deklarácii na verejnej stránke{" "}
          <Text style={styles.emph}>subenai.sk/privacy</Text>, sekcia &quot;Kategórie spracúvaných
          údajov&quot;.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableCellHead}>Kategória dotknutej osoby</Text>
            <Text style={styles.tableCellHead}>Typ údajov</Text>
            <Text style={styles.tableCellHead}>Doba uchovávania</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>
              Respondenti edu testov (žiaci, učitelia, zamestnanci)
            </Text>
            <Text style={styles.tableCell}>
              Meno, e-mail, odpovede, skóre, časové známky, anti-cheat flagy
            </Text>
            <Text style={styles.tableCell}>
              12 mesiacov, potom auto-anonymizácia mena + e-mailu
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Anonymní respondenti rýchlych testov</Text>
            <Text style={styles.tableCell}>
              Skóre, breakdown, demografia (vekové pásmo, region — voliteľné)
            </Text>
            <Text style={styles.tableCell}>36 mesiacov, potom výmaz</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Kontaktné osoby žiadateľa o DPA (vy)</Text>
            <Text style={styles.tableCell}>Meno, e-mail, názov školy, IP hash</Text>
            <Text style={styles.tableCell}>
              12 mesiacov, potom auto-anonymizácia mena + e-mailu
            </Text>
          </View>
        </View>

        <Text style={styles.smallNote}>
          Anti-cheat metadáta (časovanie odpovedí, indikátory podozrivého správania) sú spracúvané
          na základe oprávneného záujmu prevádzkovateľa (čl. 6 ods. 1 písm. f) GDPR) — predchádzanie
          zneužitiu testov. Auto-anonymizujú sa po 12 mesiacoch spolu s menom a e-mailom.
        </Text>

        <Footer version={version} requestId={requestId} />
      </Page>

      {/* ===================== STRANA 6 — Príloha B: Bezpečnosť + sub-procesory ===================== */}
      <Page size="A4" style={styles.page} wrap>
        {isDraft ? <Watermark /> : null}

        <Text style={styles.annexTitle}>
          Príloha B — Technické a organizačné opatrenia + sub-procesory
        </Text>

        <Text style={styles.sectionHeading}>B.1 — Technické a organizačné opatrenia (čl. 32)</Text>
        <Text style={styles.bullet}>
          • <Text style={styles.emph}>Šifrovanie pri prenose</Text>: TLS 1.2+ pre všetku komunikáciu
          medzi prehliadačom respondenta a aplikáciou (HTTPS, HSTS hlavička).
        </Text>
        <Text style={styles.bullet}>
          • <Text style={styles.emph}>Šifrovanie v pokoji</Text>: údaje v databáze (Supabase
          Postgres) sú šifrované na úrovni úložiska poskytovateľa cloudu (AES-256).
        </Text>
        <Text style={styles.bullet}>
          • <Text style={styles.emph}>Row-Level Security</Text>: prístup k záznamom je obmedzený
          PostgreSQL RLS politikami; každá tabuľka má explicitné pravidlá pre úlohy anon /
          authenticated / admin.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={styles.emph}>Anti-cheat detekcia</Text>: monitorovanie podozrivého
          správania pri vyplňovaní testov; anonymizácia anti-cheat metadát po 12 mesiacoch.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={styles.emph}>Audit log</Text>: každý zásah administrátora (zmena stavu,
          manuálna anonymizácia, export) je zaznamenaný v tabuľke audit_log.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={styles.emph}>Rate limiting + bot challenge</Text>: verejné formuláre sú
          chránené Cloudflare Turnstile a rate-limit na úrovni Worker isolate.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={styles.emph}>Pravidelné aktualizácie</Text>: závislosti sledované cez
          automatizovaný audit (CodeQL, npm-audit), bezpečnostné patche aplikované do 14 dní od
          zverejnenia.
        </Text>
        <Text style={styles.bullet}>
          • <Text style={styles.emph}>Záloha</Text>: denné Point-In-Time Recovery snapshoty
          poskytuje Supabase, retention 7 dní (Free tier) / 30 dní (Pro tier).
        </Text>

        <Text style={styles.sectionHeading}>B.2 — Sub-sprostredkovatelia (sub-procesory)</Text>
        <Text style={styles.paragraph}>
          Sprostredkovateľ pri spracúvaní osobných údajov využíva nasledujúcich sub-procesorov.
          Zoznam je zhodný s deklaráciou na podstránke{" "}
          <Text style={styles.emph}>subenai.sk/privacy</Text>, sekcia &quot;Sub-procesory&quot;.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableCellHead}>Subjekt</Text>
            <Text style={styles.tableCellHead}>Účel</Text>
            <Text style={styles.tableCellHead}>Lokalita</Text>
          </View>
          {SUB_PROCESSORS.map((sp) => (
            <View key={sp.name} style={styles.tableRow}>
              <Text style={styles.tableCell}>{sp.name}</Text>
              <Text style={styles.tableCell}>{sp.purpose}</Text>
              <Text style={styles.tableCell}>{sp.location}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.smallNote}>
          Pridanie ďalšieho sub-procesora bude oznámené aktualizáciou Prílohy B a verejnej stránky
          /privacy najneskôr 14 dní pred nasadením. Prevádzkovateľ má právo voči zmene namietnuť
          (bod 7 zmluvy).
        </Text>

        <Footer version={version} requestId={requestId} />
      </Page>
    </Document>
  );
}
