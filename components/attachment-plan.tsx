"use client"

import { Archive, FileText, FolderOpen, Landmark, Paperclip, Tag, Users } from "lucide-react"
import { useDemo } from "@/lib/demo-store"
import { ATTACHMENT_CATEGORIES, XERO_ATTACHMENT_RULES, attachmentSummary, type AttachmentCategory } from "@/lib/demo-data/attachments"
import { periodFromDate } from "@/lib/periods"
import { cn } from "@/lib/utils"

const CATEGORY_ICON: Record<AttachmentCategory, React.ComponentType<{ className?: string }>> = {
  transaction: FileText,
  contact: Users,
  financial: Landmark,
  general: FolderOpen,
}

const HANDLING_TONE: Record<string, string> = {
  attach: "bg-green-500/10 text-green-700",
  convert: "bg-sky-500/10 text-sky-700",
  compress: "bg-sky-500/10 text-sky-700",
  "xero-files": "bg-primary/10 text-primary",
  gojee: "bg-brand-mint/40 text-primary",
  external: "bg-amber-500/15 text-amber-700",
}

const TRACKED = ["NetSuite record type", "NetSuite internal ID", "File name", "File format", "File size", "Destination reference"]

/** Map step, Attachments tab: how every NetSuite file is categorised, handled and tracked. */
export default function AttachmentPlan() {
  const { state } = useDemo()
  const s = attachmentSummary(state.netsuite.subsidiaryId, periodFromDate(state.fromDate))

  const groupHandling = (formats: string[]) => {
    if (formats.every((f) => XERO_ATTACHMENT_RULES.external.includes(f))) return { label: "External storage, linked", tone: HANDLING_TONE.external }
    if (formats.some((f) => XERO_ATTACHMENT_RULES.convert[f])) return { label: "Attach · HEIC converted to JPG", tone: HANDLING_TONE.convert }
    return { label: "Attach directly", tone: HANDLING_TONE.attach }
  }

  return (
    <div className="animate-fade-in-up space-y-5 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center text-base font-semibold text-foreground">
            <Paperclip className="mr-2.5 h-5 w-5 text-primary" />
            Attachment plan
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Every file keeps a manifest line from its NetSuite record to its destination. Files Xero can&apos;t attach to the matching record go to
            Xero Files or external storage — none are dropped.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {s.total.toLocaleString()} files · {(s.totalMb / 1024).toFixed(2)} GB
        </span>
      </div>

      {/* Categories */}
      <div className="grid gap-3 sm:grid-cols-2">
        {s.byCategory.map((c) => {
          const Icon = CATEGORY_ICON[c.key]
          return (
            <div key={c.key} className="rounded-xl border border-border/50 bg-card p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{c.label}</span>
                    <span className="text-lg font-extrabold tabular-nums text-primary">{c.files.toLocaleString()}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.examples}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">NetSuite:</span> {c.netsuiteRecords}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Goes to:</span> {c.destination}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* File types */}
      <div className="overflow-hidden rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary/5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold">File type</th>
              <th className="px-4 py-2.5 font-semibold">Formats</th>
              <th className="px-4 py-2.5 text-right font-semibold">Files</th>
              <th className="px-4 py-2.5 font-semibold">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {s.byGroup.map((g) => {
              const h = groupHandling(g.formats)
              return (
                <tr key={g.group} className="hover:bg-brand-mint/10">
                  <td className="px-4 py-2.5 font-medium text-foreground">{g.group}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{g.formats.join(" · ")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{g.files.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", h.tone)}>{h.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Where files end up */}
      <div className="grid gap-2 sm:grid-cols-3">
        {s.byHandling
          .filter((h) => h.files > 0)
          .map((h) => (
            <div key={h.handling} className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold", HANDLING_TONE[h.handling])}>
              <span>{h.label}</span>
              <span className="tabular-nums">{h.files.toLocaleString()}</span>
            </div>
          ))}
      </div>

      {/* Tracked fields */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Tag className="h-3.5 w-3.5 text-primary" /> Tracked for every file:
        </span>
        {TRACKED.map((t) => (
          <span key={t} className="rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
            {t}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Archive className="h-3.5 w-3.5" /> External store: {XERO_ATTACHMENT_RULES.externalStore}
        </span>
      </div>
    </div>
  )
}
