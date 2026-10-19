"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import MigrationStepper from "@/components/migration-stepper"
import NextButton from "@/components/next-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  BadgeDollarSign,
  Banknote,
  CalendarDays,
  Copy,
  ListChecks,
  Lock,
  PiggyBank,
  TrendingUp,
  UserCheck,
  Boxes,
  Briefcase,
  Clock,
  Landmark,
  Split,
  Warehouse,
  BookOpen,
  Building2,
  CheckCircle,
  CheckSquare,
  ClipboardList,
  CreditCard,
  Database,
  FileMinus,
  FilePlus,
  FileText,
  Map,
  MoveRight,
  Package,
  Paperclip,
  PenLine,
  Receipt,
  RotateCcw,
  Settings2,
  ShoppingCart,
  SkipForward,
  Sparkles,
  Upload,
  Users,
} from "lucide-react"

/* ---------------------------------------------------------------------------
   Mapping model
   - Every category has editable FIELD mappings and TREATMENT rules.
   - Chart of Accounts additionally has record-level ACCOUNT remapping.
   - Each category lands in Xero or Gojee (`dest`).
--------------------------------------------------------------------------- */

const SKIP = "__skip__"
const STORAGE_KEY = "gojee-map-overrides-v1"

interface FieldDef {
  id: string
  /** NetSuite field */
  source: string
  suggested: string
  alternates: string[]
  /** AI could not confidently pick a target — user must map manually */
  needsReview?: boolean
}

interface RuleOption {
  value: string
  label: string
  hint?: string
}

interface RuleDef {
  id: string
  label: string
  description: string
  suggested: string
  options: RuleOption[]
}

interface TargetAccount {
  code: string
  name: string
  type: string
  tax: string
}

// Target Xero chart of accounts available for remapping
const TARGET_ACCOUNTS: TargetAccount[] = [
  { code: "090", name: "CBA Operating Account", type: "Asset", tax: "BAS Excluded" },
  { code: "095", name: "Undeposited Funds Clearing", type: "Asset", tax: "BAS Excluded" },
  { code: "610", name: "Accounts Receivable", type: "Asset", tax: "BAS Excluded" },
  { code: "630", name: "Inventory", type: "Asset", tax: "BAS Excluded" },
  { code: "640", name: "Work in Progress", type: "Asset", tax: "BAS Excluded" },
  { code: "800", name: "Accounts Payable", type: "Liability", tax: "BAS Excluded" },
  { code: "820", name: "GST", type: "Liability", tax: "BAS Excluded" },
  { code: "835", name: "Gift Vouchers Liability", type: "Liability", tax: "BAS Excluded" },
  { code: "860", name: "Rounding", type: "Liability", tax: "BAS Excluded" },
  { code: "960", name: "Retained Earnings", type: "Equity", tax: "BAS Excluded" },
  { code: "201", name: "Sales – Dine-in", type: "Income", tax: "GST on Income" },
  { code: "202", name: "Sales – Delivery", type: "Income", tax: "GST on Income" },
  { code: "203", name: "Sales – Catering", type: "Income", tax: "GST on Income" },
  { code: "260", name: "Other Revenue", type: "Income", tax: "GST on Income" },
  { code: "310", name: "Cost of Goods Sold", type: "Cost of Sales", tax: "GST on Expenses" },
  { code: "406", name: "Delivery Platform Commission", type: "Expense", tax: "GST on Expenses" },
  { code: "429", name: "General Expenses", type: "Expense", tax: "GST on Expenses" },
  { code: "469", name: "Rent", type: "Expense", tax: "GST on Expenses" },
  { code: "477", name: "Wages and Salaries", type: "Expense", tax: "BAS Excluded" },
]

const ACCOUNT_TYPE_ORDER = ["Asset", "Liability", "Equity", "Income", "Cost of Sales", "Expense"]

const targetAccount = (code: string) => TARGET_ACCOUNTS.find((a) => a.code === code)

const accountOptions = (codes?: string[]): RuleOption[] =>
  TARGET_ACCOUNTS.filter((a) => !codes || codes.includes(a.code)).map((a) => ({
    value: a.code,
    label: `${a.code} · ${a.name}`,
    hint: a.type,
  }))

// Sample NetSuite accounts with their suggested Xero targets (record-level remapping)
const SOURCE_ACCOUNTS: { code: string; name: string; type: string; suggested: string; needsReview?: boolean }[] = [
  { code: "1000", name: "CBA Operating Account", type: "Bank", suggested: "090" },
  { code: "1050", name: "Undeposited Funds", type: "Other Current Asset", suggested: "095" },
  { code: "1100", name: "Accounts Receivable", type: "Accounts Receivable", suggested: "610" },
  { code: "1300", name: "Inventory Asset", type: "Other Current Asset", suggested: "630" },
  { code: "1350", name: "Work in Progress", type: "Other Current Asset", suggested: "640" },
  { code: "2450", name: "Gift Vouchers Liability", type: "Other Current Liability", suggested: "835" },
  { code: "4000·DI", name: "Food Sales – Dine-in channel", type: "Income", suggested: "201" },
  { code: "4000·DL", name: "Food Sales – Delivery channel", type: "Income", suggested: "202" },
  { code: "6600", name: "Delivery Platform Fees", type: "Expense", suggested: "406" },
  { code: "9999", name: "Rounding", type: "Other Expense", suggested: "860" },
]

