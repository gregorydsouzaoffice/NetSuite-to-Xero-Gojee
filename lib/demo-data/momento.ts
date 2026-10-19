/**
 * Invented demo data for Momento Hospitality Group (NetSuite OneWorld, AUD).
 * Names follow the BRD's acceptance tests; every number is made up.
 * All screens and reports read from here so figures agree everywhere.
 */
import type { NsTypeCode } from "../mapping/transaction-types"
import { CHART_SIZE } from "./chart"
import type { SourceJournal } from "../mapping/intercompany"
import type { GojeeAccount, SegmentTarget, Subsidiary, XeroIdentity, XeroOrg } from "../types"

export const CLIENT_NAME = "Momento Hospitality Group"

export const XERO_IDENTITY: XeroIdentity = {
  name: "Priya Raman",
  email: "priya.raman@momentohg.com.au",
  xeroUserId: "c9a1f6e2-41d7-4bd2-9f3e-7a2d5b0e8c11",
}

export const NETSUITE_ACCOUNT = {
  accountId: "7412953",
  companyName: "Momento Hospitality Group Pty Ltd",
  login: "priya.raman@momentohg.com.au",
  roles: [
    { id: "3", name: "Administrator", hasRestWebServices: true },
    { id: "1047", name: "MHG – Finance Manager", hasRestWebServices: false },
    { id: "15", name: "Employee Center", hasRestWebServices: false },
  ],
}

// ---------------------------------------------------------------------------
// Subsidiary tree

export const SUBSIDIARIES: Subsidiary[] = [
  { id: "1", name: "Momento Hospitality Group Pty Ltd", parentId: null, kind: "subsidiary", currency: "AUD", country: "AU", suggestedTenantId: "xt-momento", industry: "Holding company" },
  { id: "c1", name: "Momento Hospitality Group (Consolidated)", parentId: "1", kind: "consolidated", currency: "AUD", country: "AU" },
  { id: "2", name: "Hillys Pizzeria Pty Ltd", parentId: "1", kind: "subsidiary", currency: "AUD", country: "AU", suggestedTenantId: "xt-hillys", industry: "Pizzeria & catering" },
  { id: "3", name: "VICE Pty Ltd", parentId: "1", kind: "subsidiary", currency: "AUD", country: "AU", suggestedTenantId: "xt-vice", industry: "Bars & venues" },
  { id: "c3", name: "VICE Pty Ltd (Consolidated)", parentId: "3", kind: "consolidated", currency: "AUD", country: "AU" },
  { id: "4", name: "BVH Operations Mgt Pty Ltd", parentId: "3", kind: "subsidiary", currency: "AUD", country: "AU", suggestedTenantId: "xt-bvh", industry: "Venue management" },
  { id: "5", name: "Coranton Pty Ltd", parentId: "1", kind: "subsidiary", currency: "AUD", country: "AU", suggestedTenantId: "xt-coranton", industry: "Coffee roasting & wholesale" },
  { id: "6", name: "DWC Holdings Pty Ltd", parentId: "1", kind: "subsidiary", currency: "AUD", country: "AU", suggestedTenantId: "xt-dwch", industry: "Holding company" },
  { id: "c6", name: "DWC Holdings Pty Ltd (Consolidated)", parentId: "6", kind: "consolidated", currency: "AUD", country: "AU" },
  { id: "7", name: "DWC Trading Pty Ltd", parentId: "6", kind: "subsidiary", currency: "AUD", country: "AU", suggestedTenantId: "xt-dwct", industry: "Function centre" },
  { id: "8", name: "HST Hospitality Pty Ltd", parentId: "1", kind: "subsidiary", currency: "AUD", country: "AU", suggestedTenantId: "xt-hst", industry: "Hotel restaurant" },
  { id: "e1", name: "Momento Elimination", parentId: "1", kind: "elimination", currency: "AUD", country: "AU" },
]

export const SUBSIDIARY_BY_ID = Object.fromEntries(SUBSIDIARIES.map((s) => [s.id, s])) as Record<string, Subsidiary>

/** Pre-selected on the Entities screen */
export const DEFAULT_SELECTED = ["2", "3", "4", "5", "7", "8"]

