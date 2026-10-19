/**
 * Momento's NetSuite chart of accounts (159 accounts, shared by every
 * subsidiary in OneWorld) and the Xero accounts each one maps to.
 * Used by the Map step's account remapping and the trial balance report.
 */

export type XeroAccountType = "Asset" | "Liability" | "Equity" | "Income" | "Cost of Sales" | "Expense"

export interface XeroTarget {
  code: string
  name: string
  type: XeroAccountType
  tax: string
}

/** Xero accounts the NetSuite chart maps into (existing defaults + accounts the tool creates) */
export const XERO_TARGETS: XeroTarget[] = [
  { code: "090", name: "CBA Operating Account", type: "Asset", tax: "BAS Excluded" },
  { code: "091", name: "NAB Savings Account", type: "Asset", tax: "BAS Excluded" },
  { code: "095", name: "Undeposited Funds Clearing", type: "Asset", tax: "BAS Excluded" },
  { code: "610", name: "Accounts Receivable", type: "Asset", tax: "BAS Excluded" },
  { code: "620", name: "Prepayments", type: "Asset", tax: "BAS Excluded" },
  { code: "630", name: "Inventory", type: "Asset", tax: "BAS Excluded" },
  { code: "640", name: "Work in Progress", type: "Asset", tax: "BAS Excluded" },
  { code: "715", name: "Kitchen Equipment", type: "Asset", tax: "BAS Excluded" },
  { code: "716", name: "Less Accumulated Depreciation", type: "Asset", tax: "BAS Excluded" },
  { code: "1810", name: "Intercompany Loans", type: "Asset", tax: "BAS Excluded" },
  { code: "800", name: "Accounts Payable", type: "Liability", tax: "BAS Excluded" },
  { code: "805", name: "Accrued Purchases", type: "Liability", tax: "BAS Excluded" },
  { code: "820", name: "GST", type: "Liability", tax: "BAS Excluded" },
  { code: "825", name: "PAYG Withholdings Payable", type: "Liability", tax: "BAS Excluded" },
  { code: "826", name: "Superannuation Payable", type: "Liability", tax: "BAS Excluded" },
  { code: "835", name: "Gift Vouchers Liability", type: "Liability", tax: "BAS Excluded" },
  { code: "860", name: "Rounding", type: "Liability", tax: "BAS Excluded" },
  { code: "950", name: "Share Capital", type: "Equity", tax: "BAS Excluded" },
  { code: "960", name: "Retained Earnings", type: "Equity", tax: "BAS Excluded" },
  { code: "201", name: "Sales – Dine-in", type: "Income", tax: "GST on Income" },
  { code: "202", name: "Sales – Delivery", type: "Income", tax: "GST on Income" },
  { code: "203", name: "Sales – Catering", type: "Income", tax: "GST on Income" },
  { code: "211", name: "Beverage Sales", type: "Income", tax: "GST on Income" },
  { code: "260", name: "Other Revenue", type: "Income", tax: "GST on Income" },
  { code: "270", name: "Interest Income", type: "Income", tax: "GST Free Income" },
  { code: "310", name: "Cost of Goods Sold", type: "Cost of Sales", tax: "GST on Expenses" },
  { code: "400", name: "Advertising", type: "Expense", tax: "GST on Expenses" },
  { code: "404", name: "Bank & Merchant Fees", type: "Expense", tax: "GST Free Expenses" },
  { code: "406", name: "Delivery Platform Commission", type: "Expense", tax: "GST on Expenses" },
  { code: "416", name: "Depreciation", type: "Expense", tax: "BAS Excluded" },
  { code: "429", name: "General Expenses", type: "Expense", tax: "GST on Expenses" },
  { code: "433", name: "Insurance", type: "Expense", tax: "GST on Expenses" },
  { code: "445", name: "Light, Power, Heating", type: "Expense", tax: "GST on Expenses" },
  { code: "469", name: "Rent & Outgoings", type: "Expense", tax: "GST on Expenses" },
  { code: "473", name: "Repairs and Maintenance", type: "Expense", tax: "GST on Expenses" },
  { code: "477", name: "Wages and Salaries", type: "Expense", tax: "BAS Excluded" },
  { code: "478", name: "Superannuation", type: "Expense", tax: "BAS Excluded" },
  { code: "499", name: "Realised Currency Gains", type: "Expense", tax: "BAS Excluded" },
]

