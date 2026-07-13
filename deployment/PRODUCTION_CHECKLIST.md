# QCMS Production Readiness Checklist

## Security gate

- [ ] Revoke the exposed GitHub fine-grained token and review its audit activity.
- [ ] Confirm the two legacy per-item GitHub export flows are disabled.
- [ ] Confirm no flow export or repository file contains a credential.
- [ ] Use governed connections or an approved secret store; enable Secure Inputs and Secure Outputs on credential-bearing actions.
- [ ] Restrict SharePoint lists and report libraries to appropriate QCMS roles.

## SharePoint schema gate

- [ ] QCMS Inspection Schedule has `ScheduleKey` (single-line text, required, unique, indexed).
- [ ] Schedule fields include FormID, InspectionName, Department, Frequency, DueDate, Sequence, Status, and OwnerEmail.
- [ ] QCMS Inspection Responses has `ResponseKey = InspectionID|ChecklistItemID` (required, unique, indexed).
- [ ] QCMS Inspection Records has a unique indexed InspectionID and an indexed Status and DueDate.
- [ ] QCMS Corrective Actions has indexed InspectionID, Status, DueDate, and Department fields.
- [ ] QCMS Escalation Log uses `Escalated On` (Date/Time) and `Escalated To Email` (Text); retire the obsolete number columns from views.
- [ ] QCMS Departments contains an active row and manager/reviewer routing for every catalog department.

## Workflow gate

- [ ] Web submission is idempotent by Forms response ID and ends in Processed or Failed.
- [ ] Inspection Record remains Processing until all expected responses exist.
- [ ] Submit-to-QA accepts Pass, Fail, and legitimate N/A, and rejects only missing answers/count mismatches.
- [ ] QA decision requires Awaiting QA, validates the decision, requires rejection comments, and uses authenticated reviewer identity plus `utcNow()`.
- [ ] Corrective actions and workflow history are created once under retry.
- [ ] Overdue monitoring suppresses duplicate escalation notices and has separate error handling for email.
- [ ] Snapshot publishing is serialized, paginated, and commits records and responses together.
- [ ] Audit package uses requested dates and saves a controlled artifact with metadata.

## Go-live data gate

- [ ] Validate `data/forms.json` and `data/checklist-items.json` with `npm test`.
- [ ] Review `initial-inspection-schedule.csv` and import only after ScheduleKey uniqueness is enabled.
- [ ] Confirm August 1, 2026 baseline and responsible department managers.
- [ ] Clear test records using the approved retention/backup procedure.
- [ ] Run smoke submissions for Pass, Fail, N/A, rejection, approval, corrective-action closure, overdue escalation, and retry/idempotency.
- [ ] Verify dashboard, reports, notification recipients, permissions, mobile layout, and print/PDF output.

## Release gate

- [ ] Export and archive the final Power Automate solution and SharePoint schema inventory.
- [ ] Record flow owners, connections, support contacts, recovery procedure, and rollback plan.
- [ ] Enable outbound notifications only after routing tests pass.
- [ ] Capture go-live approval and deployment timestamp in the engineering log.