/** Short names used in tight UI spaces */
export function shortName(subsidiaryId: string): string {
  const name = SUBSIDIARY_BY_ID[subsidiaryId]?.name ?? subsidiaryId
  return name.replace(/ Pty Ltd$/, "")
}

// ---------------------------------------------------------------------------
// Xero orgs the user can authorise (created by the client beforehand, R-30)

export const XERO_ORGS: XeroOrg[] = [
  { tenantId: "xt-hillys", name: "Hillys Pizzeria Pty Ltd", baseCurrency: "AUD", shortCode: "!hP7wQ", financialYearEnd: "30 June", gstBasis: "Accrual", enabledCurrencies: ["AUD"] },
  { tenantId: "xt-vice", name: "VICE Pty Ltd", baseCurrency: "AUD", shortCode: "!vC2kL", financialYearEnd: "30 June", gstBasis: "Accrual", enabledCurrencies: ["AUD"] },
  { tenantId: "xt-bvh", name: "BVH Operations Mgt Pty Ltd", baseCurrency: "AUD", shortCode: "!bV9mR", financialYearEnd: "30 June", gstBasis: "Accrual", enabledCurrencies: ["AUD"] },
  { tenantId: "xt-coranton", name: "Coranton Pty Ltd", baseCurrency: "AUD", shortCode: "!cR4tN", financialYearEnd: "30 June", gstBasis: "Accrual", enabledCurrencies: ["AUD", "USD", "NZD"] },
  { tenantId: "xt-dwct", name: "DWC Trading Pty Ltd", baseCurrency: "AUD", shortCode: "!dT6wC", financialYearEnd: "30 June", gstBasis: "Accrual", enabledCurrencies: ["AUD"] },
  { tenantId: "xt-hst", name: "HST Hospitality Pty Ltd", baseCurrency: "AUD", shortCode: "!hS3tH", financialYearEnd: "30 June", gstBasis: "Accrual", enabledCurrencies: ["AUD"] },
  { tenantId: "xt-momento", name: "Momento Hospitality Group Pty Ltd", baseCurrency: "AUD", shortCode: "!mM1hG", financialYearEnd: "30 June", gstBasis: "Accrual", enabledCurrencies: ["AUD"] },
  { tenantId: "xt-dwch", name: "DWC Holdings Pty Ltd", baseCurrency: "AUD", shortCode: "!dH8wh", financialYearEnd: "30 June", gstBasis: "Accrual", enabledCurrencies: ["AUD"] },
  { tenantId: "xt-demo", name: "Demo Company (AU)", baseCurrency: "AUD", shortCode: "!dEm0A", financialYearEnd: "30 June", gstBasis: "Accrual", enabledCurrencies: ["AUD"] },
]

export const XERO_ORG_BY_ID = Object.fromEntries(XERO_ORGS.map((o) => [o.tenantId, o])) as Record<string, XeroOrg>

/** Ticked by default on the Xero consent screen */
export const DEFAULT_AUTHORISED_ORGS = ["xt-hillys", "xt-vice", "xt-bvh", "xt-coranton", "xt-dwct", "xt-hst"]

// ---------------------------------------------------------------------------
// Gojee accounts, as the (mock) Gojee API would report them by Xero tenantId.
// Two deliberate problems for the demo:
//  • HST Hospitality has no Gojee account yet
//  • DWC Trading's Gojee account was set up against the DWC Holdings Xero org

export const GOJEE_ACCOUNTS: GojeeAccount[] = [
  { id: "gj-10231", name: "Hillys Pizzeria", linkedTenantId: "xt-hillys", connectedToXero: false },
  { id: "gj-10232", name: "VICE", linkedTenantId: "xt-vice", connectedToXero: false },
  { id: "gj-10233", name: "BVH Operations", linkedTenantId: "xt-bvh", connectedToXero: false },
  { id: "gj-10234", name: "Coranton Coffee", linkedTenantId: "xt-coranton", connectedToXero: false },
  { id: "gj-10236", name: "DWC Trading", linkedTenantId: "xt-dwch", connectedToXero: false },
  { id: "gj-10230", name: "Momento Group", linkedTenantId: "xt-momento", connectedToXero: false },
]

// ---------------------------------------------------------------------------
// Record counts (full history, Jul 2022 – Sep 2026) per subsidiary

