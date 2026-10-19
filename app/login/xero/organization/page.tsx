"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, ChevronDown, Loader2 } from "lucide-react"
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
    <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: "#1e3145" }}>
      <main className="flex flex-1 flex-col items-center px-4 pt-12">
        {/* App ⇄ Xero */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/gojee/gojee-tile.png" alt="" className="h-14 w-14 rounded-xl shadow-sm" />
          <span className="flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#a6b0bb]" />
            ))}
          </span>
          <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[#13b5ea]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/Xero-logo.png" alt="Xero" className="h-14 w-14 scale-[1.92]" />
          </span>
        </div>

        <div className="mt-7 w-full max-w-[460px]">
          <h1 className="text-center text-[24px] font-bold leading-snug text-[#000a1e]">{brand.productName} wants to connect to your Xero organisation</h1>
          <p className="mt-2 text-center text-[14px] text-[#59687a]">
            Logged in as <span className="font-semibold text-[#1e3145]">{XERO_IDENTITY.email}</span>
          </p>

          <label className="mt-7 block">
            <span className="text-[13px] font-semibold text-[#59687a]">Organisation</span>
            <span className="relative mt-1.5 block">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="block h-[52px] w-full appearance-none rounded-[6px] border border-[#a6b0bb] bg-white px-3.5 pr-10 text-[16px] text-[#000a1e] outline-none focus:shadow-[0_0_0_3px_rgba(0,120,200,0.25)]"
              >
                {orgs.map((o) => (
                  <option key={o.tenantId} value={o.tenantId}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#59687a]" />
            </span>
          </label>

          <div className="mt-6 rounded-[8px] border border-[#e1e6ea] bg-[#f7f9fa] p-5">
            <div className="text-[14px] font-bold text-[#000a1e]">This app will be able to:</div>
            <ul className="mt-3 space-y-2.5 text-[14px]">
              {SCOPES.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0078c8]" strokeWidth={3} />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-[#59687a]">
            By allowing access, you agree to the transfer of your data between Xero and this app in accordance with Xero&apos;s{" "}
            <a href="#" className="font-semibold text-[#0078c8] hover:underline">
              terms of use
            </a>
            . You can disconnect at any time from Connected apps in Xero.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => router.push(ret)}
              className="h-12 flex-1 rounded-[6px] border border-[#a6b0bb] bg-white text-[15px] font-bold text-[#000a1e] hover:bg-[#f7f9fa]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={allow}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[6px] text-[15px] font-bold text-white transition-colors hover:bg-[#00609f] disabled:opacity-80"
              style={{ background: busy ? "#00609f" : XERO_BLUE }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Allow access
            </button>
          </div>
        </div>
      </main>
      <footer className="mt-10 border-t border-[#e1e6ea] px-6 py-5 text-center text-[12px] text-[#59687a]">© Xero Limited · Privacy · Terms · Security</footer>
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
