/**
 * Branded PDF exports (reports and the R-48 sign-off certificate).
 * jsPDF is loaded on demand so it never weighs on the initial page.
 */
import { brand } from "../brand"
import { downloadBlob } from "../csv"
import { fmtInt, fmtMoney } from "../format"
import { formatDate } from "../periods"
import type { Cell, Report, Table } from "../reports"
import type { SignOff } from "../types"

type Ctx = {
  client: string
  subsidiary: string
  short: string
  xeroOrg: string
  gojee: string
  migrationId: string
  cutover: string
  frozenAt: string | null
  generatedAt: string
}

type RGB = [number, number, number]

async function loadImage(src: string): Promise<string | null> {
  try {
    const res = await fetch(src)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => resolve(null)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function setup(orientation: "portrait" | "landscape" = "landscape") {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" })
  const mmc = await loadImage(brand.poweredBy.logoSrc)
  const gojeeLogo = await loadImage(brand.logoOnDarkSrc)
  return { doc, autoTable: autoTableMod.default, mmc, gojeeLogo }
}

/** jsPDF's built-in fonts only cover WinAnsi; swap characters they can't draw */
function pdfSafe(s: string): string {
  return s
    .replace(/→/g, "->")
    .replace(/↔/g, "<->")
    .replace(/−/g, "-")
    .replace(/[✓✔]/g, "OK")
    .replace(/[^\x00-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, "")
}

function cellText(v: Cell | undefined, kind?: string): string {
  if (v === undefined || v === "") return ""
  if (kind === "money" && typeof v === "number") return fmtMoney(v)
  if (kind === "int" && typeof v === "number") return fmtInt(v)
  return pdfSafe(String(v))
}

/** Header band: Gojee mark left, "Powered by MMC Convert" right */
function header(doc: import("jspdf").jsPDF, mmc: string | null, gojeeLogo: string | null) {
  const w = doc.internal.pageSize.getWidth()
  const [r, g, b] = brand.pdf.primary
  doc.setFillColor(r, g, b)
  doc.rect(0, 0, w, 54, "F")
  if (gojeeLogo) {
    // White wordmark (≈2.3:1) on the navy band, plus the product label
    doc.addImage(gojeeLogo, "PNG", 32, 13, 64, 28)
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text("MIGRATE", 104, 32)
  } else {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(32, 15, 24, 24, 5, 5, "F")
    doc.setTextColor(r, g, b)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(15)
    doc.text("g", 44, 32, { align: "center" })
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(15)
    doc.text(brand.partnerName.toLowerCase(), 64, 32)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text("MIGRATE", 64 + doc.getTextWidth(brand.partnerName.toLowerCase()) * (15 / 9) + 8, 32)
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text(`Powered by ${brand.poweredBy.name}`, w - 32 - (mmc ? 30 : 0), 31, { align: "right" })
  if (mmc) {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(w - 56, 13, 26, 26, 3, 3, "F")
    doc.addImage(mmc, "PNG", w - 55, 14, 24, 24)
  }
}

function footer(doc: import("jspdf").jsPDF, ctx: Ctx) {
  const pages = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const [mr, mg, mb] = brand.pdf.muted
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(mr, mg, mb)
    doc.text(`${brand.productName} · ${brand.domain} · ${ctx.migrationId} · generated ${formatDate(ctx.generatedAt)}`, 32, h - 18)
    doc.text(`Page ${i} of ${pages}`, w - 32, h - 18, { align: "right" })
  }
}

function passLabel(pass: boolean | null) {
  return pass === null ? "Reference" : pass ? "PASS" : "FAIL"
}

function passColour(pass: boolean | null): RGB {
  return pass === null ? brand.pdf.muted : pass ? brand.pdf.success : brand.pdf.danger
}

function drawTables(doc: import("jspdf").jsPDF, autoTable: (d: import("jspdf").jsPDF, o: object) => void, tables: Table[], startY: number) {
  let y = startY
  const [r, g, b] = brand.pdf.primary
  for (const t of tables) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...brand.pdf.ink)
    doc.text(pdfSafe(t.title), 32, y)
    const numeric = new Set(t.columns.filter((c) => c.kind === "money" || c.kind === "int").map((c) => c.key))
    autoTable(doc, {
      startY: y + 6,
      margin: { left: 32, right: 32, top: 70 },
      head: [t.columns.map((c) => pdfSafe(c.label))],
      body: t.rows.map((row) => t.columns.map((c) => cellText(row[c.key], c.kind))),
      foot: t.footer ? [t.columns.map((c) => cellText(t.footer![c.key], c.kind))] : undefined,
      styles: { fontSize: 7.5, cellPadding: 3.5, textColor: brand.pdf.ink, lineColor: [226, 230, 235], lineWidth: 0.4 },
      headStyles: { fillColor: [r, g, b], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [241, 244, 247], textColor: brand.pdf.ink, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 251] },
      columnStyles: Object.fromEntries(t.columns.map((c, i) => [i, numeric.has(c.key) ? { halign: "right" } : {}])),
      didParseCell: (data: { section: string; column: { index: number }; cell: { raw: unknown; styles: { textColor: unknown; fontStyle: string } } }) => {
        if (data.section !== "body") return
        const col = t.columns[data.column.index]
        if (col?.kind === "status") {
          data.cell.styles.textColor = data.cell.raw === "Pass" ? brand.pdf.success : brand.pdf.danger
          data.cell.styles.fontStyle = "bold"
        }
      },
      didDrawPage: () => undefined,
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
  }
  return y
}

export async function reportPdf(report: Report, ctx: Ctx) {
  const { doc, autoTable, mmc, gojeeLogo } = await setup("landscape")
  const w = doc.internal.pageSize.getWidth()

  header(doc, mmc, gojeeLogo)
  doc.setTextColor(...brand.pdf.ink)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(17)
  doc.text(pdfSafe(`${report.id}  ${report.title}`), 32, 86)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...brand.pdf.muted)
  doc.text(pdfSafe(`${ctx.client} · ${ctx.subsidiary} -> Xero: ${ctx.xeroOrg} · Gojee: ${ctx.gojee} · cutover ${ctx.cutover}`), 32, 102)

  // Result badge
  const [pr, pg, pb] = passColour(report.pass)
  doc.setFillColor(pr, pg, pb)
  doc.roundedRect(w - 112, 74, 80, 22, 11, 11, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(passLabel(report.pass), w - 72, 89, { align: "center" })

  doc.setTextColor(...brand.pdf.ink)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.text(pdfSafe(report.headline), 32, 122, { maxWidth: w - 160 })
  doc.setTextColor(...brand.pdf.muted)
  doc.setFontSize(8)
  doc.text(pdfSafe(`Pass rule: ${report.passRule}`), 32, 136)

  let y = drawTables(doc, autoTable, report.tables, 162)
  if (report.notes.length) {
    doc.setFontSize(8)
    doc.setTextColor(...brand.pdf.muted)
    for (const n of report.notes) {
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        y = 80
      }
      doc.text(pdfSafe(`• ${n}`), 32, y, { maxWidth: w - 64 })
      y += 14
    }
  }
  // Header on every page added by autoTable
  for (let i = 2; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i)
    header(doc, mmc, gojeeLogo)
  }
  footer(doc, ctx)
  downloadBlob(`${ctx.migrationId}-${ctx.short.replace(/\s+/g, "-")}-${report.slug}.pdf`, doc.output("blob"))
}

