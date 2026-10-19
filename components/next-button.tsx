"use client"

import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The one button that moves the demo forward. Same label and place on every
 * screen; the small caption says where it goes next.
 */
export default function NextButton({
  onClick,
  to,
  disabled,
  busy,
  className,
}: {
  onClick: () => void
  /** Where Next goes, e.g. "Extract" */
  to?: string
  disabled?: boolean
  busy?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {to && (
        <span className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:inline-flex">
          Next <span className="text-primary">· {to}</span>
        </span>
      )}
      <Button
        onClick={onClick}
        disabled={disabled || busy}
        size="lg"
        className="premium-button group min-w-[150px] rounded-full px-7 text-base font-bold disabled:opacity-50"
        data-next-button
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Next
        {!busy && (
          <span className="ml-2 grid h-7 w-7 place-items-center rounded-full bg-brand-mint text-primary transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </span>
        )}
      </Button>
    </div>
  )
}
