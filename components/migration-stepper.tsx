"use client"

import { useEffect, useState } from "react"
import { CheckCircle, CheckSquare, Database, FileText, Map, Upload } from "lucide-react"

const STEPS = [
  { icon: Database, label: "Connect" },
  { icon: FileText, label: "Extract" },
  { icon: Map, label: "Map" },
  { icon: CheckSquare, label: "Validate" },
  { icon: Upload, label: "Import" },
]

/** The original progress bar + 5-step navigation, shared by every step page. */
export default function MigrationStepper({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const pct = step * 20

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-between text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          <div>Migration Progress</div>
          <div className="text-primary font-bold">{pct}%</div>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute inset-0 opacity-20 blur-sm rounded-full bg-primary transition-all duration-500"
            style={{ width: `${mounted ? pct : 0}%` }}
          />
          <div className="absolute inset-0 rounded-full journey-gradient-bg transition-all duration-700" style={{ width: `${mounted ? pct : 0}%` }} />
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent shine-animation"
            style={{ width: `${mounted ? pct : 0}%` }}
          />
          <div className="absolute inset-0 flex">
            {[20, 40, 60, 80].map((segment) => (
              <div key={segment} className="h-full flex-1 border-r border-background/20" aria-hidden="true" />
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex justify-between border-b border-border/40 pb-6">
        <div className="absolute left-0 bottom-0 h-0.5 journey-gradient-bg transition-all duration-700" style={{ width: `${(step - 1) * 25}%` }} />
        {STEPS.map((s, index) => {
          const stepNum = index + 1
          const isActive = stepNum === step
          const isCompleted = stepNum < step
          return (
            <div
              key={s.label}
              className={`flex flex-col items-center gap-2 rounded-xl px-4 py-2 transition-all duration-300 ${
                isActive ? "text-primary font-bold" : isCompleted ? "text-primary/80 font-semibold" : "text-muted-foreground opacity-60"
              }`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-brand-mint/50"
                    : isCompleted
                      ? "border-transparent bg-brand-mint/40 text-primary"
                      : "border-border/60 bg-card shadow-sm"
                }`}
              >
                {isCompleted ? <CheckCircle className="check-pop h-5 w-5 text-primary" strokeWidth={2.5} /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className="text-xs font-medium mt-1">{s.label}</span>
            </div>
          )
        })}
      </div>

      <style jsx global>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .shine-animation {
          animation: shine 2s infinite;
        }
      `}</style>
    </>
  )
}
