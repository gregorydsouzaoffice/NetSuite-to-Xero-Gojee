/**
 * The categories one entity migrates, with counts. Extract, Map, Validate,
 * Import and the Report all read from here so the numbers agree everywhere.
 */
import { CONTACTS, ITEMS, MASTER_COUNTS, recordCounts } from "./momento"
import { FIRST_PERIOD, historyShare } from "../periods"
import {
  COST_CODES,
  JOB_TEMPLATES,
  billingRates,
  gojeeSnapshot,
  inventory,
  jobBudgets,
  jobTasks,
  openJobs,
  openPurchaseOrders,
  resourceAllocations,
  staff,
  unbilledTimesheets,
} from "./snapshot"

export type CategorySystem = "xero" | "gojee"

export interface Category {
  key: string
  label: string
  system: CategorySystem
  count: number
  /** NetSuite record type(s) it comes from */
  source: string
  /** What it becomes in the destination */
  becomes: string
}

export function categories(subsidiaryId: string, fromPeriod: string = FIRST_PERIOD): Category[] {
  const share = historyShare(fromPeriod)
  const full = recordCounts(subsidiaryId)
  // Transaction history scales with the date range; master data and Gojee's open items don't
  const c = Object.fromEntries(Object.entries(full).map(([k, v]) => [k, Math.round(v * share)])) as typeof full
  const m = MASTER_COUNTS[subsidiaryId] ?? { accounts: 46, customers: 0, vendors: 0, items: 0 }
  const g = gojeeSnapshot(subsidiaryId)
  return [
    { key: "accounts", label: "Chart of Accounts", system: "xero", count: m.accounts, source: "account", becomes: "Accounts (channel split on sales)" },
    { key: "customers", label: "Customers", system: "xero", count: m.customers, source: "customer", becomes: "Contacts, grouped by region" },
    { key: "vendors", label: "Suppliers", system: "xero", count: m.vendors, source: "vendor", becomes: "Contacts" },
    { key: "items", label: "Items", system: "xero", count: m.items, source: "item", becomes: "Untracked items (class → code)" },
    { key: "invoices", label: "Invoices", system: "xero", count: c.CustInvc, source: "CustInvc", becomes: "Invoices (ACCREC)" },
    { key: "bills", label: "Bills", system: "xero", count: c.VendBill, source: "VendBill", becomes: "Bills (ACCPAY)" },
    { key: "creditNotes", label: "Credit Notes", system: "xero", count: c.CustCred, source: "CustCred", becomes: "Credit notes + allocations" },
    { key: "billCredits", label: "Bill Credits", system: "xero", count: c.VendCred, source: "VendCred", becomes: "Supplier credits + allocations" },
    { key: "invoicePayments", label: "Invoice Payments", system: "xero", count: c.CustPymt, source: "CustPymt", becomes: "Payments, overpayments, prepayments" },
    { key: "billPayments", label: "Bill Payments", system: "xero", count: c.VendPymt, source: "VendPymt", becomes: "Batch payments" },
    {
      key: "bank",
      label: "Bank Transactions & Transfers",
      system: "xero",
      count: c.Check + c.Deposit + c.CashRfnd + c.Transfer,
      source: "Check, Deposit, CashRfnd, Transfer",
      becomes: "Spend / receive money, bank transfers",
    },
    { key: "journals", label: "Journals", system: "xero", count: c.Journal, source: "Journal", becomes: "Manual journals (intercompany split)" },
    {
      key: "inventoryJournals",
      label: "Inventory Journals",
      system: "xero",
      count: c.InvAdjst + c.ItemRcpt + c.ItemShip,
      source: "InvAdjst, ItemRcpt, ItemShip",
      becomes: "Manual journals (COGS, inventory, accruals)",
    },
    { key: "stock", label: "Stock on Hand & Serials", system: "gojee", count: g.items + g.serials, source: "record/v1/inventoryItem (on hand)", becomes: "Gojee inventory" },
    { key: "jobs", label: "Jobs & WIP", system: "gojee", count: g.jobs, source: "record/v1/job", becomes: "Gojee jobs (status, dates, PM); WIP = cost − billed" },
    { key: "jobTasks", label: "Job Tasks & Stages", system: "gojee", count: g.tasks, source: "record/v1/projectTask", becomes: "Gojee job stages" },
    { key: "jobTemplates", label: "Job Templates", system: "gojee", count: g.templates, source: "record/v1/projectTemplate", becomes: "Gojee job templates" },
    { key: "jobBudgets", label: "Job Budgets", system: "gojee", count: g.budgetLines, source: "SuiteQL · project budget lines", becomes: "Budgets by Gojee cost code" },
    {
      key: "jobCostRevenue",
      label: "Job Cost & Revenue to Date",
      system: "gojee",
      count: g.costRevenueSummaries,
      source: "SuiteQL · transaction + transactionLine by project",
      becomes: "Summaries by cost code, linked to Xero bills & invoices",
    },
    { key: "retention", label: "Retention Held", system: "gojee", count: g.retentionJobs, source: "SuiteQL · custom field / invoice line", becomes: "Retention on Gojee jobs" },
    { key: "purchaseOrders", label: "Open Purchase Orders", system: "gojee", count: g.purchaseOrders, source: "SuiteQL · PurchOrd (open)", becomes: "Gojee purchase orders" },
    { key: "timesheets", label: "Timesheets (unbilled)", system: "gojee", count: g.timesheetEntries, source: "record/v1/timeBill (billed = false)", becomes: "Gojee timesheets" },
    { key: "schedule", label: "Staff Schedule", system: "gojee", count: g.allocations, source: "record/v1/resourceAllocation", becomes: "Gojee schedule (future bookings)" },
    { key: "staff", label: "Staff (link only)", system: "gojee", count: g.staff, source: "record/v1/employee", becomes: "Linked to staff synced from Xero payroll" },
    { key: "billingRates", label: "Billing Rates", system: "gojee", count: g.billingRates, source: "SuiteQL · charge rules, labor cost", becomes: "Staff cost & charge rates" },
  ]
}

