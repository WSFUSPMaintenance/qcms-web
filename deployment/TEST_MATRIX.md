# QCMS End-to-End Test Matrix

| Area | Test | Current evidence | Gate |
|---|---|---|---|
| Catalog | Unique form and checklist IDs; every item maps to a form | Automated tests pass | Passed |
| Schedule | Calendar cadence from 2026-08-01; unique keys; SEC001 excluded | 785 deterministic rows; automated tests pass | Passed |
| Dashboard | KPI and attention data load | Browser verified: 7 inspections, 4 Awaiting QA, 7 failures | Passed |
| Navigation | Home → queue → details → queue → home | Browser verified under CSP | Passed |
| Inspection entry | Catalog selection and checklist rendering | Browser verified with OHD001 | Passed |
| Inspection validation | Missing response blocks bridge | Browser verified `Please answer item 1.` | Passed |
| Reports | Central date defaults and detailed report generation | Browser verified 2026-07-01 through 2026-07-12 | Passed |
| Responsive UI | 390×844 layout | Browser verified no horizontal overflow | Passed |
| Security | No token patterns, inline handlers, or unsafe script CSP | Automated tests pass | Passed locally |
| Snapshot integrity | Malformed/duplicate/orphan catalog data rejected | Automated tests pass; valid data loads in browser | Passed |
| Web submission | Pass/Fail/N/A creates exactly one record and expected responses | Prior live run evidence; must repeat after final flow export | Revalidation required |
| Submit to QA | State update occurs after complete response validation | Prior live run evidence; must repeat after final solution export | Revalidation required |
| QA approval | Authorized response updates exactly one Awaiting QA record | Prior live run evidence; final authorization test pending | Revalidation required |
| QA rejection | Comments required; corrective actions/history idempotent | Prior live run evidence; retry test pending | Revalidation required |
| Corrective closure | Notes required; ClosedDate/history written once | Live flow and EventKey uniqueness verified; run `08584176475833492467068376974CU15` passed | Passed |
| Overdue escalation | Levels, department routing, retry, and duplicate suppression | Live query, reservation, failed-row reuse, and routing passed; outbound delivery remains gated | Controlled delivery test required |
| Snapshot publisher | Serialized, paginated, coordinated commit, governed secret | Legacy exports disabled; replacement pending | Blocked by live access/token rotation |
| Audit package | Requested dates; escaped HTML artifact and metrics | Live run `08584176220107551792178553093CU15` passed all four paginated SharePoint reads and controlled storage; corrective-action/history rendering remains | Live completion required |
| SharePoint schema | Unique/indexed keys and target fields | Schedule schema/785-row load complete; response, record, corrective-action, escalation, and department constraints remain | Live completion required |
| Forms | Organization auth, authoritative identity, negative cases | Specification complete; tenant settings verification pending | Tenant verification required |

Production release is not approved while any row is marked Blocked, Pending implementation, or Revalidation required.
