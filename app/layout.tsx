import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { DemoProvider } from "@/lib/demo-store"
import { brand } from "@/lib/brand"
import "./globals.css"

// Rounded, friendly sans in the spirit of Gojee's own interface
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans", display: "swap" })

export const metadata: Metadata = {
  title: `${brand.productName} | NetSuite to Xero + Gojee`,
  description: "NetSuite to Xero and Gojee data migration, powered by MMC Convert",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-AU" className={`${nunito.variable} ${GeistMono.variable}`}>
      <head>
        <style>{`
html {
  font-family: ${nunito.style.fontFamily}, ui-sans-serif, system-ui, sans-serif;
  --font-mono: ${GeistMono.style.fontFamily};
}
        `}</style>
      </head>
      <body>
        <DemoProvider>{children}</DemoProvider>
        <Analytics />
      </body>
    </html>
  )
}
