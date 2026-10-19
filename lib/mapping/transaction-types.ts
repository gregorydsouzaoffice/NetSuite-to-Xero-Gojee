/**
 * NetSuite transaction type → Xero / Gojee mapping (BRD section 6, R-22).
 *
 * TX_TYPES is the table the UI shows. mapTransaction() applies the rules to one
 * staged NetSuite transaction and returns what the loaders would write.
 * Type codes are SuiteQL `transaction.type` values — verify them in the
 * account's SuiteQL Records Catalog.
 */
import { lastDayOfPeriod } from "../periods"
import { round2 } from "../format"
import type { DateBasis } from "../types"

export type NsTypeCode =
  | "CustInvc"
  | "VendBill"
  | "CustCred"
  | "VendCred"
  | "CustPymt"
  | "VendPymt"
  | "Check"
  | "Deposit"
  | "CashRfnd"
  | "Journal"
  | "Transfer"
  | "InvAdjst"
  | "ItemRcpt"
  | "ItemShip"
  | "FxReval"
  | "SalesOrd"
  | "PurchOrd"
  | "RtnAuth"

export interface TxTypeRule {
  code: NsTypeCode
  label: string
  xero: string | null
  gojee: string | null
  rule: string
  /** Which systems receive this type */
  destinations: ("xero" | "gojee")[]
  /** Records per Xero API call. 1 = one call per record (e.g. allocations). */
  xeroBatchSize: number
  /** Extra per-record Xero calls (e.g. one allocation call per credit note) */
  extraCallsPerRecord?: number
  /** Only open records at cutover are migrated */
  openOnly?: boolean
}

export const TX_TYPES: TxTypeRule[] = [
  { code: "CustInvc", label: "Invoice", xero: "Invoice (ACCREC)", gojee: "Linked to its job if the job is open", rule: "Full history, line-level tracking", destinations: ["xero", "gojee"], xeroBatchSize: 50 },
  { code: "VendBill", label: "Bill", xero: "Invoice (ACCPAY)", gojee: null, rule: "Full history", destinations: ["xero"], xeroBatchSize: 50 },
  { code: "CustCred", label: "Credit Memo", xero: "Credit note (ACCRECCREDIT) + allocations", gojee: null, rule: "Allocated to the invoices it was applied to", destinations: ["xero"], xeroBatchSize: 50, extraCallsPerRecord: 1 },
  { code: "VendCred", label: "Bill Credit", xero: "Credit note (ACCPAYCREDIT) + allocations", gojee: null, rule: "Allocated to the bills it was applied to", destinations: ["xero"], xeroBatchSize: 50, extraCallsPerRecord: 1 },
  { code: "CustPymt", label: "Payment", xero: "Payment against invoices", gojee: null, rule: "Unapplied amount → RECEIVE-OVERPAYMENT or RECEIVE-PREPAYMENT", destinations: ["xero"], xeroBatchSize: 50 },
  { code: "VendPymt", label: "Bill Payment", xero: "Payment per bill, grouped as a batch payment", gojee: null, rule: "One NetSuite payment split across its bills", destinations: ["xero"], xeroBatchSize: 50 },
  { code: "Check", label: "Check", xero: "Bank transaction SPEND, or bill payment when applied", gojee: null, rule: "", destinations: ["xero"], xeroBatchSize: 50 },
  { code: "Deposit", label: "Deposit", xero: "Bank transfer from undeposited funds; RECEIVE for other lines", gojee: null, rule: "Undeposited funds maps to a Xero clearing bank account", destinations: ["xero"], xeroBatchSize: 50 },
  { code: "CashRfnd", label: "Cash Refund", xero: "Bank transaction SPEND, or refund against a credit note", gojee: null, rule: "", destinations: ["xero"], xeroBatchSize: 50 },
  { code: "Journal", label: "Journal", xero: "Manual journal", gojee: null, rule: "Intercompany split (R-21)", destinations: ["xero"], xeroBatchSize: 50 },
  { code: "Transfer", label: "Transfer", xero: "Bank transfer", gojee: null, rule: "Raised in the meeting; not in the original list", destinations: ["xero"], xeroBatchSize: 50 },
  { code: "InvAdjst", label: "Inventory Adjustment", xero: "Manual journal", gojee: "Stock adjustment (cutover quantities only)", rule: "", destinations: ["xero", "gojee"], xeroBatchSize: 50 },
  { code: "ItemRcpt", label: "Item Receipt", xero: "Manual journal (inventory vs accrued purchases)", gojee: "Received quantities on open POs", rule: "", destinations: ["xero", "gojee"], xeroBatchSize: 50 },
  { code: "ItemShip", label: "Item Fulfillment", xero: "Manual journal (cost of sales vs inventory)", gojee: null, rule: "NetSuite posts cost of sales at fulfilment", destinations: ["xero"], xeroBatchSize: 50 },
  { code: "FxReval", label: "Currency Revaluation", xero: "Not recreated", gojee: null, rule: "Reconciling journal per period if the TB differs", destinations: [], xeroBatchSize: 50 },
  { code: "SalesOrd", label: "Sales Order", xero: "Not posted", gojee: "Open ones → Gojee job or quote", rule: "Not a ledger transaction", destinations: ["gojee"], xeroBatchSize: 50, openOnly: true },
  { code: "PurchOrd", label: "Purchase Order", xero: "Not posted", gojee: "Open ones → Gojee purchase orders", rule: "Gojee sends POs on to Xero", destinations: ["gojee"], xeroBatchSize: 50, openOnly: true },
  { code: "RtnAuth", label: "Return Authorization", xero: "Not migrated", gojee: null, rule: "Open ones listed in the cutover report", destinations: [], xeroBatchSize: 50, openOnly: true },
]

