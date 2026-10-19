"use client"

import { useSearchParams } from "next/navigation"

/* Oracle NetSuite login look (colours sampled from the official login page). Demo replica. */
export const NS = {
  navy: "#264759",
  button: "#36677d",
  text: "#171615",
  muted: "#55595b",
  border: "#b1b8ba",
  card: "#f4f6f7",
  footer: "#deebef",
  bg: "#2c5266",
}

const FONT = '"Oracle Sans", "Segoe UI", -apple-system, Helvetica, Arial, sans-serif'

/** Angled background panels like the NetSuite login page */
function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: NS.bg }}>
      <div className="absolute inset-0" style={{ background: "#36677d", clipPath: "polygon(0 0, 38% 0, 12% 100%, 0 100%)" }} />
      <div className="absolute inset-0" style={{ background: "#d0e5ed", opacity: 0.9, clipPath: "polygon(0 22%, 30% 8%, 34% 42%, 0 74%)" }} />
      <div className="absolute inset-0" style={{ background: "#5e8ea3", opacity: 0.55, clipPath: "polygon(0 74%, 34% 42%, 24% 100%, 0 100%)" }} />
      <div className="absolute inset-0" style={{ background: "#36677d", clipPath: "polygon(72% 0, 100% 0, 100% 100%, 88% 100%)" }} />
      <div className="absolute inset-0" style={{ background: "#2a4b5d", opacity: 0.8, clipPath: "polygon(84% 0, 100% 0, 100% 46%, 92% 64%)" }} />
    </div>
  )
}

export function NetSuiteFrame({ children, width = 412, footer = true }: { children: React.ReactNode; width?: number; footer?: boolean }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10" style={{ fontFamily: FONT, color: NS.text }}>
      <Background />
      <div className="relative w-full overflow-hidden rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.25)]" style={{ maxWidth: width, background: NS.card }}>
        <div className="px-6 pb-8 pt-8 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/netsuite/oracle-netsuite-logo.png" alt="Oracle NetSuite" className="h-[46px] w-auto" />
          <div className="mt-8">{children}</div>
        </div>
        {footer && (
          <div className="flex items-start justify-between gap-3 px-10 py-6 text-[13px]" style={{ background: NS.footer }}>
            <div className="space-y-1.5">
              <a href="#" className="block underline" style={{ color: NS.navy }}>
                © Oracle
              </a>
              <a href="#" className="block underline" style={{ color: NS.navy }}>
                Oracle Terms of Use for NetSuite Support Portal
              </a>
            </div>
            <span className="h-4 w-px" style={{ background: NS.border }} />
          </div>
        )}
      </div>
    </div>
  )
}

export function NsHeading({ children }: { children: React.ReactNode }) {
  return <h1 className="text-[30px] font-bold leading-tight tracking-tight">{children}</h1>
}

export function NsButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  const { secondary, className, style, ...rest } = props
  return (
    <button
      {...rest}
      className={`flex h-[52px] w-full items-center justify-center gap-3 rounded-[4px] text-[17px] font-semibold transition hover:brightness-110 disabled:opacity-70 ${className ?? ""}`}
      style={secondary ? { border: `1px solid ${NS.border}`, color: NS.text, background: "white", ...style } : { background: NS.button, color: "white", ...style }}
    />
  )
}

/** NetSuite-style input; with `label` the label floats inside the box like the real login page */
export function NsInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, className, ...rest } = props
  return (
    <label className={`block rounded-[4px] border bg-white px-4 focus-within:ring-2 focus-within:ring-[#36677d]/40 ${className ?? ""}`} style={{ borderColor: NS.border }}>
      {label && (
        <span className="block pt-3 text-[15px] font-semibold" style={{ color: NS.muted }}>
          {label}
        </span>
      )}
      <input {...rest} className={`block w-full bg-transparent text-[17px] outline-none ${label ? "pb-3 pt-1" : "py-[15px]"}`} />
    </label>
  )
}

/** Keep account + return across the NetSuite screens */
export function useNsQuery() {
  const p = useSearchParams()
  const account = p.get("account") ?? ""
  const ret = p.get("return") ?? ""
  const role = p.get("role") ?? ""
  const qs = (extra: Record<string, string> = {}) =>
    "?" + new URLSearchParams({ account, ...(ret ? { return: ret } : {}), ...(role ? { role } : {}), ...extra }).toString()
  return { account, ret, role, qs }
}
