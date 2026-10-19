"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AnimatedCounter from "@/app/components/animated-counter"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { ModuleComparisonModal } from "./module-comparison-modal"
import { attachmentSummary, specialHandlingNote } from "@/lib/demo-data/attachments"
import { categories, sampleRows } from "@/lib/demo-data/migration"
import { SUBSIDIARY_BY_ID, XERO_ORG_BY_ID } from "@/lib/demo-data/momento"
import { useDemo } from "@/lib/demo-store"
import { LAST_CLOSED_PERIOD, formatDate, lastDayOfPeriod, periodFromDate, periodsInScope } from "@/lib/periods"

const TAB_ORDER = [
  "summary",
  "accounts",
  "customers",
  "vendors",
  "items",
  "invoices",
  "bills",
  "creditNotes",
  "billCredits",
  "invoicePayments",
  "billPayments",
  "bank",
  "journals",
  "inventoryJournals",
  "attachments",
  "stock",
  "jobs",
  "jobTasks",
  "jobTemplates",
  "jobBudgets",
  "jobCostRevenue",
  "retention",
  "quotes",
  "purchaseOrders",
  "warnings",
]

const TAB_LABEL: Record<string, string> = {
  summary: "Summary",
  accounts: "Chart of Accounts",
  customers: "Customers",
  vendors: "Suppliers",
  items: "Items",
  invoices: "Invoices",
  bills: "Bills",
  creditNotes: "Credit Notes",
  billCredits: "Bill Credits",
  invoicePayments: "Invoice Payments",
  billPayments: "Bill Payments",
  bank: "Bank",
  journals: "Journals",
  inventoryJournals: "Inventory Journals",
  attachments: "Attachments",
  stock: "Gojee · Stock",
  jobs: "Gojee · Jobs & WIP",
  jobTasks: "Gojee · Tasks",
  jobTemplates: "Gojee · Templates",
  jobBudgets: "Gojee · Budgets",
  jobCostRevenue: "Gojee · Cost & Revenue",
  retention: "Gojee · Retention",
  quotes: "Gojee · Quotes",
  purchaseOrders: "Gojee · Purchase Orders",
  warnings: "Warnings",
}

const comparativeReports = [
  {
    key: "trial-balance",
    title: "Comparative Trial Balance",
    body: "Compare your trial balance between NetSuite and Xero, account by account, for every period.",
    tile: "journey-gradient-bg",
  },
  {
    key: "aged-receivable",
    title: "Comparative Aged Receivable",
    body: "Compare customer outstanding balances between NetSuite and Xero at cutover.",
    tile: "gradient-bg",
  },
  {
    key: "aged-payable",
    title: "Comparative Aged Payable",
    body: "Compare supplier outstanding balances between NetSuite and Xero at cutover.",
    tile: "bg-[hsl(var(--brand-teal))]",
  },
  {
    key: "inventory",
    title: "Comparative Inventory",
    body: "Compare stock quantities and values: NetSuite, Gojee, and Xero's inventory account.",
    tile: "bg-primary",
  },
  {
    key: "jobs-wip",
    title: "Comparative Jobs & WIP",
    body: "Compare open jobs, cost and billed to date, WIP and retention between NetSuite and Gojee.",
    tile: "bg-[hsl(var(--brand-pink))]",
  },
  {
    key: "attachments",
    title: "Attachment Manifest",
    body: "Every NetSuite file: record type and ID, file name, format, size, and where it landed in Xero, Gojee, Xero Files or external storage.",
    tile: "bg-[hsl(var(--brand-violet))]",
  },
]

const RING_CIRCUMFERENCE = 2 * Math.PI * 52

