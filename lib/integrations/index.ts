/**
 * Integration seams. The demo only implements the mocks; a real backend plugs
 * in behind these interfaces without the screens changing.
 *
 * Gojee's API and SSO contract have not been documented to us yet.
 * Do not invent Gojee endpoints — every real call is marked TODO(GOJEE-API).
 */
import { GOJEE_ACCOUNTS, XERO_ORG_BY_ID } from "../demo-data/momento"
import type { GojeeAccount, PairIssue, XeroIdentity } from "../types"
import type { NsTransaction } from "../mapping/transaction-types"

// ---------------------------------------------------------------------------
// Source and target

export interface SourceConnector {
  readonly id: "netsuite" | "netsuite-csv"
  testConnection(): Promise<{ ok: boolean; missingPermissions: string[] }>
  listSubsidiaries(): Promise<{ id: string; name: string; parentId: string | null }[]>
  /** R-31: copy into staging; loads never read live NetSuite */
  extractToStaging(subsidiaryIds: string[], since?: string): Promise<{ stagedRecords: number }>
  readStaged(subsidiaryId: string, period: string): Promise<NsTransaction[]>
}

export interface TargetWriter {
  readonly system: "xero" | "gojee"
  /** Writes are keyed by NetSuite internalId + type + subsidiary (R-40 ledger) */
  write(subsidiaryId: string, records: unknown[]): Promise<{ created: number; skippedExisting: number; failed: number }>
}

// ---------------------------------------------------------------------------
// Gojee auth (R-05)

export interface GojeeAuthProvider {
  readonly kind: "xero-sso" | "gojee-oauth" | "mock"
  /** Start sign-in. For xero-sso this is the single "Continue with Xero" click. */
  signIn(identity: XeroIdentity): Promise<{ ok: boolean }>
  /** Find the Gojee account linked to each authorised Xero org by tenantId (R-04) */
  findAccounts(tenantIds: string[]): Promise<Record<string, GojeeAccount | null>>
}

export interface GojeeClient {
  /** True once the client has connected Gojee to the Xero org (R-36) */
  isConnectedToXero(accountId: string): Promise<boolean>
  // TODO(GOJEE-API): how to stop Gojee pulling historical invoices/bills/payments on connect
  importItems(accountId: string, items: unknown[]): Promise<void>
  importJobs(accountId: string, jobs: unknown[]): Promise<void>
  importPurchaseOrders(accountId: string, pos: unknown[]): Promise<void>
  importTimesheets(accountId: string, entries: unknown[]): Promise<void>
}

export class XeroSsoGojeeAuth implements GojeeAuthProvider {
  readonly kind = "xero-sso" as const
  async signIn(): Promise<{ ok: boolean }> {
    // TODO(GOJEE-API): Gojee must issue our tool its own token (or a partner credential keyed by
    // Xero tenantId). Our Xero access token cannot call Gojee's API.
    throw new Error("TODO(GOJEE-API): Xero SSO contract not available yet")
  }
  async findAccounts(): Promise<Record<string, GojeeAccount | null>> {
    throw new Error("TODO(GOJEE-API): account lookup by Xero tenantId not available yet")
  }
}

export class GojeeOAuthAuth implements GojeeAuthProvider {
  readonly kind = "gojee-oauth" as const
  async signIn(): Promise<{ ok: boolean }> {
    throw new Error("TODO(GOJEE-API): Gojee OAuth endpoints not available yet")
  }
  async findAccounts(): Promise<Record<string, GojeeAccount | null>> {
    throw new Error("TODO(GOJEE-API): Gojee OAuth endpoints not available yet")
  }
}

export class MockGojeeAuth implements GojeeAuthProvider {
  readonly kind = "mock" as const
  constructor(private accounts: GojeeAccount[] = GOJEE_ACCOUNTS) {}
  async signIn() {
    return { ok: true }
  }
  async findAccounts(tenantIds: string[]) {
    return Object.fromEntries(tenantIds.map((t) => [t, findGojeeAccount(t, this.accounts)]))
  }
}

/** Chosen by config; the demo always uses the mock */
export function gojeeAuthProvider(kind: GojeeAuthProvider["kind"] = "mock", accounts: GojeeAccount[] = GOJEE_ACCOUNTS): GojeeAuthProvider {
  if (kind === "xero-sso") return new XeroSsoGojeeAuth()
  if (kind === "gojee-oauth") return new GojeeOAuthAuth()
  return new MockGojeeAuth(accounts)
}

// ---------------------------------------------------------------------------
// Synchronous helpers the screens use (mock data)

/** The Gojee account linked to a Xero org by tenantId */
export function findGojeeAccount(tenantId: string, accounts: GojeeAccount[] = GOJEE_ACCOUNTS): GojeeAccount | null {
  return accounts.find((g) => g.linkedTenantId === tenantId) ?? null
}

/** Gojee accounts whose name suggests this org but which are linked to another org */
export function findMislinked(tenantId: string, accounts: GojeeAccount[] = GOJEE_ACCOUNTS): GojeeAccount | null {
  const org = XERO_ORG_BY_ID[tenantId]
  if (!org) return null
  const stem = org.name.replace(/ Pty Ltd$/, "").toLowerCase()
  return accounts.find((g) => g.linkedTenantId !== tenantId && stem.startsWith(g.name.toLowerCase())) ?? null
}

export function gojeeIssue(tenantId: string, accounts: GojeeAccount[] = GOJEE_ACCOUNTS): PairIssue | null {
  const org = XERO_ORG_BY_ID[tenantId]
  const account = findGojeeAccount(tenantId, accounts)
  if (account) {
    return account.connectedToXero ? { kind: "gojee-already-connected", gojeeName: account.name } : null
  }
  const mislinked = findMislinked(tenantId, accounts)
  if (mislinked) {
    return {
      kind: "gojee-linked-elsewhere",
      gojeeName: mislinked.name,
      linkedOrgName: XERO_ORG_BY_ID[mislinked.linkedTenantId ?? ""]?.name ?? "another Xero org",
    }
  }
  return { kind: "no-gojee-account", orgName: org?.name ?? tenantId }
}

export function describeIssue(issue: PairIssue): string {
  switch (issue.kind) {
    case "no-xero-org":
      return "No Xero org is paired with this subsidiary."
    case "currency-mismatch":
      return `Base currency differs: NetSuite ${issue.netsuite}, Xero ${issue.xero}.`
    case "no-gojee-account":
      return `No Gojee account is linked to the Xero org "${issue.orgName}".`
    case "gojee-linked-elsewhere":
      return `The Gojee account "${issue.gojeeName}" is linked to a different Xero org (${issue.linkedOrgName}).`
    case "gojee-already-connected":
      return `Gojee "${issue.gojeeName}" is already syncing with this Xero org. Disconnect it until cutover (R-30).`
  }
}