const BASE_PROFILE: Record<NsTypeCode, number> = {
  CustInvc: 7200,
  VendBill: 15600,
  CustCred: 360,
  VendCred: 270,
  CustPymt: 6750,
  VendPymt: 7800,
  Check: 1560,
  Deposit: 4440,
  CashRfnd: 90,
  Journal: 2940,
  Transfer: 570,
  InvAdjst: 480,
  ItemRcpt: 6300,
  ItemShip: 6900,
  FxReval: 0,
  SalesOrd: 8,
  PurchOrd: 12,
  RtnAuth: 2,
}

const SCALE: Record<string, number> = { "1": 0.08, "2": 1, "3": 2.2, "4": 0.4, "5": 0.85, "6": 0.05, "7": 0.65, "8": 1.1 }
const NO_INVENTORY = new Set(["1", "4", "6"])
const OPEN_ONLY: NsTypeCode[] = ["SalesOrd", "PurchOrd", "RtnAuth"]

export function recordCounts(subsidiaryId: string): Record<NsTypeCode, number> {
  const scale = SCALE[subsidiaryId] ?? 0
  const out = {} as Record<NsTypeCode, number>
  for (const [code, base] of Object.entries(BASE_PROFILE) as [NsTypeCode, number][]) {
    let n = OPEN_ONLY.includes(code) ? Math.round(base * Math.max(scale, 0.25)) : Math.round(base * scale)
    if (NO_INVENTORY.has(subsidiaryId) && ["InvAdjst", "ItemRcpt", "ItemShip", "PurchOrd"].includes(code)) n = 0
    out[code] = n
  }
  if (subsidiaryId === "5") out.FxReval = 18
  if (subsidiaryId === "4" || subsidiaryId === "1" || subsidiaryId === "6") out.SalesOrd = 0
  return out
}

/** Foreign-currency records flagged by the pre-scan (R-32) */
export const FOREIGN_CURRENCY: Record<string, { currency: string; count: number }[]> = {
  "5": [
    { currency: "USD", count: 214 },
    { currency: "NZD", count: 37 },
  ],
}

export const MASTER_COUNTS: Record<string, { accounts: number; customers: number; vendors: number; items: number }> = {
  "1": { accounts: CHART_SIZE, customers: 4, vendors: 31, items: 0 },
  "2": { accounts: CHART_SIZE, customers: 312, vendors: 148, items: 96 },
  "3": { accounts: CHART_SIZE, customers: 488, vendors: 236, items: 154 },
  "4": { accounts: CHART_SIZE, customers: 22, vendors: 117, items: 0 },
  "5": { accounts: CHART_SIZE, customers: 406, vendors: 89, items: 61 },
  "6": { accounts: CHART_SIZE, customers: 2, vendors: 12, items: 0 },
  "7": { accounts: CHART_SIZE, customers: 264, vendors: 102, items: 48 },
  "8": { accounts: CHART_SIZE, customers: 371, vendors: 163, items: 88 },
}

// ---------------------------------------------------------------------------
// Segments (section 5)

export interface SegmentDef {
  id: string
  label: string
  values: string[]
  defaultTarget: SegmentTarget
  editable: boolean
  note?: string
}

export const SEGMENTS: SegmentDef[] = [
  { id: "subsidiary", label: "Subsidiary", values: ["9 subsidiaries"], defaultTarget: "separate-org", editable: false, note: "Paired with its Gojee account. (Consolidated) nodes are not migrated." },
  { id: "department", label: "Department (cost centre)", values: ["Kitchen", "Front of House", "Delivery", "Catering", "Administration"], defaultTarget: "tracking-1", editable: true },
  { id: "location", label: "Location", values: ["Fitzroy", "Richmond", "South Yarra", "Docklands", "St Kilda", "Melbourne CBD"], defaultTarget: "tracking-2", editable: true, note: "Freed up because jobs move to Gojee" },
  { id: "project", label: "Project / Job", values: ["37 jobs (21 open)"], defaultTarget: "gojee-job", editable: true, note: "Open jobs and WIP at cutover only" },
  { id: "channel", label: "Channel (custom segment)", values: ["Dine-in", "Delivery", "Catering"], defaultTarget: "account-split", editable: true, note: "One account per channel on the affected lines" },
  { id: "class", label: "Class (product line)", values: ["Food", "Beverage", "Packaging", "Equipment", "Catering"], defaultTarget: "item-codes", editable: true },
  { id: "region", label: "Region / sales rep", values: ["VIC Metro", "VIC Regional", "NSW", "Corporate accounts"], defaultTarget: "contact-groups", editable: true },
  { id: "items", label: "Items, on-hand stock, serials", values: ["447 items"], defaultTarget: "gojee-inventory", editable: false, note: "Plus the inventory account balance in Xero" },
  { id: "time", label: "Time entries", values: ["Open jobs only"], defaultTarget: "gojee-timesheets", editable: false },
  { id: "history", label: "Invoices, bills, payments, journals", values: ["Full history"], defaultTarget: "xero-only", editable: false },
]

