"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock } from "lucide-react"
import { NETSUITE_ACCOUNT } from "@/lib/demo-data/momento"
import { NetSuiteFrame, NsButton, NsHeading, NsInput, NS, useNsQuery } from "./frame"

/*
 * Replica of the Oracle NetSuite login reached from the OAuth 2.0 authorise endpoint (R-06):
 * https://<accountId>.app.netsuite.com/app/login/oauth2/authorize.nl
 *   ?response_type=code&client_id=…&redirect_uri=…&scope=rest_webservices
 *   &state=…&code_challenge=…&code_challenge_method=S256
 */
function Login() {
  const router = useRouter()
  const { account, qs } = useNsQuery()
  const [busy, setBusy] = useState(false)
  const [remember, setRemember] = useState(false)

  return (
    <NetSuiteFrame>
      <NsHeading>Log In</NsHeading>
      <form
        className="mt-7 space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          setBusy(true)
          setTimeout(() => router.push(`/login/netsuite/2fa${qs({ account: account || NETSUITE_ACCOUNT.accountId })}`), 700)
        }}
      >
        <NsInput label="Email address" type="email" required defaultValue={NETSUITE_ACCOUNT.login} />
        <NsInput type="password" required placeholder="Password" defaultValue="demo-password" aria-label="Password" />
        <label className="flex cursor-pointer items-center gap-3 text-[17px]">
          <span
            className="grid h-6 w-6 place-items-center rounded-[4px] border-2"
            style={{ borderColor: NS.text, background: remember ? NS.text : "transparent" }}
            onClick={() => setRemember(!remember)}
          >
            {remember && <span className="text-xs font-bold text-white">✓</span>}
          </span>
          Remember Me
        </label>
        <NsButton type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />} Log In
        </NsButton>
      </form>
      <a href="#" className="mt-6 block text-[17px] hover:underline" style={{ color: NS.button }}>
        Forgot your password?
      </a>
      <p className="mt-7 text-[13px] leading-relaxed" style={{ color: NS.muted }}>
        By clicking on the Log In button, you understand and agree to{" "}
        <a href="#" className="underline" style={{ color: NS.navy }}>
          Oracle Terms of Use
        </a>{" "}
        and{" "}
        <a href="#" className="underline" style={{ color: NS.navy }}>
          Oracle Privacy Policy
        </a>
      </p>
    </NetSuiteFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  )
}
