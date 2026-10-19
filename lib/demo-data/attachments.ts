/**
 * NetSuite → Xero attachment migration.
 *
 * Every file is tracked with its original NetSuite record type and internal ID,
 * filename, format, size and the destination reference it ends up at. Files
 * Xero can't attach to the matching record go to Xero Files or external storage.
 *
 * Xero's accepted formats and limits must be verified against Xero's current
 * documentation before a real run; they live in XERO_ATTACHMENT_RULES.
 */
import { round2, seeded } from "../format"
import { FIRST_PERIOD, historyShare } from "../periods"
import { CONTACTS } from "./momento"

export type AttachmentCategory = "transaction" | "contact" | "financial" | "general"

export type Handling = "attach" | "convert" | "compress" | "xero-files" | "gojee" | "external"

export const XERO_ATTACHMENT_RULES = {
  /** Formats attached as-is (verify against Xero's current list) */
  direct: ["PDF", "DOC", "DOCX", "TXT", "RTF", "XLS", "XLSX", "CSV", "JPG", "JPEG", "PNG", "GIF", "TIF", "TIFF", "EML", "MSG"],
  /** Formats converted first */
  convert: { HEIC: "JPG" } as Record<string, string>,
  /** Formats kept in approved external storage, linked from the Xero record */
  external: ["ZIP", "DWG", "PSD", "MP4"],
  maxFileMb: 25,
  maxPerRecord: 10,
  externalStore: "SharePoint · /NetSuite-Archive",
  xeroFilesFolder: "Xero Files · NetSuite migration",
}

export const ATTACHMENT_CATEGORIES: {
  key: AttachmentCategory
  label: string
  examples: string
  netsuiteRecords: string
  destination: string
}[] = [
  {
    key: "transaction",
    label: "Transaction attachments",
    examples: "Invoices, bills, receipts, credit notes, purchase orders, quotes",
    netsuiteRecords: "CustInvc, VendBill, CustCred, VendCred, PurchOrd, Estimate",
    destination: "Same Xero record (invoice, bill, credit note); open POs and quotes → Gojee",
  },
  {
    key: "contact",
    label: "Contact attachments",
    examples: "Customer and supplier contracts, KYC documents, correspondence",
    netsuiteRecords: "Customer, Vendor",
    destination: "Xero contact",
  },
  {
    key: "financial",
    label: "Financial supporting documents",
    examples: "Bank statements, payment proofs, reconciliation documents",
    netsuiteRecords: "Deposit, Check, CustPymt, VendPymt, Bank reconciliation",
    destination: "Xero bank transaction; payment proofs → the invoice or bill paid; reconciliations → Xero Files",
  },
  {
    key: "general",
    label: "General attachments",
    examples: "Contracts, miscellaneous files, documents with no supported Xero record",
    netsuiteRecords: "File Cabinet (unlinked), Employee, Project",
    destination: "Xero Files folder (or external storage), indexed in the manifest",
  },
]

export const FILE_TYPE_GROUPS: { group: string; formats: string[] }[] = [
  { group: "Documents", formats: ["PDF", "DOC", "DOCX", "TXT", "RTF"] },
  { group: "Spreadsheets", formats: ["XLS", "XLSX", "CSV"] },
  { group: "Images", formats: ["JPG", "JPEG", "PNG", "GIF", "TIFF", "HEIC"] },
  { group: "Email files", formats: ["EML", "MSG"] },
  { group: "Other files", formats: ["ZIP", "DWG", "PSD", "MP4"] },
]

export const HANDLING_LABEL: Record<Handling, string> = {
  attach: "Attached",
  convert: "Converted & attached",
  compress: "Compressed & attached",
  "xero-files": "Stored in Xero Files",
  gojee: "Attached in Gojee",
  external: "External storage (linked)",
}

export interface AttachmentFile {
  /** Manifest line number */
  line: number
  category: AttachmentCategory
  netsuiteRecordType: string
  netsuiteRecordId: string
  netsuiteRef: string
  filename: string
  format: string
  sizeMb: number
  handling: Handling
  destination: string
  destinationRef: string
}

/** Files attached to NetSuite records, full history, per subsidiary */
const BASE_COUNT: Record<string, number> = { "1": 120, "2": 1284, "3": 2310, "4": 410, "5": 980, "6": 60, "7": 760, "8": 1105 }

export function attachmentTotal(subsidiaryId: string, fromPeriod: string = FIRST_PERIOD): number {
  return Math.round((BASE_COUNT[subsidiaryId] ?? 0) * historyShare(fromPeriod))
}

