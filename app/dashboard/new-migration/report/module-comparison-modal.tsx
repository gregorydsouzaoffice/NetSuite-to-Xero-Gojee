"use client"

import { useState } from "react"
import { CheckCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Compass as Compare } from "lucide-react"
import { jobTasks, openJobs } from "@/lib/demo-data/snapshot"

interface ModuleComparisonProps {
  className?: string
}

const JOB = openJobs("2")[0]
const TASKS = jobTasks("2").filter((t) => t.jobId === JOB.jobId)
const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type Side = { system: "NetSuite" | "Xero" | "Gojee"; title: string; fields: [string, string][] }

const modules: { id: string; name: string; description: string; left: Side; right: Side }[] = [
  {
    id: "invoices",
    name: "Invoices",
    description: "The same invoice in NetSuite and in Xero",
    left: {
      system: "NetSuite",
      title: "Invoice INV-35210",
      fields: [
        ["Customer", "Crown Melbourne Events"],
        ["Date", "03/09/2026 (period Sep 2026)"],
        ["Department", "Catering"],
        ["Location", "Fitzroy"],
        ["Channel", "Catering"],
        ["Tax code", "GST_AU 10%"],
        ["Total", "$1,840.00"],
      ],
    },
    right: {
      system: "Xero",
      title: "Invoice INV-35210 (ACCREC)",
      fields: [
        ["Contact", "Crown Melbourne Events"],
        ["Date", "03/09/2026"],
        ["Tracking 1", "Catering"],
        ["Tracking 2", "Fitzroy"],
        ["Account", "203 Sales – Catering"],
        ["Tax rate", "GST on Income (10%)"],
        ["Total", "$1,840.00"],
      ],
    },
  },
  {
    id: "bills",
    name: "Bills",
    description: "A supplier bill and its payment",
    left: {
      system: "NetSuite",
      title: "Bill BILL-88104",
      fields: [
        ["Vendor", "Bidfood Australia"],
        ["Date", "03/09/2026"],
        ["Lines", "Mozzarella 2kg × 40, Flour 00 25kg × 12"],
        ["Paid by", "Bill Payment BP-7310 (3 bills)"],
        ["Total", "$612.50"],
      ],
    },
    right: {
      system: "Xero",
      title: "Bill BILL-88104 (ACCPAY)",
      fields: [
        ["Contact", "Bidfood Australia"],
        ["Date", "03/09/2026"],
        ["Lines", "FD-MOZZARELLA-2KG × 40, FD-FLOUR-00-25KG × 12"],
        ["Paid by", "Batch payment BP-7310"],
        ["Total", "$612.50"],
      ],
    },
  },
  {
    id: "customers",
    name: "Customers",
    description: "A customer record and its region",
    left: {
      system: "NetSuite",
      title: "Customer 10432",
      fields: [
        ["Company name", "Crown Melbourne Events"],
        ["Email", "accounts@crownevents.com.au"],
        ["ABN", "51 004 300 120"],
        ["Region", "Corporate accounts"],
        ["Terms", "Net 30"],
      ],
    },
    right: {
      system: "Xero",
      title: "Contact",
      fields: [
        ["Name", "Crown Melbourne Events"],
        ["Email", "accounts@crownevents.com.au"],
        ["Tax number", "51 004 300 120"],
        ["Contact group", "Corporate accounts"],
        ["Payment terms", "30 days after invoice date"],
      ],
    },
  },
  {
    id: "chart-of-accounts",
    name: "Chart of Accounts",
    description: "One NetSuite sales account split by Channel in Xero",
    left: {
      system: "NetSuite",
      title: "Account 4000 Food Sales",
      fields: [
        ["Type", "Income"],
        ["Channel segment", "Dine-in, Delivery, Catering"],
        ["Default tax", "GST_AU"],
      ],
    },
    right: {
      system: "Xero",
      title: "Accounts 201 / 202 / 203",
      fields: [
        ["201", "Sales – Dine-in"],
        ["202", "Sales – Delivery"],
        ["203", "Sales – Catering"],
        ["Tax rate", "GST on Income"],
      ],
    },
  },
  {
    id: "inventory",
    name: "Stock",
    description: "An item with stock and a serial number, now held in Gojee",
    left: {
      system: "NetSuite",
      title: "Item Oven Moretti S100",
      fields: [
        ["Type", "Inventory item (serialised)"],
        ["Location", "Fitzroy"],
        ["On hand", "1"],
        ["Serial", "EQ2-2431-1"],
        ["Value", "$11,840.00"],
      ],
    },
    right: {
      system: "Gojee",
      title: "Product EQ-OVEN-MORETTI-S100",
      fields: [
        ["Tracking", "Serial numbers"],
        ["Warehouse", "Fitzroy"],
        ["Quantity", "1"],
        ["Serial", "EQ2-2431-1"],
        ["Value", "$11,840.00 (matches Xero 630)"],
      ],
    },
  },
  {
    id: "jobs",
    name: "Jobs",
    description: "An open job: details, tasks, cost, billing and WIP (cost to date − billed to date)",
    left: {
      system: "NetSuite",
      title: `Project ${JOB.jobId}`,
      fields: [
        ["Name", JOB.name],
        ["Customer", JOB.customer],
        ["Status / PM", `${JOB.status} · ${JOB.projectManager}`],
        ["Project tasks", TASKS.map((t) => t.name).join(", ")],
        ["Cost to date", money(JOB.costToDate)],
        ["Billed to date", money(JOB.billedToDate)],
      ],
    },
    right: {
      system: "Gojee",
      title: `Job ${JOB.jobId}`,
      fields: [
        ["Name", JOB.name],
        ["Client", JOB.customer],
        ["Status / manager", `${JOB.status} · ${JOB.projectManager}`],
        ["Stages", TASKS.map((t) => t.name).join(", ")],
        ["Cost to date", `${money(JOB.costToDate)} (${JOB.xeroBills} Xero bills linked)`],
        ["Billed to date", `${money(JOB.billedToDate)} (${JOB.xeroInvoices} Xero invoices linked)`],
        ["WIP", `${money(JOB.gojeeWip)} = cost − billed`],
      ],
    },
  },
]

const HEADER: Record<Side["system"], string> = {
  NetSuite: "bg-[#36677d]/10 text-[#36677d] border-[#36677d]/20",
  Xero: "bg-[#13b5ea]/10 text-[#0b7fa6] border-[#13b5ea]/20",
  Gojee: "bg-primary/10 text-primary border-primary/20",
}

function Record({ side }: { side: Side }) {
  return (
    <div className="flex flex-col">
      <div className={`font-semibold mb-2 p-2 rounded-t-md border-b ${HEADER[side.system]}`}>{side.system}</div>
      <div className="border border-border/50 rounded-b-md bg-card/50 backdrop-blur-md p-4">
        <div className="mb-3 text-sm font-semibold text-foreground">{side.title}</div>
        <dl className="divide-y divide-border/40 text-sm">
          {side.fields.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[130px_1fr] gap-3 py-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

export function ModuleComparisonModal({ className }: ModuleComparisonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Compare className="mr-2 h-4 w-4" /> Compare Modules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto border-border/50 bg-background/95 backdrop-blur-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-4 text-foreground">Module Comparison: NetSuite vs Xero + Gojee</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="mb-4 flex flex-wrap h-auto">
            {modules.map((module) => (
              <TabsTrigger key={module.id} value={module.id} className="px-4 py-2">
                {module.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {modules.map((module) => (
            <TabsContent key={module.id} value={module.id} className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">{module.description}</div>
                <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" /> Matched
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Record side={module.left} />
                <Record side={module.right} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