export const TX_TYPE_BY_CODE = Object.fromEntries(TX_TYPES.map((t) => [t.code, t])) as Record<NsTypeCode, TxTypeRule>

// ---------------------------------------------------------------------------
// Staged NetSuite transaction shape (subset of SuiteQL transaction + lines)

export interface NsApplication {
  docId: string
  docType: NsTypeCode
  amount: number
}

export interface NsDepositLine {
  amount: number
  /** Payment that was sitting in undeposited funds */
  fromPaymentId?: string
  account?: string
}

export interface NsTransaction {
  internalId: string
  type: NsTypeCode
  tranId: string
  subsidiaryId: string
  tranDate: string
  postingPeriod: string
  currency: string
  exchangeRate: number
  total: number
  entityId?: string
  cleared?: boolean
  status?: "open" | "closed"
  jobId?: string
  jobOpen?: boolean
  applied?: NsApplication[]
  depositLines?: NsDepositLine[]
  /** For Item Receipts: the purchase order it received against */
  createdFromPo?: { id: string; open: boolean }
  /** For Inventory Adjustments: whether it falls inside the cutover snapshot */
  inCutoverSnapshot?: boolean
}

export type XeroWrite =
  | { system: "xero"; kind: "Invoice"; type: "ACCREC" | "ACCPAY"; amount: number }
  | { system: "xero"; kind: "CreditNote"; type: "ACCRECCREDIT" | "ACCPAYCREDIT"; amount: number }
  | { system: "xero"; kind: "Allocation"; toDocId: string; amount: number }
  | { system: "xero"; kind: "Payment"; toDocId: string; amount: number }
  | { system: "xero"; kind: "BatchPayment"; payments: { toDocId: string; amount: number }[]; amount: number }
  | {
      system: "xero"
      kind: "BankTransaction"
      type: "SPEND" | "RECEIVE" | "RECEIVE-OVERPAYMENT" | "RECEIVE-PREPAYMENT"
      amount: number
    }
  | { system: "xero"; kind: "BankTransfer"; from: string; amount: number }
  | { system: "xero"; kind: "ManualJournal"; purpose: string; amount: number }
  | { system: "xero"; kind: "Refund"; againstDocId: string; amount: number }

export type GojeeWrite =
  | { system: "gojee"; kind: "JobInvoiceLink"; jobId: string }
  | { system: "gojee"; kind: "Job" | "Quote"; fromSalesOrder: string }
  | { system: "gojee"; kind: "PurchaseOrder"; fromPo: string }
  | { system: "gojee"; kind: "PoReceipt"; poId: string }
  | { system: "gojee"; kind: "StockAdjustment"; reference: string }

export type Skip = { system: "none"; reason: string }

export type MappedWrite = (XeroWrite | GojeeWrite | Skip) & {
  date?: string
  currency?: string
  currencyRate?: number
  isReconciled?: boolean
}

