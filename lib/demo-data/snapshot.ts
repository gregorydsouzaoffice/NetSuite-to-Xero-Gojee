/**
 * Cutover snapshot and reconciliation figures for each subsidiary.
 * Generated from a seeded RNG so every screen, report and export agrees.
 */
import { fmtMoney, round2, seeded } from "../format"
import { LAST_CLOSED_PERIOD, lastDayOfPeriod } from "../periods"
import { CONTACTS, ITEMS, SUBSIDIARY_BY_ID } from "./momento"

/** The deliberate trial-balance problem for the demo (R-33) */
export const TB_ISSUE = { subsidiaryId: "3", period: "2024-03", difference: 12.4, account: "820" }
/** Periods where Coranton's FX revaluations needed a reconciling journal */
export const FX_RECONCILING_PERIODS = ["2023-06", "2024-06", "2025-06"]

// ---------------------------------------------------------------------------
// Trial balance

export interface TbRow {
  code: string
  xeroCode: string
  name: string
  netsuite: number
  xero: number
}

const TB_ACCOUNTS: { code: string; xeroCode: string; name: string; side: 1 | -1; scale: number; inventory?: boolean }[] = [
  { code: "1000", xeroCode: "090", name: "CBA Operating Account", side: 1, scale: 180000 },
  { code: "1050", xeroCode: "095", name: "Undeposited Funds", side: 1, scale: 9000 },
  { code: "1100", xeroCode: "610", name: "Accounts Receivable", side: 1, scale: 95000 },
  { code: "1300", xeroCode: "630", name: "Inventory Asset", side: 1, scale: 60000, inventory: true },
  { code: "1350", xeroCode: "640", name: "Work in Progress", side: 1, scale: 25000 },
  { code: "1500", xeroCode: "715", name: "Kitchen Equipment", side: 1, scale: 240000 },
  { code: "2000", xeroCode: "800", name: "Accounts Payable", side: -1, scale: 120000 },
  { code: "2300", xeroCode: "820", name: "GST", side: -1, scale: 22000 },
  { code: "2410", xeroCode: "826", name: "Superannuation Payable", side: -1, scale: 14000 },
  { code: "3000", xeroCode: "950", name: "Share Capital", side: -1, scale: 100000 },
  { code: "4000", xeroCode: "201-203", name: "Food Sales (by channel)", side: -1, scale: 310000 },
  { code: "4100", xeroCode: "211-213", name: "Beverage Sales (by channel)", side: -1, scale: 140000 },
  { code: "5000", xeroCode: "310", name: "Cost of Goods Sold", side: 1, scale: 150000 },
  { code: "6100", xeroCode: "477", name: "Wages & Salaries", side: 1, scale: 160000 },
  { code: "6200", xeroCode: "469", name: "Rent", side: 1, scale: 60000 },
  { code: "6300", xeroCode: "445", name: "Electricity & Gas", side: 1, scale: 18000 },
]

/**
 * `issue` turns on the demo's one visible fix (GST rounding in Mar 2024) for this
 * entity; `roundingApplied` is whether it has been fixed.
 */
