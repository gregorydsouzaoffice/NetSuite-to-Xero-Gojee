"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { brand } from "@/lib/brand"
import { NETSUITE_ACCOUNT } from "@/lib/demo-data/momento"
import { NetSuiteFrame, NsButton, NsHeading, NS, useNsQuery } from "../frame"

/*
 * Replica of the NetSuite OAuth 2.0 consent page (authorisation code + PKCE, scope rest_webservices).
 * A real build exchanges the returned code at
 * https://<accountId>.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token.
 */
function Consent() {
  const router = useRouter()
  const { account, ret, role, qs } = useNsQuery()
  const [busy, setBusy] = useState(false)

  return (
    <NetSuiteFrame width={460}>
      <NsHeading>Grant access to {brand.productName}?</NsHeading>
      <p className="mt-2 text-sm" style={{ color: NS.muted }}>
        {brand.productName} is requesting access to your NetSuite account.
      </p>
      <dl className="mt-5 space-y-2 rounded-sm border p-4 text-sm" style={{ borderColor: NS.border }}>
        <div className="flex justify-between gap-4">
          <dt style={{ color: NS.muted }}>Account</dt>
          <dd className="text-right font-semibold">
            {NETSUITE_ACCOUNT.companyName} ({account || NETSUITE_ACCOUNT.accountId})
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt style={{ color: NS.muted }}>Role</dt>
          <dd className="font-semibold">{role || "Administrator"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt style={{ color: NS.muted }}>Scope</dt>
          <dd className="font-semibold">REST Web Services</dd>
        </div>
      </dl>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <NsButton secondary type="button" onClick={() => router.push(ret || "/dashboard/new-migration/connect")}>
          Deny
        </NsButton>
        <NsButton
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setTimeout(() => router.push(`/login/netsuite/subsidiary${qs()}`), 700)
          }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Allow
        </NsButton>
      </div>
    </NetSuiteFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <Consent />
    </Suspense>
  )
}
