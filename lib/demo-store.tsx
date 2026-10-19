"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { NETSUITE_ACCOUNT } from "./demo-data/momento"
import { FIRST_DATE } from "./periods"

/**
 * What the demo needs to remember between steps: which systems are connected
 * and which NetSuite subsidiary (one entity → one Xero org + one Gojee account).
 * Kept in sessionStorage so a page reload mid-recording doesn't lose it.
 */
export interface DemoState {
  netsuite: { connected: boolean; accountId: string; role: string; subsidiaryId: string }
  xero: { connected: boolean; tenantId: string }
  gojee: { connected: boolean }
  /** Validate step: the trial-balance rounding difference has been fixed */
  roundingFixed: boolean
  /** First day of history to migrate (ISO date). Default = everything in NetSuite. */
  fromDate: string
}

const KEY = "gojee-migrate:demo:v2"

export function initialDemoState(): DemoState {
  return {
    netsuite: { connected: false, accountId: NETSUITE_ACCOUNT.accountId, role: "Administrator", subsidiaryId: "2" },
    xero: { connected: false, tenantId: "xt-hillys" },
    gojee: { connected: false },
    roundingFixed: false,
    fromDate: FIRST_DATE,
  }
}

interface Store {
  state: DemoState
  hydrated: boolean
  update: (fn: (s: DemoState) => DemoState) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialDemoState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (raw) setState({ ...initialDemoState(), ...JSON.parse(raw) })
    } catch {
      // Storage blocked: the demo still works for this page view
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state, hydrated])

  const update = useCallback((fn: (s: DemoState) => DemoState) => setState(fn), [])
  const reset = useCallback(() => setState(initialDemoState()), [])

  return <Ctx.Provider value={{ state, hydrated, update, reset }}>{children}</Ctx.Provider>
}

export function useDemo(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>")
  return ctx
}