export const SEGMENT_TARGET_LABEL: Record<SegmentTarget, string> = {
  "separate-org": "Separate Xero org",
  "tracking-1": "Xero tracking category 1",
  "tracking-2": "Xero tracking category 2",
  "account-split": "Split in the Xero chart of accounts",
  "item-codes": "Xero item codes",
  "contact-groups": "Xero contact groups",
  "gojee-job": "Gojee job",
  "gojee-inventory": "Gojee inventory",
  "gojee-timesheets": "Gojee timesheets",
  "xero-only": "Xero only",
  memo: "Memo text",
  drop: "Drop",
}

export const EDITABLE_SEGMENT_TARGETS: SegmentTarget[] = [
  "tracking-1",
  "tracking-2",
  "account-split",
  "item-codes",
  "contact-groups",
  "gojee-job",
  "memo",
  "drop",
]

// ---------------------------------------------------------------------------
// Chart of accounts mapping (NetSuite OneWorld has one shared chart)

export interface XeroAccountOption {
  code: string
  name: string
  type: string
  create?: boolean
}

export const XERO_ACCOUNTS: XeroAccountOption[] = [
  { code: "095", name: "Undeposited Funds Clearing", type: "Bank", create: true },
  { code: "090", name: "CBA Operating Account", type: "Bank", create: true },
  { code: "091", name: "NAB Savings Account", type: "Bank", create: true },
  { code: "201", name: "Sales – Dine-in", type: "Revenue", create: true },
  { code: "202", name: "Sales – Delivery", type: "Revenue", create: true },
  { code: "203", name: "Sales – Catering", type: "Revenue", create: true },
  { code: "211", name: "Beverage Sales – Dine-in", type: "Revenue", create: true },
  { code: "212", name: "Beverage Sales – Delivery", type: "Revenue", create: true },
  { code: "213", name: "Beverage Sales – Catering", type: "Revenue", create: true },
  { code: "260", name: "Other Revenue", type: "Revenue" },
  { code: "270", name: "Interest Income", type: "Revenue" },
  { code: "310", name: "Cost of Goods Sold", type: "Direct Costs" },
  { code: "400", name: "Advertising", type: "Expense" },
  { code: "404", name: "Bank Fees", type: "Expense" },
  { code: "406", name: "Delivery Platform Commission", type: "Expense", create: true },
  { code: "416", name: "Depreciation", type: "Expense" },
  { code: "429", name: "General Expenses", type: "Expense" },
  { code: "433", name: "Insurance", type: "Expense" },
  { code: "445", name: "Light, Power, Heating", type: "Expense" },
  { code: "469", name: "Rent", type: "Expense" },
  { code: "473", name: "Repairs and Maintenance", type: "Expense" },
  { code: "477", name: "Wages and Salaries", type: "Expense" },
  { code: "478", name: "Superannuation", type: "Expense" },
  { code: "498", name: "Unrealised Currency Gains", type: "Expense" },
  { code: "499", name: "Realised Currency Gains", type: "Expense" },
  { code: "610", name: "Accounts Receivable", type: "Current Asset" },
  { code: "620", name: "Prepayments", type: "Current Asset" },
  { code: "630", name: "Inventory", type: "Inventory" },
  { code: "640", name: "Work in Progress", type: "Current Asset", create: true },
  { code: "715", name: "Kitchen Equipment", type: "Fixed Asset", create: true },
  { code: "716", name: "Less Accumulated Depreciation on Kitchen Equipment", type: "Fixed Asset", create: true },
  { code: "1810", name: "Intercompany Loans (one per counterparty)", type: "Current Asset", create: true },
  { code: "800", name: "Accounts Payable", type: "Current Liability" },
  { code: "805", name: "Accrued Purchases", type: "Current Liability", create: true },
  { code: "820", name: "GST", type: "Current Liability" },
  { code: "825", name: "PAYG Withholdings Payable", type: "Current Liability" },
  { code: "826", name: "Superannuation Payable", type: "Current Liability" },
  { code: "835", name: "Gift Vouchers Liability", type: "Current Liability", create: true },
  { code: "860", name: "Rounding", type: "Current Liability" },
  { code: "950", name: "Share Capital", type: "Equity", create: true },
  { code: "960", name: "Retained Earnings", type: "Equity" },
]

