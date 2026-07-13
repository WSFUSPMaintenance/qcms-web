# QCMS Production Readiness Checklist

## Security gate

- [ ] Revoke the exposed GitHub fine-grained token and review its audit activity.
- [x] Confirm the two legacy per-item GitHub export flows are disabled. Verified live July 13, 2026: flow IDs `41dc601f-e3f0-4c18-b59d-a6636d9aaef5` and `8c83e853-a88e-43a1-8e63-205d26e8f769` are disabled.
- [x] Confirm no flow export or repository file contains a credential. The repository credential scan passes; historical exports retain redacted Authorization-header structure only so the analyzer can continue to enforce rotation and retirement controls.
- [ ] Use governed connections or an approved secret store; enable Secure Inputs and Secure Outputs on credential-bearing actions.
- [ ] Restrict SharePoint lists and report libraries to appropriate QCMS roles.

## SharePoint schema gate

- [x] QCMS Inspection Schedule has `ScheduleKey` (single-line text, required, unique, indexed). Verified through SharePoint REST after provisioning.
- [x] Schedule fields include FormID, InspectionName, Department, Frequency, DueDate, Sequence, Status, and OwnerEmail. Verified through SharePoint REST after provisioning.
- [ ] QCMS Inspection Responses has `ResponseKey = InspectionID|ChecklistItemID` (required, unique, indexed). Unique/indexed is live; enable required after the approved test-data wipe because 31 legacy test rows predate the key.
- [x] QCMS Inspection Records has a required, unique, indexed Inspection ID and indexed Status and Due Date. Verified through SharePoint REST July 13, 2026 (`field_1`, `field_8`, and `field_5`).
- [x] QCMS Corrective Actions has indexed InspectionID, Status, DueDate, and Department fields. All four live indexes were verified through SharePoint REST July 13, 2026.
- [x] QCMS Escalation Log uses `Escalated On` (Date/Time) and `Escalated To Email` (Text); obsolete numeric `Escalation Date` and `Escalated To` columns are hidden from the default view. `EscalationKey` is required, unique, and indexed.
- [x] QCMS Departments contains an active row plus Department Manager, QA Reviewer, and Backup Manager routing for every catalog department: Production, Sanitation, Maintenance, and QA.

## Workflow gate

- [ ] Web submission is idempotent by Forms response ID and ends in Processed or Failed.
- [ ] Inspection Record remains Processing until all expected responses exist.
- [x] Submit-to-QA accepts Pass, Fail, and legitimate N/A, and rejects only missing answers/count mismatches. Validated in the corrected live submission chain.
- [x] QA decision requires Awaiting QA, validates the decision, requires rejection comments, and uses authenticated reviewer identity plus `utcNow()`. Validated in `QCMS - Process QA Decision v2`.
- [x] Corrective actions and workflow history are created once under retry. Corrective-action closure uses unique `EventKey`; escalation retry reuses the existing row ID.
- [x] Overdue monitoring suppresses duplicate escalation notices and has separate error handling for email. Outbound delivery remains intentionally gated pending the controlled recipient test.
- [ ] Snapshot publishing is serialized, paginated, and commits records and responses together.
- [x] Audit package uses requested dates, paginates all four SharePoint sources, renders normalized Inspection Responses, Corrective Actions, and Workflow History sections, and saves a controlled timestamped HTML artifact with metadata to the private QCMS Reports library. Controlled run `08584176207182908895864449464CU12` passed July 13, 2026.

## Go-live data gate

- [x] Validate `data/forms.json` and `data/checklist-items.json` with `npm test`. All 21 tests passed July 13, 2026.
- [x] Review `initial-inspection-schedule.csv` and import only after ScheduleKey uniqueness is enabled. All 785 unique schedule rows were imported after the constraint and indexes were verified.
- [x] Confirm August 1, 2026 baseline and responsible department managers. The 785-row schedule begins August 1, 2026, and all four catalog departments have active primary, QA, and backup routing.
- [ ] Clear test records using the approved retention/backup procedure.
- [ ] Run smoke submissions for Pass, Fail, N/A, rejection, approval, corrective-action closure, overdue escalation, and retry/idempotency.
- [ ] Verify dashboard, reports, notification recipients, permissions, mobile layout, and print/PDF output.

## Release gate

- [ ] Export and archive the final Power Automate solution and SharePoint schema inventory.
- [ ] Record flow owners, connections, support contacts, recovery procedure, and rollback plan.
- [ ] Enable outbound notifications only after routing tests pass.
- [ ] Capture go-live approval and deployment timestamp in the engineering log.
