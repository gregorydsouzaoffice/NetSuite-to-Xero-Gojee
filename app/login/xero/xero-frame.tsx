/*
 * Layout of Xero's current login experience (demo replica): blue top bar,
 * white form column on the left, illustration panel on the right.
 * Xero's own colours are used deliberately on these screens.
 */
import { ExternalLink } from "lucide-react"

export const XERO = {
  bar: "#2368df",
  blue: "#0078c8",
  blueHover: "#00609f",
  ink: "#000a1e",
  text: "#1e3145",
  muted: "#59687a",
  field: "#8c96a0",
  line: "#d5dae0",
  panel: "#03135d",
}

export const XERO_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

const FOOTER = ["Status page", "Security noticeboard", "Terms of use", "Privacy", "Support"]

export function XeroFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily: XERO_FONT, color: XERO.ink }}>
      <header className="flex h-20 shrink-0 items-center px-8" style={{ background: XERO.bar }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/xero/xero-wordmark-white.png" alt="Xero" className="h-[22px] w-auto" />
      </header>

      <div className="flex flex-1">
        <div className="flex w-full flex-col lg:w-1/2">
          <main className="flex-1 px-6 pb-10 pt-8 sm:px-12 xl:px-20 2xl:px-[150px]">
            <div className="max-w-[650px]">{children}</div>
          </main>
          <footer className="flex flex-wrap gap-x-7 gap-y-2 px-6 pb-10 2xl:gap-x-10 text-[15px] sm:px-12 xl:px-20 2xl:px-[150px]" style={{ color: XERO.text }}>
            {FOOTER.map((f) => (
              <a key={f} href="#" className="hover:underline">
                {f}
              </a>
            ))}
          </footer>
        </div>

        <aside className="relative hidden w-1/2 overflow-hidden lg:block" style={{ background: XERO.panel }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/xero/xero-login-illustration.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[35%_center]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/xero/xero-wordmark-cyan.png"
            alt=""
            className="absolute left-[46%] top-1/2 w-[30%] max-w-[260px] -translate-x-1/2 -translate-y-1/2"
          />
        </aside>
      </div>
    </div>
  )
}

/** "Xero login has a new look" notice from the top of Xero's login page */
export function XeroNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-[10px] border px-6 py-4" style={{ borderColor: XERO.line }}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden>
        <ellipse cx="20" cy="20" rx="17" ry="7" fill="none" stroke="#13b5ea" strokeWidth="2.2" transform="rotate(35 20 20)" />
        <ellipse cx="20" cy="20" rx="17" ry="7" fill="none" stroke="#13b5ea" strokeWidth="2.2" transform="rotate(-35 20 20)" />
        <path d="M20 25s-6-3.6-6-7.4a3.3 3.3 0 0 1 6-1.9 3.3 3.3 0 0 1 6 1.9C26 21.4 20 25 20 25z" fill="#ff6b9a" />
      </svg>
      <p className="flex-1 text-[17px] leading-relaxed">{children}</p>
      <a
        href="#"
        className="shrink-0 rounded-full border px-5 py-1.5 text-[16px] font-bold hover:bg-[#f2f6fa]"
        style={{ borderColor: XERO.line, color: XERO.blue }}
      >
        Learn more
      </a>
    </div>
  )
}

export function XeroLink({ children, external = false }: { children: React.ReactNode; external?: boolean }) {
  return (
    <a href="#" className="inline-flex items-center gap-1 hover:underline" style={{ color: XERO.blue }}>
      {children}
      {external && <ExternalLink className="h-4 w-4" />}
    </a>
  )
}

export function XeroField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[16px] font-bold">{label}</span>
      {children}
    </label>
  )
}

export const xeroInputClass =
  "block h-[50px] w-full rounded-[3px] border bg-white px-3 text-[17px] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(0,120,200,0.3)]"

export function XeroPrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, ...rest } = props
  return (
    <button
      {...rest}
      className={`inline-flex h-[50px] items-center justify-center gap-2 rounded-[3px] px-5 text-[19px] font-bold text-white transition-colors disabled:opacity-80 ${className ?? ""}`}
      style={{ background: XERO.blue, ...style }}
      onMouseEnter={(e) => (e.currentTarget.style.background = XERO.blueHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = XERO.blue)}
    />
  )
}