export const XERO_ACCOUNT_BY_CODE = Object.fromEntries(XERO_ACCOUNTS.map((a) => [a.code, a])) as Record<string, XeroAccountOption>

export type MatchKind = "exact" | "name" | "type" | "split" | "review"

export interface AccountMapRow {
  ns: string
  name: string
  type: string
  suggested: string // Xero code, "split:channel", or "" when it needs review
  match: MatchKind
  system?: SystemAccountKey
  note?: string
}

export type SystemAccountKey =
  | "receivables"
  | "payables"
  | "gst"
  | "retained"
  | "undeposited"
  | "inventory"
  | "wip"
  | "rounding"

export const SYSTEM_ACCOUNTS: { key: SystemAccountKey; label: string; ns: string; xero: string; why: string }[] = [
  { key: "receivables", label: "Accounts receivable", ns: "1100", xero: "610", why: "Control account for invoices and credit notes" },
  { key: "payables", label: "Accounts payable", ns: "2000", xero: "800", why: "Control account for bills and bill credits" },
  { key: "gst", label: "GST", ns: "2300", xero: "820", why: "Xero holds GST collected and paid in one account" },
  { key: "retained", label: "Retained earnings", ns: "3100", xero: "960", why: "Year-end close target" },
  { key: "undeposited", label: "Undeposited funds clearing", ns: "1050", xero: "095", why: "Deposits become transfers from this clearing bank account" },
  { key: "inventory", label: "Inventory", ns: "1300", xero: "630", why: "Balance only — items are untracked in Xero; Gojee holds stock" },
  { key: "wip", label: "Work in progress", ns: "1350", xero: "640", why: "Reconciled against Gojee job WIP at cutover" },
  { key: "rounding", label: "Rounding", ns: "9999", xero: "860", why: "Named account for rounding differences (R-40)" },
]

