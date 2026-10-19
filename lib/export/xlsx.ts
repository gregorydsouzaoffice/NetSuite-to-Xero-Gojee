/** Branded Excel exports. ExcelJS is loaded on demand. */
import { brand } from "../brand"
import { downloadBlob } from "../csv"
import type { Report } from "../reports"

type Ctx = { client: string; subsidiary: string; short: string; xeroOrg: string; gojee: string; migrationId: string; cutover: string }

const hex = (rgb: readonly number[]) => "FF" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()

export async function reportsXlsx(reports: Report[], ctx: Ctx, filename: string) {
  const ExcelJS = (await import("exceljs")).default
  const wb = new ExcelJS.Workbook()
  wb.creator = `${brand.productName} (powered by ${brand.poweredBy.name})`
  wb.created = new Date()
  const primary = hex(brand.pdf.primary)

  for (const report of reports) {
    const ws = wb.addWorksheet(`${report.id} ${report.short}`.slice(0, 31).replace(/[\\/?*[\]:]/g, "-"), { views: [{ showGridLines: false }] })
    ws.addRow([`${brand.productName} · Powered by ${brand.poweredBy.name}`]).font = { bold: true, color: { argb: primary }, size: 9 }
    ws.addRow([`${report.id} ${report.title}`]).font = { bold: true, size: 14 }
    ws.addRow([`${ctx.client} · ${ctx.subsidiary} → Xero: ${ctx.xeroOrg} · Gojee: ${ctx.gojee} · cutover ${ctx.cutover} · ${ctx.migrationId}`]).font = { color: { argb: "FF6B7280" }, size: 9 }
    const result = ws.addRow([`Result: ${report.pass === null ? "Reference" : report.pass ? "PASS" : "FAIL"}`, report.headline])
    result.getCell(1).font = { bold: true, color: { argb: report.pass === false ? "FFDC2626" : report.pass ? hex(brand.pdf.success) : "FF6B7280" } }
    ws.addRow([`Pass rule: ${report.passRule}`]).font = { italic: true, color: { argb: "FF6B7280" }, size: 9 }

    for (const t of report.tables) {
      ws.addRow([])
      ws.addRow([t.title]).font = { bold: true, size: 11 }
      const head = ws.addRow(t.columns.map((c) => c.label))
      head.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: primary } }
        cell.alignment = { vertical: "middle" }
      })
      for (const row of t.rows) {
        const r = ws.addRow(t.columns.map((c) => row[c.key] ?? ""))
        t.columns.forEach((c, i) => {
          const cell = r.getCell(i + 1)
          if (c.kind === "money") cell.numFmt = "#,##0.00;(#,##0.00)"
          if (c.kind === "int") cell.numFmt = "#,##0"
          if (c.kind === "status") cell.font = { bold: true, color: { argb: row[c.key] === "Pass" ? hex(brand.pdf.success) : "FFDC2626" } }
        })
      }
      if (t.footer) {
        const f = ws.addRow(t.columns.map((c) => t.footer![c.key] ?? ""))
        f.font = { bold: true }
        t.columns.forEach((c, i) => {
          if (c.kind === "money") f.getCell(i + 1).numFmt = "#,##0.00;(#,##0.00)"
          f.getCell(i + 1).border = { top: { style: "thin" } }
        })
      }
    }
    for (const n of report.notes) ws.addRow([n]).font = { italic: true, color: { argb: "FF6B7280" }, size: 9 }

    // Approximate column widths from content
    const widths: number[] = []
    ws.eachRow((row, idx) => {
      if (idx <= 5) return
      row.eachCell((cell, col) => {
        const len = String(cell.value ?? "").length
        widths[col - 1] = Math.min(60, Math.max(widths[col - 1] ?? 10, len + 2))
      })
    })
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))
  }

  const buf = await wb.xlsx.writeBuffer()
  downloadBlob(filename, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
}
