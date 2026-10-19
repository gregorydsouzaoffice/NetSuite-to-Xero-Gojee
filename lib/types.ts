export type SystemId = "netsuite" | "xero" | "gojee"
export type Destination = "xero" | "gojee" | "none"

export type ConnStatus = "not_connected" | "connected" | "expired" | "needs_reauth"

export interface XeroIdentity {
  name: string
  email: string
  xeroUserId: string
}

export interface XeroOrg {
  tenantId: string
  name: string
  baseCurrency: string
  shortCode: string
  financialYearEnd: string
  gstBasis: "Accrual" | "Cash"
  enabledCurrencies: string[]
}

export interface GojeeAccount {
  id: string
  name: string
  /** The Xero org this Gojee account is connected to, by Xero tenantId */
  linkedTenantId: string | null
  /** Gojee must not be connected to the Xero org until R-36 */
  connectedToXero: boolean
}

export type SubsidiaryKind = "subsidiary" | "consolidated" | "elimination"

export interface Subsidiary {
  id: string
  name: string
  parentId: string | null
  kind: SubsidiaryKind
  currency: string
  country: string
  /** Suggested Xero org pairing for the demo */
  suggestedTenantId?: string
  industry?: string
}

export interface SubsidiaryPair {
  subsidiaryId: string
  xeroTenantId: string | null
  gojeeAccountId: string | null
}

export type PairIssue =
  | { kind: "no-xero-org" }
  | { kind: "currency-mismatch"; netsuite: string; xero: string }
  | { kind: "no-gojee-account"; orgName: string }
  | { kind: "gojee-linked-elsewhere"; gojeeName: string; linkedOrgName: string }
  | { kind: "gojee-already-connected"; gojeeName: string }

export type HistoryRange = "full" | "from-date" | "balances"
export type DateBasis = "posting-period" | "transaction-date"

export interface Scope {
  range: HistoryRange
  fromPeriod: string // "2024-07"
  dateBasis: DateBasis
  cutoverDate: string // ISO date
}

export type SegmentTarget =
  | "separate-org"
  | "tracking-1"
  | "tracking-2"
  | "account-split"
  | "item-codes"
  | "contact-groups"
  | "gojee-job"
  | "gojee-inventory"
  | "gojee-timesheets"
  | "xero-only"
  | "memo"
  | "drop"

export type StageId =
  | "prereq"
  | "extract"
  | "prescan"
  | "xero-setup"
  | "history"
  | "freeze"
  | "delta"
  | "xero-recon"
  | "gojee-connect"
  | "gojee-load"
  | "gojee-recon"

export type StageStatus = "pending" | "running" | "waiting" | "blocked" | "done" | "skipped"

export type WaitReason =
  | { kind: "freeze" }
  | { kind: "netsuite-reauth" }
  | { kind: "tb-gate"; period: string; difference: number }
  | { kind: "gojee-connect" }
  | { kind: "exceptions"; count: number }

export interface PairRun {
  subsidiaryId: string
  stage: StageId
  /** 0..1 progress within the current stage */
  progress: number
  stageStatus: Record<StageId, StageStatus>
  /** Index of the last period whose trial balance passed */
  periodsDone: number
  wait: WaitReason | null
  /** Records written, for the idempotency ledger */
  ledger: { xero: number; gojee: number; skippedAsDuplicate: number }
  tbRoundingApplied: boolean
  failuresInjected: boolean
}

export type RunStatus = "idle" | "running" | "paused" | "complete"

export interface RunState {
  status: RunStatus
  speed: 1 | 4 | 12
  startedAt: string | null
  frozenAt: string | null
  /** Simulated elapsed hours of Xero API time (the real run takes days, R-39) */
  simulatedHours: number
  /** Busiest org's estimated API time; the simulated clock ends here */
  estimatedHours?: number
  pairs: Record<string, PairRun>
  netsuiteTokenExpiredShown: boolean
  log: { at: string; subsidiaryId?: string; level: "info" | "warn" | "error" | "success"; message: string }[]
}

export type ExceptionStatus = "open" | "retrying" | "resolved" | "skipped"

export interface ExceptionRecord {
  id: string
  subsidiaryId: string
  system: "xero" | "gojee"
  recordType: string
  reference: string
  reason: string
  fix: string
  status: ExceptionStatus
  retryResult?: string
  /** Skipped by design (e.g. not migrated) rather than failed */
  byDesign?: boolean
}

export interface SignOff {
  name: string
  title: string
  signedAt: string
}