export function trialBalance(
  subsidiaryId: string,
  period: string,
  opts: { roundingApplied?: boolean; issue?: boolean; issuePeriod?: string } = {},
): TbRow[] {
  const rnd = seeded(`tb-${subsidiaryId}-${period}`)
  const hasStock = !["1", "4", "6"].includes(subsidiaryId)
  const rows: TbRow[] = TB_ACCOUNTS.filter((a) => hasStock || !a.inventory).map((a) => {
    const amount = round2(a.side * a.scale * (0.4 + rnd() * 0.9))
    return { code: a.code, xeroCode: a.xeroCode, name: a.name, netsuite: amount, xero: amount }
  })
  // Plug to retained earnings so the TB balances
  const sum = round2(rows.reduce((s, r) => s + r.netsuite, 0))
  rows.push({ code: "3100", xeroCode: "960", name: "Retained Earnings", netsuite: -sum, xero: -sum })

  if (subsidiaryId === "5" && FX_RECONCILING_PERIODS.includes(period)) {
    const fx = round2(800 + rnd() * 2400)
    rows.push({ code: "8160", xeroCode: "498", name: "Unrealised FX (reconciling journal)", netsuite: fx, xero: fx })
    rows[rows.length - 2].netsuite = round2(rows[rows.length - 2].netsuite - fx)
    rows[rows.length - 2].xero = rows[rows.length - 2].netsuite
  }

  if ((opts.issue ?? subsidiaryId === TB_ISSUE.subsidiaryId) && period === (opts.issuePeriod ?? TB_ISSUE.period)) {
    // NetSuite rounded GST per document and posted the difference to 9999 Rounding.
    // Xero rounds GST per line, so its GST is 12.40 lower and Rounding is empty
    // until the tool posts a rounding adjustment to the named account (R-40).
    const re = rows.find((r) => r.code === "3100")!
    re.netsuite = round2(re.netsuite - TB_ISSUE.difference)
    re.xero = re.netsuite
    const gst = rows.find((r) => r.xeroCode === TB_ISSUE.account)!
    const fixed = !!opts.roundingApplied
    gst.xero = fixed ? gst.netsuite : round2(gst.netsuite + TB_ISSUE.difference)
    rows.push({
      code: "9999",
      xeroCode: "860",
      name: "Rounding",
      netsuite: TB_ISSUE.difference,
      xero: fixed ? TB_ISSUE.difference : 0,
    })
  }
  return rows
}

/** Sum of absolute account differences. The period passes the R-33 gate at 0.00. */
export function tbDifference(rows: TbRow[]): number {
  return round2(rows.reduce((s, r) => s + Math.abs(round2(r.xero - r.netsuite)), 0))
}

// ---------------------------------------------------------------------------
// Receivables / payables at cutover (R-42)

export interface AgedRow {
  contact: string
  current: number
  d30: number
  d60: number
  d90: number
  netsuite: number
  xero: number
}

const EXTRA_CUSTOMERS = ["The Rooftop Collective", "St Kilda Football Club", "Fitzroy Primary School PFA", "Lygon St Traders Assoc.", "RMIT Student Union"]
const EXTRA_VENDORS = ["Toll Group", "Jim's Cleaning Fitzroy", "Cleanaway", "Telstra", "Coates Hire"]

function aged(seed: string, names: string[], scale: number): AgedRow[] {
  const rnd = seeded(seed)
  return names.map((contact) => {
    const current = round2(scale * rnd())
    const d30 = round2(scale * 0.5 * rnd())
    const d60 = rnd() > 0.55 ? round2(scale * 0.25 * rnd()) : 0
    const d90 = rnd() > 0.8 ? round2(scale * 0.15 * rnd()) : 0
    const total = round2(current + d30 + d60 + d90)
    return { contact, current, d30, d60, d90, netsuite: total, xero: total }
  })
}

export function receivables(subsidiaryId: string): AgedRow[] {
  const names = [
    ...CONTACTS.filter((c) => c.kind === "Customer" && c.subsidiaries.includes(subsidiaryId)).map((c) => c.name),
    ...EXTRA_CUSTOMERS.slice(0, 3 + (Number(subsidiaryId) % 3)),
  ]
  return aged(`ar-${subsidiaryId}`, names, 9000)
}

export function payables(subsidiaryId: string): AgedRow[] {
  const names = [
    ...CONTACTS.filter((c) => c.kind === "Vendor" && c.subsidiaries.includes(subsidiaryId)).map((c) => c.name),
    ...EXTRA_VENDORS.slice(0, 3 + (Number(subsidiaryId) % 2)),
  ]
  return aged(`ap-${subsidiaryId}`, names, 7000)
}

// ---------------------------------------------------------------------------
// Bank at cutover (R-43)

export interface BankRow {
  account: string
  xeroAccount: string
  netsuite: number
  xero: number
}

