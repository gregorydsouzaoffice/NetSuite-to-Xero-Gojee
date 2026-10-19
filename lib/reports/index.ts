/**
 * The comparative reports opened from the Report page (one entity).
 * The new-tab report page, the PDF and the Excel export all render these.
 */
import { CLIENT_NAME, SUBSIDIARY_BY_ID, XERO_ORG_BY_ID, shortName } from "../demo-data/momento"
import {
  FX_RECONCILING_PERIODS,
  inventory,
  inventoryTotals,
  COST_CODES,
  jobBudgets,
  openJobs,
  payables,
  receivables,
  tbDifference,
  trialBalance,
} from "../demo-data/snapshot"
import { round2 } from "../format"
import { FIRST_PERIOD, LAST_CLOSED_PERIOD, formatDate, lastDayOfPeriod, periodLabel, periodsInScope } from "../periods"

export type Cell = string | number
export interface Column {
  key: string
  label: string
  kind?: "text" | "money" | "int" | "status"
}
export interface Table {
  title: string
  columns: Column[]
  rows: Record<string, Cell>[]
  footer?: Record<string, Cell>
}

export type ReportKey = "trial-balance" | "aged-receivable" | "aged-payable" | "inventory" | "jobs-wip"

export interface Report {
  id: string
  slug: ReportKey
  title: string
  short: string
  subsidiaryId: string
  pass: boolean | null
  passRule: string
  headline: string
  tables: Table[]
  notes: string[]
}

export const REPORT_KEYS: ReportKey[] = ["trial-balance", "aged-receivable", "aged-payable", "inventory", "jobs-wip"]

const sum = (rows: Record<string, Cell>[], key: string) => round2(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0))

function trialBalanceReport(sub: string, fromPeriod: string): Report {
  const asAt = trialBalance(sub, LAST_CLOSED_PERIOD)
  const accountRows = asAt.map((r) => ({
    account: `${r.code} ${r.name}`,
    xeroAccount: r.xeroCode,
    netsuite: r.netsuite,
    xero: r.xero,
    diff: round2(r.xero - r.netsuite),
  }))
  const periods = periodsInScope(fromPeriod).map((p) => {
    const tb = trialBalance(sub, p)
    const debit = (k: "netsuite" | "xero") => round2(tb.filter((r) => r[k] > 0).reduce((s, r) => s + r[k], 0))
    const diff = tbDifference(tb)
    return {
      period: periodLabel(p),
      netsuite: debit("netsuite"),
      xero: debit("xero"),
      diff,
      note: sub === "5" && FX_RECONCILING_PERIODS.includes(p) ? "FX reconciling journal" : "",
    }
  })
  const failing = periods.filter((p) => p.diff !== 0)
  return {
    id: "Report 1",
    slug: "trial-balance",
    title: "Comparative Trial Balance",
    short: "Trial balance",
    subsidiaryId: sub,
    pass: failing.length === 0,
    passRule: "Difference 0.00 for every account and every period.",
    headline: failing.length === 0 ? `All ${periods.length} periods match NetSuite to the cent.` : `${failing.length} period(s) differ.`,
    tables: [
      {
        title: `Trial balance as at ${formatDate(lastDayOfPeriod(LAST_CLOSED_PERIOD))} — all ${asAt.length} accounts`,
        columns: [
          { key: "account", label: "Account" },
          { key: "xeroAccount", label: "Xero account" },
          { key: "netsuite", label: "NetSuite", kind: "money" },
          { key: "xero", label: "Xero", kind: "money" },
          { key: "diff", label: "Diff", kind: "money" },
        ],
        rows: accountRows,
        footer: { account: "TOTAL", netsuite: sum(accountRows, "netsuite"), xero: sum(accountRows, "xero"), diff: sum(accountRows, "diff") },
      },
      {
        title: `Period-by-period check (${periodLabel(fromPeriod)} – ${periodLabel(LAST_CLOSED_PERIOD)})`,
        columns: [
          { key: "period", label: "Period" },
          { key: "netsuite", label: "NetSuite debits", kind: "money" },
          { key: "xero", label: "Xero debits", kind: "money" },
          { key: "diff", label: "Diff", kind: "money" },
          { key: "note", label: "Note" },
        ],
        rows: periods,
      },
    ],
    notes: ["Debit balances are positive, credit balances negative. Food and beverage sales are split by channel in Xero and compared in total."],
  }
}

