"use client"

/** Small Xero / Gojee tag used wherever a category shows where it goes. */
export default function DestinationBadge({ system }: { system: "xero" | "gojee" }) {
  return system === "xero" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-700">
      <span className="h-3.5 w-3.5 overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/Xero-logo.png" alt="" className="h-3.5 w-3.5 scale-[1.9]" />
      </span>
      Xero
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-mint" />
      Gojee
    </span>
  )
}