export function bankBalances(subsidiaryId: string): BankRow[] {
  const rnd = seeded(`bank-${subsidiaryId}`)
  const short = SUBSIDIARY_BY_ID[subsidiaryId]?.name.split(" ")[0] ?? ""
  return [
    { account: `1000 CBA Operating – ${short}`, xeroAccount: "090 CBA Operating Account" },
    { account: "1010 NAB Savings", xeroAccount: "091 NAB Savings Account" },
    { account: "1050 Undeposited Funds", xeroAccount: "095 Undeposited Funds Clearing" },
  ].map((b, i) => {
    const v = round2((i === 2 ? 4000 : 90000) * (0.3 + rnd()))
    return { ...b, netsuite: v, xero: v }
  })
}

// ---------------------------------------------------------------------------
// Inventory at cutover (R-44)

export interface InventoryRow {
  itemId: string
  name: string
  location: string
  netsuiteQty: number
  gojeeQty: number
  unitCost: number
  netsuiteValue: number
  gojeeValue: number
  serials: string[]
}

const LOCATIONS: Record<string, string> = { "2": "Fitzroy", "3": "Richmond", "5": "Brunswick roastery", "7": "Docklands", "8": "South Yarra" }

export function inventory(subsidiaryId: string): InventoryRow[] {
  const rnd = seeded(`inv-${subsidiaryId}`)
  return ITEMS.filter((i) => i.subsidiaries.includes(subsidiaryId) && (i.type === "InvtPart" || i.type === "Assembly")).map((i) => {
    const qty = i.serialized ? 1 + Math.floor(rnd() * 2) : Math.round(10 + rnd() * 240)
    const unitCost = round2(i.serialized ? 6000 + rnd() * 9000 : 4 + rnd() * 70)
    const value = round2(qty * unitCost)
    const serials = i.serialized
      ? Array.from({ length: qty }, (_, k) => `${i.classPrefix}${subsidiaryId}-${2300 + Math.floor(rnd() * 600)}-${k + 1}`)
      : []
    return {
      itemId: i.itemId,
      name: i.name,
      location: LOCATIONS[subsidiaryId] ?? "Main",
      netsuiteQty: qty,
      gojeeQty: qty,
      unitCost,
      netsuiteValue: value,
      gojeeValue: value,
      serials,
    }
  })
}

export function inventoryTotals(subsidiaryId: string) {
  const rows = inventory(subsidiaryId)
  const value = round2(rows.reduce((s, r) => s + r.netsuiteValue, 0))
  const gojee = round2(rows.reduce((s, r) => s + r.gojeeValue, 0))
  return {
    items: rows.length,
    serials: rows.reduce((s, r) => s + r.serials.length, 0),
    quantity: rows.reduce((s, r) => s + r.netsuiteQty, 0),
    netsuiteValue: value,
    gojeeValue: gojee,
    /** Xero inventory account (630) balance at cutover — arrived through the history */
    xeroAccount: value,
  }
}

// ---------------------------------------------------------------------------
// Open jobs, POs and timesheets (R-45, R-37)

/** Gojee cost codes the NetSuite budget categories map to */
export const COST_CODES: { code: string; name: string; netsuiteCategory: string }[] = [
  { code: "LAB", name: "Labour", netsuiteCategory: "Labor" },
  { code: "MAT", name: "Materials (food & beverage)", netsuiteCategory: "Materials" },
  { code: "SUB", name: "Subcontractors", netsuiteCategory: "Subcontract" },
  { code: "EQP", name: "Equipment hire", netsuiteCategory: "Equipment" },
  { code: "OTH", name: "Other costs", netsuiteCategory: "Expense" },
]

export interface StaffRow {
  employeeId: string
  name: string
  role: string
  /** Master record comes from Xero payroll via the Gojee sync — we only link */
  xeroPayroll: string
}

const STAFF: Omit<StaffRow, "employeeId">[] = [
  { name: "Marco Bianchi", role: "Head Chef", xeroPayroll: "Matched" },
  { name: "Aisha Khan", role: "Events Manager", xeroPayroll: "Matched" },
  { name: "Tom Nguyen", role: "Catering Lead", xeroPayroll: "Matched" },
  { name: "Sofia Rossi", role: "Chef de Partie", xeroPayroll: "Matched" },
  { name: "Liam O'Brien", role: "Site Supervisor", xeroPayroll: "Matched" },
  { name: "Grace Chen", role: "Kitchen Hand", xeroPayroll: "Matched" },
]