export function totals(subsidiaryId: string, fromPeriod: string = FIRST_PERIOD) {
  const cats = categories(subsidiaryId, fromPeriod)
  return {
    xero: cats.filter((c) => c.system === "xero").reduce((s, c) => s + c.count, 0),
    gojee: cats.filter((c) => c.system === "gojee").reduce((s, c) => s + c.count, 0),
    all: cats.reduce((s, c) => s + c.count, 0),
  }
}

/** Sample rows for the report's Detailed Report tabs */
export function sampleRows(subsidiaryId: string): Record<string, { title: string; headers: string[]; rows: string[][] }> {
  const customers = CONTACTS.filter((c) => c.kind === "Customer").map((c) => c.name)
  const vendors = CONTACTS.filter((c) => c.kind === "Vendor").map((c) => c.name)
  const items = ITEMS.filter((i) => i.subsidiaries.includes(subsidiaryId))
  const d = (n: number) => `${String(3 + n).padStart(2, "0")}/09/2026`
  const amt = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`
  return {
    accounts: {
      title: "Chart of Accounts",
      headers: ["NetSuite", "Xero Account", "Type", "Status"],
      rows: [
        ["4000 Food Sales", "201 / 202 / 203 Sales by channel", "Revenue", "Imported"],
        ["1100 Accounts Receivable", "610 Accounts Receivable", "Current Asset", "Imported"],
        ["1300 Inventory Asset", "630 Inventory", "Inventory", "Imported"],
        ["1350 Work in Progress", "640 Work in Progress", "Current Asset", "Imported"],
        ["9999 Rounding", "860 Rounding", "Current Liability", "Imported"],
      ],
    },
    customers: {
      title: "Customers",
      headers: ["Name", "Contact Group", "Email", "Status"],
      rows: customers.slice(0, 4).map((n, i) => [n, ["Corporate accounts", "VIC Metro", "VIC Metro", "Corporate accounts"][i], `accounts@${n.toLowerCase().replace(/[^a-z]+/g, "")}.com.au`, "Imported"]),
    },
    vendors: {
      title: "Suppliers",
      headers: ["Name", "ABN", "Email", "Status"],
      rows: vendors.slice(0, 4).map((n, i) => [n, `${51 + i * 7} 004 ${300 + i * 11} ${120 + i}`, `ap@${n.toLowerCase().replace(/[^a-z]+/g, "")}.com.au`, "Imported"]),
    },
    items: {
      title: "Items",
      headers: ["NetSuite Item", "Xero Code", "Tracked", "Status"],
      rows: items.slice(0, 5).map((i) => [i.itemId, `${i.classPrefix}-${i.itemId.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`.slice(0, 30), "No (Gojee holds stock)", "Imported"]),
    },
    invoices: {
      title: "Invoices",
      headers: ["Invoice #", "Customer", "Date", "Amount", "Status"],
      rows: customers.slice(0, 4).map((c, i) => [`INV-${35210 + i * 3}`, c, d(i), amt(1840 + i * 612.4), "Imported"]),
    },
    bills: {
      title: "Bills",
      headers: ["Bill #", "Supplier", "Date", "Amount", "Status"],
      rows: vendors.slice(0, 4).map((v, i) => [`BILL-${88104 + i * 5}`, v, d(i), amt(612.5 + i * 233.1), "Imported"]),
    },
    creditNotes: {
      title: "Credit Notes",
      headers: ["Credit Note #", "Customer", "Allocated To", "Amount", "Status"],
      rows: customers.slice(0, 3).map((c, i) => [`CM-${4410 + i}`, c, `INV-${35210 + i * 3}`, amt(120 + i * 45), "Imported"]),
    },
    billCredits: {
      title: "Bill Credits",
      headers: ["Credit #", "Supplier", "Allocated To", "Amount", "Status"],
      rows: vendors.slice(0, 2).map((v, i) => [`VC-${2205 + i}`, v, `BILL-${88104 + i * 5}`, amt(64.9 + i * 30), "Imported"]),
    },
    invoicePayments: {
      title: "Invoice Payments",
      headers: ["Payment #", "Invoice", "Date", "Amount", "Status"],
      rows: [0, 1, 2, 3].map((i) => [`PYMT-${61002 + i}`, `INV-${35210 + i * 3}`, d(i + 2), amt(1840 + i * 612.4), "Imported"]),
    },
    billPayments: {
      title: "Bill Payments",
      headers: ["Batch #", "Bills", "Date", "Amount", "Status"],
      rows: [0, 1, 2].map((i) => [`BP-${7310 + i}`, `${3 + i} bills`, d(i + 4), amt(2310 + i * 980.2), "Imported"]),
    },
    bank: {
      title: "Bank Transactions & Transfers",
      headers: ["Reference", "Type", "Date", "Amount", "Status"],
      rows: [
        ["DEP-20931", "Transfer from Undeposited Funds", d(1), amt(4320.5), "Imported"],
        ["CHK-1182", "Spend money", d(2), amt(286.0), "Imported"],
        ["TRF-0442", "Bank transfer", d(3), amt(10000), "Imported"],
        ["RFND-118", "Refund against credit note", d(4), amt(45.0), "Imported"],
      ],
    },
    journals: {
      title: "Journals",
      headers: ["Journal #", "Date", "Description", "Status"],
      rows: [
        ["JE-HIL-2209", d(0), "Month-end accruals", "Imported"],
        ["JE-HIL-2210", d(1), "Depreciation — kitchen equipment", "Imported"],
        ["JE-HIL-2211", d(2), "Intercompany recharge (balanced on 1810-MHG)", "Imported"],
        ["JE-HIL-2212", d(3), "Payroll accrual", "Imported"],
      ],
    },
    inventoryJournals: {
      title: "Inventory Journals",
      headers: ["Reference", "NetSuite Type", "Xero Journal", "Status"],
      rows: [
        ["IF-90311", "Item Fulfillment", "Dr COGS / Cr Inventory", "Imported"],
        ["IR-70422", "Item Receipt", "Dr Inventory / Cr Accrued Purchases", "Imported"],
        ["IA-1104", "Inventory Adjustment", "Dr Shrinkage / Cr Inventory", "Imported"],
      ],
    },
    stock: {
      title: "Stock on Hand & Serials (Gojee)",
      headers: ["Item", "Location", "Qty", "Serials", "Status"],
      rows: inventory(subsidiaryId)
        .slice(0, 5)
        .map((r) => [r.itemId, r.location, String(r.gojeeQty), r.serials.join(", ") || "—", "Imported"]),
    },
    jobs: {
      title: "Jobs & WIP (Gojee)",
      headers: ["Job", "Status", "Project Manager", "Cost to Date", "Billed to Date", "WIP", "Status"],
      rows: openJobs(subsidiaryId).map((j) => [`${j.jobId} ${j.name}`, j.status, j.projectManager, amt(j.costToDate), amt(j.billedToDate), amt(j.gojeeWip), "Imported"]),
    },
    jobTasks: {
      title: "Job Tasks & Stages (Gojee)",
      headers: ["Task", "Job", "Planned hrs", "Actual hrs", "Status"],
      rows: jobTasks(subsidiaryId)
        .slice(0, 8)
        .map((t) => [t.name, t.jobId, String(t.plannedHours), String(t.actualHours), "Imported"]),
    },
    jobTemplates: {
      title: "Job Templates (Gojee)",
      headers: ["Template", "Stages", "Status"],
      rows: JOB_TEMPLATES.map((t) => [t.name, t.tasks.join(" → "), "Imported"]),
    },
    jobBudgets: {
      title: "Job Budgets (Gojee)",
      headers: ["Job", "NetSuite Category", "Gojee Cost Code", "Budget", "Status"],
      rows: jobBudgets(subsidiaryId)
        .slice(0, 8)
        .map((b) => [b.jobId, b.netsuiteCategory, `${b.costCode} ${COST_CODES.find((c) => c.code === b.costCode)?.name ?? ""}`, amt(b.budget), "Imported"]),
    },
    jobCostRevenue: {
      title: "Job Cost & Revenue to Date (Gojee)",
      headers: ["Job", "Cost to Date", "Xero Bills", "Billed to Date", "Xero Invoices", "Status"],
      rows: openJobs(subsidiaryId).map((j) => [j.jobId, amt(j.costToDate), `${j.xeroBills} linked`, amt(j.billedToDate), `${j.xeroInvoices} linked`, "Imported"]),
    },
    retention: {
      title: "Retention Held (Gojee)",
      headers: ["Job", "Billed to Date", "Retention", "Status"],
      rows: openJobs(subsidiaryId)
        .filter((j) => j.retention > 0)
        .map((j) => [`${j.jobId} ${j.name}`, amt(j.billedToDate), amt(j.retention), "Imported"]),
    },
    purchaseOrders: {
      title: "Open Purchase Orders (Gojee)",
      headers: ["PO #", "Supplier", "Amount", "Status"],
      rows: openPurchaseOrders(subsidiaryId)
        .slice(0, 5)
        .map((p) => [p.poNumber, p.vendor, amt(p.amount), "Imported"]),
    },
    timesheets: {
      title: "Timesheets — unbilled (Gojee)",
      headers: ["Employee", "Job", "Task", "Hours", "Billable", "Status"],
      rows: unbilledTimesheets(subsidiaryId)
        .slice(0, 8)
        .map((t) => [t.employee, t.jobId, t.task, String(t.hours), t.billable ? "Yes" : "No", "Imported"]),
    },
    schedule: {
      title: "Staff Schedule (Gojee)",
      headers: ["Employee", "Job", "From", "To", "Hours", "Status"],
      rows: resourceAllocations(subsidiaryId)
        .slice(0, 8)
        .map((a) => [a.employee, a.jobId, a.startDate.split("-").reverse().join("/"), a.endDate.split("-").reverse().join("/"), String(a.allocatedHours), "Imported"]),
    },
    staff: {
      title: "Staff — link only (Gojee)",
      headers: ["Employee", "Role", "Xero Payroll", "Status"],
      rows: staff(subsidiaryId).map((p) => [`${p.employeeId} ${p.name}`, p.role, p.xeroPayroll, "Imported"]),
    },
    billingRates: {
      title: "Billing Rates (Gojee)",
      headers: ["Role", "NetSuite Rule", "Cost / Charge", "Fit", "Status"],
      rows: billingRates().map((r) => [r.role, r.netsuiteRule, `$${r.costRate} / $${r.chargeRate}`, r.fit, "Imported"]),
    },
  }
}
