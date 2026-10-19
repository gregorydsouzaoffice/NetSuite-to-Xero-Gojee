/**
 * Branding and pricing for the NetSuite → Xero + Gojee flow (R-50).
 *
 * Every screen, email preview and generated PDF/Excel file reads from here.
 * Values marked PLACEHOLDER are open decisions in the BRD (section 13) — change
 * them in this one file.
 */
export const brand = {
  /** PLACEHOLDER: product name not yet decided */
  productName: "Gojee Migrate",
  partnerName: "Gojee",
  /** PLACEHOLDER: domain not yet decided */
  domain: "migrate.gojee.com.au",
  supportEmail: "migrations@gojee.com.au",
  emailSenderName: "Gojee Migrate",
  /**
   * Gojee wordmark (navy). Official artwork supplied by the client.
   */
  logoSrc: "/images/gojee/gojee-logo.png" as string | null,
  /** White version for dark backgrounds (PDF header band) */
  logoOnDarkSrc: "/images/gojee/gojee-logo-white.png",
  poweredBy: {
    name: "MMC Convert",
    logoSrc: "/images/mmc-convert-logo.png",
    url: "https://mmcconvert.com",
  },
  /** RGB used inside generated PDF/Excel files, which can't read CSS variables. Keep in step with globals.css. */
  pdf: {
    primary: [0, 60, 100] as [number, number, number],
    ink: [0, 38, 62] as [number, number, number],
    muted: [107, 114, 128] as [number, number, number],
    success: [33, 140, 88] as [number, number, number],
    danger: [220, 38, 38] as [number, number, number],
  },
} as const

/** PLACEHOLDER pricing model — the BRD leaves this open. */
export const pricing = {
  currency: "AUD",
  setupFee: 1500,
  perSubsidiary: 2900,
  /** Added per subsidiary when history is longer than this many periods */
  includedPeriods: 36,
  perExtraPeriod: 45,
  gstRate: 0.1,
}

export function quote(subsidiaryCount: number, periods: number) {
  const extraPeriods = Math.max(0, periods - pricing.includedPeriods)
  const lines = [
    { label: "Migration setup", amount: pricing.setupFee },
    { label: `Subsidiary pairs × ${subsidiaryCount}`, amount: pricing.perSubsidiary * subsidiaryCount },
  ]
  if (extraPeriods > 0) {
    lines.push({
      label: `Extra history: ${extraPeriods} periods × ${subsidiaryCount}`,
      amount: pricing.perExtraPeriod * extraPeriods * subsidiaryCount,
    })
  }
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)
  const gst = Math.round(subtotal * pricing.gstRate * 100) / 100
  return { lines, subtotal, gst, total: subtotal + gst }
}
