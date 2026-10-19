"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { NETSUITE_ACCOUNT } from "@/lib/demo-data/momento"
import { NetSuiteFrame, NsHeading, NS, useNsQuery } from "../frame"

/* Replica of NetSuite's "Choose role" page. */
function ChooseRole() {
  const router = useRouter()
  const { qs } = useNsQuery()

  return (
    <NetSuiteFrame width={460}>
      <NsHeading>Choose a role</NsHeading>
      <p className="mt-1 text-sm" style={{ color: NS.muted }}>
        The role decides what the application can read. Administrator is recommended for a migration.
      </p>
      <ul className="mt-5 divide-y rounded-sm border" style={{ borderColor: NS.border }}>
        {NETSUITE_ACCOUNT.roles.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => router.push(`/login/netsuite/consent${qs({ role: r.name })}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#f4f6f8]"
            >
              <span className="flex-1">
                <span className="font-semibold">{NETSUITE_ACCOUNT.companyName}</span>
                <span className="block" style={{ color: NS.muted }}>
                  {r.name} · Production
                </span>
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: NS.muted }} />
            </button>
          </li>
        ))}
      </ul>
    </NetSuiteFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <ChooseRole />
    </Suspense>
  )
}