export function staff(subsidiaryId: string): StaffRow[] {
  return STAFF.map((p, i) => ({ ...p, employeeId: `EMP-${subsidiaryId}${String(101 + i * 3)}` }))
}

export interface JobRow {
  jobId: string
  name: string
  customer: string
  status: "In progress" | "Not started" | "Awaiting invoice"
  startDate: string
  endDate: string
  projectManager: string
  template: string
  /** Cost posted to the project in NetSuite (bills, journals, time) */
  costToDate: number
  /** Invoiced to the customer so far */
  billedToDate: number
  /** WIP = cost to date − billed to date (calculated, not mapped) */
  netsuiteWip: number
  gojeeWip: number
  retention: number
  /** Unbilled hours on the job */
  timesheetHours: number
  xeroBills: number
  xeroInvoices: number
  fromSalesOrder?: string
}

const JOB_NAMES: Record<string, string[]> = {
  "2": ["Melbourne Cup corporate lunch", "Fitzroy Primary fete catering", "Hillys Richmond fit-out", "Weekly staff meals – Crown"],
  "3": ["NYE rooftop event", "Richmond bar refurbishment", "AFL Grand Final functions", "Cocktail menu launch", "Winter wine dinner series"],
  "4": ["Venue compliance upgrade", "BVH CBD lease make-good"],
  "5": ["Café fit-out – Geelong Wine Bar Co", "Espresso machine install program", "Sydney wholesale launch"],
  "7": ["Racing Club gala dinner", "Wedding – Nguyen/Tran", "Conference – RMIT Student Union"],
  "8": ["Hotel restaurant relaunch", "Spring racing high tea", "Corporate Christmas packages", "Rooftop terrace build"],
}

const isFitOut = (name: string) => /fit-out|refurb|build|upgrade|make-good|install/i.test(name)

export const JOB_TEMPLATES = [
  { id: "TPL-01", name: "Corporate catering event", tasks: ["Menu & planning", "Purchasing & prep", "Event delivery", "Pack-down & invoicing"] },
  { id: "TPL-02", name: "Venue fit-out", tasks: ["Design & approvals", "Strip-out", "Fit-out works", "Handover & defects"] },
  { id: "TPL-03", name: "Recurring meal service", tasks: ["Weekly menu", "Production", "Delivery"] },
]

function templateFor(name: string) {
  if (isFitOut(name)) return JOB_TEMPLATES[1]
  if (/weekly|recurring|staff meals/i.test(name)) return JOB_TEMPLATES[2]
  return JOB_TEMPLATES[0]
}

export function openJobs(subsidiaryId: string): JobRow[] {
  const rnd = seeded(`jobs-${subsidiaryId}`)
  const customers = receivables(subsidiaryId).map((r) => r.contact)
  const people = staff(subsidiaryId)
  return (JOB_NAMES[subsidiaryId] ?? []).map((name, i) => {
    const wip = round2(1500 + rnd() * 18000)
    const billed = round2(2500 + rnd() * 22000)
    const cost = round2(billed + wip)
    const start = new Date(Date.UTC(2026, 6 + (i % 3), 3 + i * 5))
    const end = new Date(start.getTime() + (40 + Math.floor(rnd() * 80)) * 86400000)
    return {
      jobId: `JOB-${subsidiaryId}${String(410 + i * 7).padStart(4, "0")}`,
      name,
      customer: customers[i % customers.length] ?? "—",
      status: i === 3 ? "Awaiting invoice" : i === 4 ? "Not started" : "In progress",
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      projectManager: isFitOut(name) ? people[4].name : people[1].name,
      template: templateFor(name).name,
      costToDate: cost,
      billedToDate: billed,
      netsuiteWip: wip,
      gojeeWip: wip,
      // Fit-out jobs hold 5% retention on progress claims
      retention: isFitOut(name) ? round2(billed * 0.05) : 0,
      timesheetHours: Math.round(8 + rnd() * 120),
      xeroBills: 3 + Math.floor(rnd() * 14),
      xeroInvoices: 1 + Math.floor(rnd() * 4),
      fromSalesOrder: i % 2 === 0 ? `SO-${subsidiaryId}${String(8800 + i * 13)}` : undefined,
    }
  })
}

