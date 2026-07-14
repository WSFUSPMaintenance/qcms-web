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
| Web submission | Pass/Fail/N/A creates exactly one record and expected responses | Controlled recent-trigger run passed July 13, 2026: bridge item 43 reached Processed, inspection 43 was Awaiting QA, and keyed response 112 linked correctly; duplicate-trigger constraint remains pre-cutover | Retry/idempotency revalidation required |
| Submit to QA | State update occurs after complete response validation | Prior live run evidence; must repeat after final solution export | Revalidation required |
| QA approval | Authorized response updates exactly one Awaiting QA record | Prior live run evidence; final authorization test pending | Revalidation required |
| QA rejection | Comments required; corrective actions/history idempotent | Prior live run evidence; retry test pending | Revalidation required |
| Corrective closure | Notes required; ClosedDate/history written once | Live flow and EventKey uniqueness verified; run `08584176475833492467068376974CU15` passed | Passed |
| Overdue escalation | Levels, department routing, retry, and duplicate suppression | Live query, reservation, failed-row reuse, and routing passed; outbound delivery remains gated | Controlled delivery test required |
| Snapshot publisher | Serialized, paginated, coordinated commit, governed secret | Legacy exports disabled; replacement pending | Blocked by live access/token rotation |
| Audit package | Requested dates; controlled HTML artifact with three normalized audit sections | Live run `08584176207182908895864449464CU12` passed every retrieval, table-rendering, and storage action; 11,282-byte artifact verified | Passed |
| SharePoint schema | Unique/indexed keys and target fields | Schedule, Inspection Records, Corrective Actions, Escalation Log, and four-department routing complete; ResponseKey required deferred until test-data wipe | Pre-cutover completion required |
| Forms | Organization auth, authoritative identity, negative cases | Specification complete; tenant settings verification pending | Tenant verification required |

Production release is not approved while any row is marked Blocked, Pending implementation, or Revalidation required.