function agedReport(sub: string, kind: "aged-receivable" | "aged-payable"): Report {
  const src = kind === "aged-receivable" ? receivables(sub) : payables(sub)
  const rows = src.map((r) => ({ contact: r.contact, netsuite: r.netsuite, xero: r.xero, diff: round2(r.xero - r.netsuite) }))
  const label = kind === "aged-receivable" ? "Customer" : "Supplier"
  return {
    id: kind === "aged-receivable" ? "Report 2" : "Report 3",
    slug: kind,
    title: kind === "aged-receivable" ? "Comparative Aged Receivable" : "Comparative Aged Payable",
    short: kind === "aged-receivable" ? "Aged receivable" : "Aged payable",
    subsidiaryId: sub,
    pass: rows.every((r) => r.diff === 0),
    passRule: "Difference 0.00 for every contact.",
    headline: `${rows.length} ${label.toLowerCase()}s match NetSuite at cutover.`,
    tables: [
      {
        title: `Outstanding balances at cutover`,
        columns: [
          { key: "contact", label: `${label} Name` },
          { key: "netsuite", label: "NetSuite", kind: "money" },
          { key: "xero", label: "Xero", kind: "money" },
          { key: "diff", label: "Diff", kind: "money" },
        ],
        rows,
        footer: { contact: "TOTAL", netsuite: sum(rows, "netsuite"), xero: sum(rows, "xero"), diff: sum(rows, "diff") },
      },
    ],
    notes: [],
  }
}

function inventoryReport(sub: string): Report {
  const t = inventoryTotals(sub)
  const rows = inventory(sub).map((i) => ({
    item: i.itemId,
    netsuiteQty: i.netsuiteQty,
    gojeeQty: i.gojeeQty,
    netsuite: i.netsuiteValue,
    gojee: i.gojeeValue,
    diff: round2(i.gojeeValue - i.netsuiteValue),
    serials: i.serials.join(", "),
  }))
  return {
    id: "Report 4",
    slug: "inventory",
    title: "Comparative Inventory",
    short: "Inventory",
    subsidiaryId: sub,
    pass: rows.every((r) => r.diff === 0 && r.netsuiteQty === r.gojeeQty) && t.gojeeValue === t.xeroAccount,
    passRule: "Quantities equal; Gojee stock value equals Xero's inventory account (630).",
    headline: `${t.items} items, ${t.serials} serials. Gojee stock value equals Xero inventory account 630.`,
    tables: [
      {
        title: "Stock at cutover",
        columns: [
          { key: "item", label: "Item" },
          { key: "netsuiteQty", label: "NetSuite qty", kind: "int" },
          { key: "gojeeQty", label: "Gojee qty", kind: "int" },
          { key: "netsuite", label: "NetSuite value", kind: "money" },
          { key: "gojee", label: "Gojee value", kind: "money" },
          { key: "diff", label: "Diff", kind: "money" },
          { key: "serials", label: "Serials" },
        ],
        rows,
        footer: { item: "TOTAL", netsuite: t.netsuiteValue, gojee: t.gojeeValue, diff: round2(t.gojeeValue - t.netsuiteValue) },
      },
      {
        title: "Against Xero",
        columns: [
          { key: "measure", label: "Measure" },
          { key: "value", label: "Value", kind: "money" },
        ],
        rows: [
          { measure: "Gojee stock value", value: t.gojeeValue },
          { measure: "Xero inventory account (630)", value: t.xeroAccount },
          { measure: "Diff", value: round2(t.gojeeValue - t.xeroAccount) },
        ],
      },
    ],
    notes: ["Items are untracked in Xero; the inventory balance arrived through the history, so no opening-stock journal was posted."],
  }
}