export interface TaskRow {
  taskId: string
  jobId: string
  job: string
  name: string
  parent: string
  plannedHours: number
  actualHours: number
  startDate: string
  endDate: string
}

export function jobTasks(subsidiaryId: string): TaskRow[] {
  const rnd = seeded(`tasks-${subsidiaryId}`)
  return openJobs(subsidiaryId).flatMap((j, ji) =>
    templateFor(j.name).tasks.map((t, ti) => {
      const planned = Math.round(6 + rnd() * 40)
      return {
        taskId: `PT-${j.jobId.slice(4)}-${ti + 1}`,
        jobId: j.jobId,
        job: j.name,
        name: t,
        parent: ti === 0 ? j.jobId : `PT-${j.jobId.slice(4)}-1`,
        plannedHours: planned,
        actualHours: ti < 2 + (ji % 2) ? Math.round(planned * (0.6 + rnd() * 0.5)) : 0,
        startDate: j.startDate,
        endDate: j.endDate,
      }
    }),
  )
}

export interface BudgetRow {
  jobId: string
  job: string
  netsuiteCategory: string
  costCode: string
  budget: number
  costToDate: number
}

export function jobBudgets(subsidiaryId: string): BudgetRow[] {
  const rnd = seeded(`budget-${subsidiaryId}`)
  return openJobs(subsidiaryId).flatMap((j) => {
    const codes = isFitOut(j.name) ? COST_CODES : COST_CODES.filter((c) => c.code !== "SUB")
    const weights = codes.map(() => 0.4 + rnd())
    const sum = weights.reduce((a, b) => a + b, 0)
    let allocated = 0
    return codes.map((c, i) => {
      const last = i === codes.length - 1
      const cost = last ? round2(j.costToDate - allocated) : round2((j.costToDate * weights[i]) / sum)
      allocated = round2(allocated + cost)
      return { jobId: j.jobId, job: j.name, netsuiteCategory: c.netsuiteCategory, costCode: c.code, budget: round2(cost * (1.15 + rnd() * 0.5)), costToDate: cost }
    })
  })
}

export interface TimesheetRow {
  employee: string
  jobId: string
  task: string
  date: string
  hours: number
  billable: boolean
}

/** Unbilled time entries (timeBill where billed = false) on open jobs */
export function unbilledTimesheets(subsidiaryId: string): TimesheetRow[] {
  const rnd = seeded(`time-${subsidiaryId}`)
  const people = staff(subsidiaryId)
  const tasks = jobTasks(subsidiaryId)
  return openJobs(subsidiaryId).flatMap((j) => {
    const jt = tasks.filter((t) => t.jobId === j.jobId)
    const n = Math.max(1, Math.ceil(j.timesheetHours / 6))
    let left = j.timesheetHours
    return Array.from({ length: n }, (_, k) => {
      const hours = k === n - 1 ? left : Math.min(left, Math.round(4 + rnd() * 4))
      left -= hours
      return {
        employee: people[(k + j.jobId.length) % people.length].name,
        jobId: j.jobId,
        task: jt[k % jt.length]?.name ?? "General",
        date: `2026-10-${String(1 + (k % 28)).padStart(2, "0")}`,
        hours,
        billable: k % 5 !== 4,
      }
    }).filter((t) => t.hours > 0)
  })
}

export interface AllocationRow {
  employee: string
  jobId: string
  job: string
  startDate: string
  endDate: string
  allocatedHours: number
}

/** Future staff schedule (resourceAllocation) */
export function resourceAllocations(subsidiaryId: string): AllocationRow[] {
  const rnd = seeded(`alloc-${subsidiaryId}`)
  const people = staff(subsidiaryId)
  return openJobs(subsidiaryId)
    .filter((j) => j.status !== "Awaiting invoice")
    .flatMap((j, i) =>
      [0, 1].map((k) => ({
        employee: people[(i * 2 + k) % people.length].name,
        jobId: j.jobId,
        job: j.name,
        startDate: `2026-11-${String(3 + i * 4 + k).padStart(2, "0")}`,
        endDate: `2026-11-${String(10 + i * 4 + k).padStart(2, "0")}`,
        allocatedHours: Math.round(12 + rnd() * 30),
      })),
    )
}

