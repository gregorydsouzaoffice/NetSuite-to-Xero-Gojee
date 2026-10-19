const money = new Intl.NumberFormat("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const whole = new Intl.NumberFormat("en-AU")

/** 12,345.60 — negative values in brackets, accounting style */
export function fmtMoney(value: number, opts: { currency?: boolean } = {}): string {
  const abs = money.format(Math.abs(value))
  const text = opts.currency ? `$${abs}` : abs
  return value < 0 ? `(${text})` : text
}

export function fmtInt(value: number): string {
  return whole.format(value)
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Deterministic PRNG so demo numbers are identical on every render and in every report */
export function seeded(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