export const ACCOUNT_MAP: AccountMapRow[] = [
  { ns: "1000", name: "CBA Operating Account", type: "Bank", suggested: "090", match: "name" },
  { ns: "1010", name: "NAB Savings Account", type: "Bank", suggested: "091", match: "name" },
  { ns: "1050", name: "Undeposited Funds", type: "Other Current Asset", suggested: "095", match: "exact", system: "undeposited" },
  { ns: "1100", name: "Accounts Receivable", type: "Accounts Receivable", suggested: "610", match: "exact", system: "receivables" },
  { ns: "1200", name: "Prepayments", type: "Other Current Asset", suggested: "620", match: "exact" },
  { ns: "1300", name: "Inventory Asset", type: "Other Current Asset", suggested: "630", match: "name", system: "inventory" },
  { ns: "1350", name: "Work in Progress", type: "Other Current Asset", suggested: "640", match: "exact", system: "wip" },
  { ns: "1500", name: "Kitchen Equipment", type: "Fixed Asset", suggested: "715", match: "exact" },
  { ns: "1510", name: "Acc. Depn – Kitchen Equipment", type: "Fixed Asset", suggested: "716", match: "name" },
  { ns: "1810", name: "Intercompany Loans", type: "Other Current Asset", suggested: "1810", match: "exact", note: "One Xero account per counterparty, e.g. 1810-BVH" },
  { ns: "2000", name: "Accounts Payable", type: "Accounts Payable", suggested: "800", match: "exact", system: "payables" },
  { ns: "2100", name: "Accrued Purchases", type: "Other Current Liability", suggested: "805", match: "exact", note: "Used by item receipt journals" },
  { ns: "2300", name: "GST Payable", type: "Other Current Liability", suggested: "820", match: "name", system: "gst" },
  { ns: "2310", name: "GST Paid", type: "Other Current Liability", suggested: "820", match: "type", note: "Merged into Xero's single GST account" },
  { ns: "2400", name: "PAYG Withholding Payable", type: "Other Current Liability", suggested: "825", match: "name" },
  { ns: "2410", name: "Superannuation Payable", type: "Other Current Liability", suggested: "826", match: "exact" },
  { ns: "2450", name: "Gift Vouchers Liability", type: "Other Current Liability", suggested: "", match: "review", note: "No equivalent in the Xero chart" },
  { ns: "3000", name: "Share Capital", type: "Equity", suggested: "950", match: "exact" },
  { ns: "3100", name: "Retained Earnings", type: "Equity", suggested: "960", match: "exact", system: "retained" },
  { ns: "4000", name: "Food Sales", type: "Income", suggested: "split:channel", match: "split", note: "Channel → 201 Dine-in / 202 Delivery / 203 Catering" },
  { ns: "4100", name: "Beverage Sales", type: "Income", suggested: "split:channel", match: "split", note: "Channel → 211 / 212 / 213" },
  { ns: "4500", name: "Catering Services", type: "Income", suggested: "203", match: "name" },
  { ns: "4900", name: "Interest Income", type: "Other Income", suggested: "270", match: "exact" },
  { ns: "5000", name: "Cost of Goods Sold – Food", type: "Cost of Goods Sold", suggested: "310", match: "type" },
  { ns: "5100", name: "Cost of Goods Sold – Beverage", type: "Cost of Goods Sold", suggested: "310", match: "type" },
  { ns: "6100", name: "Wages & Salaries", type: "Expense", suggested: "477", match: "name" },
  { ns: "6110", name: "Superannuation", type: "Expense", suggested: "478", match: "exact" },
  { ns: "6200", name: "Rent", type: "Expense", suggested: "469", match: "exact" },
  { ns: "6300", name: "Electricity & Gas", type: "Expense", suggested: "445", match: "type" },
  { ns: "6400", name: "Repairs & Maintenance", type: "Expense", suggested: "473", match: "name" },
  { ns: "6500", name: "Advertising & Marketing", type: "Expense", suggested: "400", match: "name" },
  { ns: "6600", name: "Delivery Platform Fees", type: "Expense", suggested: "", match: "review", note: "Uber Eats / DoorDash commission" },
  { ns: "6700", name: "Bank Fees", type: "Expense", suggested: "404", match: "exact" },
  { ns: "6800", name: "Insurance", type: "Expense", suggested: "433", match: "exact" },
  { ns: "6990", name: "Cash Over/Short", type: "Expense", suggested: "", match: "review", note: "POS till differences" },
  { ns: "8000", name: "Depreciation", type: "Other Expense", suggested: "416", match: "exact" },
  { ns: "8150", name: "Realised FX Gain/Loss", type: "Other Expense", suggested: "499", match: "name" },
  { ns: "8160", name: "Unrealised FX Gain/Loss", type: "Other Expense", suggested: "498", match: "name", note: "Revaluations are not recreated; reconciling journal per period" },
  { ns: "9999", name: "Rounding", type: "Other Expense", suggested: "860", match: "exact", system: "rounding" },
]

/** What the reviewer would typically pick for the rows that need review */
export const REVIEW_HINTS: Record<string, string> = { "2450": "835", "6600": "406", "6990": "429" }

export interface TaxMapRow {
  ns: string
  description: string
  rate: string
  sales: string
  purchases: string
  match: MatchKind
}

export const XERO_TAX_TYPES = [
  { code: "OUTPUT", name: "GST on Income (10%)" },
  { code: "INPUT", name: "GST on Expenses (10%)" },
  { code: "EXEMPTOUTPUT", name: "GST Free Income" },
  { code: "EXEMPTEXPENSES", name: "GST Free Expenses" },
  { code: "INPUTTAXED", name: "Input Taxed" },
  { code: "EXEMPTEXPORT", name: "GST Free Exports" },
  { code: "CAPEXINPUT", name: "GST on Capital (10%)" },
  { code: "GSTONIMPORTS", name: "GST on Imports" },
  { code: "BASEXCLUDED", name: "BAS Excluded" },
]

