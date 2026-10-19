# Audit: the codebase before the revamp

Branch `main`, last commit `1562fe4`. Short version, as agreed.

## What it was

A **frontend-only clickable demo** of a **Xero → MYOB** migration. The revamp prompt assumed "XYZ → Xero"; in fact Xero was the source.

- **Stack:** Next.js 15 (App Router), React 19, Tailwind 3, shadcn/ui (Radix), generated with v0. Both `package-lock.json` and `bun.lock` were committed.
- **Backend:** none. There were no API routes, OAuth, database, queue or real Xero/MYOB calls. Every step was mock data driven by `setTimeout`/`setInterval`.

## Routes

| Area | Routes | Notes |
| --- | --- | --- |
| Landing | `/` | Marketing page: hero, how-it-works, logo carousel |
| Login | `/login` | Email/password form; only reached from "Log out" |
| Xero | `/login/xero`, `/login/xero/organization` | Replicas; a single org was selected |
| MYOB | `/login/myob/*` | Replica screens: login, password, MFA, books |
| Wizard | `/dashboard/new-migration/{connect,extract,map,validate,import,report}` | Five-step stepper, copied into four pages |
| Unlinked | `/dashboard/connections`, `/dashboard/account`, `/dashboard/new-migration/start` | Not reachable from the UI |

## Findings

| Topic | Finding |
| --- | --- |
| Authentication | Mocked. Xero OAuth was imitated with a fake consent page; one org per migration. User identity was hard-coded ("Kylie Farr"). |
| Source connector / staging | None. The Extract page listed 14 hard-coded categories. |
| Writer, rate limits, idempotency | None. The Import page was an animation with random warnings. |
| Mapping | `map/page.tsx` (1,298 lines) had a native-select `MappingSelect`, needs-review state and per-row reset. Its overrides were written to sessionStorage and never read. |
| Job engine, pause/resume | None. |
| Reports | Three static HTML files in `public/reports/` with £ and UK data. No PDF or Excel. `utils/html-to-pdf.ts` only linked to the HTML file. |
| Branding | MYOB purple tokens in `app/globals.css`. Many colours were hard-coded; the import page alone had about 40 hex values. |
| Email, billing, admin, roles | None. |
| State | Each page kept its own `useState` plus query parameters, which dropped values between steps. Record counts disagreed across steps (1,573 / 1,397 / 1,571). |
| Tests | None. `next.config.mjs` ignores TypeScript and ESLint errors during builds. |

**Dead or broken files:**
- duplicate `mmc-logo`, `platform-logos` and `animated-gradient-border`
- unused animation components and `theme-provider`
- a placeholder `components/ui/chart.tsx` with type errors
- missing MYOB screenshots in the comparison modal