export const XERO_TARGET_BY_CODE = Object.fromEntries(XERO_TARGETS.map((t) => [t.code, t])) as Record<string, XeroTarget>

export interface ChartAccount {
  /** NetSuite account number */
  code: string
  name: string
  /** NetSuite account type */
  type: string
  /** Suggested Xero account code */
  xero: string
}

const LOCATIONS = ["Fitzroy", "Richmond", "South Yarra", "Docklands", "St Kilda", "Melbourne CBD"]
const DEPARTMENTS = ["Kitchen", "Front of House", "Delivery", "Catering", "Administration"]

function family(start: number, type: string, xero: string, names: string[], step = 1): ChartAccount[] {
  return names.map((name, i) => ({ code: String(start + i * step), name, type, xero }))
}

const FIXED: ChartAccount[] = [
  // Assets
  ...family(1000, "Bank", "090", ["CBA Operating Account", "CBA Payroll Account", "CBA Trust Account"]),
  ...family(1010, "Bank", "091", ["NAB Savings Account", "NAB Term Deposit"]),
  ...family(1050, "Other Current Asset", "095", ["Undeposited Funds", "Square POS Clearing", "Tyro Clearing"]),
  ...family(1100, "Accounts Receivable", "610", ["Accounts Receivable", "Receivables – Catering", "Receivables – Delivery Platforms"]),
  ...family(1200, "Other Current Asset", "620", ["Prepayments", "Prepaid Insurance", "Bonds & Deposits"]),
  ...family(1300, "Other Current Asset", "630", ["Inventory – Food", "Inventory – Beverage", "Inventory – Packaging", "Inventory – Cleaning", "Inventory – Equipment Spares", "Inventory in Transit"]),
  ...family(1350, "Other Current Asset", "640", ["Work in Progress – Catering", "Work in Progress – Fit-outs"]),
  ...family(1500, "Fixed Asset", "715", ["Kitchen Equipment", "Furniture & Fittings", "Leasehold Improvements", "Computer Equipment", "POS Hardware"]),
  ...family(1550, "Fixed Asset", "716", ["Acc. Depn – Kitchen Equipment", "Acc. Depn – Furniture & Fittings", "Acc. Depn – Leasehold Improvements", "Acc. Depn – Computer Equipment", "Acc. Depn – POS Hardware"]),
  ...family(1810, "Other Current Asset", "1810", ["Intercompany Loan – Momento Group", "Intercompany Loan – VICE", "Intercompany Loan – Coranton"]),
  // Liabilities
  ...family(2000, "Accounts Payable", "800", ["Accounts Payable", "Payables – Food Suppliers", "Payables – Beverage Suppliers"]),
  ...family(2100, "Other Current Liability", "805", ["Accrued Purchases", "Accrued Expenses"]),
  ...family(2300, "Other Current Liability", "820", ["GST Collected", "GST Paid", "GST Adjustments", "GST on Imports"]),
  ...family(2400, "Other Current Liability", "825", ["PAYG Withholding Payable", "Payroll Tax Payable"]),
  ...family(2410, "Other Current Liability", "826", ["Superannuation Payable"]),
  ...family(2450, "Other Current Liability", "835", ["Gift Vouchers Liability", "Customer Deposits"]),
  ...family(2900, "Other Current Liability", "860", ["Rounding"]),
  // Equity
  ...family(3000, "Equity", "950", ["Share Capital"]),
  ...family(3100, "Equity", "960", ["Retained Earnings", "Current Year Earnings"]),
  // Income
  ...LOCATIONS.map((l, i) => ({ code: `40${String(i + 1).padStart(2, "0")}`, name: `Food Sales – Dine-in – ${l}`, type: "Income", xero: "201" })),
  ...family(4020, "Income", "202", ["Food Sales – Uber Eats", "Food Sales – DoorDash", "Food Sales – Menulog", "Food Sales – Online Ordering"]),
  ...family(4030, "Income", "203", ["Catering – Corporate", "Catering – Events", "Catering – Functions", "Catering – Staff Meals"]),
  ...family(4100, "Income", "211", ["Beverage Sales – Beer", "Beverage Sales – Wine", "Beverage Sales – Spirits", "Beverage Sales – Soft Drinks", "Beverage Sales – Coffee"]),
  ...family(4500, "Other Income", "260", ["Room Hire", "Supplier Rebates", "Merchandise Sales", "Insurance Recoveries", "Sundry Income"]),
  ...family(4900, "Other Income", "270", ["Interest Income"]),
  // Cost of sales
  ...family(5000, "Cost of Goods Sold", "310", ["COGS – Meat", "COGS – Seafood", "COGS – Dairy", "COGS – Produce", "COGS – Dry Goods", "COGS – Bakery", "COGS – Beer", "COGS – Wine", "COGS – Spirits", "COGS – Soft Drinks", "COGS – Coffee", "COGS – Packaging", "Stock Wastage"]),
  // Expenses
  ...DEPARTMENTS.flatMap((d, i) => [
    { code: `61${String(i * 3).padStart(2, "0")}`, name: `Wages – ${d}`, type: "Expense", xero: "477" },
    { code: `61${String(i * 3 + 1).padStart(2, "0")}`, name: `Overtime & Penalties – ${d}`, type: "Expense", xero: "477" },
    { code: `61${String(i * 3 + 2).padStart(2, "0")}`, name: `Superannuation – ${d}`, type: "Expense", xero: "478" },
  ]),
  ...LOCATIONS.flatMap((l, i) => [
    { code: `62${String(i * 2).padStart(2, "0")}`, name: `Rent – ${l}`, type: "Expense", xero: "469" },
    { code: `62${String(i * 2 + 1).padStart(2, "0")}`, name: `Outgoings – ${l}`, type: "Expense", xero: "469" },
  ]),
  ...family(6300, "Expense", "445", ["Electricity", "Gas", "Water"]),
  ...family(6400, "Expense", "473", ["Repairs – Kitchen Equipment", "Repairs – Building", "Repairs – Refrigeration", "Maintenance Contracts"]),
  ...family(6500, "Expense", "400", ["Advertising – Digital", "Advertising – Print", "Social Media", "Promotions & Sponsorship"]),
  ...family(6600, "Expense", "406", ["Commission – Uber Eats", "Commission – DoorDash", "Commission – Menulog"]),
  ...family(6700, "Expense", "404", ["Bank Fees", "Merchant Fees – Square", "Merchant Fees – Tyro"]),
  ...family(6800, "Expense", "433", ["Insurance – Public Liability", "Insurance – Property", "Insurance – Workers Compensation"]),
  ...family(8000, "Other Expense", "416", ["Depreciation"]),
  ...family(8150, "Other Expense", "499", ["Realised FX Gain/Loss"]),
]

/** General expenses fill the chart to its real size */
const GENERAL = [
  "Cleaning & Hygiene", "Laundry & Linen", "Uniforms", "Smallwares", "Printing & Stationery", "Postage & Courier", "Subscriptions",
  "Software", "Telephone", "Internet", "Licences & Permits", "Pest Control", "Waste Removal", "Security", "Music Licensing",
  "Legal Fees", "Accounting Fees", "Consulting", "Training", "Recruitment", "Staff Amenities", "Travel", "Motor Vehicle – Fuel",
  "Parking", "Entertainment", "Donations", "Equipment Hire", "Freight", "Cash Over/Short", "Sundry Expenses",
]

export const CHART_SIZE = 159

export const NETSUITE_CHART: ChartAccount[] = [
  ...FIXED,
  ...GENERAL.slice(0, CHART_SIZE - FIXED.length).map((name, i) => ({ code: String(6900 + i), name, type: "Expense", xero: "429" })),
]
