"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import NextButton from "@/components/next-button"
import { categories } from "@/lib/demo-data/migration"
import { useDemo } from "@/lib/demo-store"
import { periodFromDate } from "@/lib/periods"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import AnimatedCounter from "@/app/components/animated-counter"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
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
  Warehouse,
  BookOpen,
  Building2,
  Check,
  CheckCircle,
  ClipboardList,
  CreditCard,
  Database,
  FileMinus,
  FilePlus,
  FileText,
  Package,
  Receipt,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react"

// Gojee palette for the inline SVG / style colours (CSS variables can't be used in SVG attributes)
const C = {
  green: "#4a9e7a",
  teal: "#1a9aa8",
  xero: "#13b5ea",
  navy: "#36677d",
  slate: "#64748b",
  amber: "#f59e0b",
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  accounts: Database,
  customers: Users,
  vendors: Building2,
  items: Package,
  invoices: Receipt,
  bills: FileText,
  creditNotes: FileMinus,
  billCredits: FilePlus,
  invoicePayments: CreditCard,
  billPayments: Banknote,
  bank: Landmark,
  journals: BookOpen,
  inventoryJournals: Boxes,
  stock: Warehouse,
  jobs: Briefcase,
  jobTasks: ListChecks,
  jobTemplates: Copy,
  jobBudgets: PiggyBank,
  jobCostRevenue: TrendingUp,
  retention: Lock,
  purchaseOrders: ClipboardList,
  timesheets: Clock,
  schedule: CalendarDays,
  staff: UserCheck,
  billingRates: BadgeDollarSign,
}

// Categories grouped by destination — one hue per system, not a rainbow
function buildPlan(subsidiaryId: string, fromPeriod: string) {
  const dataCategories = categories(subsidiaryId, fromPeriod).map((c) => ({
    name: c.label,
    total: c.count,
    system: c.system,
    icon: ICONS[c.key] ?? FileText,
    hex: c.system === "gojee" ? C.green : ["accounts", "journals", "inventoryJournals"].includes(c.key) ? C.navy : C.xero,
  }))
  const TOTAL_RECORDS = dataCategories.reduce((acc, cat) => acc + cat.total, 0)
  // Planned duration scales (gently) with record count — big categories visibly take longer
  const plannedDurationMs = dataCategories.map((cat) => Math.min(Math.max(900 + Math.log10(cat.total + 1) * 900, 1400), 4800))
  return { dataCategories, TOTAL_RECORDS, plannedDurationMs }
}

// Deliberate "hard moments" the engine hits and recovers from — the drama of
// a difficult migration, resolved gracefully every time
const stallScript: Record<string, { at: number; message: string; resolved: string }> = {
  Bills: {
    at: 55,
    message: "Xero rate limit reached (60 calls/min) — waiting for Retry-After…",
    resolved: "Rate limit window reset — resuming at full speed",
  },
  Journals: {
    at: 62,
    message: "Splitting 3 intercompany journals onto loan account 1810…",
    resolved: "Intercompany journals balanced in this org",
  },
  "Stock on Hand & Serials": {
    at: 40,
    message: "NetSuite frozen — loading the cutover delta before Gojee…",
    resolved: "Delta loaded — Gojee connected to Xero, stock loading",
  },
}

// Phase of the current category, derived from its progress
const phaseFor = (p: number) => {
  if (p < 25) return "Reading from NetSuite staging"
  if (p < 45) return "Transforming records"
  if (p < 90) return "Writing to destination"
  return "Verifying integrity"
}

// SVG conduit geometry (viewBox 0 0 640 220): three lanes converge on the
// core at (320,110), then fan back out to the destination
const inputPaths = [
  "M 8 40 C 140 40, 210 110, 320 110",
  "M 8 110 C 120 110, 220 110, 320 110",
  "M 8 180 C 140 180, 210 110, 320 110",
]
const outputPaths = [
  "M 320 110 C 430 110, 500 40, 632 40",
  "M 320 110 C 420 110, 520 110, 632 110",
  "M 320 110 C 430 110, 500 180, 632 180",
]

const confettiPieces = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: 8 + ((i * 6.4) % 84),
  color: [C.green, C.teal, C.xero, C.navy, C.amber][i % 5],
  delay: (i % 7) * 90,
  drift: ((i % 5) - 2) * 48,
}))