export const TAX_MAP: TaxMapRow[] = [
  { ns: "GST_AU", description: "GST 10%", rate: "10%", sales: "OUTPUT", purchases: "INPUT", match: "exact" },
  { ns: "FRE_AU", description: "GST-free", rate: "0%", sales: "EXEMPTOUTPUT", purchases: "EXEMPTEXPENSES", match: "exact" },
  { ns: "INP_AU", description: "Input taxed", rate: "0%", sales: "INPUTTAXED", purchases: "INPUTTAXED", match: "exact" },
  { ns: "EXP_AU", description: "Export (GST-free)", rate: "0%", sales: "EXEMPTEXPORT", purchases: "EXEMPTEXPENSES", match: "exact" },
  { ns: "CAP_AU", description: "Capital acquisitions", rate: "10%", sales: "OUTPUT", purchases: "CAPEXINPUT", match: "exact" },
  { ns: "IMP_AU", description: "Imports – GST paid", rate: "10%", sales: "BASEXCLUDED", purchases: "GSTONIMPORTS", match: "name" },
  { ns: "NR_AU", description: "Not reportable", rate: "0%", sales: "BASEXCLUDED", purchases: "BASEXCLUDED", match: "exact" },
  { ns: "UNDEF_AU", description: "Undefined (legacy)", rate: "–", sales: "", purchases: "", match: "review" },
]

export interface ItemMapRow {
  internalId: string
  itemId: string
  name: string
  type: "InvtPart" | "NonInvtPart" | "Service" | "Assembly"
  classPrefix: string
  className: string
  serialized?: boolean
  subsidiaries: string[]
}

export const ITEMS: ItemMapRow[] = [
  { internalId: "2201", itemId: "Dough Ball 250g", name: "Pizza dough ball 250g", type: "Assembly", classPrefix: "FD", className: "Food", subsidiaries: ["2", "7", "8"] },
  { internalId: "2202", itemId: "Mozzarella 2kg", name: "Fior di latte mozzarella 2kg", type: "InvtPart", classPrefix: "FD", className: "Food", subsidiaries: ["2", "3", "7", "8"] },
  { internalId: "2203", itemId: "Passata 10kg", name: "Tomato passata 10kg tin", type: "InvtPart", classPrefix: "FD", className: "Food", subsidiaries: ["2", "8"] },
  { internalId: "2204", itemId: "Flour 00 25kg", name: "Caputo 00 flour 25kg", type: "InvtPart", classPrefix: "FD", className: "Food", subsidiaries: ["2", "7"] },
  { internalId: "2205", itemId: "Olive Oil 20L", name: "Extra virgin olive oil 20L", type: "InvtPart", classPrefix: "FD", className: "Food", subsidiaries: ["2", "3", "8"] },
  { internalId: "2310", itemId: "Peroni 24pk", name: "Peroni Nastro Azzurro 24 × 330ml", type: "InvtPart", classPrefix: "BV", className: "Beverage", subsidiaries: ["2", "3", "7", "8"] },
  { internalId: "2311", itemId: "Nero d'Avola 750", name: "Nero d'Avola 750ml", type: "InvtPart", classPrefix: "BV", className: "Beverage", subsidiaries: ["3", "8"] },
  { internalId: "2312", itemId: "Espresso Blend 1kg", name: "Coranton espresso blend 1kg", type: "InvtPart", classPrefix: "BV", className: "Beverage", subsidiaries: ["5", "2", "3"] },
  { internalId: "2410", itemId: "Pizza Box 12in", name: "Pizza box 12 inch (100)", type: "InvtPart", classPrefix: "PK", className: "Packaging", subsidiaries: ["2"] },
  { internalId: "2510", itemId: "Oven Moretti S100", name: "Moretti Forni S100E deck oven", type: "InvtPart", classPrefix: "EQ", className: "Equipment", serialized: true, subsidiaries: ["2", "8"] },
  { internalId: "2511", itemId: "Commercial Coffee Grinder Robur S", name: "Mazzer Robur S electronic grinder", type: "InvtPart", classPrefix: "EQ", className: "Equipment", serialized: true, subsidiaries: ["5"] },
  { internalId: "2610", itemId: "Catering Service", name: "Catering service (per head)", type: "Service", classPrefix: "CT", className: "Catering", subsidiaries: ["2", "7"] },
  { internalId: "2611", itemId: "Delivery Fee", name: "Delivery fee", type: "NonInvtPart", classPrefix: "CT", className: "Catering", subsidiaries: ["2", "3"] },
]

