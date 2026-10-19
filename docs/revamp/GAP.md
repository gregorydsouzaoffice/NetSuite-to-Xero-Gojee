# Where each BRD requirement shows up in the demo

The demo is built on the original 5-step UI, with one entity per migration (see DECISIONS.md).

| BRD | Where in the demo |
| --- | --- |
| R-01–R-05 Xero and Gojee authentication | Connect step: Xero login + organisation consent; Gojee "Continue with Xero", account found by Xero org |
| R-06 NetSuite OAuth 2.0 + PKCE | Connect step: NetSuite login → 2FA → role → consent → entity picker |
| R-08 All three systems connected before running | Connect step: Next goes to whichever system is still unconnected; Extract only after all three |
| R-10 Entity, Consolidated nodes blocked, AUD | Entity picker after NetSuite sign-in |
| R-12 Data types tagged Xero / Gojee | Extract: Data Preview with destination tags and counts |
| R-13 Segment routing | Map: "Segment Routing" tab (Department → tracking 1, Location → tracking 2, Channel → account split, Project → Gojee job…) |
| R-14 Mapping incl. system accounts | Map: accounts, contacts, items, transactions and the Gojee tabs; account remapping incl. 630, 640, 860 |
| R-21 Intercompany split | Map (Journals rule); Validate warning; Import log |
| R-22 Type mapping | Map treatments; unit-tested in `lib/mapping/transaction-types.ts` |
| R-33 Trial balance gate | Validate: trial balance compared period by period (all match) |
| R-34–R-37 Freeze, delta, connect Gojee, Gojee load | Import: log and stall messages, Gojee categories |
| R-41–R-45 Reports | Report: Comparative Reports tiles → new-tab reports with PDF and Excel |
| R-46 Exceptions | Report: Warnings tab |
| R-50 Branding | Gojee placeholder theme + "Powered by MMC Convert" everywhere |

**Not in the demo, by decision:** payment, multiple subsidiaries at once, admin console, notifications and roles.

## Client's NetSuite → Gojee project mapping (added 19 Oct 2026)

| Gojee object | NetSuite source | Where in the demo |
| --- | --- | --- |
| Job | `record/v1/job` | Extract / Import "Jobs & WIP"; Map "Jobs & WIP" (name, customer, status, dates, PM) |
| Job tasks / stages | `record/v1/projectTask` | "Job Tasks & Stages" (task, parent, planned hours, dates) |
| Job template | `record/v1/projectTemplate` | "Job Templates" — partial fit, Validate warning; `TODO(GOJEE-API)` |
| Job budget | SuiteQL budget lines | "Job Budgets": NetSuite budget category → Gojee cost code (LAB, MAT, SUB, EQP, OTH) |
| Job cost / revenue to date | SuiteQL transaction + transactionLine by project | "Job Cost & Revenue to Date": summaries, linked to Xero bill and invoice IDs |
| WIP per job | Calculated | Cost to date − billed to date (Map rule; Jobs & WIP report) |
| Retention held | Custom field / invoice line | "Retention Held" (fit-out jobs hold 5%) |
| Open quotes | SuiteQL · Estimate (open) | "Open Quotes" → Gojee quotes (added) |
| Attachments | File Cabinet files on transactions | "Attachments" → Xero attachments (added) |

Removed at the client's request (19 Oct 2026): unbilled timesheets, staff schedule, staff link, billing rates.