export interface MapContext {
  dateBasis: DateBasis
  salesOrdersAs: "job" | "quote"
  undepositedClearingAccount: string
}

/** Posting-period basis: a transaction dated outside its period takes the period's last day (R-11) */
export function effectiveDate(tx: Pick<NsTransaction, "tranDate" | "postingPeriod">, basis: DateBasis): string {
  if (basis === "transaction-date") return tx.tranDate
  return tx.tranDate.slice(0, 7) === tx.postingPeriod ? tx.tranDate : lastDayOfPeriod(tx.postingPeriod)
}

function sumApplied(tx: NsTransaction): number {
  return round2((tx.applied ?? []).reduce((s, a) => s + a.amount, 0))
}

function mapCore(tx: NsTransaction, ctx: MapContext): (XeroWrite | GojeeWrite | Skip)[] {
  switch (tx.type) {
    case "CustInvc": {
      const out: (XeroWrite | GojeeWrite)[] = [{ system: "xero", kind: "Invoice", type: "ACCREC", amount: tx.total }]
      if (tx.jobId && tx.jobOpen) out.push({ system: "gojee", kind: "JobInvoiceLink", jobId: tx.jobId })
      return out
    }
    case "VendBill":
      return [{ system: "xero", kind: "Invoice", type: "ACCPAY", amount: tx.total }]
    case "CustCred":
    case "VendCred": {
      const type = tx.type === "CustCred" ? "ACCRECCREDIT" : "ACCPAYCREDIT"
      return [
        { system: "xero", kind: "CreditNote", type, amount: tx.total },
        ...(tx.applied ?? []).map((a): XeroWrite => ({ system: "xero", kind: "Allocation", toDocId: a.docId, amount: a.amount })),
      ]
    }
    case "CustPymt": {
      const applied = tx.applied ?? []
      const out: XeroWrite[] = applied.map((a) => ({ system: "xero", kind: "Payment", toDocId: a.docId, amount: a.amount }))
      const unapplied = round2(tx.total - sumApplied(tx))
      if (unapplied > 0) {
        // Nothing applied at all = paid in advance; partly applied = paid too much
        out.push({
          system: "xero",
          kind: "BankTransaction",
          type: applied.length === 0 ? "RECEIVE-PREPAYMENT" : "RECEIVE-OVERPAYMENT",
          amount: unapplied,
        })
      }
      return out
    }
    case "VendPymt": {
      const payments = (tx.applied ?? []).map((a) => ({ toDocId: a.docId, amount: a.amount }))
      return [{ system: "xero", kind: "BatchPayment", payments, amount: tx.total }]
    }
    case "Check": {
      const bills = (tx.applied ?? []).filter((a) => a.docType === "VendBill")
      if (bills.length > 0) {
        return bills.map((a): XeroWrite => ({ system: "xero", kind: "Payment", toDocId: a.docId, amount: a.amount }))
      }
      return [{ system: "xero", kind: "BankTransaction", type: "SPEND", amount: tx.total }]
    }
    case "Deposit": {
      const lines = tx.depositLines ?? []
      const fromUndeposited = round2(lines.filter((l) => l.fromPaymentId).reduce((s, l) => s + l.amount, 0))
      const other = round2(lines.filter((l) => !l.fromPaymentId).reduce((s, l) => s + l.amount, 0))
      const out: XeroWrite[] = []
      if (fromUndeposited > 0) {
        out.push({ system: "xero", kind: "BankTransfer", from: ctx.undepositedClearingAccount, amount: fromUndeposited })
      }
      if (other > 0) out.push({ system: "xero", kind: "BankTransaction", type: "RECEIVE", amount: other })
      return out
    }
    case "CashRfnd": {
      const credit = (tx.applied ?? []).find((a) => a.docType === "CustCred")
      if (credit) return [{ system: "xero", kind: "Refund", againstDocId: credit.docId, amount: tx.total }]
      return [{ system: "xero", kind: "BankTransaction", type: "SPEND", amount: tx.total }]
    }
    case "Journal":
      return [{ system: "xero", kind: "ManualJournal", purpose: "journal", amount: tx.total }]
    case "Transfer":
      return [{ system: "xero", kind: "BankTransfer", from: "bank", amount: tx.total }]
    case "InvAdjst": {
      const out: (XeroWrite | GojeeWrite)[] = [
        { system: "xero", kind: "ManualJournal", purpose: "inventory-adjustment", amount: tx.total },
      ]
      if (tx.inCutoverSnapshot) out.push({ system: "gojee", kind: "StockAdjustment", reference: tx.tranId })
      return out
    }
    case "ItemRcpt": {
      const out: (XeroWrite | GojeeWrite)[] = [
        { system: "xero", kind: "ManualJournal", purpose: "inventory-vs-accrued-purchases", amount: tx.total },
      ]
      if (tx.createdFromPo?.open) out.push({ system: "gojee", kind: "PoReceipt", poId: tx.createdFromPo.id })
      return out
    }
    case "ItemShip":
      return [{ system: "xero", kind: "ManualJournal", purpose: "cost-of-sales-vs-inventory", amount: tx.total }]
    case "FxReval":
      return [{ system: "none", reason: "Currency revaluation is not recreated; a reconciling journal is posted per period if the trial balance differs" }]
    case "SalesOrd":
      if (tx.status !== "open") return [{ system: "none", reason: "Closed sales order — not a ledger transaction" }]
      return [{ system: "gojee", kind: ctx.salesOrdersAs === "job" ? "Job" : "Quote", fromSalesOrder: tx.tranId }]
    case "PurchOrd":
      if (tx.status !== "open") return [{ system: "none", reason: "Closed purchase order — not migrated" }]
      return [{ system: "gojee", kind: "PurchaseOrder", fromPo: tx.tranId }]
    case "RtnAuth":
      return [
        {
          system: "none",
          reason: tx.status === "open" ? "Open return authorisation — listed in the cutover report" : "Return authorisation — not migrated",
        },
      ]
  }
}

