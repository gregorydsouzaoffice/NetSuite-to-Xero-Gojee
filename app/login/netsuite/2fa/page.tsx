"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Smartphone } from "lucide-react"
import { NetSuiteFrame, NsButton, NsHeading, NS, useNsQuery } from "../frame"

/* Replica of NetSuite two-factor authentication (Momento's Administrator role requires 2FA). */
function TwoFactor() {
  const router = useRouter()
  const { qs } = useNsQuery()
  const [code, setCode] = useState("482916")
  const [busy, setBusy] = useState(false)

  return (
    <NetSuiteFrame>
      <div className="flex items-center gap-3">
        <NsHeading>Two-factor authentication</NsHeading>
      </div>
      <p className="mt-3 text-sm" style={{ color: NS.muted }}>
        Enter the 6-digit verification code from your authenticator app.
      </p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          setBusy(true)
          setTimeout(() => router.push(`/login/netsuite/role${qs()}`), 600)
        }}
      >
        <input
          inputMode="numeric"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="block h-12 w-full rounded-sm border text-center font-mono text-2xl tracking-[0.5em] outline-none focus:ring-2"
          style={{ borderColor: NS.border }}
          aria-label="Verification code"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked /> Trust this device for 30 days
        </label>
        <NsButton type="submit" disabled={code.length !== 6 || busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit
        </NsButton>
      </form>
    </NetSuiteFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <TwoFactor />
    </Suspense>
  )
}
