"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { XERO_IDENTITY } from "@/lib/demo-data/momento"

/*
 * Replica of the current Xero login page (demo only). Real build: redirect to
 * https://login.xero.com/identity/connect/authorize with openid profile email + accounting scopes.
 * Xero's own colours are used deliberately here.
 */
const XERO = {
  blue: "#0078c8",
  blueHover: "#00609f",
  navy: "#000a1e",
  text: "#1e3145",
  muted: "#59687a",
  border: "#a6b0bb",
  line: "#e1e6ea",
}

function FloatingInput({
  label,
  type,
  value,
  onChange,
  right,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  right?: React.ReactNode
}) {
  return (
    <label
      className="group relative block rounded-[6px] border bg-white transition-shadow focus-within:shadow-[0_0_0_3px_rgba(0,120,200,0.25)]"
      style={{ borderColor: XERO.border }}
    >
      <span className="pointer-events-none absolute left-3.5 top-2 text-[12px] font-semibold" style={{ color: XERO.muted }}>
        {label}
      </span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block h-[56px] w-full rounded-[6px] bg-transparent px-3.5 pb-1.5 pt-6 text-[16px] outline-none"
        style={{ color: XERO.navy }}
      />
      {right && <span className="absolute right-2 top-1/2 -translate-y-1/2">{right}</span>}
    </label>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function XeroLogin() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return")
  const [email, setEmail] = useState(XERO_IDENTITY.email)
  const [password, setPassword] = useState("demo-password")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: XERO.text }}>
      <main className="flex flex-1 flex-col items-center px-4 pt-14">
        <span className="grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-full bg-[#13b5ea]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/Xero-logo.png" alt="Xero" className="h-[58px] w-[58px] scale-[1.92]" />
        </span>

        <div className="mt-8 w-full max-w-[400px]">
          <h1 className="text-center text-[28px] font-bold tracking-[-0.01em]" style={{ color: XERO.navy }}>
            Log in to Xero
          </h1>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setBusy(true)
              setTimeout(() => router.push(`/login/xero/organization${ret ? `?return=${encodeURIComponent(ret)}` : ""}`), 700)
            }}
          >
            <FloatingInput label="Email address" type="email" value={email} onChange={setEmail} />
            <FloatingInput
              label="Password"
              type={show ? "text" : "password"}
              value={password}
              onChange={setPassword}
              right={
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="rounded p-2 hover:bg-[#f2f4f6]"
                  style={{ color: XERO.muted }}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
            />

            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[6px] text-[16px] font-bold text-white transition-colors disabled:opacity-80"
              style={{ background: busy ? XERO.blueHover : XERO.blue }}
              onMouseEnter={(e) => (e.currentTarget.style.background = XERO.blueHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = busy ? XERO.blueHover : XERO.blue)}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Log in
            </button>

            <div className="flex justify-between text-[14px] font-semibold">
              <a className="hover:underline" style={{ color: XERO.blue }} href="#">
                Forgot password?
              </a>
              <a className="hover:underline" style={{ color: XERO.blue }} href="#">
                Can&apos;t log in?
              </a>
            </div>
          </form>

          <div className="my-7 flex items-center gap-3 text-[13px]" style={{ color: XERO.muted }}>
            <span className="h-px flex-1" style={{ background: XERO.line }} />
            or
            <span className="h-px flex-1" style={{ background: XERO.line }} />
          </div>

          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-[6px] border bg-white text-[15px] font-semibold transition-colors hover:bg-[#f7f9fa]"
            style={{ borderColor: XERO.border, color: XERO.navy }}
          >
            <GoogleMark />
            Log in with Google
          </button>

          <p className="mt-8 text-center text-[14px]" style={{ color: XERO.muted }}>
            New to Xero?{" "}
            <a href="#" className="font-semibold hover:underline" style={{ color: XERO.blue }}>
              Try Xero for free
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t px-6 py-5 text-center text-[12px]" style={{ borderColor: XERO.line, color: XERO.muted }}>
        <span>© Xero Limited</span>
        <span className="mx-2">·</span>
        <a href="#" className="hover:underline">
          Privacy
        </a>
        <span className="mx-2">·</span>
        <a href="#" className="hover:underline">
          Terms
        </a>
        <span className="mx-2">·</span>
        <a href="#" className="hover:underline">
          Security
        </a>
      </footer>
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
