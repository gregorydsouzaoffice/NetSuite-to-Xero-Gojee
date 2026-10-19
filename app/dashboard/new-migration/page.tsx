"use client"

import { useRouter } from "next/navigation"
import { CheckCircle, Layers, Plus } from "lucide-react"
import NextButton from "@/components/next-button"
import { CLIENT_NAME } from "@/lib/demo-data/momento"

const sourcePlatforms = [
  {
    id: "netsuite",
    name: "Oracle NetSuite",
    description: "One subsidiary per migration",
    logo: "/images/netsuite/netsuite-mark.png",
  },
]

const destinationPlatforms = [
  {
    id: "xero",
    name: "Xero",
    description: "Full accounting history",
    logo: "/images/Xero-logo.png",
    zoom: true,
  },
  {
    id: "gojee",
    name: "Gojee",
    description: "Open jobs, quotes, stock and POs at cutover",
    logo: "/images/gojee/gojee-tile.png",
  },
]

function PlatformRow({ name, description, logo, zoom }: { name: string; description: string; logo: string; zoom?: boolean }) {
  return (
    <div className="group flex items-center gap-3 p-3.5 rounded-xl border border-primary/25 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50">
      <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={name} className={`w-10 h-10 object-contain ${zoom ? "scale-[1.9]" : ""}`} />
      </div>
      <div className="flex-grow">
        <h4 className="font-medium">{name}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-brand-mint/40 text-primary">
        <CheckCircle className="h-4 w-4" strokeWidth={2.5} />
      </span>
    </div>
  )
}

export default function NewMigrationPage() {
  const router = useRouter()

  return (
    <div className="container py-6 max-w-6xl mx-auto">
      <div className="w-full bg-background/70 backdrop-blur-md border border-border/50 rounded-xl shadow-lg overflow-hidden p-6">
        <div className="pb-4 mb-6 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-md border border-primary/20">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Start a New Migration</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {CLIENT_NAME} · migrate one NetSuite entity into Xero and Gojee
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground/80">Source Platform</h3>
            <div className="grid gap-3">
              {sourcePlatforms.map((p) => (
                <PlatformRow key={p.id} {...p} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground/80">Destination Platforms</h3>
            <div className="grid gap-3">
              {destinationPlatforms.map((p, i) => (
                <div key={p.id} className="space-y-3">
                  {i > 0 && (
                    <div className="flex items-center justify-center text-muted-foreground">
                      <Plus className="h-4 w-4" />
                    </div>
                  )}
                  <PlatformRow {...p} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 mt-6 flex justify-end border-t border-border/40">
          <NextButton to="Connect" onClick={() => router.push("/dashboard/new-migration/connect")} />
        </div>
      </div>
    </div>
  )
}