function pick<T>(rnd: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0)
  let r = rnd() * total
  for (const [v, w] of items) {
    r -= w
    if (r <= 0) return v
  }
  return items[items.length - 1][0]
}

const FORMAT_WEIGHTS: [string, number][] = [
  ["PDF", 56], ["JPG", 10], ["PNG", 6], ["DOCX", 5], ["XLSX", 5], ["MSG", 3], ["EML", 1.5], ["CSV", 2], ["TIFF", 1.5],
  ["DOC", 1.5], ["TXT", 1], ["RTF", 0.5], ["GIF", 0.5], ["JPEG", 1.5], ["XLS", 1], ["HEIC", 1.2], ["ZIP", 1], ["DWG", 0.4], ["PSD", 0.3], ["MP4", 0.3],
]

const xeroId = (rnd: () => number) => Math.floor(rnd() * 0xffffffff).toString(16).padStart(8, "0")

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export function attachmentManifest(subsidiaryId: string, fromPeriod: string = FIRST_PERIOD): AttachmentFile[] {
  const n = attachmentTotal(subsidiaryId, fromPeriod)
  const rnd = seeded(`att-${subsidiaryId}`)
  const customers = CONTACTS.filter((c) => c.kind === "Customer").map((c) => c.name)
  const vendors = CONTACTS.filter((c) => c.kind === "Vendor").map((c) => c.name)
  const out: AttachmentFile[] = []

  for (let i = 0; i < n; i++) {
    const category = pick<AttachmentCategory>(rnd, [["transaction", 68], ["contact", 12], ["financial", 14], ["general", 6]])
    const internalId = String(48200 + i * 7 + Math.floor(rnd() * 5))
    let recordType = ""
    let ref = ""
    let base = ""
    let destination = ""
    let destinationRef = ""
    let target: "xero" | "gojee" | "files" = "xero"

    if (category === "transaction") {
      const t = pick<string>(rnd, [["Invoice", 40], ["Bill", 38], ["Credit Memo", 6], ["Bill Credit", 4], ["Purchase Order", 8], ["Estimate", 4]])
      const num = 1000 + Math.floor(rnd() * 9000)
      if (t === "Invoice") [recordType, ref, base, destination] = ["Invoice (CustInvc)", `INV-3${num}`, "tax-invoice", "Xero invoice"]
      if (t === "Bill") [recordType, ref, base, destination] = ["Bill (VendBill)", `BILL-8${num}`, `${slug(vendors[num % vendors.length])}-invoice`, "Xero bill"]
      if (t === "Credit Memo") [recordType, ref, base, destination] = ["Credit Memo (CustCred)", `CM-4${num}`, "credit-note", "Xero credit note"]
      if (t === "Bill Credit") [recordType, ref, base, destination] = ["Bill Credit (VendCred)", `VC-2${num}`, "supplier-credit", "Xero credit note"]
      if (t === "Purchase Order") {
        const open = rnd() < 0.25
        ;[recordType, ref, base] = ["Purchase Order (PurchOrd)", `PO-5${num}`, "purchase-order"]
        if (open) [destination, target] = ["Gojee purchase order", "gojee"]
        else [destination, target] = ["Xero Files (closed PO, not migrated)", "files"]
      }
      if (t === "Estimate") {
        const open = rnd() < 0.4
        ;[recordType, ref, base] = ["Estimate (quote)", `EST-2${num}`, "quotation"]
        if (open) [destination, target] = ["Gojee quote", "gojee"]
        else [destination, target] = ["Xero Files (expired quote)", "files"]
      }
    } else if (category === "contact") {
      const isCustomer = rnd() < 0.55
      const name = isCustomer ? customers[Math.floor(rnd() * customers.length)] : vendors[Math.floor(rnd() * vendors.length)]
      recordType = isCustomer ? "Customer" : "Vendor"
      ref = name
      base = `${slug(name)}-${pick<string>(rnd, [["contract", 4], ["kyc", 2], ["correspondence", 3], ["trading-terms", 2]])}`
      destination = "Xero contact"
    } else if (category === "financial") {
      const t = pick<string>(rnd, [["statement", 5], ["proof", 4], ["recon", 2]])
      const num = 1000 + Math.floor(rnd() * 9000)
      if (t === "statement") [recordType, ref, base, destination] = ["Deposit", `DEP-2${num}`, "bank-statement", "Xero bank transaction"]
      if (t === "proof") [recordType, ref, base, destination] = ["Customer Payment (CustPymt)", `PYMT-6${num}`, "payment-proof", "Xero invoice paid (payments can't hold files)"]
      if (t === "recon") {
        ;[recordType, ref, base] = ["Bank Reconciliation", `REC-${num}`, "bank-reconciliation"]
        ;[destination, target] = ["Xero Files · Reconciliations", "files"]
      }
    } else {
      recordType = pick<string>(rnd, [["File Cabinet (unlinked)", 5], ["Employee", 2], ["Project", 2]])
      ref = recordType === "Project" ? `JOB-2${410 + Math.floor(rnd() * 30)}` : "—"
      base = pick<string>(rnd, [["lease-agreement", 2], ["insurance-policy", 2], ["equipment-manual", 2], ["council-permit", 1], ["menu-artwork", 1]])
      destination = "Xero Files · General"
      target = "files"
    }

    let format = pick(rnd, FORMAT_WEIGHTS)
    if (category === "contact" && ["ZIP", "DWG", "PSD", "MP4"].includes(format)) format = "PDF"
    const sizeMb = round2(format === "MP4" ? 30 + rnd() * 120 : format === "PDF" && rnd() < 0.004 ? 26 + rnd() * 20 : 0.05 + rnd() * rnd() * 6)

    // Decide handling: external formats, conversion, compression, or the normal route
    let handling: Handling = target === "gojee" ? "gojee" : target === "files" ? "xero-files" : "attach"
    if (XERO_ATTACHMENT_RULES.external.includes(format) || (sizeMb > XERO_ATTACHMENT_RULES.maxFileMb && format !== "PDF")) {
      handling = "external"
      destination = `External storage (${XERO_ATTACHMENT_RULES.externalStore})`
    } else if (XERO_ATTACHMENT_RULES.convert[format]) {
      if (handling === "attach") handling = "convert"
    } else if (sizeMb > XERO_ATTACHMENT_RULES.maxFileMb && handling === "attach") {
      handling = "compress"
    }

    // The NetSuite filename keeps its original extension; conversion is recorded in `handling`
    const ext = format.toLowerCase()
    const filename = `${base}${ref && ref !== "—" && category !== "contact" ? `-${ref.toLowerCase()}` : ""}.${ext}`

    if (handling === "external") destinationRef = `/NetSuite-Archive/${subsidiaryId}/${internalId}/${filename} · link note on ${ref === "—" ? "manifest" : ref}`
    else if (handling === "xero-files") destinationRef = `${destination.split(" · ")[1] ?? "General"}/${filename}`
    else if (handling === "gojee") destinationRef = `${ref} · Gojee ${xeroId(rnd).slice(0, 6)}`
    else {
      const kind = destination.replace("Xero ", "").replace(/ \(.*\)$/, "")
      destinationRef = `${kind[0].toUpperCase()}${kind.slice(1)} ${ref} · ${xeroId(rnd)}`
    }

    out.push({ line: i + 1, category, netsuiteRecordType: recordType, netsuiteRecordId: internalId, netsuiteRef: ref, filename, format, sizeMb, handling, destination, destinationRef })
  }
  return out
}