export default function MigrationReport() {
  const { state } = useDemo()
  const subId = state.netsuite.subsidiaryId
  const fromPeriod = periodFromDate(state.fromDate)
  const tabData = sampleRows(subId)
  const att = attachmentSummary(subId, fromPeriod)
  const [activeTab, setActiveTab] = useState("summary")
  const [ringDrawn, setRingDrawn] = useState(false)
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({})

  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  useEffect(() => {
    const end = new Date()
    const start = new Date(end.getTime() - (3 * 60 + 25) * 1000) // 3m 25s ago
    const formatTime = (date: Date) => date.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const formatDate = (date: Date) => date.toLocaleDateString("en-GB")

    setEndTime(`${formatDate(end)} - ${formatTime(end)}`)
    setStartTime(`${formatDate(start)} - ${formatTime(start)}`)

    const t = setTimeout(() => setRingDrawn(true), 300)
    return () => clearTimeout(t)
  }, [])

  const migrationData: {
    completed: Record<string, number>
    total: Record<string, number>
    warnings: { id: number; category: string; message: string }[]
    errors: { id: number; category: string; message: string }[]
  } = {
    completed: Object.fromEntries(categories(subId, fromPeriod).map((c) => [c.label, c.count])),
    total: Object.fromEntries(categories(subId, fromPeriod).map((c) => [c.label, c.count])),
    warnings: [
      { id: 1, category: "Customers", message: "2 customers had no email address. A placeholder contact email was used." },
      { id: 2, category: "Bills", message: "1 bill in USD kept NetSuite's exchange rate (1.5234). USD is enabled in the Xero org." },
      {
        id: 3,
        category: "Journals",
        message: "Journal JE-HIL-2211 had a line in another subsidiary. It was balanced on intercompany loan account 1810-MHG.",
      },
      {
        id: 4,
        category: "Attachments",
        message: `${att.total.toLocaleString()} files migrated with a manifest line each — ${specialHandlingNote(att)}.`,
      },
    ],
    errors: [],
  }

  const totalRecords = Object.values(migrationData.total).reduce((a, b) => a + b, 0)
  const completedRecords = Object.values(migrationData.completed).reduce((a, b) => a + b, 0)
  const successRate = (completedRecords / totalRecords) * 100
  const successRateLabel = successRate.toFixed(1)

  const handleViewReport = (reportType: string) => {
    setIsDownloading((d) => ({ ...d, [reportType]: true }))
    window.open(`/reports/${reportType}`, "_blank")
    setTimeout(() => setIsDownloading((d) => ({ ...d, [reportType]: false })), 600)
  }

  const stagger = (i: number, base = 0) =>
    ({ animationDelay: `${base + i * 100}ms`, animationFillMode: "both" }) as React.CSSProperties

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8 animate-fade-in-up" style={{ animationFillMode: "both" }}>
          <Link href="/dashboard/new-migration/import" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Import
          </Link>
        </div>

        <div className="space-y-6">
          {/* Victory header */}
          <div
            className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur-md sm:p-8"
            style={{ animationFillMode: "both" }}
          >
            <div className="journey-gradient-bg absolute inset-x-0 top-0 h-0.5" />
            <div className="pointer-events-none absolute -top-20 right-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-[hsl(var(--brand-pink)/0.08)] blur-3xl" />

            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="check-pop flex h-11 w-11 items-center justify-center rounded-full journey-gradient-bg shadow-lg">
                    <Check className="h-6 w-6 text-white" strokeWidth={3} />
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight gradient-text pb-1">Migration Report</h1>
                </div>
                <p className="text-muted-foreground">
                  NetSuite to Xero + Gojee migration completed on{" "}
                  {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Successfully completed
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="mr-1.5 h-3.5 w-3.5" /> 3 min 25 sec
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Layers className="mr-1.5 h-3.5 w-3.5" /> {totalRecords.toLocaleString()} records
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> {Object.keys(migrationData.total).length} data categories
                  </span>
                </div>
              </div>

              {/* Success-rate ring */}
              <div className="relative mx-auto shrink-0 lg:mx-0">
                <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
                  <defs>
                    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--brand-teal))" />
                      <stop offset="100%" stopColor="hsl(var(--brand-pink))" />
                    </linearGradient>
                  </defs>
                  <circle cx="66" cy="66" r="52" fill="none" strokeWidth="9" className="stroke-secondary" />
                  <circle
                    cx="66"
                    cy="66"
                    r="52"
                    fill="none"
                    stroke="url(#ringGradient)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringDrawn ? RING_CIRCUMFERENCE * (1 - successRate / 100) : RING_CIRCUMFERENCE}
                    style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.2, 0, 0, 1)" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold tabular-nums text-foreground">
                    <AnimatedCounter from={0} to={Number(successRateLabel)} decimals={1} duration={1.6} suffix="%" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Success rate
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Count-up stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              {
                label: "Total Records",
                value: totalRecords,
                icon: Layers,
                color: "text-foreground",
                accent: "bg-primary",
              },
              {
                label: "Successfully Imported",
                value: completedRecords,
                icon: CheckCircle,
                color: "text-green-600",
                accent: "bg-green-500",
              },
              {
                label: "Warnings",
                value: migrationData.warnings.length,
                icon: AlertTriangle,
                color: "text-amber-500",
                accent: "bg-amber-500",
              },
              {
                label: "Errors",
                value: migrationData.errors.length,
                icon: XCircle,
                color: "text-muted-foreground",
                accent: "bg-border",
              },
            ].map((stat, i) => (
              <Card
                key={stat.label}
                className="animate-fade-in-up group relative overflow-hidden border-border/50 bg-card/70 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                style={stagger(i, 100)}
              >
                <div className={`absolute inset-x-0 top-0 h-0.5 ${stat.accent} opacity-60`} />
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <stat.icon
                      className={`mb-2 h-5 w-5 ${stat.color} opacity-70 transition-transform duration-300 group-hover:scale-110`}
                    />
                    <div className={`text-3xl font-extrabold tracking-tight tabular-nums ${stat.color}`}>
                      <AnimatedCounter from={0} to={stat.value} duration={1.4} />
                    </div>
                    <div className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparative reports */}
          <Card
            className="animate-fade-in-up border-border/50 bg-card/70 backdrop-blur-md shadow-sm"
            style={stagger(0, 400)}
          >
            <CardHeader className="flex flex-col gap-4 border-b border-border/30 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Comparative Reports</CardTitle>
                <CardDescription className="text-muted-foreground">
                  View comparative reports to analyze your migrated data consistency
                </CardDescription>
              </div>
              <ModuleComparisonModal className="shadow-sm hover:shadow transition-all" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-3">
                {comparativeReports.map((report, i) => (
                  <div
                    key={report.key}
                    className="animate-fade-in-up group flex flex-col rounded-xl border border-border/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                    style={stagger(i, 500)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-md transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110 ${report.tile}`}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="font-semibold text-foreground">{report.title}</div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{report.body}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto border-border/50 bg-background/50 transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                      onClick={() => handleViewReport(report.key)}
                      disabled={isDownloading[report.key]}
                    >
                      {isDownloading[report.key] ? (
                        <>Opening…</>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />{" "}
                          View Report
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed report */}
          <Card
            className="animate-fade-in-up border-border/50 bg-card/70 backdrop-blur-md shadow-sm"
            style={stagger(0, 600)}
          >
            <CardHeader className="border-b border-border/30 pb-4">
              <CardTitle className="text-xl font-bold">Detailed Report</CardTitle>
              <CardDescription className="text-muted-foreground">Review the details of your migration</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6 flex flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
                  {TAB_ORDER.map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                    >
                      {TAB_LABEL[tab] ?? tab}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="summary" className="space-y-6 mt-4">
                  <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
                    <h3 className="mb-4 text-base font-semibold text-foreground">Migration Overview</h3>
                    <div className="space-y-3">
                      {[
                        ["Migration ID", <span key="id" className="font-mono">MIG-2026-0142</span>],
                        ["Start Time", startTime],
                        ["End Time", endTime],
                        ["Duration", "3 minutes, 25 seconds"],
                        ["Entity", SUBSIDIARY_BY_ID[subId]?.name ?? ""],
                        ["History migrated", `${formatDate(state.fromDate)} – ${formatDate(lastDayOfPeriod(LAST_CLOSED_PERIOD))} (${periodsInScope(fromPeriod).length} periods)`],
                        ["Source", "Oracle NetSuite (SuiteQL REST, OAuth 2.0)"],
                        ["Destinations", "Xero (Accounting API) + Gojee"],
                        ["Xero organisation", XERO_ORG_BY_ID[state.xero.tenantId]?.name ?? ""],
                      ].map(([label, value], i) => (
                        <div
                          key={i}
                          className="animate-fade-in-up grid grid-cols-2 gap-4 border-b border-border/30 pb-2.5 text-sm last:border-0"
                          style={stagger(i, 0)}
                        >
                          <div className="font-medium text-muted-foreground">{label}</div>
                          <div className="text-foreground">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
                    <h3 className="mb-4 text-base font-semibold text-foreground">Data Categories</h3>
                    <div className="space-y-3">
                      {Object.keys(migrationData.total).map((category, i) => {
                        const done = migrationData.completed[category]
                        const total = migrationData.total[category]
                        const pct = (done / total) * 100
                        return (
                          <div key={category} className="animate-fade-in-up space-y-1.5" style={stagger(i, 0)}>
                            <div className="flex items-center justify-between text-sm">
                              <div className="text-foreground font-medium">{category}</div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    done === total
                                      ? "text-green-600 bg-green-500/10"
                                      : "text-amber-600 bg-amber-500/10"
                                  }`}
                                >
                                  {done}/{total} Imported
                                </span>
                                {done === total ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                )}
                              </div>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className={`h-full rounded-full ${done === total ? "bg-primary/60" : "bg-amber-500/70"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {migrationData.warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">Warnings</div>
                          <p className="text-xs text-muted-foreground">
                            {migrationData.warnings.length} records were imported with warnings. See the Warnings tab for details.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="warnings" className="space-y-4 mt-4">
                  <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
                    <h3 className="mb-4 text-base font-semibold text-foreground">Warning Details</h3>
                    <div className="space-y-3">
                      {migrationData.warnings.map((warning, i) => (
                        <div
                          key={warning.id}
                          className="animate-fade-in-up rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 hover:bg-amber-500/10 transition-colors"
                          style={stagger(i, 0)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">{warning.category}</div>
                              <p className="text-xs text-muted-foreground mt-1">{warning.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {Object.entries(tabData).map(([key, data]) => (
                  <TabsContent key={key} value={key} className="space-y-6 mt-4">
                    <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
                      <h3 className="mb-4 text-base font-semibold text-foreground">{data.title}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-border/50 text-muted-foreground">
                              {data.headers.map((h, i) => (
                                <th key={i} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i === data.headers.length - 1 ? 'text-right' : 'text-left'}`}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((row, rIndex) => (
                              <tr
                                key={rIndex}
                                className="animate-fade-in-up border-b border-border/30 hover:bg-muted/5 transition-colors"
                                style={{ animationDelay: `${rIndex * 60}ms`, animationFillMode: "both" }}
                              >
                                {row.map((cell, cIndex) => (
                                  <td key={cIndex} className={`px-4 py-3 ${cIndex === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'} ${cIndex === row.length - 1 ? 'text-right' : 'text-left'}`}>
                                    {cIndex === row.length - 1 && cell === "Imported" ? (
                                      <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-600">
                                        <CheckCircle className="mr-1 h-3 w-3" />
                                        {cell}
                                      </span>
                                    ) : cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border/30 pt-4">
              <Button variant="outline" asChild className="border-border/50 hover:bg-muted/30">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* QA callout */}
          <Card
            className="animate-fade-in-up relative overflow-hidden border border-primary/20 shadow-sm rounded-2xl"
            style={stagger(0, 700)}
          >
            <div className="google-gradient absolute inset-0" />
            <div className="journey-gradient-bg absolute inset-x-0 top-0 h-0.5" />
            <CardContent className="relative p-8">
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-lg">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div className="text-xl font-bold text-foreground">
                  Your financial migration is {successRateLabel}% complete!
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Want MMC to do a manual QA to ensure 100% accuracy? Our experts can review your migrated data for
                  complete peace of mind.
                </p>
                <Button
                  size="lg"
                  className="premium-button rounded-full px-8 font-semibold"
                  onClick={() => {
                    alert("The MMC team has been notified and will reach out within 24 hours.")
                  }}
                >
                  Request Manual QA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
