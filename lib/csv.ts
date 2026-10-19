export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? "" : String(v)
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(","),
    )
    .join("\r\n")
}

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const src = text.replace(/^﻿/, "")
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += c
  }
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""))
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  downloadBlob(filename, new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" }))
}

/** CSV fallback templates (R-07). Transaction columns follow NetSuite's Custom Transaction Detail report. */
export const CSV_TEMPLATES = {
  transactions: {
    label: "Transaction detail",
    file: "transaction-detail.csv",
    columns: ["Type", "Date", "Document Number", "Name", "Memo", "Account", "Cleared", "Split", "Qty", "Amount", "Currency"],
    perSubsidiary: true,
  },
  accounts: { label: "Chart of accounts", file: "accounts.csv", columns: ["Number", "Name", "Type", "Parent", "Inactive"], perSubsidiary: false },
  customers: { label: "Customers", file: "customers.csv", columns: ["ID", "Name", "Email", "Phone", "ABN", "Region", "Sales Rep", "Currency"], perSubsidiary: true },
  vendors: { label: "Vendors", file: "vendors.csv", columns: ["ID", "Name", "Email", "Phone", "ABN", "Currency"], perSubsidiary: true },
  items: { label: "Items", file: "items.csv", columns: ["Item ID", "Display Name", "Type", "Class", "Income Account", "COGS Account", "Asset Account", "Serialized"], perSubsidiary: false },
  segments: { label: "Segments", file: "segments.csv", columns: ["Segment", "Value", "Parent", "Inactive"], perSubsidiary: false },
} as const

export type CsvKind = keyof typeof CSV_TEMPLATES

export function validateCsvHeader(kind: CsvKind, text: string): { ok: boolean; rows: number; errors: string[] } {
  const rows = parseCsv(text)
  if (rows.length === 0) return { ok: false, rows: 0, errors: ["The file is empty."] }
  const expected = CSV_TEMPLATES[kind].columns as readonly string[]
  const header = rows[0].map((h) => h.trim())
  const missing = expected.filter((c) => !header.includes(c))
  const errors = missing.length ? [`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`] : []
  if (rows.length < 2) errors.push("No data rows below the header.")
  return { ok: errors.length === 0, rows: Math.max(0, rows.length - 1), errors }
}