/** One sentence on the files that don't attach straight onto a Xero record */
export function specialHandlingNote(s: ReturnType<typeof attachmentSummary>): string {
  const n = (h: Handling) => s.byHandling.find((x) => x.handling === h)?.files ?? 0
  return [
    `${n("convert")} HEIC photos converted to JPG`,
    `${n("compress")} PDF over 25 MB compressed`,
    `${n("external")} files in formats Xero can't hold (ZIP, DWG, PSD, MP4) kept in external storage and linked`,
    `${n("xero-files")} files with no supported Xero record stored in Xero Files`,
  ].join(", ")
}

export function attachmentSummary(subsidiaryId: string, fromPeriod: string = FIRST_PERIOD) {
  const files = attachmentManifest(subsidiaryId, fromPeriod)
  const byCategory = ATTACHMENT_CATEGORIES.map((c) => {
    const f = files.filter((x) => x.category === c.key)
    return { ...c, files: f.length, sizeMb: round2(f.reduce((s, x) => s + x.sizeMb, 0)) }
  })
  const byGroup = FILE_TYPE_GROUPS.map((g) => {
    const f = files.filter((x) => g.formats.includes(x.format))
    return { ...g, files: f.length }
  })
  const byHandling = (Object.keys(HANDLING_LABEL) as Handling[]).map((h) => ({ handling: h, label: HANDLING_LABEL[h], files: files.filter((x) => x.handling === h).length }))
  return {
    files,
    total: files.length,
    totalMb: round2(files.reduce((s, x) => s + x.sizeMb, 0)),
    byCategory,
    byGroup,
    byHandling,
    special: files.filter((x) => x.handling !== "attach" && x.handling !== "gojee"),
  }
}