/** R-48: one certificate per subsidiary pair */
export async function certificatePdf(reports: Report[], ctx: Ctx, signoff: SignOff) {
  const { doc, autoTable, mmc, gojeeLogo } = await setup("portrait")
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const [r, g, b] = brand.pdf.primary

  header(doc, mmc, gojeeLogo)
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(1.2)
  doc.roundedRect(24, 70, w - 48, h - 110, 8, 8, "S")

  doc.setTextColor(...brand.pdf.muted)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("CERTIFICATE OF MIGRATION SIGN-OFF", w / 2, 112, { align: "center" })
  doc.setTextColor(...brand.pdf.ink)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.text(pdfSafe(ctx.subsidiary), w / 2, 142, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10.5)
  doc.setTextColor(...brand.pdf.muted)
  doc.text(pdfSafe(`NetSuite -> Xero: ${ctx.xeroOrg}  +  Gojee: ${ctx.gojee}`), w / 2, 162, { align: "center", maxWidth: w - 120 })

  const facts = [
    ["Client", ctx.client],
    ["Migration", ctx.migrationId],
    ["Cutover date", ctx.cutover],
    ["NetSuite frozen", ctx.frozenAt ? `${formatDate(ctx.frozenAt)} ${ctx.frozenAt.slice(11, 16)} UTC` : "—"],
  ]
  autoTable(doc, {
    startY: 186,
    margin: { left: 80, right: 80 },
    body: facts.map(([k, v]) => [k, pdfSafe(v)]),
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 3, textColor: brand.pdf.ink },
    columnStyles: { 0: { textColor: brand.pdf.muted, cellWidth: 140 } },
  })
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18

  autoTable(doc, {
    startY: y,
    margin: { left: 80, right: 80 },
    head: [["Report", "Result", "Summary"]],
    body: reports.map((rep) => [pdfSafe(`${rep.id} ${rep.short}`), passLabel(rep.pass), pdfSafe(rep.headline)]),
    styles: { fontSize: 8.5, cellPadding: 5, textColor: brand.pdf.ink, lineColor: [226, 230, 235], lineWidth: 0.4 },
    headStyles: { fillColor: [r, g, b], textColor: 255 },
    columnStyles: { 0: { cellWidth: 120, fontStyle: "bold" }, 1: { cellWidth: 62, halign: "center", fontStyle: "bold" } },
    didParseCell: (data: { section: string; column: { index: number }; cell: { raw: unknown; styles: { textColor: unknown } } }) => {
      if (data.section === "body" && data.column.index === 1) {
        data.cell.styles.textColor = data.cell.raw === "PASS" ? brand.pdf.success : data.cell.raw === "FAIL" ? brand.pdf.danger : brand.pdf.muted
      }
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 40

  doc.setDrawColor(...brand.pdf.muted)
  doc.setLineWidth(0.5)
  doc.line(80, y + 26, 300, y + 26)
  doc.setFont("helvetica", "italic")
  doc.setFontSize(16)
  doc.setTextColor(...brand.pdf.ink)
  doc.text(pdfSafe(signoff.name), 84, y + 20)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...brand.pdf.muted)
  doc.text(pdfSafe(`${signoff.name}, ${signoff.title}`), 80, y + 40)
  doc.text(`Signed electronically ${formatDate(signoff.signedAt)} ${signoff.signedAt.slice(11, 16)} UTC`, 80, y + 52)

  doc.setFillColor(r, g, b)
  doc.circle(w - 130, y + 22, 34, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("SIGNED", w - 130, y + 20, { align: "center" })
  doc.text("OFF", w - 130, y + 31, { align: "center" })

  footer(doc, ctx)
  downloadBlob(`${ctx.migrationId}-${ctx.short.replace(/\s+/g, "-")}-certificate.pdf`, doc.output("blob"))
}
