import Link from "next/link"
import { brand } from "@/lib/brand"

interface GojeeLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

/** Official Gojee wordmark with the "Migrate" product label. */
export default function GojeeLogo({ className = "", size = "md" }: GojeeLogoProps) {
  const height = { sm: 26, md: 32, lg: 40 }[size]
  return (
    <Link href="/dashboard" className={`flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.logoSrc ?? "/images/gojee/gojee-logo.png"} alt={brand.partnerName} style={{ height }} className="w-auto" />
      <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Migrate</span>
    </Link>
  )
}
