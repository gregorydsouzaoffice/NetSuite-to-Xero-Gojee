import { describe, expect, it } from "vitest"
import {
  TX_TYPES,
  XERO_ITEM_CODE_MAX,
  effectiveDate,
  mapTransaction,
  safeXeroItemCode,
  xeroItemCode,
  xeroItemFromNetSuite,
  type MapContext,
  type NsTransaction,
} from "./transaction-types"

const ctx: MapContext = { dateBasis: "posting-period", salesOrdersAs: "job", undepositedClearingAccount: "095" }

function tx(partial: Partial<NsTransaction> & Pick<NsTransaction, "type">): NsTransaction {
  return {
    internalId: "1",
    tranId: "T-1",
    subsidiaryId: "2",
    tranDate: "2024-03-15",
    postingPeriod: "2024-03",
    currency: "AUD",
    exchangeRate: 1,
    total: 100,
    ...partial,
  }
}

const kinds = (writes: ReturnType<typeof mapTransaction>) => writes.map((w) => ("kind" in w ? w.kind : "skip"))

describe("section 6 table", () => {
  it("covers every NetSuite type in the BRD", () => {
    expect(TX_TYPES.map((t) => t.code).sort()).toEqual(
      ["CashRfnd", "Check", "CustCred", "CustInvc", "CustPymt", "Deposit", "FxReval", "InvAdjst", "ItemRcpt", "ItemShip", "Journal", "PurchOrd", "RtnAuth", "SalesOrd", "Transfer", "VendBill", "VendCred", "VendPymt"].sort(),
    )
  })
})

