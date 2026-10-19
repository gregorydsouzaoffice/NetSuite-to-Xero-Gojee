import { describe, expect, it } from "vitest"
import { CHART_SIZE, NETSUITE_CHART, XERO_TARGET_BY_CODE } from "./chart"

describe("NetSuite chart of accounts", () => {
  it("has exactly 159 accounts", () => {
    expect(CHART_SIZE).toBe(159)
    expect(NETSUITE_CHART).toHaveLength(159)
  })

  it("has unique account numbers", () => {
    expect(new Set(NETSUITE_CHART.map((a) => a.code)).size).toBe(NETSUITE_CHART.length)
  })

  it("maps every account to a known Xero account", () => {
    for (const a of NETSUITE_CHART) expect(XERO_TARGET_BY_CODE[a.xero], `${a.code} ${a.name}`).toBeDefined()
  })
})