/** Apply section 6 rules to one staged NetSuite transaction. */
export function mapTransaction(tx: NsTransaction, ctx: MapContext): MappedWrite[] {
  const date = effectiveDate(tx, ctx.dateBasis)
  return mapCore(tx, ctx).map((w) =>
    w.system === "xero"
      ? {
          ...w,
          date,
          currency: tx.currency,
          currencyRate: tx.exchangeRate,
          // Cleared flag → IsReconciled where the API allows it (payments and bank transactions)
          ...(["Payment", "BankTransaction", "BatchPayment"].includes(w.kind) ? { isReconciled: !!tx.cleared } : {}),
        }
      : w,
  )
}

// ---------------------------------------------------------------------------
// Items: always untracked in Xero (Gojee holds the stock)

export interface NsItem {
  internalId: string
  itemId: string
  displayName: string
  type: "InvtPart" | "NonInvtPart" | "Service" | "Assembly"
  classPrefix: string
  salesAccount: string
  cogsAccount: string
  assetAccount?: string
  serialized?: boolean
}

export const XERO_ITEM_CODE_MAX = 30

export function xeroItemCode(item: Pick<NsItem, "itemId" | "classPrefix">): string {
  const base = item.itemId.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `${item.classPrefix}-${base}`
}

/** Item code that fits Xero's 30-character limit; long codes are shortened word by word */
export function safeXeroItemCode(item: Pick<NsItem, "itemId" | "classPrefix">): string {
  const full = xeroItemCode(item)
  if (full.length <= XERO_ITEM_CODE_MAX) return full
  const words = full.split("-")
  let out = words[0]
  for (const w of words.slice(1)) {
    const next = `${out}-${w}`
    out = next.length <= XERO_ITEM_CODE_MAX ? next : `${out}-${w}`.slice(0, XERO_ITEM_CODE_MAX)
    if (out.length >= XERO_ITEM_CODE_MAX) break
  }
  return out.replace(/-+$/, "")
}

export function xeroItemFromNetSuite(item: NsItem) {
  return {
    Code: safeXeroItemCode(item),
    Name: item.displayName.slice(0, 50),
    IsTrackedAsInventory: false,
    // Deliberately no InventoryAssetAccountCode: tracked items would make Xero post
    // cost of sales on every invoice and double the fulfilment journals.
    SalesDetails: { AccountCode: item.salesAccount },
    PurchaseDetails: { AccountCode: item.cogsAccount },
  }
}

export function toGojeeInventory(item: NsItem): boolean {
  return item.type === "InvtPart" || item.type === "Assembly"
}
