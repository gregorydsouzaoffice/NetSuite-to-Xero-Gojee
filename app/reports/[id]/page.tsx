"use client"

import { use, useState } from "react"
import { notFound } from "next/navigation"
import { brand } from "@/lib/brand"
import { useDemo } from "@/lib/demo-store"
import { fmtInt } from "@/lib/format"
import { REPORT_KEYS, buildReport, reportContext, type Cell, type Column, type ReportKey } from "@/lib/reports"
import { periodFromDate } from "@/lib/periods"

/*
 * Comparative report opened in a new tab from the Report page — same look as
 * the original static HTML reports (plain table, Diff column, total row,
 * MMC footer, Print), plus PDF and Excel downloads.
 */

const BRAND = "#003c64"

function fmt(v: Cell | undefined, kind?: Column["kind"]) {
  if (v === undefined || v === "") return ""
  if (kind === "money" && typeof v === "number") return v.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (kind === "int" && typeof v === "number") return fmtInt(v)
  return String(v)
}

export default function ComparativeReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { state, hydrated } = useDemo()
  const [busy, setBusy] = useState<string | null>(null)
  if (!REPORT_KEYS.includes(id as ReportKey)) notFound()
  if (!hydrated) return null

  const sub = state.netsuite.subsidiaryId
  const report = buildReport(id as ReportKey, sub, periodFromDate(state.fromDate))
  const ctx = reportContext(sub, state.xero.tenantId)

  const download = async (kind: "pdf" | "xlsx") => {
    setBusy(kind)
    try {
      if (kind === "pdf") await (await import("@/lib/export/pdf")).reportPdf(report, ctx)
      else await (await import("@/lib/export/xlsx")).reportsXlsx([report], ctx, `${ctx.migrationId}-${report.slug}.xlsx`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="report-page">
      <div className="toolbar no-print">
        <span>
          {brand.productName} · Powered by {brand.poweredBy.name}
        </span>
        <div>
          <button onClick={() => window.print()}>Print Report</button>
          <button onClick={() => download("pdf")} disabled={!!busy}>
            {busy === "pdf" ? "Preparing…" : "Download PDF"}
          </button>
          <button onClick={() => download("xlsx")} disabled={!!busy}>
            {busy === "xlsx" ? "Preparing…" : "Download Excel"}
          </button>
        </div>
      </div>

      <h1>{report.title}</h1>
      <div className="header-info">
        <h2>Comparative QA Report For {ctx.subsidiary}</h2>
        <p>
          NetSuite → Xero{report.slug === "inventory" || report.slug === "jobs-wip" ? " + Gojee" : ""} · {ctx.xeroOrg}
        </p>
        <p>
          {ctx.client} · Migration {ctx.migrationId} · Cutover {ctx.cutover}
        </p>
        <p className={report.pass ? "result pass" : "result fail"}>
          {report.pass ? "✓ PASS" : "✗ FAIL"} — {report.headline}
        </p>
      </div>

      {report.tables.map((t) => (
        <div key={t.title}>
          <h3>{t.title}</h3>
          <table>
            <thead>
              <tr>
                {t.columns.map((c) => (
                  <th key={c.key} className={c.kind === "money" || c.kind === "int" ? "amount" : ""}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, i) => (
                <tr key={i}>
                  {t.columns.map((c) => (
                    <td
                      key={c.key}
                      className={[
                        c.kind === "money" || c.kind === "int" ? "amount" : "",
                        c.key === "diff" || c.label === "Diff" ? (Number(r[c.key]) === 0 ? "diff-zero" : "diff-bad") : "",
                      ].join(" ")}
                    >
                      {fmt(r[c.key], c.kind)}
                    </td>
                  ))}
                </tr>
              ))}
              {t.footer && (
                <tr className="total-row">
                  {t.columns.map((c) => (
                    <td key={c.key} className={c.kind === "money" || c.kind === "int" ? "amount" : ""}>
                      {fmt(t.footer![c.key], c.kind)}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}

      {report.notes.map((n) => (
        <p key={n} className="note">
          {n}
        </p>
      ))}

      <div className="footer">
        <p>This report was generated automatically by the {brand.poweredBy.name} migration tool for {brand.partnerName}.</p>
        <p>© 2026 {brand.poweredBy.name}. All rights reserved.</p>
      </div>

      <style jsx global>{`
        body {
          background: #fff;
        }
        .report-page {
          font-family: Arial, sans-serif;
          margin: 0 auto;
          max-width: 1100px;
          padding: 24px 40px 40px;
          color: #333;
          line-height: 1.6;
        }
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 0 18px;
          margin-bottom: 18px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        .toolbar button {
          margin-left: 8px;
          padding: 6px 12px;
          cursor: pointer;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          font-size: 13px;
        }
        .toolbar button:last-child,
        .toolbar button:nth-child(2) {
          background: ${BRAND};
          border-color: ${BRAND};
          color: #fff;
        }
        .report-page h1 {
          color: ${BRAND};
          font-size: 24px;
          margin-bottom: 20px;
          text-align: center;
        }
        .report-page h2 {
          color: #4b5563;
          font-size: 20px;
          margin-bottom: 15px;
          text-align: center;
        }
        .report-page h3 {
          font-size: 15px;
          margin: 24px 0 10px;
          color: #374151;
        }
        .report-page table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          font-size: 14px;
        }
        .report-page th {
          background-color: #f3f4f6;
          padding: 10px;
          text-align: left;
          border: 1px solid #d1d5db;
          font-weight: bold;
        }
        .report-page td {
          padding: 8px 10px;
          border: 1px solid #d1d5db;
        }
        .report-page .amount {
          text-align: right;
        }
        .report-page .total-row {
          font-weight: bold;
          background-color: #f9fafb;
        }
        .report-page .diff-zero {
          color: #047857;
        }
        .report-page .diff-bad {
          color: #dc2626;
          font-weight: bold;
        }
        .header-info {
          margin-bottom: 30px;
          text-align: center;
        }
        .header-info p {
          margin: 5px 0;
          color: #6b7280;
        }
        .header-info .result {
          display: inline-block;
          margin-top: 10px;
          padding: 4px 14px;
          border-radius: 999px;
          font-weight: bold;
        }
        .header-info .pass {
          color: #047857;
          background: #ecfdf5;
        }
        .header-info .fail {
          color: #dc2626;
          background: #fef2f2;
        }
        .note {
          font-size: 12px;
          color: #6b7280;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
        @media print {
          .no-print {
            display: none;
          }
          .report-page {
            padding: 0.5cm;
          }
          .report-page h1 {
            font-size: 18px;
          }
          .report-page table {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}
