"use client"

import { Suspense, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { XERO_IDENTITY } from "@/lib/demo-data/momento"

/*
 * Replica of the Xero login page (demo only). Real build: redirect to
 * https://login.xero.com/identity/connect/authorize with openid profile email + accounting scopes.
 * Xero's own colours are used deliberately here.
 */
const XERO_BLUE = "#0078c8"

function XeroLogin() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return")
  const [email, setEmail] = useState(XERO_IDENTITY.email)
  const [password, setPassword] = useState("demo-password")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f5f6f8] px-4 pt-16 font-sans text-[#1e3145]">
      <Image src="/images/Xero-logo.png" alt="Xero" width={120} height={120} className="-my-6" priority />
      <div className="mt-4 w-full max-w-[400px] rounded-md bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
        <h1 className="text-center text-[22px] font-bold">Log in to Xero</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setBusy(true)
            setTimeout(() => router.push(`/login/xero/organization${ret ? `?return=${encodeURIComponent(ret)}` : ""}`), 700)
          }}
        >
          <label className="block text-sm font-semibold">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 block h-10 w-full rounded border border-[#a6b0bb] px-3 text-[15px] font-normal outline-none focus:border-[#0078c8] focus:ring-2 focus:ring-[#0078c8]/25"
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <span className="relative mt-1.5 block">
              <input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block h-10 w-full rounded border border-[#a6b0bb] px-3 pr-10 text-[15px] font-normal outline-none focus:border-[#0078c8] focus:ring-2 focus:ring-[#0078c8]/25"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#59687a]"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded text-[15px] font-semibold text-white transition hover:brightness-95 disabled:opacity-80"
            style={{ background: XERO_BLUE }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Log in
          </button>
          <div className="flex justify-between text-sm">
            <a className="text-[#0078c8] hover:underline" href="#">
              Forgot password?
            </a>
            <a className="text-[#0078c8] hover:underline" href="#">
              Can&apos;t log in?
            </a>
          </div>
        </form>
      </div>
          </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <XeroLogin />
    </Suspense>
  )
}