function jobsReport(sub: string): Report {
  const rows = openJobs(sub).map((j) => ({
    job: `${j.jobId} ${j.name}`,
    status: j.status,
    cost: j.costToDate,
    billed: j.billedToDate,
    retention: j.retention,
    netsuite: j.netsuiteWip,
    gojee: j.gojeeWip,
    diff: round2(j.gojeeWip - j.netsuiteWip),
  }))
  const budgets = jobBudgets(sub)
  const byCode = COST_CODES.map((c) => {
    const lines = budgets.filter((b) => b.costCode === c.code)
    return { code: `${c.code} ${c.name}`, category: c.netsuiteCategory, budget: round2(lines.reduce((s, b) => s + b.budget, 0)), cost: round2(lines.reduce((s, b) => s + b.costToDate, 0)) }
  }).filter((r) => r.budget > 0)
  return {
    id: "Report 5",
    slug: "jobs-wip",
    title: "Comparative Jobs & WIP",
    short: "Jobs & WIP",
    subsidiaryId: sub,
    pass: rows.every((r) => r.diff === 0),
    passRule: "Every open job present in Gojee; WIP (cost to date − billed to date) equal.",
    headline: `${rows.length} open jobs in Gojee, WIP matching NetSuite and the Xero WIP account (640).`,
    tables: [
      {
        title: "Open jobs at cutover — WIP = cost to date − billed to date",
        columns: [
          { key: "job", label: "Job" },
          { key: "status", label: "Status" },
          { key: "cost", label: "Cost to date", kind: "money" },
          { key: "billed", label: "Billed to date", kind: "money" },
          { key: "retention", label: "Retention held", kind: "money" },
          { key: "netsuite", label: "NetSuite WIP", kind: "money" },
          { key: "gojee", label: "Gojee WIP", kind: "money" },
          { key: "diff", label: "Diff", kind: "money" },
        ],
        rows,
        footer: {
          job: "TOTAL",
          cost: sum(rows, "cost"),
          billed: sum(rows, "billed"),
          retention: sum(rows, "retention"),
          netsuite: sum(rows, "netsuite"),
          gojee: sum(rows, "gojee"),
          diff: sum(rows, "diff"),
        },
      },
      {
        title: "Budget vs cost to date by Gojee cost code",
        columns: [
          { key: "code", label: "Gojee cost code" },
          { key: "category", label: "NetSuite budget category" },
          { key: "budget", label: "Budget", kind: "money" },
          { key: "cost", label: "Cost to date", kind: "money" },
        ],
        rows: byCode,
        footer: { code: "TOTAL", budget: sum(byCode, "budget"), cost: sum(byCode, "cost") },
      },
    ],
    notes: [
      "Cost and revenue to date are summaries in Gojee; the line detail links to the Xero bills and invoices.",
      "Open quotes went to Gojee as quotes. No WIP journal was posted in Xero.",
    ],
  }
}

export function buildReport(key: ReportKey, sub: string, fromPeriod: string = FIRST_PERIOD): Report {
  switch (key) {
    case "trial-balance":
      return trialBalanceReport(sub, fromPeriod)
    case "aged-receivable":
    case "aged-payable":
      return agedReport(sub, key)
    case "inventory":
      return inventoryReport(sub)
    case "jobs-wip":
      return jobsReport(sub)
  }
}

export function reportContext(sub: string, tenantId: string) {
  return {
    client: CLIENT_NAME,
    subsidiary: SUBSIDIARY_BY_ID[sub]?.name ?? sub,
    short: shortName(sub),
    xeroOrg: XERO_ORG_BY_ID[tenantId]?.name ?? "—",
    gojee: shortName(sub),
    migrationId: "MIG-2026-0142",
    cutover: formatDate("2026-10-31"),
    frozenAt: null as string | null,
    generatedAt: new Date().toISOString(),
  }
}
