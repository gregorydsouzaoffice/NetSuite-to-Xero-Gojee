"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileText } from "lucide-react"
import MigrationStepper from "@/components/migration-stepper"
import NextButton from "@/components/next-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SUBSIDIARY_BY_ID } from "@/lib/demo-data/momento"
import { categories, totals } from "@/lib/demo-data/migration"
import { useDemo } from "@/lib/demo-store"
import DestinationBadge from "@/components/destination-badge"
import HistoryRange from "@/components/history-range"
import { periodFromDate } from "@/lib/periods"

export default function ExtractData() {
  const router = useRouter()
  const { state } = useDemo()
  const subId = state.netsuite.subsidiaryId
  const fromPeriod = periodFromDate(state.fromDate)
  const cats = categories(subId, fromPeriod)
  const t = totals(subId, fromPeriod)

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/new-migration/connect"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="mr-2 h-8 w-8 rounded-full bg-card border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Connect
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">New Migration: NetSuite to Xero + Gojee</h1>
            <p className="text-muted-foreground mt-1">{SUBSIDIARY_BY_ID[subId]?.name} · extracted to staging</p>
          </div>

          <MigrationStepper step={2} />

          <Card className="google-card bg-card/65 backdrop-blur-md shadow-sm border border-border/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10"></div>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl font-bold tracking-tight text-foreground">
                <FileText className="mr-2.5 h-5 w-5 text-primary" />
                Step 2: Extract Data from NetSuite
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Pick how far back to go, then review what will be migrated — history goes to Xero, open operational records go to Gojee at cutover
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <HistoryRange totalRecords={t.all} />
              <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6">
                <h3 className="mb-4 text-base font-semibold flex items-center text-foreground">
                  <FileText className="mr-2.5 h-5 w-5 text-primary" />
                  Data Preview
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/30">
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Category</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Destination</th>
                        <th className="px-4 py-3 text-right font-semibold text-foreground">Records</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cats.map((item, index) => (
                        <tr
                          key={item.key}
                          className="animate-fade-in-up border-b border-border/30 hover:bg-muted/10 transition-colors"
                          style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{item.label}</div>
                            <div className="text-xs text-muted-foreground">NetSuite: {item.source}</div>
                          </td>
                          <td className="px-4 py-3">
                            <DestinationBadge system={item.system} />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{item.count.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-green-600 font-medium">
                              <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" style={{ animationDelay: `${index * 180}ms` }}></div>
                              Ready
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/30 pt-6 mt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/new-migration/connect")}
                className="rounded-xl border-border bg-card hover:bg-muted text-foreground transition-all duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <NextButton to="Map" onClick={() => router.push("/dashboard/new-migration/map")} />
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
