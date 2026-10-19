import { describe, expect, it } from "vitest"
import { XERO_ATTACHMENT_RULES, attachmentManifest, attachmentSummary, attachmentTotal } from "./attachments"

describe("attachment manifest", () => {
  const files = attachmentManifest("2")

  it("has one tracked line per file, with every required field", () => {
    expect(files).toHaveLength(attachmentTotal("2"))
    for (const f of files) {
      expect(f.netsuiteRecordType).not.toBe("")
      expect(f.netsuiteRecordId).toMatch(/^\d+$/)
      expect(f.filename).toMatch(/\.[a-z0-9]+$/)
      expect(f.format).not.toBe("")
      expect(f.sizeMb).toBeGreaterThan(0)
      expect(f.destinationRef).not.toBe("")
    }
  })

  it("never attaches a format Xero can't take directly", () => {
    for (const f of files.filter((x) => XERO_ATTACHMENT_RULES.external.includes(x.format))) expect(f.handling).toBe("external")
  })

  it("never attaches a file over the size limit as-is", () => {
    for (const f of files.filter((x) => x.sizeMb > XERO_ATTACHMENT_RULES.maxFileMb)) expect(["compress", "external"]).toContain(f.handling)
  })

  it("covers all four categories and summaries add up", () => {
    const s = attachmentSummary("2")
    expect(s.byCategory.every((c) => c.files > 0)).toBe(true)
    expect(s.byCategory.reduce((a, c) => a + c.files, 0)).toBe(s.total)
    expect(s.byHandling.reduce((a, h) => a + h.files, 0)).toBe(s.total)
  })

  it("scales with the history start date", () => {
    expect(attachmentTotal("2", "2024-07")).toBeLessThan(attachmentTotal("2"))
  })
})
