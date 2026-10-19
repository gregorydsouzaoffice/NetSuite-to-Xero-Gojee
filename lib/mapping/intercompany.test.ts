import { describe, expect, it } from "vitest"
import { splitIntercompanyJournal, type SourceJournal } from "./intercompany"
import { INV36502, intercompanyLoanAccount } from "../demo-data/momento"

describe("intercompany split (R-21)", () => {
  it("splits INV36502 into one balanced journal per subsidiary", () => {
    const parts = splitIntercompanyJournal(INV36502, intercompanyLoanAccount)
    expect(parts.map((p) => p.subsidiaryId).sort()).toEqual(["3", "4"])
    for (const p of parts) {
      expect(p.totalDebit).toBe(p.totalCredit)
      expect(p.totalDebit).toBe(26486.55)
    }
  })

  it("puts the balancing line on each org's intercompany loan account for the counterparty", () => {
    const parts = splitIntercompanyJournal(INV36502, intercompanyLoanAccount)
    const vice = parts.find((p) => p.subsidiaryId === "3")!
    const bvh = parts.find((p) => p.subsidiaryId === "4")!
    expect(vice.lines.filter((l) => l.intercompany)).toMatchObject([{ account: "1810-BVH", debit: 26486.55, credit: 0 }])
    expect(bvh.lines.filter((l) => l.intercompany)).toMatchObject([{ account: "1810-VICE", debit: 0, credit: 26486.55 }])
  })

  it("keeps every source line in its own subsidiary", () => {
    const parts = splitIntercompanyJournal(INV36502, intercompanyLoanAccount)
    for (const p of parts) {
      expect(p.lines.every((l) => l.subsidiaryId === p.subsidiaryId)).toBe(true)
    }
  })

  it("balances three subsidiaries against the header subsidiary", () => {
    const journal: SourceJournal = {
      tranId: "JE-3",
      date: "2024-01-31",
      memo: "Shared costs",
      headerSubsidiaryId: "1",
      lines: [
        { subsidiaryId: "1", account: "6200", accountName: "Rent", debit: 0, credit: 1000 },
        { subsidiaryId: "2", account: "6200", accountName: "Rent", debit: 600.33, credit: 0 },
        { subsidiaryId: "5", account: "6200", accountName: "Rent", debit: 399.67, credit: 0 },
      ],
    }
    const parts = splitIntercompanyJournal(journal, intercompanyLoanAccount)
    expect(parts).toHaveLength(3)
    for (const p of parts) expect(p.totalDebit).toBe(p.totalCredit)
    const header = parts.find((p) => p.subsidiaryId === "1")!
    expect(header.lines.filter((l) => l.intercompany).map((l) => l.account).sort()).toEqual(["1810-COR", "1810-HIL"])
  })

  it("adds nothing when each subsidiary already balances", () => {
    const journal: SourceJournal = {
      tranId: "JE-4",
      date: "2024-01-31",
      memo: "",
      headerSubsidiaryId: "2",
      lines: [
        { subsidiaryId: "2", account: "6200", accountName: "Rent", debit: 10, credit: 0 },
        { subsidiaryId: "2", account: "1000", accountName: "Bank", debit: 0, credit: 10 },
      ],
    }
    const [only] = splitIntercompanyJournal(journal, intercompanyLoanAccount)
    expect(only.lines).toHaveLength(2)
  })

  it("rejects an unbalanced source journal", () => {
    const bad: SourceJournal = { ...INV36502, lines: INV36502.lines.slice(1) }
    expect(() => splitIntercompanyJournal(bad, intercompanyLoanAccount)).toThrow(/does not balance/)
  })
})