export default function ImportProgress() {
  const router = useRouter()
  const { state } = useDemo()
  const { dataCategories, TOTAL_RECORDS, plannedDurationMs } = useMemo(
    () => buildPlan(state.netsuite.subsidiaryId, periodFromDate(state.fromDate)),
    [state.netsuite.subsidiaryId, state.fromDate],
  )
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("Preparing import…")
  const [isComplete, setIsComplete] = useState(false)
  const [currentCategory, setCurrentCategory] = useState(0)
  const [categoryProgress, setCategoryProgress] = useState(0)
  const [migratedItems, setMigratedItems] = useState<Record<string, number>>({})
  const [errors] = useState<{ id: number; message: string; category: string }[]>([])
  const [warnings, setWarnings] = useState<{ id: number; message: string; category: string }[]>([])
  const [logs, setLogs] = useState<{ id: number; message: string; type: string; time: string }[]>([])
  const [showInitialAnimation, setShowInitialAnimation] = useState(true)
  const [stallMessage, setStallMessage] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  const logIdRef = useRef(0)

  const addLog = (message: string, type = "info") => {
    logIdRef.current += 1
    setLogs((prev) => [
      { id: logIdRef.current, message, type, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 59),
    ])
  }

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  // Intro: connection handshake
  useEffect(() => {
    if (!showInitialAnimation) return
    addLog("Starting migration process…", "info")
    addLog("Connecting to NetSuite (SuiteQL, OAuth 2.0)…", "info")
    addLog("Connection established — reading from staging", "success")
    addLog("Connecting to Xero API…", "info")
    addLog("Connection established", "success")
    addLog("Connecting to Gojee…", "info")
    addLog("Connection established", "success")
    addLog(`Preparing ${TOTAL_RECORDS.toLocaleString()} records across ${dataCategories.length} categories…`, "info")

    const timer = setTimeout(() => {
      setShowInitialAnimation(false)
      addLog("Ready to begin data transfer", "success")
    }, 2000)
    return () => clearTimeout(timer)
  }, [showInitialAnimation])

  // Elapsed clock
  useEffect(() => {
    if (showInitialAnimation || isComplete) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [showInitialAnimation, isComplete])

  // Migration engine: record-proportional pacing, decelerating tails,
  // scripted stalls, phase logging
  useEffect(() => {
    if (showInitialAnimation) return

    let catIdx = 0
    let catProg = 0
    let stallTicks = 0
    let pendingResolved = ""
    const stalledDone = new Set<string>()
    const phaseLogged = new Set<string>()
    const localMigrated: Record<string, number> = {}
    const localWarnings: { id: number; message: string; category: string }[] = []
    let finalizing = false

    const interval = setInterval(() => {
      if (finalizing) return

      // Mid-migration stall: progress genuinely freezes, then recovers
      if (stallTicks > 0) {
        stallTicks -= 1
        if (stallTicks === 0) {
          setStallMessage(null)
          addLog(pendingResolved, "success")
        }
        return
      }

      const category = dataCategories[catIdx]
      if (!category) return

      const ticksPlanned = plannedDurationMs[catIdx] / 80
      let step = (100 / ticksPlanned) * (0.55 + Math.random() * 0.9)
      if (catProg > 85) step *= 0.5 // decelerating tail, like real I/O
      const prevProg = catProg
      catProg = Math.min(100, catProg + step)

      // Log phase transitions once per category
      const phase = phaseFor(catProg)
      const phaseKey = `${category.name}:${phase}`
      if (!phaseLogged.has(phaseKey)) {
        phaseLogged.add(phaseKey)
        addLog(`${phase} — ${category.name.toLowerCase()}`, "info")
      }

      // Scripted stall for this category?
      const stall = stallScript[category.name]
      if (stall && !stalledDone.has(category.name) && prevProg < stall.at && catProg >= stall.at) {
        stalledDone.add(category.name)
        stallTicks = 12 + Math.floor(Math.random() * 8)
        pendingResolved = stall.resolved
        setStallMessage(stall.message)
        addLog(stall.message, "warning")
        catProg = stall.at
      }

      if (catProg >= 100) {
        localMigrated[category.name] = category.total
        setMigratedItems({ ...localMigrated })
        addLog(`Completed ${category.name} — ${category.total} records verified`, "success")

        if (Math.random() > 0.8 && catIdx > 0 && localWarnings.length < 3) {
          const warningMessages = [
            `Missing field in ${Math.floor(Math.random() * 5) + 1} ${category.name.toLowerCase()}`,
            `Incomplete data for some ${category.name.toLowerCase()}`,
            `Non-standard format detected in ${category.name.toLowerCase()}`,
            `Field mapping ambiguity in ${category.name.toLowerCase()}`,
          ]
          const newWarning = {
            id: Date.now(),
            message: warningMessages[Math.floor(Math.random() * warningMessages.length)],
            category: category.name,
          }
          localWarnings.push(newWarning)
          setWarnings([...localWarnings])
          addLog(newWarning.message, "warning")
        }

        catIdx += 1
        catProg = 0
        setCurrentCategory(catIdx)
        setCategoryProgress(0)

        if (catIdx < dataCategories.length) {
          addLog(`Starting migration of ${dataCategories[catIdx].name}`)
        } else {
          finalizing = true
          setStatus("Finalizing migration…")
          setProgress(100)
          setEtaSeconds(null)
          addLog("Running final integrity checks…", "info")
          setTimeout(() => {
            setIsComplete(true)
            addLog("Migration complete! All data has been transferred.", "success")
          }, 1200)
          return
        }
      } else {
        setCategoryProgress(catProg)
      }

      // Totals derived from records, ETA derived from planned durations
      const completedRecords = Object.values(localMigrated).reduce((acc, val) => acc + val, 0)
      const inFlight = catIdx < dataCategories.length ? Math.floor((catProg * dataCategories[catIdx].total) / 100) : 0
      setProgress(Math.min(((completedRecords + inFlight) * 100) / TOTAL_RECORDS, 100))

      let remainingMs = 0
      for (let i = catIdx; i < dataCategories.length; i++) {
        remainingMs += plannedDurationMs[i] * (i === catIdx ? 1 - catProg / 100 : 1)
      }
      const eta = Math.ceil(remainingMs / 1000)
      setEtaSeconds(eta > 20 ? Math.ceil(eta / 5) * 5 : eta)

      if (catIdx < dataCategories.length) {
        setStatus(`Migrating ${dataCategories[catIdx].name}…`)
      }
    }, 80)

    return () => clearInterval(interval)
  }, [showInitialAnimation])

  const migratedCount = Object.values(migratedItems).reduce((acc, val) => acc + val, 0)
  const inFlightCount =
    currentCategory < dataCategories.length
      ? Math.floor((categoryProgress * dataCategories[currentCategory].total) / 100)
      : 0
  const liveRecordCount = migratedCount + inFlightCount
  const activeCat = currentCategory < dataCategories.length ? dataCategories[currentCategory] : null
  const activeHex = activeCat?.hex ?? C.green
  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/new-migration/validate"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="mr-2 h-8 w-8 rounded-full bg-card border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Validate
          </Link>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text pb-1">Migration in Progress</h1>
            <p className="text-muted-foreground mt-1">NetSuite to Xero + Gojee data migration</p>
          </div>

          {showInitialAnimation ? (
            <Card className="google-card bg-card/65 border border-border/50 backdrop-blur-md shadow-sm overflow-hidden relative">
              <CardContent className="p-10">
                <div className="flex flex-col items-center justify-center space-y-7">
                  <div className="relative h-28 w-28">
                    <div className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl animate-pulse" />
                    <div className="conic-ring absolute inset-0 rounded-full animate-spin-slower" />
                    <div className="absolute inset-[5px] rounded-full bg-card flex items-center justify-center shadow-inner">
                      <Database className="h-9 w-9 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-semibold">Initializing Migration</h2>
                    <p className="text-muted-foreground mt-1">
                      Establishing secure connections
                      <span className="typing-dots" aria-hidden="true">
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="google-card bg-card/65 border border-border/50 backdrop-blur-md shadow-sm overflow-hidden relative">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                      {isComplete ? "Migration Complete" : "Importing Data"}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mt-1">
                      {isComplete
                        ? "Your data has been successfully migrated"
                        : "Please wait while your data is being imported"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {isComplete ? (
                      <div className="space-y-8">
                        <div className="relative flex flex-col items-center justify-center py-10 overflow-hidden">
                          {!reducedMotion &&
                            confettiPieces.map((piece) => (
                              <span
                                key={piece.id}
                                className="confetti-piece"
                                style={
                                  {
                                    left: `${piece.left}%`,
                                    backgroundColor: piece.color,
                                    animationDelay: `${piece.delay}ms`,
                                    "--drift": `${piece.drift}px`,
                                  } as React.CSSProperties
                                }
                              />
                            ))}
                          <div className="relative mb-7">
                            <div className="absolute -inset-5 rounded-full journey-gradient-bg opacity-25 blur-2xl" />
                            <div className="check-pop relative flex h-24 w-24 items-center justify-center rounded-full journey-gradient-bg shadow-xl">
                              <Check className="h-12 w-12 text-white" strokeWidth={3} />
                            </div>
                          </div>
                          <h3 className="text-2xl font-semibold animate-fade-in-up">Migration Successful</h3>
                          <p className="text-muted-foreground mt-1 animate-fade-in-up animation-delay-200">
                            All your data has been migrated to Xero and Gojee in {elapsedLabel}
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <Card className="border border-border/40 bg-card shadow-sm">
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-foreground">
                                <AnimatedCounter from={0} to={TOTAL_RECORDS} duration={1.4} />
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Total Records</div>
                            </CardContent>
                          </Card>
                          <Card className="border border-border/40 bg-card shadow-sm">
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-green-600">
                                <AnimatedCounter from={0} to={TOTAL_RECORDS - errors.length} duration={1.4} />
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Records Migrated</div>
                            </CardContent>
                          </Card>
                          <Card className="border border-border/40 bg-card shadow-sm">
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold text-amber-600">{warnings.length}</div>
                              <div className="text-xs text-muted-foreground mt-1">Warnings</div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Overall progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <div className="font-medium text-foreground">{status}</div>
                            <div className="font-bold text-primary tabular-nums">{Math.round(progress)}%</div>
                          </div>
                          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full journey-gradient-bg transition-all duration-300 ease-out"
                              style={{ width: `${progress}%` }}
                            />
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent import-shine-animation"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                            <span>
                              {liveRecordCount.toLocaleString()} / {TOTAL_RECORDS.toLocaleString()} records
                            </span>
                            {etaSeconds !== null && <span>~{etaSeconds}s remaining</span>}
                          </div>
                        </div>

                        {/* The conduit: dark command-center panel */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001b2e] p-5 shadow-2xl">
                          <div className="pointer-events-none absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-[#4a9e7a]/25 blur-3xl" />
                          <div className="pointer-events-none absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-[#13b5ea]/15 blur-3xl" />

                          {/* Current category chip */}
                          {activeCat && (
                            <div
                              key={currentCategory}
                              className="animate-fade-in-up relative z-20 mx-auto mb-4 flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 backdrop-blur-md"
                            >
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full"
                                style={{ backgroundColor: activeHex }}
                              >
                                <activeCat.icon className="h-3 w-3 text-white" />
                              </span>
                              <span className="text-xs font-semibold text-white">{activeCat.name}</span>
                              <span className="text-[10px] font-medium text-white/50">
                                {stallMessage ?? phaseFor(categoryProgress)}
                              </span>
                              {stallMessage && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse-dot" />
                              )}
                            </div>
                          )}

                          <div className="relative flex items-center gap-3">
                            {/* Source */}
                            <div className="relative z-10 flex shrink-0 flex-col items-center gap-2">
                              <div className="relative">
                                <div className="absolute -inset-1.5 rounded-2xl bg-[#36677d]/40 blur-md animate-pulse" />
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-3 shadow-lg sm:h-24 sm:w-24">
                                  <img src="/images/netsuite/netsuite-mark.png" alt="NetSuite" className="h-full w-full object-contain" />
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
                                Source
                              </span>
                            </div>

                            {/* Conduit */}
                            <div className="relative min-w-0 flex-1">
                              <svg viewBox="0 0 640 220" className="h-auto w-full" aria-hidden="true">
                                <defs>
                                  <linearGradient id="laneIn" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#36677d" stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="#4a9e7a" stopOpacity="0.5" />
                                  </linearGradient>
                                  <linearGradient id="laneOut" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#4a9e7a" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#13b5ea" stopOpacity="0.45" />
                                  </linearGradient>
                                </defs>

                                {inputPaths.map((d, i) => (
                                  <g key={`in-${i}`}>
                                    <path d={d} fill="none" stroke="url(#laneIn)" strokeWidth="1.5" opacity="0.5" />
                                    <path
                                      d={d}
                                      fill="none"
                                      stroke="url(#laneIn)"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeDasharray="3 22"
                                      className="stream-dash"
                                      style={{ animationDelay: `${i * -0.6}s` }}
                                    />
                                  </g>
                                ))}
                                {outputPaths.map((d, i) => (
                                  <g key={`out-${i}`}>
                                    <path d={d} fill="none" stroke="url(#laneOut)" strokeWidth="1.5" opacity="0.5" />
                                    <path
                                      d={d}
                                      fill="none"
                                      stroke="url(#laneOut)"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeDasharray="3 22"
                                      className="stream-dash"
                                      style={{ animationDelay: `${i * -0.6 - 0.3}s` }}
                                    />
                                  </g>
                                ))}

                                {/* Packets: category-colored in, brand-magenta out (transformed) */}
                                {!reducedMotion &&
                                  inputPaths.map((d, lane) =>
                                    [0, 1].map((n) => (
                                      <g key={`pin-${lane}-${n}`}>
                                        <circle r="7" fill={activeHex} opacity="0.25">
                                          <animateMotion
                                            dur={`${2 + lane * 0.3}s`}
                                            begin={`${-(n * 1.1 + lane * 0.5)}s`}
                                            repeatCount="indefinite"
                                            path={d}
                                          />
                                        </circle>
                                        <circle r="3.5" fill={activeHex}>
                                          <animateMotion
                                            dur={`${2 + lane * 0.3}s`}
                                            begin={`${-(n * 1.1 + lane * 0.5)}s`}
                                            repeatCount="indefinite"
                                            path={d}
                                          />
                                        </circle>
                                      </g>
                                    )),
                                  )}
                                {!reducedMotion &&
                                  outputPaths.map((d, lane) =>
                                    [0, 1].map((n) => (
                                      <g key={`pout-${lane}-${n}`}>
                                        <circle r="6" fill="#13b5ea" opacity="0.25">
                                          <animateMotion
                                            dur={`${1.9 + lane * 0.25}s`}
                                            begin={`${-(n * 1 + lane * 0.45)}s`}
                                            repeatCount="indefinite"
                                            path={d}
                                          />
                                        </circle>
                                        <circle r="3" fill="#13b5ea">
                                          <animateMotion
                                            dur={`${1.9 + lane * 0.25}s`}
                                            begin={`${-(n * 1 + lane * 0.45)}s`}
                                            repeatCount="indefinite"
                                            path={d}
                                          />
                                        </circle>
                                      </g>
                                    )),
                                  )}
                              </svg>

                              {/* Transformation core */}
                              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                                <div key={`core-${currentCategory}`} className="core-pulse relative h-20 w-20 sm:h-24 sm:w-24">
                                  <div className="absolute -inset-3 rounded-full bg-[#4a9e7a]/25 blur-xl animate-pulse" />
                                  <div className="conic-ring absolute inset-0 rounded-full animate-spin-slower" />
                                  <div className="absolute inset-[4px] flex flex-col items-center justify-center rounded-full bg-[#00263e] shadow-inner">
                                    <span className="text-lg font-bold text-white tabular-nums sm:text-xl">
                                      {Math.round(progress)}%
                                    </span>
                                    <span className="text-[8px] font-semibold uppercase tracking-widest text-white/40">
                                      Migrating
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Destination */}
                            <div className="relative z-10 flex shrink-0 flex-col items-center gap-2">
                              <div className="relative">
                                <div
                                  className="absolute -inset-1.5 rounded-2xl bg-[#13b5ea]/30 blur-md animate-pulse transition-opacity duration-1000"
                                  style={{ opacity: 0.35 + (progress / 100) * 0.65 }}
                                />
                                <div className="relative flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 shadow-lg sm:h-24 sm:w-24">
                                  <span className="h-8 w-8 overflow-hidden rounded-full sm:h-9 sm:w-9">
                                    <img src="/images/Xero-logo.png" alt="Xero" className="h-full w-full scale-[1.9] object-contain" />
                                  </span>
                                  <img src="/images/gojee/gojee-tile.png" alt="Gojee" className="h-7 w-7 sm:h-8 sm:w-8" />
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
                                Destination
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Category checklist */}
                        <div className="rounded-2xl border border-border/40 bg-card/50 p-6 shadow-sm">
                          <h3 className="mb-4 text-base font-semibold text-foreground">Migration Progress</h3>
                          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                            {dataCategories.map((category, index) => {
                              const isDone = index < currentCategory
                              const isActive = index === currentCategory
                              const completedCount = isDone
                                ? category.total
                                : isActive
                                  ? Math.floor((categoryProgress * category.total) / 100)
                                  : 0
                              const CategoryIcon = category.icon

                              return (
                                <div
                                  key={category.name}
                                  className={`space-y-1.5 rounded-xl px-3 py-2 transition-all duration-300 ${
                                    isActive
                                      ? "bg-accent/60 ring-1 ring-primary/25"
                                      : isDone
                                        ? "opacity-80"
                                        : "opacity-45"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                      <div className="relative shrink-0">
                                        <div
                                          className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-sm"
                                          style={{ backgroundColor: category.hex }}
                                        >
                                          <CategoryIcon className="h-3.5 w-3.5" />
                                        </div>
                                        {isActive && (
                                          <svg className="absolute -inset-[5px] h-[38px] w-[38px] -rotate-90" viewBox="0 0 38 38">
                                            <circle
                                              cx="19"
                                              cy="19"
                                              r="16.5"
                                              fill="none"
                                              stroke={category.hex}
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeDasharray={`${(categoryProgress / 100) * 103.7} 103.7`}
                                              className="transition-all duration-300"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                      <span className="truncate text-sm font-medium">{category.name}</span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                        {completedCount}/{category.total}
                                      </span>
                                      {isDone ? (
                                        <span className="check-pop inline-flex">
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        </span>
                                      ) : isActive ? (
                                        <span
                                          className="text-xs font-semibold tabular-nums"
                                          style={{ color: category.hex }}
                                        >
                                          {Math.round(categoryProgress)}%
                                        </span>
                                      ) : (
                                        <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/20" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="relative h-1 w-full overflow-hidden rounded-full bg-secondary">
                                    <div
                                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                                        isDone ? "bg-primary/50" : "journey-gradient-bg"
                                      }`}
                                      style={{ width: isDone ? "100%" : isActive ? `${categoryProgress}%` : "0%" }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between border-t border-border/30 pt-6 mt-4">
                    {isComplete ? (
                      <>
                        <Button
                          variant="outline"
                          className="rounded-xl border-border bg-card hover:bg-muted text-foreground transition-all duration-200"
                          asChild
                        >
                          <Link href="/dashboard/new-migration/validate">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                          </Link>
                        </Button>
                        <NextButton to="Report" onClick={() => router.push("/dashboard/new-migration/report")} />
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="ml-auto rounded-xl border-border text-muted-foreground bg-transparent"
                        disabled
                      >
                        Cancel
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>

              <div className="space-y-6">
                {/* Status card */}
                <Card className="google-card bg-card/65 border border-border/50 backdrop-blur-md shadow-sm overflow-hidden relative">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-foreground">Migration Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-border/50 bg-muted/40 p-3.5 shadow-inner">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <RefreshCw className={`h-4 w-4 text-primary ${isComplete ? "" : "animate-spin"}`} />
                        <div>{isComplete ? "Migration Complete" : "Migration in Progress"}</div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {isComplete
                          ? "Your data has been successfully migrated to Xero and Gojee"
                          : (stallMessage ?? status)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border/40 bg-muted/20 p-3.5 shadow-sm">
                        <div className="text-2xl font-bold text-foreground tabular-nums">
                          {liveRecordCount.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Records Migrated</div>
                      </div>
                      <div className="rounded-xl border border-border/40 bg-muted/20 p-3.5 shadow-sm">
                        <div className="text-2xl font-bold text-primary tabular-nums">
                          {isComplete ? "100%" : `${Math.round(progress)}%`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Complete</div>
                      </div>
                      <div className="rounded-xl border border-border/40 bg-muted/20 p-3.5 shadow-sm">
                        <div className="text-2xl font-bold text-amber-600 tabular-nums">{warnings.length}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Warnings</div>
                      </div>
                      <div className="rounded-xl border border-border/40 bg-muted/20 p-3.5 shadow-sm">
                        <div className="text-2xl font-bold text-foreground tabular-nums">{elapsedLabel}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Elapsed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Terminal log */}
                <Card className="google-card bg-card/65 border border-border/50 backdrop-blur-md shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#00172a] shadow-inner">
                      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                          <span className="ml-2 font-mono text-[10px] text-white/40">migration.log</span>
                        </div>
                        {!isComplete && (
                          <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-widest text-green-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-dot" />
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="max-h-[380px] overflow-auto p-2 font-mono text-[11px] leading-relaxed">
                        {!isComplete && (
                          <div className="px-2 py-0.5 text-white/60">
                            <span className="terminal-caret">▍</span>
                          </div>
                        )}
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="animate-fadeIn flex gap-2 rounded px-2 py-1 hover:bg-white/5"
                          >
                            <span className="shrink-0 text-white/30">{log.time}</span>
                            <span
                              className={`shrink-0 ${
                                log.type === "error"
                                  ? "text-red-400"
                                  : log.type === "warning"
                                    ? "text-amber-400"
                                    : log.type === "success"
                                      ? "text-green-400"
                                      : "text-teal-300"
                              }`}
                            >
                              {log.type === "error" ? "✕" : log.type === "warning" ? "⚠" : log.type === "success" ? "✓" : "›"}
                            </span>
                            <span className="min-w-0 flex-1 text-white/75">{log.message}</span>
                          </div>
                        ))}
                        {logs.length === 0 && <div className="p-3 text-center text-white/40">No logs yet…</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {warnings.length > 0 && (
                  <Card className="google-card bg-card/65 border border-border/50 backdrop-blur-md shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-amber-600">Warnings</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[200px] overflow-auto">
                      <div className="space-y-2">
                        {warnings.map((warning) => (
                          <div
                            key={warning.id}
                            className="animate-fade-in-up rounded-xl border-l-4 border-amber-500 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-500 shadow-sm"
                          >
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                              <div>
                                <div className="font-semibold text-sm">{warning.category}</div>
                                <div className="text-xs opacity-90 mt-0.5">{warning.message}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {errors.length > 0 && (
                  <Card className="google-card bg-card/65 border border-border/50 backdrop-blur-md shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-destructive">Errors</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[200px] overflow-auto">
                      <div className="space-y-2">
                        {errors.map((error) => (
                          <div
                            key={error.id}
                            className="rounded-xl border-l-4 border-destructive bg-destructive/10 p-3 text-xs text-destructive shadow-sm"
                          >
                            <div className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <div>
                                <div className="font-semibold text-sm">{error.category}</div>
                                <div className="text-xs opacity-90 mt-0.5">{error.message}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        /* Flowing dashes along the conduit lanes */
        @keyframes streamDash {
          to {
            stroke-dashoffset: -25;
          }
        }
        .stream-dash {
          animation: streamDash 0.9s linear infinite;
        }

        /* Rotating gradient ring for the transformation core */
        .conic-ring {
          background: conic-gradient(
            from 0deg,
            transparent 0%,
            #4a9e7a 20%,
            #13b5ea 45%,
            #13b5ea 70%,
            transparent 90%
          );
        }
        @keyframes spinSlower {
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slower {
          animation: spinSlower 4s linear infinite;
        }

        /* Core flashes when a category hands off */
        @keyframes corePulse {
          0% {
            transform: scale(1);
          }
          35% {
            transform: scale(1.12);
          }
          100% {
            transform: scale(1);
          }
        }
        .core-pulse {
          animation: corePulse 0.6s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
        }

        /* Springy check-mark pop */
        @keyframes checkPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.18);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .check-pop {
          animation: checkPop 0.5s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
        }

        /* One-shot confetti burst on success */
        @keyframes confettiFall {
          0% {
            transform: translateY(-10px) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(240px) translateX(var(--drift, 0px)) rotate(540deg);
            opacity: 0;
          }
        }
        .confetti-piece {
          position: absolute;
          top: 0;
          width: 7px;
          height: 11px;
          border-radius: 2px;
          opacity: 0;
          animation: confettiFall 1.6s ease-out forwards;
          pointer-events: none;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        @keyframes importShine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .import-shine-animation {
          animation: importShine 1.8s ease-in-out infinite;
        }

        @keyframes caretBlink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
        .terminal-caret {
          animation: caretBlink 1.1s step-end infinite;
        }

        .typing-dots span {
          animation: caretBlink 1.2s infinite;
        }
        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  )
}
