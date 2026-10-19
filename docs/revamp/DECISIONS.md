# Decisions

## Current direction (19 Oct 2026, after review of the first revamp)

The first revamp rebuilt the UI from scratch. It was rejected. The demo is now built on the **original UI from `main`**, re-themed to Gojee colours, with NetSuite → Xero + Gojee content.

| ID | Decision |
| --- | --- |
| D-01 | **Clickable demo for a recorded video.** Mock data, no backend. |
| D-02 | **No login screen for the tool.** `/` goes straight to the dashboard (the original "Start a New Migration" screen). |
| D-03 | **One entity per migration:** one NetSuite subsidiary → one Xero org + one Gojee account. The entity is picked after NetSuite sign-in (Hillys Pizzeria by default). "(Consolidated)" and elimination nodes can't be picked. |
| D-04 | **Original UI and flow kept:** dashboard → Connect → Extract → Map → Validate → Import → Report. The stepper, cards, Import animation and the Report structure are unchanged. Only colours and content differ. |
| D-05 | **Next → Next.** Every screen has one **Next** button in the same place, with a caption saying where it goes. On Connect, Next opens whichever system isn't connected yet (NetSuite, then Xero; Gojee follows Xero automatically). |
| D-06 | **No payment step.** |
| D-07 | **Happy path, no fix moment** (updated 19 Oct 2026): the trial-balance rounding card and its "Fix" button were removed from Validate; every period matches NetSuite and Validate only shows non-blocking warnings. |
| D-08 | Third-party sign-in screens (NetSuite login/2FA/role/consent, Xero login/consent, Gojee "Continue with Xero") are realistic replicas. |
| D-09 | Comparative reports open in a new tab, styled like the original HTML reports: Trial Balance, Aged Receivable, Aged Payable, plus Inventory and Jobs & WIP for Gojee. Each adds real PDF and Excel downloads. |
| D-10 | **Official logos and colours** (supplied 19 Oct 2026): Gojee wordmark and "go further" logo, NetSuite "N" mark and Oracle NetSuite logo, all in `public/images/gojee/` and `public/images/netsuite/`. Theme = Gojee navy `#003c64` / `#00263e` + mint `#a8d4b9`. |
| D-11 | Sign-in screens match the official NetSuite and Gojee login pages. **Gojee signs in automatically** right after the Xero connection, because Gojee uses Xero sign-in; no extra click. |
| D-12 | **Start date for the history** (19 Oct 2026). On Extract, "Migrate history from" offers All history / last 3 / 2 / 1 financial years or any date; the end date is always the last closed period. Record counts, the Import plan, the Report and the trial-balance report follow the chosen range. |
| D-13 | **UI polish, same UX.** Nunito typeface, Gojee navy + mint tokens, glowing round "Next" button, mint-tick stepper, soft card shadows, tinted table headers, mint selection colour. No screen, step or control was added or moved. |
| D-14 | **Scope changes** (19 Oct 2026): chart of accounts is 159 accounts (`lib/demo-data/chart.ts`), shown in full in Map's account remapping and the trial-balance report. Removed Timesheets (unbilled), Staff Schedule, Staff (link only) and Billing Rates. Added **Open Quotes** (NetSuite estimates → Gojee quotes) and **Attachments** (NetSuite File Cabinet → Xero attachments). Xero login and consent screens refreshed to Xero's current look; sign-in steps unchanged. |
| D-15 | **Xero sign-in matches Xero's new login layout** (from the client's screenshot): blue top bar, "Xero login has a new look" notice, "Log in to your account", and an illustration panel on the right. The authentication (consent) screen uses the same layout. The illustration was generated with Higgsfield (no text or logos in the image); the Xero wordmark is overlaid from the existing Xero logo. Files: `app/login/xero/xero-frame.tsx`, `public/images/xero/`. |
| D-16 | **Attachments handled per file** (20 Oct 2026). Four categories: transaction, contact, financial supporting, general. Every file gets a manifest line (NetSuite record type + internal ID, file name, format, size, destination reference). Supported formats attach to the matching Xero record; HEIC is converted to JPG; PDFs over 25 MB are compressed; ZIP/DWG/PSD/MP4 and other oversized files go to external storage with a link; files with no supported Xero record (closed POs, expired quotes, reconciliations, unlinked documents) go to Xero Files; payment proofs attach to the invoice or bill paid; open POs and quotes carry files into Gojee. Shown on Map (Attachment plan), Validate (warning), the Report (Attachments tab) and a new "Attachment Manifest" report with PDF and Excel. Xero's format list and limits are in `XERO_ATTACHMENT_RULES` and should be checked against Xero's current documentation. |

## Kept from the first revamp
- Demo data (`lib/demo-data/*`).
- The NetSuite → Xero type mapping and the intercompany split, with their unit tests (`lib/mapping/*`).
- The PDF and Excel exporters (`lib/export/*`).
- The placeholder brand config (`lib/brand.ts`).
- The integration interfaces with `TODO(GOJEE-API)` (`lib/integrations`).

## Still open (BRD section 13)
- The Gojee API and SSO contract.
- Product name and domain (placeholder: "Gojee Migrate").
- The full BRD, to check the screens against.