describe("mapTransaction", () => {
  it("Invoice → ACCREC, linked to an open Gojee job", () => {
    const out = mapTransaction(tx({ type: "CustInvc", jobId: "J-1", jobOpen: true }), ctx)
    expect(out[0]).toMatchObject({ system: "xero", kind: "Invoice", type: "ACCREC", amount: 100 })
    expect(out[1]).toMatchObject({ system: "gojee", kind: "JobInvoiceLink", jobId: "J-1" })
  })

  it("Invoice on a closed job is not linked in Gojee", () => {
    expect(kinds(mapTransaction(tx({ type: "CustInvc", jobId: "J-1", jobOpen: false }), ctx))).toEqual(["Invoice"])
  })

  it("Bill → ACCPAY", () => {
    expect(mapTransaction(tx({ type: "VendBill" }), ctx)[0]).toMatchObject({ kind: "Invoice", type: "ACCPAY" })
  })

  it("Credit Memo → ACCRECCREDIT plus one allocation per applied invoice", () => {
    const out = mapTransaction(
      tx({
        type: "CustCred",
        applied: [
          { docId: "INV-1", docType: "CustInvc", amount: 60 },
          { docId: "INV-2", docType: "CustInvc", amount: 40 },
        ],
      }),
      ctx,
    )
    expect(out[0]).toMatchObject({ kind: "CreditNote", type: "ACCRECCREDIT" })
    expect(out.slice(1)).toMatchObject([
      { kind: "Allocation", toDocId: "INV-1", amount: 60 },
      { kind: "Allocation", toDocId: "INV-2", amount: 40 },
    ])
  })

  it("Bill Credit → ACCPAYCREDIT plus allocations", () => {
    const out = mapTransaction(tx({ type: "VendCred", applied: [{ docId: "B-1", docType: "VendBill", amount: 100 }] }), ctx)
    expect(kinds(out)).toEqual(["CreditNote", "Allocation"])
    expect(out[0]).toMatchObject({ type: "ACCPAYCREDIT" })
  })

  it("Payment: applied part → payments, unapplied part → overpayment", () => {
    const out = mapTransaction(
      tx({ type: "CustPymt", total: 150, applied: [{ docId: "INV-1", docType: "CustInvc", amount: 100 }] }),
      ctx,
    )
    expect(out).toMatchObject([
      { kind: "Payment", toDocId: "INV-1", amount: 100 },
      { kind: "BankTransaction", type: "RECEIVE-OVERPAYMENT", amount: 50 },
    ])
  })

  it("Payment with nothing applied → prepayment", () => {
    const out = mapTransaction(tx({ type: "CustPymt", total: 80, applied: [] }), ctx)
    expect(out).toMatchObject([{ kind: "BankTransaction", type: "RECEIVE-PREPAYMENT", amount: 80 }])
  })

  it("Bill Payment → one batch payment split across its bills", () => {
    const out = mapTransaction(
      tx({
        type: "VendPymt",
        total: 300,
        applied: [
          { docId: "B-1", docType: "VendBill", amount: 120 },
          { docId: "B-2", docType: "VendBill", amount: 180 },
        ],
      }),
      ctx,
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: "BatchPayment", amount: 300 })
    expect((out[0] as { payments: unknown[] }).payments).toHaveLength(2)
  })

  it("Check applied to a bill → bill payment; otherwise SPEND", () => {
    expect(kinds(mapTransaction(tx({ type: "Check", applied: [{ docId: "B-1", docType: "VendBill", amount: 100 }] }), ctx))).toEqual(["Payment"])
    expect(mapTransaction(tx({ type: "Check" }), ctx)[0]).toMatchObject({ kind: "BankTransaction", type: "SPEND" })
  })

  it("Deposit: undeposited payments → transfer from clearing; other lines → RECEIVE", () => {
    const out = mapTransaction(
      tx({
        type: "Deposit",
        depositLines: [
          { amount: 70, fromPaymentId: "P-1" },
          { amount: 30, fromPaymentId: "P-2" },
          { amount: 12.5, account: "4900" },
        ],
      }),
      ctx,
    )
    expect(out).toMatchObject([
      { kind: "BankTransfer", from: "095", amount: 100 },
      { kind: "BankTransaction", type: "RECEIVE", amount: 12.5 },
    ])
  })

  it("Cash Refund against a credit memo → refund; otherwise SPEND", () => {
    expect(mapTransaction(tx({ type: "CashRfnd", applied: [{ docId: "CM-1", docType: "CustCred", amount: 100 }] }), ctx)[0]).toMatchObject({
      kind: "Refund",
      againstDocId: "CM-1",
    })
    expect(mapTransaction(tx({ type: "CashRfnd" }), ctx)[0]).toMatchObject({ kind: "BankTransaction", type: "SPEND" })
  })

  it("Journal → manual journal", () => {
    expect(kinds(mapTransaction(tx({ type: "Journal" }), ctx))).toEqual(["ManualJournal"])
  })

  it("Transfer → bank transfer", () => {
    expect(kinds(mapTransaction(tx({ type: "Transfer" }), ctx))).toEqual(["BankTransfer"])
  })

  it("Inventory Adjustment → journal, plus Gojee stock adjustment only inside the cutover snapshot", () => {
    expect(kinds(mapTransaction(tx({ type: "InvAdjst" }), ctx))).toEqual(["ManualJournal"])
    expect(kinds(mapTransaction(tx({ type: "InvAdjst", inCutoverSnapshot: true }), ctx))).toEqual(["ManualJournal", "StockAdjustment"])
  })

  it("Item Receipt → journal, plus Gojee PO receipt when the PO is open", () => {
    const out = mapTransaction(tx({ type: "ItemRcpt", createdFromPo: { id: "PO-9", open: true } }), ctx)
    expect(out[0]).toMatchObject({ kind: "ManualJournal", purpose: "inventory-vs-accrued-purchases" })
    expect(out[1]).toMatchObject({ system: "gojee", kind: "PoReceipt", poId: "PO-9" })
  })

  it("Item Fulfillment → cost of sales journal", () => {
    expect(mapTransaction(tx({ type: "ItemShip" }), ctx)[0]).toMatchObject({ purpose: "cost-of-sales-vs-inventory" })
  })

  it("Currency Revaluation is not recreated", () => {
    expect(mapTransaction(tx({ type: "FxReval" }), ctx)[0]).toMatchObject({ system: "none" })
  })

  it("Open Sales Order → Gojee job or quote per the migration's setting", () => {
    expect(mapTransaction(tx({ type: "SalesOrd", status: "open" }), ctx)[0]).toMatchObject({ system: "gojee", kind: "Job" })
    expect(mapTransaction(tx({ type: "SalesOrd", status: "open" }), { ...ctx, salesOrdersAs: "quote" })[0]).toMatchObject({ kind: "Quote" })
    expect(mapTransaction(tx({ type: "SalesOrd", status: "closed" }), ctx)[0]).toMatchObject({ system: "none" })
  })

  it("Open Purchase Order → Gojee purchase order; never posted to Xero", () => {
    const out = mapTransaction(tx({ type: "PurchOrd", status: "open" }), ctx)
    expect(out).toMatchObject([{ system: "gojee", kind: "PurchaseOrder" }])
  })

  it("Return Authorization is not migrated; open ones go to the cutover report", () => {
    expect(mapTransaction(tx({ type: "RtnAuth", status: "open" }), ctx)[0]).toMatchObject({ system: "none", reason: expect.stringContaining("cutover report") })
  })

  it("keeps foreign currency and NetSuite's exchange rate", () => {
    const out = mapTransaction(tx({ type: "VendBill", currency: "USD", exchangeRate: 1.5234 }), ctx)
    expect(out[0]).toMatchObject({ currency: "USD", currencyRate: 1.5234 })
  })

  it("cleared flag → IsReconciled on payments and bank transactions only", () => {
    expect(mapTransaction(tx({ type: "Check", cleared: true }), ctx)[0]).toMatchObject({ isReconciled: true })
    expect(mapTransaction(tx({ type: "VendBill", cleared: true }), ctx)[0]).not.toHaveProperty("isReconciled")
  })
})

