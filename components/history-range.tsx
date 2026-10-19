"use client"

import { useRef } from "react"
import { CalendarDays, History } from "lucide-react"
import AnimatedCounter from "@/app/components/animated-counter"
import { useDemo } from "@/lib/demo-store"
import { FIRST_DATE, LAST_CLOSED_PERIOD, formatDate, lastDayOfPeriod, periodFromDate, periodLabel, periodsInScope } from "@/lib/periods"
import { cn } from "@/lib/utils"

/** Quick choices: everything, or the start of a recent Australian financial year */
const PRESETS = [
  { label: "All history", date: FIRST_DATE, hint: "Jul 2022" },
  { label: "Last 3 financial years", date: "2023-07-01", hint: "FY24 →" },
  { label: "Last 2 financial years", date: "2024-07-01", hint: "FY25 →" },
  { label: "Last financial year", date: "2025-07-01", hint: "FY26 →" },
]

const END_DATE = lastDayOfPeriod(LAST_CLOSED_PERIOD)

/**
 * "Migrate history from…" — the one setting the user picks on the Extract step.
 * The end date is always the last closed period; only the start moves.
 */
export default function HistoryRange({ totalRecords }: { totalRecords: number }) {
  const { state, update } = useDemo()
  const prev = useRef(totalRecords)
  const from = state.fromDate
  const periods = periodsInScope(periodFromDate(from)).length
  const isPreset = PRESETS.some((p) => p.date === from)
  const set = (date: string) => update((s) => ({ ...s, fromDate: date, roundingFixed: false }))

  const counterFrom = prev.current
  prev.current = totalRecords

  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold flex items-center text-foreground">
            <History className="mr-2.5 h-5 w-5 text-primary" />
            Migrate history from
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the first date to bring across. Everything from that date up to the last closed period ({periodLabel(LAST_CLOSED_PERIOD)}) goes
            to Xero. Open items for Gojee are taken at cutover whatever you choose.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active = from === p.date
              return (
                <button
                  key={p.date}
                  type="button"
                  onClick={() => set(p.date)}
                  aria-pressed={active}
                  className={cn(
                    "group flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "border-border/70 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  {p.label}
                  <span className={cn("text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{p.hint}</span>
                </button>
              )
            })}
            <label
              className={cn(
                "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                !isPreset ? "border-primary bg-primary/5 text-primary" : "border-border/70 bg-card text-foreground hover:border-primary/40",
              )}
            >
              <CalendarDays className="h-4 w-4" />
              <span>From</span>
              <input
                type="date"
                value={from}
                min={FIRST_DATE}
                max={END_DATE}
                onChange={(e) => e.target.value && set(e.target.value)}
                className="bg-transparent text-sm font-semibold text-foreground outline-none"
                aria-label="Migrate history from date"
              />
            </label>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-primary/15 bg-primary/5 px-5 py-4 lg:w-[270px]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Selected range</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {formatDate(from)} <span className="text-muted-foreground font-normal">to</span> {formatDate(END_DATE)}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums tracking-tight text-primary">
              <AnimatedCounter key={totalRecords} from={counterFrom} to={totalRecords} duration={0.8} />
            </span>
            <span className="text-sm text-muted-foreground">records</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {periods} accounting period{periods === 1 ? "" : "s"} · last date fixed at cutover
          </div>
        </div>
      </div>
    </div>
  )
}
