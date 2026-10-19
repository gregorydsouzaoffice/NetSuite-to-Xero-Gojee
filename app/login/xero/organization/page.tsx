"use client"

import { Suspense, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { brand } from "@/lib/brand"
import { SUBSIDIARY_BY_ID, XERO_IDENTITY, XERO_ORGS } from "@/lib/demo-data/momento"
import { useDemo } from "@/lib/demo-store"

/* Replica of Xero's app consent screen: pick the one organisation this entity migrates into. Xero's own colours on purpose. */
const XERO_BLUE = "#0078c8"

const SCOPES = [
  "View your name, email address and user profile",
  "View and manage your organisation settings (chart of accounts, tax rates, tracking)",
  "View and manage your contacts",
  "View and manage your business transactions",
  "View your reports (trial balance, aged receivables and payables)",
]

function Consent() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return") ?? "/dashboard/new-migration/connect"
  const { state, update } = useDemo()
  // Suggest the org named after the NetSuite subsidiary chosen earlier
  const suggested = SUBSIDIARY_BY_ID[state.netsuite.subsidiaryId]?.suggestedTenantId ?? state.xero.tenantId
  const [selected, setSelected] = useState(suggested)
  const [busy, setBusy] = useState(false)
  const orgs = XERO_ORGS.filter((o) => o.tenantId !== "xt-demo").concat(XERO_ORGS.filter((o) => o.tenantId === "xt-demo"))

  const allow = () => {
    setBusy(true)
    setTimeout(() => {
      update((s) => ({ ...s, xero: { connected: true, tenantId: selected } }))
      // Gojee is built on Xero: the Xero sign-in logs the user in to Gojee automatically
      router.push(state.gojee.connected ? ret : `/login/gojee?auto=1&return=${encodeURIComponent(ret)}`)
    }, 800)
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f5f6f8] px-4 py-10 font-sans text-[#1e3145]">
      <div className="w-full max-w-[500px] rounded-md bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-center gap-4 border-b px-8 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/gojee/gojee-tile.png" alt="" className="h-12 w-12" />
          <span className="text-[#a6b0bb]">⇄</span>
          <Image src="/images/Xero-logo.png" alt="Xero" width={84} height={84} className="-m-4" />
        </div>
        <div className="px-8 py-6">
          <h1 className="text-center text-xl font-bold">{brand.productName} wants access to your Xero organisation</h1>
          <p className="mt-2 text-center text-sm text-[#59687a]">Logged in as {XERO_IDENTITY.email}</p>

          <label className="mt-6 block text-sm font-semibold">
            Organisation
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-1.5 block h-11 w-full rounded border border-[#a6b0bb] bg-white px-3 text-[15px] font-normal outline-none focus:border-[#0078c8] focus:ring-2 focus:ring-[#0078c8]/25"
            >
              {orgs.map((o) => (
                <option key={o.tenantId} value={o.tenantId}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-6">
            <div className="text-sm font-semibold">This will allow {brand.productName} to:</div>
            <ul className="mt-2 space-y-1.5 text-sm text-[#3c4a5a]">
              {SCOPES.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#3c4a5a]" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-[#59687a]">
            By allowing access, you agree to the transfer of your data between Xero and this application in accordance with Xero&apos;s{" "}
            <a href="#" className="text-[#0078c8] underline">
              terms of use
            </a>
            . You can disconnect at any time from Connected apps in Xero.
          </p>

          <div className="mt-6 flex gap-3">
            <button type="button" onClick={() => router.push(ret)} className="h-10 flex-1 rounded border border-[#a6b0bb] text-[15px] font-semibold hover:bg-[#f5f6f8]">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={allow}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded text-[15px] font-semibold text-white disabled:opacity-60"
              style={{ background: XERO_BLUE }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Allow access
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <Consent />
    </Suspense>
  )
}