export interface ContactRow {
  name: string
  kind: "Customer" | "Vendor"
  region: string
  subsidiaries: string[]
  match: "new" | "existing"
}

export const CONTACTS: ContactRow[] = [
  { name: "Crown Melbourne Events", kind: "Customer", region: "Corporate accounts", subsidiaries: ["2", "7"], match: "new" },
  { name: "Uber Eats Australia", kind: "Customer", region: "VIC Metro", subsidiaries: ["2", "3", "8"], match: "new" },
  { name: "DoorDash Australia", kind: "Customer", region: "VIC Metro", subsidiaries: ["2", "8"], match: "new" },
  { name: "Melbourne Racing Club", kind: "Customer", region: "Corporate accounts", subsidiaries: ["7"], match: "new" },
  { name: "Geelong Wine Bar Co", kind: "Customer", region: "VIC Regional", subsidiaries: ["5"], match: "new" },
  { name: "Sydney Espresso Collective", kind: "Customer", region: "NSW", subsidiaries: ["5"], match: "new" },
  { name: "Bidfood Australia", kind: "Vendor", region: "VIC Metro", subsidiaries: ["2", "3", "7", "8"], match: "new" },
  { name: "PFD Food Services", kind: "Vendor", region: "VIC Metro", subsidiaries: ["2", "8"], match: "new" },
  { name: "Lion Beer Australia", kind: "Vendor", region: "VIC Metro", subsidiaries: ["3", "8"], match: "new" },
  { name: "Origin Energy", kind: "Vendor", region: "VIC Metro", subsidiaries: ["2", "3", "4", "5", "7", "8"], match: "existing" },
  { name: "Café Imports (USD)", kind: "Vendor", region: "Corporate accounts", subsidiaries: ["5"], match: "new" },
]

// ---------------------------------------------------------------------------
// Intercompany journal from the BRD (R-21)

export const INV36502: SourceJournal = {
  tranId: "INV36502",
  date: "2023-05-29",
  memo: "Bring VICE ledger details across to BVH Operations Mgt",
  headerSubsidiaryId: "3",
  lines: [
    { subsidiaryId: "3", account: "6100", accountName: "Wages & Salaries", debit: 0, credit: 18450 },
    { subsidiaryId: "3", account: "6200", accountName: "Rent", debit: 0, credit: 6800 },
    { subsidiaryId: "3", account: "6300", accountName: "Electricity & Gas", debit: 0, credit: 1236.55 },
    { subsidiaryId: "4", account: "6100", accountName: "Wages & Salaries", debit: 18450, credit: 0 },
    { subsidiaryId: "4", account: "6200", accountName: "Rent", debit: 6800, credit: 0 },
    { subsidiaryId: "4", account: "6300", accountName: "Electricity & Gas", debit: 1236.55, credit: 0 },
  ],
}

const LOAN_SUFFIX: Record<string, string> = { "1": "MHG", "2": "HIL", "3": "VICE", "4": "BVH", "5": "COR", "6": "DWCH", "7": "DWCT", "8": "HST" }

export function intercompanyLoanAccount(subsidiaryId: string, counterparty: string) {
  return {
    account: `1810-${LOAN_SUFFIX[counterparty] ?? counterparty}`,
    accountName: `Intercompany Loan – ${shortName(counterparty)}`,
  }
}

// ---------------------------------------------------------------------------
// Other clients, for the dashboard's "All clients" tab (R-18)

export const OTHER_CLIENTS = [
  { client: "Bayside Dental Group", pairs: 3, stage: "Signed off", status: "complete" as const, updated: "2026-09-12", health: { netsuite: "disconnected", xero: "disconnected", gojee: "connected" } },
  { client: "Kestrel Electrical Services", pairs: 2, stage: "Gojee load", status: "running" as const, updated: "2026-10-18", health: { netsuite: "connected", xero: "connected", gojee: "connected" } },
  { client: "Northgate Brewing Co", pairs: 4, stage: "NetSuite authentication", status: "attention" as const, updated: "2026-10-16", health: { netsuite: "needs_reauth", xero: "connected", gojee: "connected" } },
]