describe("date basis (R-11)", () => {
  it("posting period: a date outside its period takes the period's last day", () => {
    expect(effectiveDate({ tranDate: "2024-04-02", postingPeriod: "2024-03" }, "posting-period")).toBe("2024-03-31")
    expect(effectiveDate({ tranDate: "2024-03-10", postingPeriod: "2024-03" }, "posting-period")).toBe("2024-03-10")
  })

  it("transaction date: the date is kept", () => {
    expect(effectiveDate({ tranDate: "2024-04-02", postingPeriod: "2024-03" }, "transaction-date")).toBe("2024-04-02")
  })

  it("handles February in a leap year", () => {
    expect(effectiveDate({ tranDate: "2024-03-01", postingPeriod: "2024-02" }, "posting-period")).toBe("2024-02-29")
  })
})

describe("items", () => {
  it("are created untracked, without an inventory asset account", () => {
    const item = xeroItemFromNetSuite({
      internalId: "1",
      itemId: "Mozzarella 2kg",
      displayName: "Mozzarella",
      type: "InvtPart",
      classPrefix: "FD",
      salesAccount: "201",
      cogsAccount: "310",
      assetAccount: "630",
    })
    expect(item.IsTrackedAsInventory).toBe(false)
    expect(item).not.toHaveProperty("InventoryAssetAccountCode")
    expect(item.Code).toBe("FD-MOZZARELLA-2KG")
  })

  it("shortens item codes longer than Xero's 30-character limit", () => {
    const item = { itemId: "Commercial Coffee Grinder Robur S", classPrefix: "EQ" }
    expect(xeroItemCode(item).length).toBeGreaterThan(XERO_ITEM_CODE_MAX)
    const safe = safeXeroItemCode(item)
    expect(safe.length).toBeLessThanOrEqual(XERO_ITEM_CODE_MAX)
    expect(safe.startsWith("EQ-COMMERCIAL-COFFEE")).toBe(true)
    expect(safe.endsWith("-")).toBe(false)
  })
})
