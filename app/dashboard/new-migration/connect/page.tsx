"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Circle, Database } from "lucide-react"
import MigrationStepper from "@/components/migration-stepper"
import NextButton from "@/components/next-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { NETSUITE_ACCOUNT, SUBSIDIARY_BY_ID, XERO_IDENTITY, XERO_ORG_BY_ID } from "@/lib/demo-data/momento"
import { useDemo } from "@/lib/demo-store"

const RETURN = "/dashboard/new-migration/connect"

export default function ConnectAccounts() {
  const router = useRouter()
  const { state, hydrated } = useDemo()
  const { netsuite, xero, gojee } = state
  const subsidiary = SUBSIDIARY_BY_ID[netsuite.subsidiaryId]
  const org = XERO_ORG_BY_ID[xero.tenantId]

  const platforms = [
    {
      key: "netsuite",
      role: "Source Platform",
      name: "Oracle NetSuite",
      logo: "/images/netsuite/netsuite-mark.png",
      connected: netsuite.connected,
      detail: netsuite.connected ? [subsidiary?.name ?? "", `Account ${netsuite.accountId}`] : null,
      href: `/login/netsuite?account=${NETSUITE_ACCOUNT.accountId}&return=${RETURN}`,
    },
    {
      key: "xero",
      role: "Destination · Accounting",
      name: "Xero",
      logo: "/images/Xero-logo.png",
      zoom: true,
      connected: xero.connected,
      detail: xero.connected ? [org?.name ?? "", XERO_IDENTITY.email] : null,
      href: `/login/xero?return=${RETURN}`,
    },
    {
      key: "gojee",
      role: "Destination · Jobs & inventory",
      name: "Gojee",
      logo: "/images/gojee/gojee-tile.png",
      connected: gojee.connected,
      detail: gojee.connected ? [org?.name.replace(/ Pty Ltd$/, "") ?? "", "Signed in automatically with Xero"] : null,
      href: `/login/gojee?return=${RETURN}`,
    },
  ]

  const nextToConnect = platforms.find((p) => !p.connected)

  const handleNext = () => {
    if (nextToConnect) router.push(nextToConnect.href)
    else router.push("/dashboard/new-migration/extract")
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/new-migration"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="mr-2 h-8 w-8 rounded-full bg-card border border-border/60 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Software Selection
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">New Migration: NetSuite to Xero + Gojee</h1>
            <p className="text-muted-foreground mt-1">Connect your accounts to begin migration</p>
          </div>

          <MigrationStepper step={1} />

          <Card className="google-card bg-card/65 backdrop-blur-md shadow-sm border border-border/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10"></div>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl font-bold tracking-tight text-foreground">
                <Database className="mr-2.5 h-5 w-5 text-primary" />
                Step 1: Connect Your Accounts
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Connect NetSuite and Xero — Gojee signs in automatically with your Xero login. Press Next to connect each one in turn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid gap-6 md:grid-cols-3">
                {platforms.map((p) => (
                  <Card
                    key={p.key}
                    className={`bg-card/50 rounded-2xl border overflow-hidden relative transition-all duration-300 hover:shadow-md ${
                      hydrated && nextToConnect?.key === p.key ? "border-primary/50 ring-2 ring-primary/15" : "border-border/40"
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[80px] -z-10"></div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold">{p.role}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img alt={`${p.name} logo`} className={`h-8 w-8 object-contain ${p.zoom ? "scale-[1.9]" : ""}`} src={p.logo} />
                          </div>
                          <div className="font-semibold text-foreground">{p.name}</div>
                        </div>
                        {p.connected ? (
                          <div className="h-8 w-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center">
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border border-border/45 bg-muted/20 backdrop-blur-sm p-3.5 min-h-[68px]">
                        <div className="text-xs text-muted-foreground">{p.connected ? "Connected as:" : "Status:"}</div>
                        {p.connected && p.detail ? (
                          <>
                            <div className="font-semibold text-sm text-foreground mt-0.5 break-words">{p.detail[0]}</div>
                            <div className="text-xs text-muted-foreground break-all">{p.detail[1]}</div>
                          </>
                        ) : (
                          <div className="font-semibold text-sm text-foreground mt-0.5">
                            {p.key === "gojee" ? "Signs in automatically with Xero" : "Not connected yet"}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button
                        onClick={() => router.push(p.href)}
                        variant="outline"
                        className="w-full rounded-xl border-border bg-card hover:bg-muted text-foreground transition-all duration-200"
                      >
                        {p.connected ? "Reconnect Account" : "Connect Account"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border/30 pt-6 mt-4">
              <NextButton to={nextToConnect ? `Connect ${nextToConnect.name.replace("Oracle ", "")}` : "Extract"} onClick={handleNext} />
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
