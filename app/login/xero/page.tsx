"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { XERO_IDENTITY } from "@/lib/demo-data/momento"
import { XERO, XeroField, XeroFrame, XeroLink, XeroNotice, XeroPrimaryButton, xeroInputClass } from "./xero-frame"

/*
 * Replica of Xero's current login page (demo only). Real build: redirect to
 * https://login.xero.com/identity/connect/authorize with openid profile email + accounting scopes.
 */
function XeroLogin() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return")
  const [email, setEmail] = useState(XERO_IDENTITY.email)
  const [password, setPassword] = useState("demo-password")
  const [busy, setBusy] = useState(false)

  return (
    <XeroFrame>
      <XeroNotice>Xero login has a new look. Your details and security settings haven&apos;t changed.</XeroNotice>

      <h1 className="mt-10 text-[38px] font-bold tracking-[-0.01em]">Log in to your account</h1>

      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          setBusy(true)
          setTimeout(() => router.push(`/login/xero/organization${ret ? `?return=${encodeURIComponent(ret)}` : ""}`), 700)
        }}
      >
        <XeroField label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={xeroInputClass} style={{ borderColor: XERO.field }} />
        </XeroField>
        <XeroField label="Password">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={xeroInputClass}
            style={{ borderColor: XERO.field }}
          />
        </XeroField>

        <div className="flex items-center justify-between gap-4 pt-4">
          <span className="text-[19px]">
            <XeroLink>Forgot your password?</XeroLink>
          </span>
          <XeroPrimaryButton type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Log in
          </XeroPrimaryButton>
        </div>
      </form>

      <div className="mt-12 space-y-4 text-[19px]">
        <p>
          <XeroLink external>Can&apos;t log in?</XeroLink>
        </p>
        <p>
          Don&apos;t have an account? <XeroLink external>Sign up</XeroLink>
        </p>
      </div>
    </XeroFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <XeroLogin />
    </Suspense>
  )
}