type Dest = "xero" | "gojee"

const DEST_NAME: Record<Dest, string> = { xero: "Xero", gojee: "Gojee" }

interface CategoryDef {
  key: string
  label: string
  dest: Dest
  fields: FieldDef[]
  rules: RuleDef[]
}

const f = (id: string, source: string, suggested: string, alternates: string[] = []): FieldDef => ({
  id,
  source,
  suggested,
  alternates,
})

const keep = (label: string, description: string, recommended: string, other: string): RuleDef => ({
  id: label.toLowerCase().replace(/[^a-z]+/g, "-"),
  label,
  description,
  suggested: "a",
  options: [
    { value: "a", label: recommended, hint: "Recommended" },
    { value: "b", label: other },
  ],
})

const CATEGORIES: CategoryDef[] = [
  {
    key: "accounts",
    label: "Chart of Accounts",
    dest: "xero",
    fields: [
      f("number", "Account Number", "Account Code", ["Reporting Code"]),
      f("name", "Account Name", "Account Name", ["Description"]),
      f("type", "Account Type", "Account Type", ["Account Class"]),
      f("tax", "Default Tax Code", "Tax Rate", ["BAS Excluded"]),
    ],
    rules: [
      keep("Channel segment", "Sales lines carry a Channel (Dine-in, Delivery, Catering)", "Split into one Xero account per channel", "Keep one sales account"),
      keep("Inactive accounts", "NetSuite accounts that are inactive or unused", "Skip inactive accounts", "Migrate all accounts"),
    ],
  },
  {
    key: "segments",
    label: "Segment Routing",
    dest: "xero",
    fields: [
      f("department", "Department (cost centre)", "Tracking Category 1", ["Tracking Category 2", "Memo text"]),
      f("location", "Location", "Tracking Category 2", ["Tracking Category 1", "Memo text"]),
      f("channel", "Channel (custom segment)", "Account split", ["Tracking Category 1", "Memo text"]),
      f("class", "Class (product line)", "Item codes", ["Memo text"]),
      f("project", "Project / Job", "Gojee job", ["Memo text"]),
      f("region", "Region / Sales rep", "Contact groups", ["Memo text"]),
    ],
    rules: [
      keep("Tracking limit", "Xero allows two active tracking categories", "Department and Location only", "Ask me per segment"),
    ],
  },
  {
    key: "customers",
    label: "Customers",
    dest: "xero",
    fields: [
      f("name", "Company Name", "Contact Name", ["Display Name"]),
      f("email", "Email", "Email Address", ["Accounts Email"]),
      f("phone", "Phone", "Phone Number", ["Mobile"]),
      f("abn", "Tax Number (ABN)", "Tax Number", []),
      f("region", "Region", "Contact Group", ["Memo"]),
    ],
    rules: [
      keep("Contacts with missing details", "Customers without an email or phone number", "Import with placeholder", "Skip these contacts"),
      keep("Credit terms", "Payment terms on each customer", "Map from NetSuite terms", "Use Xero default (30 days)"),
    ],
  },
  {
    key: "vendors",
    label: "Suppliers",
    dest: "xero",
    fields: [
      f("name", "Company Name", "Contact Name", ["Display Name"]),
      f("email", "Email", "Email Address", ["Remittance Email"]),
      f("abn", "Tax Number (ABN)", "Tax Number", []),
      f("bank", "Bank Details", "Bank Account Details", []),
    ],
    rules: [keep("Possible duplicates", "Suppliers whose names closely match an existing Xero contact", "Merge into existing contact", "Create separate contacts")],
  },
  {
    key: "items",
    label: "Items",
    dest: "xero",
    fields: [
      f("code", "Item Name/Number", "Item Code", ["SKU"]),
      f("name", "Display Name", "Item Name", ["Description"]),
      f("class", "Class", "Item code prefix", []),
      f("income", "Income Account", "Sales Account", []),
      f("cogs", "COGS Account", "Purchase Account", []),
    ],
    rules: [
      keep("Inventory tracking", "Stock is held in Gojee", "Create as untracked items in Xero", "Track inventory in Xero"),
      keep("Long item codes", "Xero item codes are limited to 30 characters", "Shorten automatically", "Skip the item"),
    ],
  },
  {
    key: "invoices",
    label: "Invoices",
    dest: "xero",
    fields: [
      f("number", "Document Number", "Invoice Number", ["Reference"]),
      f("customer", "Customer", "Contact", []),
      f("date", "Date (posting period)", "Invoice Date", ["Transaction Date"]),
      f("due", "Due Date", "Due Date", []),
      f("lines", "Item Lines", "Line Items", []),
      f("dept", "Department / Location", "Tracking", []),
    ],
    rules: [
      keep("Date basis", "A transaction dated outside its posting period", "Use the period's last day", "Keep the transaction date"),
      keep("Open jobs", "Invoices on a job that is still open", "Link to the Gojee job", "Don't link"),
    ],
  },
  {
    key: "bills",
    label: "Bills",
    dest: "xero",
    fields: [
      f("number", "Document Number", "Bill Reference", ["Invoice Number"]),
      f("vendor", "Vendor", "Contact", []),
      f("date", "Date (posting period)", "Bill Date", []),
      f("lines", "Expense & Item Lines", "Line Items", []),
    ],
    rules: [keep("Foreign currency", "Bills in USD or NZD", "Keep currency and NetSuite rate", "Convert to AUD")],
  },
  {
    key: "credit-notes",
    label: "Credit Notes",
    dest: "xero",
    fields: [
      f("number", "Credit Memo #", "Credit Note Number", []),
      f("customer", "Customer", "Contact", []),
      f("applied", "Applied To", "Allocations", []),
    ],
    rules: [keep("Allocations", "Credit memos applied to invoices", "Allocate to the same invoices", "Leave unallocated")],
  },
  {
    key: "bill-credits",
    label: "Bill Credits",
    dest: "xero",
    fields: [
      f("number", "Bill Credit #", "Credit Note Number", []),
      f("vendor", "Vendor", "Contact", []),
      f("applied", "Applied To", "Allocations", []),
    ],
    rules: [keep("Allocations", "Bill credits applied to bills", "Allocate to the same bills", "Leave unallocated")],
  },
  {
    key: "invoice-payments",
    label: "Invoice Payments",
    dest: "xero",
    fields: [
      f("account", "Deposit To Account", "Bank Account", ["Undeposited Funds Clearing"]),
      f("applied", "Applied Invoices", "Invoice", []),
      f("cleared", "Cleared", "Is Reconciled", []),
    ],
    rules: [keep("Unapplied amounts", "Payments larger than the invoices they pay", "Overpayment / prepayment", "Leave on account")],
  },
  {
    key: "bill-payments",
    label: "Bill Payments",
    dest: "xero",
    fields: [
      f("account", "Account", "Bank Account", []),
      f("applied", "Applied Bills", "Bills", []),
      f("cleared", "Cleared", "Is Reconciled", []),
    ],
    rules: [keep("Payment runs", "One NetSuite payment covering several bills", "Batch payment in Xero", "Separate payments")],
  },
  {
    key: "bank",
    label: "Bank Transactions",
    dest: "xero",
    fields: [
      f("check", "Check", "Spend Money", ["Bill Payment"]),
      f("deposit", "Deposit", "Transfer from clearing", ["Receive Money"]),
      f("transfer", "Transfer", "Bank Transfer", []),
      f("refund", "Cash Refund", "Refund", ["Spend Money"]),
    ],
    rules: [keep("Undeposited funds", "Payments grouped into a NetSuite deposit", "Transfer from the clearing account", "Receive money per line")],
  },
  {
    key: "journals",
    label: "Journals",
    dest: "xero",
    fields: [
      f("number", "Journal #", "Narration Reference", []),
      f("date", "Date (posting period)", "Journal Date", []),
      f("lines", "Lines", "Journal Lines", []),
      f("memo", "Memo", "Narration", []),
    ],
    rules: [
      {
        id: "intercompany",
        label: "Intercompany lines",
        description: "Journals with lines in another subsidiary",
        suggested: "loan",
        options: [
          { value: "loan", label: "Balance on the intercompany loan account", hint: "Recommended" },
          { value: "skip", label: "Skip other-subsidiary lines" },
        ],
      },
      {
        id: "rounding",
        label: "Rounding differences",
        description: "Cent differences after tax rounding",
        suggested: "860",
        options: accountOptions(["860", "429"]),
      },
    ],
  },
  {
    key: "inventory-journals",
    label: "Inventory Journals",
    dest: "xero",
    fields: [
      f("fulfil", "Item Fulfillment", "Journal: COGS / Inventory", []),
      f("receipt", "Item Receipt", "Journal: Inventory / Accrued Purchases", []),
      f("adjust", "Inventory Adjustment", "Journal: Adjustment / Inventory", []),
    ],
    rules: [keep("Opening stock", "Inventory balance at cutover", "Arrives through the history (no extra journal)", "Post an opening balance")],
  },
  {
    key: "gojee-stock",
    label: "Stock & Serials",
    dest: "gojee",
    fields: [
      f("item", "Item", "Product", []),
      f("location", "Location", "Warehouse", []),
      f("qty", "On Hand", "Quantity", []),
      f("serial", "Serial Numbers", "Serial Numbers", []),
      f("cost", "Average Cost", "Unit Cost", []),
    ],
    rules: [keep("Stock journals", "Loading stock into Gojee", "No journal to Xero (balance already there)", "Post to Xero")],
  },
  {
    key: "gojee-jobs",
    label: "Jobs & WIP",
    dest: "gojee",
    fields: [
      f("job", "Project (job) name", "Job Name", []),
      f("customer", "Customer", "Client", []),
      f("status", "Project Status", "Job Status", []),
      f("dates", "Start / End Date", "Start / Due Date", []),
      f("pm", "Project Manager", "Job Manager", []),
      f("so", "Open Sales Order", "Job", ["Quote"]),
    ],
    rules: [
      {
        id: "wip",
        label: "Work in progress",
        description: "WIP per job is calculated, not mapped",
        suggested: "calc",
        options: [
          { value: "calc", label: "Cost to date − billed to date", hint: "Recommended" },
          { value: "balance", label: "Use the NetSuite WIP balance" },
        ],
      },
      keep("Open sales orders", "Sales orders not yet invoiced", "Create as Gojee jobs", "Create as Gojee quotes"),
    ],
  },
  {
    key: "gojee-tasks",
    label: "Job Tasks & Stages",
    dest: "gojee",
    fields: [
      f("name", "Task Name", "Stage Name", []),
      f("parent", "Parent Task", "Parent Stage", []),
      f("planned", "Planned Work (hrs)", "Estimated Hours", []),
      f("dates", "Start / End Date", "Start / Due Date", []),
    ],
    rules: [keep("Completed tasks", "Tasks already finished in NetSuite", "Import as completed stages", "Skip completed tasks")],
  },
  {
    key: "gojee-templates",
    label: "Job Templates",
    dest: "gojee",
    fields: [
      f("name", "Template Name", "Template Name", []),
      f("tasks", "Template Tasks", "Template Stages", []),
    ],
    rules: [
      // TODO(GOJEE-API): confirm Gojee supports job templates
      keep("Template support", "Partial fit — only if Gojee supports templates", "Import as Gojee job templates", "Skip templates"),
    ],
  },
  {
    key: "gojee-budgets",
    label: "Job Budgets",
    dest: "gojee",
    fields: [
      f("labor", "Budget category: Labor", "LAB Labour", ["OTH Other costs"]),
      f("materials", "Budget category: Materials", "MAT Materials (food & beverage)", ["OTH Other costs"]),
      f("sub", "Budget category: Subcontract", "SUB Subcontractors", ["OTH Other costs"]),
      f("equipment", "Budget category: Equipment", "EQP Equipment hire", ["OTH Other costs"]),
      f("expense", "Budget category: Expense", "OTH Other costs", []),
    ],
    rules: [keep("Unmatched categories", "NetSuite budget categories without a Gojee cost code", "Put into OTH Other costs", "Create a new cost code")],
  },
  {
    key: "gojee-cost",
    label: "Job Cost & Revenue",
    dest: "gojee",
    fields: [
      f("cost", "Transaction lines tagged to project", "Cost to date by cost code", []),
      f("revenue", "Invoices tagged to project", "Revenue to date", []),
      f("bill-link", "Bill line detail", "Link to Xero bill ID", []),
      f("inv-link", "Invoice line detail", "Link to Xero invoice ID", []),
    ],
    rules: [keep("Line detail", "Individual bill and invoice lines", "Summary in Gojee, detail linked to Xero", "Copy every line into Gojee")],
  },
  {
    key: "gojee-retention",
    label: "Retention",
    dest: "gojee",
    fields: [
      f("field", "custbody_retention (custom field)", "Retention Held", ["Retention invoice line"]),
      f("rate", "Retention %", "Retention Rate", []),
    ],
    rules: [keep("Source of retention", "Client-specific: custom field or a separate invoice line", "Read the custom field", "Read the invoice line")],
  },
  {
    key: "gojee-pos",
    label: "Open Purchase Orders",
    dest: "gojee",
    fields: [
      f("number", "PO Number", "Purchase Order Number", []),
      f("vendor", "Vendor", "Supplier", []),
      f("received", "Quantity Received", "Received", []),
    ],
    rules: [keep("Sending to Xero", "Gojee passes purchase orders on to Xero", "Gojee sends them after cutover", "Don't send")],
  },
  {
    key: "gojee-timesheets",
    label: "Timesheets (unbilled)",
    dest: "gojee",
    fields: [
      f("employee", "Employee", "Staff Member", []),
      f("job", "Project", "Job", []),
      f("task", "Project Task", "Job Stage", []),
      f("hours", "Hours", "Hours", []),
      f("date", "Date", "Date", []),
      f("billable", "Billable", "Billable", []),
    ],
    rules: [
      keep("Which entries", "timeBill records on open jobs", "Unbilled only (billed = false)", "All time entries"),
      keep("Payroll", "Time entries on open jobs", "Gojee only — not Xero payroll", "Also send to Xero payroll"),
    ],
  },
  {
    key: "gojee-schedule",
    label: "Staff Schedule",
    dest: "gojee",
    fields: [
      f("employee", "Employee", "Staff Member", []),
      f("job", "Project", "Job", []),
      f("dates", "Start / End Date", "Booking Dates", []),
      f("hours", "Allocated Hours", "Scheduled Hours", []),
    ],
    rules: [keep("Past allocations", "Resource allocations before cutover", "Future bookings only", "Import all allocations")],
  },
  {
    key: "gojee-staff",
    label: "Staff",
    dest: "gojee",
    fields: [
      f("employee", "Employee", "Staff Member (from Xero payroll)", []),
      f("email", "Email", "Match key", ["Employee ID"]),
    ],
    rules: [keep("Staff master", "Staff come from Xero payroll via the Gojee sync", "Link only — don't create staff", "Create staff in Gojee")],
  },
  {
    key: "gojee-rates",
    label: "Billing Rates",
    dest: "gojee",
    fields: [
      f("labor", "Labor cost on employee", "Staff Cost Rate", []),
      f("charge", "Project billing / charge rules", "Charge Rate", []),
      f("tiers", "Tiered / weekend uplift rules", "Separate charge rate", ["Ignore"]),
    ],
    rules: [keep("Complex charge rules", "Partial fit: NetSuite rate logic is richer than Gojee", "Simplify to a charge rate per role", "Skip complex rules")],
  },
]

