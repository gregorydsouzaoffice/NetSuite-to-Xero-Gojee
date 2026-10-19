"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Ban, Building2, CheckCircle2, CornerDownRight } from "lucide-react"
import NextButton from "@/components/next-button"
import GojeeLogo from "@/app/components/mmc-logo"
import { NETSUITE_ACCOUNT, SUBSIDIARIES, SUBSIDIARY_BY_ID } from "@/lib/demo-data/momento"
import { useDemo } from "@/lib/demo-store"
import type { Subsidiary } from "@/lib/types"
import { cn } from "@/lib/utils"

function depth(s: Subsidiary): number {
  let d = 0
  let p = s.parentId
  while (p) {
    d++
    p = SUBSIDIARY_BY_ID[p]?.parentId ?? null
  }
  return d
}

/** Depth-first order so children sit under their parent, (Consolidated) first */
function treeOrder(): Subsidiary[] {
  const out: Subsidiary[] = []
  const visit = (parentId: string | null) => {
    const kids = SUBSIDIARIES.filter((s) => s.parentId === parentId).sort((a, b) =>
      a.kind === "consolidated" ? -1 : b.kind === "consolidated" ? 1 : 0,
    )
    for (const k of kids) {
      out.push(k)
      visit(k.id)
    }
  }
  visit(null)
  return out
}

/** After NetSuite sign-in: pick the one subsidiary (entity) this migration moves. */
function SubsidiaryPicker() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return") || "/dashboard/new-migration/connect"
  const role = params.get("role") || "Administrator"
  const account = params.get("account") || NETSUITE_ACCOUNT.accountId
  const { state, update } = useDemo()
  const [selected, setSelected] = useState(state.netsuite.subsidiaryId)
  const tree = treeOrder()

  const confirm = () => {
    const sub = SUBSIDIARY_BY_ID[selected]
    update((s) => ({
      ...s,
      netsuite: { connected: true, accountId: account, role, subsidiaryId: selected },
      // Default the Xero org to the one named after this subsidiary
      xero: s.xero.connected ? s.xero : { ...s.xero, tenantId: sub.suggestedTenantId ?? s.xero.tenantId },
    }))
    router.push(ret)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-3xl py-10">
        <div className="mb-8">
          <GojeeLogo size="sm" />
        </div>
        <div className="google-card bg-card/65 backdrop-blur-md shadow-sm border border-border/50">
          <div className="flex items-start gap-3 border-b border-border/40 pb-5">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight gradient-text">Choose the entity to migrate</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Connected to NetSuite account {account} as {role}. One subsidiary moves into one Xero organisation and its Gojee account.
              </p>
            </div>
          </div>

          <ul className="my-4 rounded-xl border border-border/50 divide-y divide-border/40 overflow-hidden">
            {tree.map((s) => {
              const selectable = s.kind === "subsidiary"
              const isSel = selected === s.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!selectable}
                    onClick={() => setSelected(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 py-3 pr-4 text-left text-sm transition-colors",
                      selectable ? "hover:bg-primary/5" : "cursor-not-allowed text-muted-foreground",
                      isSel && "bg-primary/10",
                    )}
                    style={{ paddingLeft: 16 + depth(s) * 22 }}
                  >
                    {depth(s) > 0 && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                        isSel ? "border-primary bg-primary" : "border-muted-foreground/40",
                        !selectable && "opacity-40",
                      )}
                    >
                      {isSel && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <span className={cn("flex-1", isSel && "font-semibold text-foreground")}>{s.name}</span>
                    {selectable ? (
                      <span className="text-xs text-muted-foreground">
                        {s.industry} · {s.currency}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Ban className="h-3 w-3" /> Not migrated
                      </span>
                    )}
                    {isSel && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="flex justify-end border-t border-border/30 pt-5">
            <NextButton to="Back to Connect" onClick={confirm} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <SubsidiaryPicker />
    </Suspense>
  )
}
