/** Accounting periods are "YYYY-MM" strings. Australian financial year runs July–June. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** First period in Momento's NetSuite account */
export const FIRST_PERIOD = "2022-07"
/** Last closed period at the time of the demo (today is Oct 2026) */
export const LAST_CLOSED_PERIOD = "2026-09"
/** First day of history in NetSuite */
export const FIRST_DATE = "2022-07-01"

/** Period ("YYYY-MM") a migration starting on this date begins with; never before FIRST_PERIOD */
export function periodFromDate(isoDate: string): string {
  const p = (isoDate || FIRST_DATE).slice(0, 7)
  return p < FIRST_PERIOD ? FIRST_PERIOD : p > LAST_CLOSED_PERIOD ? LAST_CLOSED_PERIOD : p
}

/** Periods in scope for a migration starting at `fromPeriod` */
export function periodsInScope(fromPeriod: string): string[] {
  return periodRange(fromPeriod, LAST_CLOSED_PERIOD)
}

/** Share of the full history that is in scope, 0..1 */
export function historyShare(fromPeriod: string): number {
  return periodsInScope(fromPeriod).length / periodRange(FIRST_PERIOD, LAST_CLOSED_PERIOD).length
}

export function periodRange(from: string, to: string): string[] {
  const out: string[] = []
  let [y, m] = from.split("-").map(Number)
  const [ty, tm] = to.split("-").map(Number)
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`)
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out
}

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

/** Last calendar day of a period, as ISO date */
export function lastDayOfPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number)
  const d = new Date(Date.UTC(y, m, 0))
  return d.toISOString().slice(0, 10)
}

export function periodOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** "FY24" for any period from Jul 2023 to Jun 2024 */
export function financialYear(period: string): string {
  const [y, m] = period.split("-").map(Number)
  const fy = m >= 7 ? y + 1 : y
  return `FY${String(fy).slice(2)}`
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}