interface SelectOption {
  value: string
  label: string
}

// Native select styled to match the design system — renders its value in the
// initial HTML (no hydration dependency) and supports grouped options
function MappingSelect({
  value,
  onChange,
  placeholder,
  options,
  groups,
  review = false,
  tall = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  options?: SelectOption[]
  groups?: { label: string; options: SelectOption[] }[]
  review?: boolean
  tall?: boolean
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${tall ? "h-10" : "h-9"} w-full cursor-pointer appearance-none truncate rounded-lg border bg-card px-3 pr-9 text-sm text-foreground shadow-sm outline-none transition-colors duration-200 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-ring/30 ${
        review && !value
          ? "border-amber-500/60 text-amber-700 dark:text-amber-400"
          : "border-border/60"
      }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {groups?.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  accounts: Database,
  segments: Split,
  customers: Users,
  vendors: Building2,
  items: Package,
  invoices: Receipt,
  bills: FileText,
  "credit-notes": FileMinus,
  "bill-credits": FilePlus,
  "invoice-payments": CreditCard,
  "bill-payments": Banknote,
  bank: Landmark,
  journals: BookOpen,
  "inventory-journals": Boxes,
  "gojee-stock": Warehouse,
  "gojee-jobs": Briefcase,
  "gojee-tasks": ListChecks,
  "gojee-templates": Copy,
  "gojee-budgets": PiggyBank,
  "gojee-cost": TrendingUp,
  "gojee-retention": Lock,
  "gojee-schedule": CalendarDays,
  "gojee-staff": UserCheck,
  "gojee-rates": BadgeDollarSign,
  "gojee-pos": ClipboardList,
  "gojee-timesheets": Clock,
}

/* ------------------------------------------------------------------------- */

export default function MapData() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Overrides only store deviations from the suggestion — empty means all-auto
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, string>>({})
  const [ruleOverrides, setRuleOverrides] = useState<Record<string, string>>({})
  const [accountOverrides, setAccountOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    setMounted(true)
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        setFieldOverrides(saved.fields ?? {})
        setRuleOverrides(saved.rules ?? {})
        setAccountOverrides(saved.accounts ?? {})
      }
    } catch {
      // corrupted storage — start clean
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fields: fieldOverrides, rules: ruleOverrides, accounts: accountOverrides }),
    )
  }, [fieldOverrides, ruleOverrides, accountOverrides, hydrated])

  const customCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of CATEGORIES) counts[cat.key] = 0
    for (const key of Object.keys(fieldOverrides)) counts[key.split(":")[0]] += 1
    for (const key of Object.keys(ruleOverrides)) counts[key.split(":")[0]] += 1
    counts["accounts"] += Object.keys(accountOverrides).length
    return counts
  }, [fieldOverrides, ruleOverrides, accountOverrides])

  // Ambiguous mappings the user has not resolved yet
  const reviewCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of CATEGORIES) {
      counts[cat.key] = cat.fields.filter((fl) => fl.needsReview && !fieldOverrides[`${cat.key}:${fl.id}`]).length
    }
    counts["accounts"] += SOURCE_ACCOUNTS.filter((a) => a.needsReview && !accountOverrides[a.code]).length
    return counts
  }, [fieldOverrides, accountOverrides])

  const totalCustom = Object.values(customCounts).reduce((a, b) => a + b, 0)
  const totalReview = Object.values(reviewCounts).reduce((a, b) => a + b, 0)
  const totalMappings =
    CATEGORIES.reduce((acc, c) => acc + c.fields.length + c.rules.length, 0) + SOURCE_ACCOUNTS.length

  const resetAll = () => {
    setFieldOverrides({})
    setRuleOverrides({})
    setAccountOverrides({})
  }

  const setOverride = (
    map: Record<string, string>,
    setMap: (m: Record<string, string>) => void,
    key: string,
    value: string,
    suggested: string,
  ) => {
    const next = { ...map }
    if (value === suggested) delete next[key]
    else next[key] = value
    setMap(next)
  }

  const handleNextStep = () => router.push("/dashboard/new-migration/validate")
  const handlePrevStep = () => router.push("/dashboard/new-migration/extract")

  /* --- small render helpers ------------------------------------------------ */

  const StatusBadge = ({ state }: { state: "auto" | "custom" | "skipped" | "review" }) => (
    <span
      key={state}
      className={`animate-google-scale-in inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        state === "auto"
          ? "bg-green-500/10 text-green-600"
          : state === "custom"
            ? "bg-primary/10 text-primary"
            : state === "review"
              ? "bg-amber-500/15 text-amber-600 animate-pulse"
              : "bg-amber-500/10 text-amber-600"
      }`}
    >
      {state === "auto" ? (
        <>
          <CheckCircle className="h-3 w-3" /> Auto
        </>
      ) : state === "custom" ? (
        <>
          <PenLine className="h-3 w-3" /> Custom
        </>
      ) : state === "review" ? (
        <>
          <AlertTriangle className="h-3 w-3" /> Needs review
        </>
      ) : (
        <>
          <SkipForward className="h-3 w-3" /> Skipped
        </>
      )}
    </span>
  )

  const ResetButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      title="Reset to suggested"
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
    >
      <RotateCcw className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/new-migration/extract"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="mr-2 h-8 w-8 rounded-full bg-card border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Extract
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text pb-1">New Migration: NetSuite to Xero + Gojee</h1>
            <p className="text-muted-foreground mt-1">
              Review the suggested mapping — every field, account and rule can be remapped to your preference
            </p>
          </div>

          <MigrationStepper step={3} />

          <Card className="google-card bg-card/65 backdrop-blur-md shadow-sm border border-border/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10"></div>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center text-xl font-bold tracking-tight text-foreground">
                    <Map className="mr-2.5 h-5 w-5 text-primary" />
                    Step 3: Map Data Fields
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-1">
                    We've suggested a mapping for everything — change any of it with the dropdowns
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {totalReview > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> {totalReview} need review
                    </span>
                  )}
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {totalCustom} <span className="text-muted-foreground font-normal">of {totalMappings}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">mappings customized</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAll}
                    disabled={totalCustom === 0}
                    className="rounded-lg border-border/60 text-xs"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset all
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* How mapping works */}
              <div className="animate-fade-in-up rounded-xl border border-border/50 bg-accent/40 p-4" style={{ animationFillMode: "both" }}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Auto-mapped by AI</div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        Everything marked <span className="font-semibold text-green-600">Auto</span> is matched and
                        ready — no action needed.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Needs your decision</div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        Highlighted rows marked{" "}
                        <span className="font-semibold text-amber-600">Needs review</span> couldn&apos;t be matched
                        confidently — pick the right target from the dropdown.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <PenLine className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Remap anything</div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        Change any dropdown to override the suggestion — rows turn{" "}
                        <span className="font-semibold text-primary">Custom</span>, with per-row reset or{" "}
                        <span className="font-semibold text-foreground">Reset all</span> above.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="accounts" className="w-full">
                <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
                  {/* Category rail — every category visible, no scrollbar */}
                  <TabsList className="h-auto w-full flex-col items-stretch justify-start gap-1 self-start rounded-xl border border-border/50 bg-muted/40 p-2 backdrop-blur-md lg:sticky lg:top-24">
                    {CATEGORIES.map((cat) => {
                      const CategoryIcon = CATEGORY_ICONS[cat.key]
                      return (
                        <TabsTrigger
                          key={cat.key}
                          value={cat.key}
                          className="w-full justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <CategoryIcon className="h-4 w-4 shrink-0 opacity-70" />
                            <span className="truncate">{cat.label}</span>
                          </span>
                          {reviewCounts[cat.key] > 0 ? (
                            <span className="inline-flex h-4 min-w-4 shrink-0 animate-pulse items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                              {reviewCounts[cat.key]}
                            </span>
                          ) : customCounts[cat.key] > 0 ? (
                            <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                              {customCounts[cat.key]}
                            </span>
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500/60" />
                          )}
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>

                  <div className="min-w-0">
                    {CATEGORIES.map((cat) => (
                  <TabsContent key={cat.key} value={cat.key} className="space-y-4">
                    {/* Field mapping */}
                    <div className="animate-fade-in-up rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6" style={{ animationFillMode: "both" }}>
                      <h3 className="mb-6 text-base font-semibold flex items-center text-foreground">
                        <Map className="mr-2.5 h-5 w-5 text-primary" />
                        Field Mapping
                      </h3>
                      <div className="space-y-1">
                        <div className="grid grid-cols-12 gap-3 border-b border-border/30 pb-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                          <div className="col-span-4">NetSuite Field</div>
                          <div className="col-span-1"></div>
                          <div className="col-span-5">{DEST_NAME[cat.dest]} Field</div>
                          <div className="col-span-2 text-right">Status</div>
                        </div>

                        {cat.fields.map((field, index) => {
                          const key = `${cat.key}:${field.id}`
                          const override = fieldOverrides[key]
                          const value = override ?? field.suggested
                          const state =
                            value === SKIP
                              ? "skipped"
                              : override
                                ? "custom"
                                : field.needsReview
                                  ? "review"
                                  : "auto"
                          return (
                            <div
                              key={field.id}
                              className={`animate-fade-in-up grid grid-cols-12 items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors duration-300 ${
                                state === "custom"
                                  ? "bg-accent/50"
                                  : state === "skipped"
                                    ? "bg-amber-500/5"
                                    : state === "review"
                                      ? "bg-amber-500/10 ring-1 ring-amber-500/40"
                                      : ""
                              }`}
                              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
                            >
                              <div className="col-span-4 flex items-center min-w-0">
                                <div className="mr-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal"></div>
                                <span className="truncate font-medium text-foreground">{field.source}</span>
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <MoveRight className="h-4 w-4 text-muted-foreground/50" />
                              </div>
                              <div className="col-span-5">
                                <MappingSelect
                                  value={value}
                                  review={state === "review"}
                                  placeholder={`Select ${DEST_NAME[cat.dest]} field…`}
                                  onChange={(v) =>
                                    setOverride(fieldOverrides, setFieldOverrides, key, v, field.suggested)
                                  }
                                  options={[
                                    ...(field.suggested
                                      ? [{ value: field.suggested, label: `${field.suggested} (suggested)` }]
                                      : []),
                                    ...field.alternates.map((alt) => ({ value: alt, label: alt })),
                                    { value: SKIP, label: "— Do not migrate this field" },
                                  ]}
                                />
                              </div>
                              <div className="col-span-2 flex items-center justify-end gap-1.5">
                                {(state === "custom" || state === "skipped") && (
                                  <ResetButton
                                    onClick={() =>
                                      setOverride(fieldOverrides, setFieldOverrides, key, field.suggested, field.suggested)
                                    }
                                  />
                                )}
                                <StatusBadge state={state} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Record-level account remapping — Chart of Accounts only */}
                    {cat.key === "accounts" && (
                      <div
                        className="animate-fade-in-up rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6"
                        style={{ animationDelay: "100ms", animationFillMode: "both" }}
                      >
                        <h3 className="mb-1 text-base font-semibold flex items-center text-foreground">
                          <Database className="mr-2.5 h-5 w-5 text-primary" />
                          Account Remapping
                        </h3>
                        <p className="mb-6 text-xs text-muted-foreground">
                          Choose the Xero account each NetSuite account will migrate into — the treatment below updates
                          with your selection
                        </p>
                        <div className="space-y-1">
                          <div className="grid grid-cols-12 gap-3 border-b border-border/30 pb-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                            <div className="col-span-4">NetSuite Account</div>
                            <div className="col-span-1"></div>
                            <div className="col-span-5">Xero Account</div>
                            <div className="col-span-2 text-right">Status</div>
                          </div>

                          {SOURCE_ACCOUNTS.map((account, index) => {
                            const override = accountOverrides[account.code]
                            const value = override ?? account.suggested
                            const target = value ? targetAccount(value) : undefined
                            const isCustom = Boolean(override)
                            const state = isCustom ? "custom" : account.needsReview ? "review" : "auto"
                            return (
                              <div
                                key={account.code}
                                className={`animate-fade-in-up rounded-lg px-2 py-2.5 transition-colors duration-300 ${
                                  state === "custom"
                                    ? "bg-accent/50"
                                    : state === "review"
                                      ? "bg-amber-500/10 ring-1 ring-amber-500/40"
                                      : ""
                                }`}
                                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
                              >
                                <div className="grid grid-cols-12 items-center gap-3 text-sm">
                                  <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                                    <span className="shrink-0 rounded bg-[hsl(var(--brand-teal)/0.12)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-teal">
                                      {account.code}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-foreground">{account.name}</div>
                                      <div className="text-[11px] text-muted-foreground">{account.type}</div>
                                    </div>
                                  </div>
                                  <div className="col-span-1 flex justify-center">
                                    <MoveRight className="h-4 w-4 text-muted-foreground/50" />
                                  </div>
                                  <div className="col-span-5">
                                    <MappingSelect
                                      value={value}
                                      review={state === "review"}
                                      tall
                                      placeholder="Choose Xero account…"
                                      onChange={(v) =>
                                        setOverride(
                                          accountOverrides,
                                          setAccountOverrides,
                                          account.code,
                                          v,
                                          account.suggested,
                                        )
                                      }
                                      groups={ACCOUNT_TYPE_ORDER.map((type) => ({
                                        label: type,
                                        options: TARGET_ACCOUNTS.filter((a) => a.type === type).map((a) => ({
                                          value: a.code,
                                          label: `${a.code} · ${a.name}${a.code === account.suggested ? " (suggested)" : ""}`,
                                        })),
                                      })).filter((g) => g.options.length > 0)}
                                    />
                                  </div>
                                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                                    {isCustom && (
                                      <ResetButton
                                        onClick={() =>
                                          setOverride(
                                            accountOverrides,
                                            setAccountOverrides,
                                            account.code,
                                            account.suggested,
                                            account.suggested,
                                          )
                                        }
                                      />
                                    )}
                                    <StatusBadge state={state} />
                                  </div>
                                </div>
                                {target ? (
                                  <div
                                    key={value}
                                    className="animate-google-fade-in mt-1.5 ml-[37px] text-[11px] text-muted-foreground"
                                  >
                                    Treated in Xero as{" "}
                                    <span className="font-semibold text-primary">{target.type}</span> · Tax code:{" "}
                                    <span className="font-semibold text-primary">{target.tax}</span>
                                  </div>
                                ) : (
                                  <div className="mt-1.5 ml-[37px] flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                                    <AlertTriangle className="h-3 w-3" />
                                    AI couldn&apos;t match this account — choose the Xero account it should migrate
                                    into
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Treatment rules */}
                    <div
                      className="animate-fade-in-up rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6"
                      style={{ animationDelay: "150ms", animationFillMode: "both" }}
                    >
                      <h3 className="mb-1 text-base font-semibold flex items-center text-foreground">
                        <Settings2 className="mr-2.5 h-5 w-5 text-primary" />
                        How {DEST_NAME[cat.dest]} Will Treat {cat.label}
                      </h3>
                      <p className="mb-6 text-xs text-muted-foreground">
                        Behavior applied during import — change any rule to control the outcome in {DEST_NAME[cat.dest]}
                      </p>
                      <div className="space-y-4">
                        {cat.rules.map((rule, index) => {
                          const key = `${cat.key}:${rule.id}`
                          const value = ruleOverrides[key] ?? rule.suggested
                          const isCustom = Boolean(ruleOverrides[key])
                          return (
                            <div
                              key={rule.id}
                              className={`animate-fade-in-up flex flex-col gap-3 rounded-lg px-2 py-2.5 sm:flex-row sm:items-center sm:justify-between transition-colors duration-300 ${
                                isCustom ? "bg-accent/50" : ""
                              }`}
                              style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
                            >
                              <div className="min-w-0 pr-4">
                                <div className="text-sm font-medium text-foreground">{rule.label}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{rule.description}</div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {isCustom && (
                                  <ResetButton
                                    onClick={() =>
                                      setOverride(ruleOverrides, setRuleOverrides, key, rule.suggested, rule.suggested)
                                    }
                                  />
                                )}
                                <div className="w-[280px]">
                                  <MappingSelect
                                    value={value}
                                    onChange={(v) =>
                                      setOverride(ruleOverrides, setRuleOverrides, key, v, rule.suggested)
                                    }
                                    options={rule.options.map((opt) => ({
                                      value: opt.value,
                                      label: `${opt.label}${opt.value === rule.suggested ? " (recommended)" : ""}`,
                                    }))}
                                  />
                                </div>
                                <StatusBadge state={isCustom ? "custom" : "auto"} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </TabsContent>
                    ))}
                  </div>
                </div>
              </Tabs>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t border-border/30 pt-6 mt-4">
              <Button
                variant="outline"
                onClick={handlePrevStep}
                className="rounded-xl border-border bg-card hover:bg-muted text-foreground transition-all duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-4">
                {totalReview > 0 ? (
                  <span className="animate-google-fade-in hidden items-center gap-1.5 text-xs font-medium text-amber-600 sm:inline-flex">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Resolve the {totalReview} highlighted mapping{totalReview === 1 ? "" : "s"} to continue
                  </span>
                ) : totalCustom > 0 ? (
                  <span className="animate-google-fade-in hidden text-xs text-muted-foreground sm:inline">
                    <span className="font-semibold text-primary">{totalCustom}</span> custom mapping
                    {totalCustom === 1 ? "" : "s"} will be applied during import
                  </span>
                ) : null}
                <NextButton to="Validate" onClick={handleNextStep} disabled={totalReview > 0} />
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>


    </div>
  )
}
