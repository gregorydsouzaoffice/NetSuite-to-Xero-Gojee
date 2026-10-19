"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react"
import { XERO_ORG_BY_ID } from "@/lib/demo-data/momento"
import { useDemo } from "@/lib/demo-store"

/*
 * Replica of the Gojee login page (official look). Gojee is built on Xero, so
 * "Sign In with Xero" uses the Xero session the user already has: when this page
 * is reached straight after the Xero connection (?auto=1) it signs in by itself.
 * TODO(GOJEE-API): real SSO contract not yet documented.
 */
const GOJEE_NAVY = "#003c64"
const GOJEE_MINT = "#a8d4b9"

function GojeeSignIn() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return") ?? "/dashboard/new-migration/connect"
  const auto = params.get("auto") === "1"
  const { state, update } = useDemo()
  const [stage, setStage] = useState<"idle" | "signing" | "found">("idle")
  const started = useRef(false)
  const org = XERO_ORG_BY_ID[state.xero.tenantId]

  const signInWithXero = () => {
    if (started.current) return
    started.current = true
    setStage("signing")
    setTimeout(() => setStage("found"), 1100)
    setTimeout(() => {
      update((s) => ({ ...s, gojee: { connected: true } }))
      router.push(ret)
    }, 2300)
  }

  // Arrived straight from the Xero sign-in: Gojee logs in automatically with the Xero session
  useEffect(() => {
    if (!auto) return
    const t = setTimeout(signInWithXero, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  return (
    <div className="flex min-h-screen items-start justify-center bg-white px-4 pt-16" style={{ fontFamily: '"Catamaran", "Segoe UI", Helvetica, Arial, sans-serif' }}>
      <div className="w-full max-w-[600px] rounded-[4px] border border-[#d6d6d6] bg-white px-12 pb-10 pt-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/gojee/gojee-logo-tagline.png" alt="gojee — go further" className="mx-auto h-[142px] w-auto" />
        <hr className="my-9 border-[#e5e5e5]" />

        <div className="flex flex-col items-center">
          {stage === "found" ? (
            <div className="flex h-[69px] items-center gap-3 rounded-[6px] px-6 text-[18px] font-semibold" style={{ color: GOJEE_NAVY, background: "#eef7f1" }}>
              <CheckCircle2 className="h-6 w-6" style={{ color: "#3f8f68" }} />
              Signed in — Gojee account for {org?.name.replace(/ Pty Ltd$/, "") ?? "your organisation"}
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithXero}
              disabled={stage === "signing"}
              className="flex h-[69px] min-w-[271px] items-center justify-center gap-3 rounded-[6px] px-8 text-[19px] font-semibold text-white transition hover:brightness-110 disabled:opacity-90"
              style={{ background: GOJEE_NAVY }}
            >
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#13b5ea]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/Xero-logo.png" alt="" className="h-9 w-9 scale-[1.9]" />
              </span>
              {stage === "signing" ? (
                <>
                  Signing in with Xero <Loader2 className="h-5 w-5 animate-spin" />
                </>
              ) : (
                "Sign In with Xero"
              )}
            </button>
          )}
          {auto && stage !== "found" && <p className="mt-3 text-sm text-[#5c6f7b]">Using your Xero sign-in — no Gojee password needed</p>}
        </div>

        <div className="relative my-10 text-center text-[19px] text-[#222]">
          <hr className="absolute inset-x-0 top-1/2 border-[#e5e5e5]" />
          <span className="relative bg-white px-3">or, login with email</span>
        </div>

        <form className="mx-auto max-w-[386px] space-y-4" onSubmit={(e) => e.preventDefault()}>
          {[
            { icon: Mail, placeholder: "Enter email", type: "email" },
            { icon: KeyRound, placeholder: "Enter password", type: "password" },
          ].map((f) => (
            <div key={f.placeholder} className="flex h-[48px] overflow-hidden rounded-[4px] border border-[#c8c8c8]">
              <span className="grid w-[68px] place-items-center border-r border-[#c8c8c8] bg-white">
                <f.icon className="h-5 w-5" style={{ color: "#00263e" }} />
              </span>
              <input type={f.type} placeholder={f.placeholder} className="flex-1 px-4 text-[19px] italic outline-none placeholder:text-[#8a8a8a]" />
            </div>
          ))}
          <button type="submit" className="mt-3 h-[47px] w-full rounded-[8px] text-[19px] text-[#00263e]" style={{ background: GOJEE_MINT }}>
            Sign in
          </button>
          <div className="text-right">
            <a href="#" className="text-[18px] text-[#5c6f7b] hover:underline">
              Forgot password?
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
      <GojeeSignIn />
    </Suspense>
  )
}
