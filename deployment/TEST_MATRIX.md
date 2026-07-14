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
| Web submission | Pass/Fail/N/A creates exactly one record and expected responses | Fresh structured rejection response 46 passed July 13, 2026: bridge 52 reached Processed, inspection 49 transitioned to Awaiting QA at 100%, and response 118 stored `BRE001-01`, `Fail`, the failure notes, both lookups, and deterministic ResponseKey. Replaying response 40 was rejected by the unique ExternalSubmissionID constraint without a secondary recovery-action failure. | Passed |
| Submit to QA | State update occurs after complete response validation | Prior live run evidence; must repeat after final solution export | Revalidation required |
| QA approval | Authorized response updates exactly one Awaiting QA record | Controlled Forms responses passed July 13, 2026 after replacing the optional form date with server `utcNow()`. Inspection 48 moved to Approved, retained the QA comment, populated QA Reviewer with Barr, Dennis, and stored the server review timestamp. | Passed |
| QA rejection | Comments required; failed responses create corrective actions and history | Structured rejection `BRE001-20260714-015204` passed July 13, 2026: inspection 49 moved to Rejected, Corrective Action 5 was created once for `BRE001-01` with Production manager ownership and a seven-day due date, and Workflow History 8 recorded Awaiting QA to Rejected. | Passed |
| Corrective closure | Notes required; ClosedDate/history written once | Live flow and EventKey uniqueness verified; run `08584176475833492467068376974CU15` passed | Passed |
| Overdue escalation | Levels, department routing, retry, and duplicate suppression | Live query, reservation, failed-row reuse, and routing passed; outbound delivery remains gated | Controlled delivery test required |
| Snapshot publisher | Serialized, paginated, coordinated commit, governed secret | Legacy exports disabled; replacement pending | Blocked by live access/token rotation |
| Audit package | Requested dates; controlled HTML artifact with three normalized audit sections | Live run `08584176207182908895864449464CU12` passed every retrieval, table-rendering, and storage action; 11,282-byte artifact verified | Passed |
| SharePoint schema | Unique/indexed keys and target fields | Schedule, Inspection Records, Corrective Actions, Escalation Log, and four-department routing complete; ResponseKey required deferred until test-data wipe | Pre-cutover completion required |
| Forms | Organization auth, authoritative identity, negative cases | Specification complete; tenant settings verification pending | Tenant verification required |

Production release is not approved while any row is marked Blocked, Pending implementation, or Revalidation required.
