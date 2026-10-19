import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import GojeeLogo from "../components/mmc-logo"
import UserMenu from "@/components/user-menu"
import { brand } from "@/lib/brand"
import PageTransition from "../components/page-transition"

export const metadata: Metadata = {
  title: `Dashboard | ${brand.productName}`,
  description: "NetSuite to Xero + Gojee migration dashboard",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="journey-gradient-bg h-1 w-full" aria-hidden />
      <header className="sticky top-0 z-30 flex h-20 items-center gap-6 border-b border-border/50 bg-card/80 backdrop-blur-xl px-6 md:px-8 shadow-sm">
        <div className="transition-transform duration-200 hover:scale-105">
          <GojeeLogo size="sm" />
        </div>

        <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity duration-200">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <Link
            href={brand.poweredBy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:scale-105 transition-transform duration-200"
          >
            <Image
              src={brand.poweredBy.logoSrc}
              alt={brand.poweredBy.name}
              width={32}
              height={32}
              className="h-8 w-8"
            />
          </Link>
        </div>

        <nav className="hidden flex-1 md:flex">
          <Link
            href="/dashboard/new-migration"
            className="relative flex h-full items-center px-6 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/5 rounded-lg after:absolute after:bottom-4 after:left-6 after:right-6 after:h-0.5 after:rounded-full after:bg-brand-mint"
          >
            Migration
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end gap-4 md:flex-none">
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 bg-gradient-to-br from-background via-muted/20 to-background">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
