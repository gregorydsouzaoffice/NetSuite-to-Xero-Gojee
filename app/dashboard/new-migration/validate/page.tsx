"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, CheckCircle, CheckSquare, Shield, XCircle } from "lucide-react"
import DestinationBadge from "@/components/destination-badge"
import MigrationStepper from "@/components/migration-stepper"
import NextButton from "@/components/next-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { attachmentSummary, specialHandlingNote } from "@/lib/demo-data/attachments"
import { categories } from "@/lib/demo-data/migration"
import { SUBSIDIARY_BY_ID } from "@/lib/demo-data/momento"
import { useDemo } from "@/lib/demo-store"
import { periodFromDate } from "@/lib/periods"

/** Warnings that don't block the migration (shown like the original Validate step) */
const WARNINGS: Record<string, { count: number; message: string }> = {
  customers: { count: 2, message: "2 customers have no email address. A placeholder contact email will be used." },
  bills: { count: 1, message: "1 bill in USD uses NetSuite's exchange rate of 1.5234 — USD is enabled in the Xero org." },
  journals: { count: 1, message: "Journal JE-HIL-2211 has a line in another subsidiary; it will be balanced on the intercompany loan account 1810-MHG." },
  jobs: { count: 1, message: "1 open sales order will be created as a Gojee job (setting on the Map step). WIP is calculated as cost to date − billed to date." },
  jobTemplates: { count: 1, message: "Job templates are a partial fit — they import only if Gojee supports templates (to be confirmed with Gojee)." },
  attachments: { count: 3, message: "3 attachments are over Xero's 25 MB limit and will be compressed before upload." },
}

export default function ValidateData() {
  const router = useRouter()
  const { state, update } = useDemo()
  const subId = state.netsuite.subsidiaryId
  const fromPeriod = periodFromDate(state.fromDate)
  const [validationComplete, setValidationComplete] = useState(false)
  const [validationProgress, setValidationProgress] = useState(0)

  useEffect(() => {
    // Fast start, jittery decelerating tail — like real record-by-record checks
    const interval = setInterval(() => {
      setValidationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setValidationComplete(true)
          return 100
        }
        const remaining = 100 - prev
        const step = Math.max(0.5, remaining * 0.09) * (0.5 + Math.random())
        return Math.min(100, prev + step)
      })
    }, 120)
    return () => clearInterval(interval)
  }, [])

  const att = attachmentSummary(subId, fromPeriod)
  const warnings: typeof WARNINGS = {
    ...WARNINGS,
    attachments: { count: att.special.length, message: `${att.special.length} of ${att.total.toLocaleString()} files need special handling: ${specialHandlingNote(att)}. Every file stays in the manifest.` },
  }
  const validationResults = categories(subId, fromPeriod).map((c) => {
    const w = warnings[c.key]?.count ?? 0
    return {
      ...c,
      valid: c.count,
      warnings: w,
      status: w > 0 ? "warning" : "success",
    }
  })
  const validationWarnings = Object.entries(warnings).map(([key, w], id) => ({
    id,
    category: validationResults.find((r) => r.key === key)?.label ?? key,
    message: w.message,
  }))

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/new-migration/map"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="mr-2 h-8 w-8 rounded-full bg-card border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Map
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">New Migration: NetSuite to Xero + Gojee</h1>
            <p className="text-muted-foreground mt-1">Validate data before migration</p>
          </div>

          <MigrationStepper step={4} />

          <Card className="google-card bg-card/65 backdrop-blur-md shadow-sm border border-border/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10"></div>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl font-bold tracking-tight text-foreground">
                <CheckSquare className="mr-2.5 h-5 w-5 text-primary" />
                Step 4: Validate Data
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                {SUBSIDIARY_BY_ID[subId]?.name}: every record checked and the trial balance compared with NetSuite, period by period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {!validationComplete ? (
                <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6">
                  <h3 className="mb-4 text-base font-semibold flex items-center text-foreground">
                    <Shield className="mr-2.5 h-5 w-5 text-primary" />
                    Validating Data
                  </h3>
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                      </div>
                      <div className="text-lg font-medium">Validating your data...</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Checking every record and comparing the trial balance for each period.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <div>Validation Progress</div>
                        <div className="text-primary font-semibold">{Math.round(validationProgress)}%</div>
                      </div>
                      <Progress value={validationProgress} className="h-2" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in-up space-y-6">
                  <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6">
                    <h3 className="mb-4 text-base font-semibold flex items-center text-foreground">
                      <Shield className="mr-2.5 h-5 w-5 text-primary" />
                      Validation Results
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-6 gap-4 border-b border-border/30 pb-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        <div className="col-span-2">Category</div>
                        <div>Destination</div>
                        <div>Records</div>
                        <div>Valid</div>
                        <div className="text-right">Status</div>
                      </div>
                      {validationResults.map((result, index) => (
                        <div
                          key={result.key}
                          className="animate-fade-in-up grid grid-cols-6 gap-4 items-center py-3 text-sm border-b border-border/20 last:border-0 hover:bg-muted/5 transition-colors"
                          style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
                        >
                          <div className="col-span-2 font-medium text-foreground">{result.label}</div>
                          <div>
                            <DestinationBadge system={result.system} />
                          </div>
                          <div className="text-muted-foreground tabular-nums">{result.count.toLocaleString()}</div>
                          <div className="text-foreground tabular-nums">
                            {result.valid.toLocaleString()}{" "}
                            {result.warnings > 0 && <span className="text-amber-600 text-xs font-medium">({result.warnings} warnings)</span>}
                          </div>
                          <div className="text-right">
                            {result.status === "success" ? (
                              <div className="flex items-center justify-end text-green-600 font-medium text-xs">
                                <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                                Valid
                              </div>
                            ) : result.status === "warning" ? (
                              <div className="flex items-center justify-end text-amber-600 font-medium text-xs">
                                <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
                                Warnings
                              </div>
                            ) : (
                              <div className="flex items-center justify-end text-red-600 font-medium text-xs">
                                <XCircle className="h-4 w-4 mr-1 text-red-500" />
                                Errors
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md p-6">
                    <h3 className="mb-4 text-base font-semibold flex items-center text-amber-800">
                      <AlertTriangle className="mr-2.5 h-5 w-5 text-amber-600" />
                      Warnings
                    </h3>
                    <div className="space-y-4">
                      {validationWarnings.map((warning) => (
                        <div key={warning.id} className="flex items-start gap-3 border-b border-amber-500/10 pb-3 last:border-0 last:pb-0">
                          <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-amber-800 text-sm">{warning.category}</div>
                            <div className="text-xs text-amber-800/80 mt-0.5 leading-relaxed">{warning.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-xs text-amber-800/70 font-medium">* These warnings won&apos;t prevent migration, but you may want to review them.</div>
                  </div>

                  {(
                    <div className="animate-fade-in-up rounded-2xl border border-green-500/20 bg-green-500/5 backdrop-blur-md p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-green-800">Ready for Migration</h3>
                          <p className="text-sm text-green-800/80 mt-1 leading-relaxed">
                            Your data has been validated and is ready to be migrated to Xero and Gojee.
                          </p>
                          <p className="text-xs text-green-800/70 mt-2 font-medium">
                            Total records: {validationResults.reduce((acc, r) => acc + r.count, 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/30 pt-6 mt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/new-migration/map")}
                className="rounded-xl border-border bg-card hover:bg-muted text-foreground transition-all duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <NextButton to="Import" onClick={() => router.push("/dashboard/new-migration/import")} disabled={!validationComplete} />
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
