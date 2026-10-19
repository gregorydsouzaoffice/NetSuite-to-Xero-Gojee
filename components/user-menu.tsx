"use client"

import { useRouter } from "next/navigation"
import { ChevronDown, RotateCcw } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { XERO_IDENTITY } from "@/lib/demo-data/momento"
import { useDemo } from "@/lib/demo-store"

export default function UserMenu() {
  const { reset } = useDemo()
  const router = useRouter()
  const initials = XERO_IDENTITY.name
    .split(" ")
    .map((p) => p[0])
    .join("")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-10 gap-2 rounded-xl bg-card/50 border-border/50 hover:bg-card hover:border-primary/20 transition-all duration-200 hover:scale-105"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline font-medium">{XERO_IDENTITY.name}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-card/95 backdrop-blur-xl border-border/50 shadow-xl rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="font-medium text-foreground">{XERO_IDENTITY.name}</div>
          <div className="text-xs text-muted-foreground">{XERO_IDENTITY.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem
          className="rounded-lg"
          onSelect={() => {
            reset()
            router.push("/dashboard/new-migration")
          }}
        >
          <RotateCcw className="mr-3 h-4 w-4" />
          Restart demo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