export interface BillingRateRow {
  role: string
  netsuiteRule: string
  costRate: number
  chargeRate: number
  gojee: string
  fit: "Direct" | "Partial"
}

export function billingRates(): BillingRateRow[] {
  return [
    { role: "Head Chef", netsuiteRule: "Labor cost on employee + project rate card", costRate: 48, chargeRate: 95, gojee: "Staff cost & charge rate", fit: "Direct" },
    { role: "Events Manager", netsuiteRule: "Project rate card", costRate: 42, chargeRate: 85, gojee: "Staff cost & charge rate", fit: "Direct" },
    { role: "Catering Lead", netsuiteRule: "Charge rule: time-based, +25% weekends", costRate: 36, chargeRate: 72, gojee: "Charge rate $72 (weekend uplift as separate rate)", fit: "Partial" },
    { role: "Chef de Partie", netsuiteRule: "Labor cost on employee", costRate: 34, chargeRate: 65, gojee: "Staff cost & charge rate", fit: "Direct" },
    { role: "Site Supervisor", netsuiteRule: "Charge rule: fixed fee milestones", costRate: 45, chargeRate: 90, gojee: "Charge rate $90; milestones as job stages", fit: "Partial" },
    { role: "Kitchen Hand", netsuiteRule: "Labor cost on employee", costRate: 29, chargeRate: 52, gojee: "Staff cost & charge rate", fit: "Direct" },
  ]
}

export interface PoRow {
  poNumber: string
  vendor: string
  ordered: number
  received: number
  amount: number
}

export function openPurchaseOrders(subsidiaryId: string): PoRow[] {
  const rnd = seeded(`po-${subsidiaryId}`)
  const vendors = payables(subsidiaryId).map((p) => p.contact)
  const n = ["1", "4", "6"].includes(subsidiaryId) ? 0 : 3 + Math.floor(rnd() * 6)
  return Array.from({ length: n }, (_, i) => {
    const ordered = Math.round(10 + rnd() * 90)
    return {
      poNumber: `PO-${subsidiaryId}${String(5120 + i * 9)}`,
      vendor: vendors[i % vendors.length],
      ordered,
      received: rnd() > 0.6 ? Math.round(ordered * rnd() * 0.8) : 0,
      amount: round2(200 + rnd() * 6000),
    }
  })
}

export function openReturnAuthorisations(subsidiaryId: string) {
  const rnd = seeded(`ra-${subsidiaryId}`)
  if (["1", "4", "6"].includes(subsidiaryId)) return []
  return Array.from({ length: 1 + Math.floor(rnd() * 2) }, (_, i) => ({
    reference: `RA-${subsidiaryId}${String(301 + i * 4)}`,
    amount: round2(80 + rnd() * 900),
  }))
}

/** Counts the Gojee loader writes for a subsidiary (R-37) */
export function gojeeSnapshot(subsidiaryId: string) {
  const inv = inventoryTotals(subsidiaryId)
  const jobs = openJobs(subsidiaryId)
  return {
    items: inv.items,
    serials: inv.serials,
    jobs: jobs.length,
    wip: round2(jobs.reduce((s, j) => s + j.gojeeWip, 0)),
    tasks: jobTasks(subsidiaryId).length,
    templates: JOB_TEMPLATES.length,
    budgetLines: jobBudgets(subsidiaryId).length,
    costRevenueSummaries: jobs.length * 2,
    retentionJobs: jobs.filter((j) => j.retention > 0).length,
    purchaseOrders: openPurchaseOrders(subsidiaryId).length,
    timesheetEntries: unbilledTimesheets(subsidiaryId).length,
    allocations: resourceAllocations(subsidiaryId).length,
    staff: staff(subsidiaryId).length,
    billingRates: billingRates().length,
  }
}

export const CUTOVER_LABEL = `as at cutover`
export const LAST_CLOSED_LABEL = lastDayOfPeriod(LAST_CLOSED_PERIOD)
export { fmtMoney }
