/**
 * Intercompany journal split (R-21).
 *
 * A NetSuite journal can post lines to several subsidiaries. Each subsidiary
 * becomes its own Xero org, so the journal is split into one manual journal
 * per subsidiary. Where a subsidiary's lines don't balance on their own, the
 * difference goes to that subsidiary's intercompany loan account for the
 * counterparty.
 *
 * Counterparty rule: lines in a non-header subsidiary balance against the
 * journal's header subsidiary; the header subsidiary gets one balancing line
 * per other subsidiary. Because the source journal balances, so does every part.
 */
import { round2 } from "../format"

export interface JournalLine {
  subsidiaryId: string
  account: string
  accountName: string
  debit: number
  credit: number
  memo?: string
  intercompany?: boolean
}

export interface SourceJournal {
  tranId: string
  date: string
  memo: string
  headerSubsidiaryId: string
  lines: JournalLine[]
}

export interface SplitJournal {
  subsidiaryId: string
  tranId: string
  date: string
  memo: string
  lines: JournalLine[]
  totalDebit: number
  totalCredit: number
}

export type LoanAccountResolver = (
  subsidiaryId: string,
  counterpartySubsidiaryId: string,
) => { account: string; accountName: string }

function net(lines: JournalLine[]): number {
  return round2(lines.reduce((s, l) => s + l.debit - l.credit, 0))
}

function balancingLine(
  subsidiaryId: string,
  counterparty: string,
  amount: number,
  resolve: LoanAccountResolver,
): JournalLine {
  const { account, accountName } = resolve(subsidiaryId, counterparty)
  return {
    subsidiaryId,
    account,
    accountName,
    debit: amount > 0 ? round2(amount) : 0,
    credit: amount < 0 ? round2(-amount) : 0,
    memo: "Intercompany balancing line",
    intercompany: true,
  }
}

export function splitIntercompanyJournal(journal: SourceJournal, resolve: LoanAccountResolver): SplitJournal[] {
  if (net(journal.lines) !== 0) {
    throw new Error(`Journal ${journal.tranId} does not balance`)
  }

  const bySub = new Map<string, JournalLine[]>()
  for (const line of journal.lines) {
    if (!bySub.has(line.subsidiaryId)) bySub.set(line.subsidiaryId, [])
    bySub.get(line.subsidiaryId)!.push({ ...line })
  }
  const header = journal.headerSubsidiaryId
  if (!bySub.has(header)) bySub.set(header, [])

  for (const [sub, lines] of bySub) {
    if (sub === header) continue
    const n = net(lines)
    if (n === 0) continue
    // This subsidiary owes / is owed by the header subsidiary
    lines.push(balancingLine(sub, header, -n, resolve))
    bySub.get(header)!.push(balancingLine(header, sub, n, resolve))
  }

  return [...bySub.entries()]
    .filter(([, lines]) => lines.length > 0)
    .map(([subsidiaryId, lines]) => ({
      subsidiaryId,
      tranId: journal.tranId,
      date: journal.date,
      memo: journal.memo,
      lines,
      totalDebit: round2(lines.reduce((s, l) => s + l.debit, 0)),
      totalCredit: round2(lines.reduce((s, l) => s + l.credit, 0)),
    }))
}
