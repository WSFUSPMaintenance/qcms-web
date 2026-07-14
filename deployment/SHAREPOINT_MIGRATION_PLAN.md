# SharePoint Additive Migration Plan

The live lists predate the final schema and several business columns use generated names such as `field_1`. Internal names cannot be safely renamed. Production migration is therefore additive: create canonical columns, backfill, switch flows/views, verify, and only then retire legacy columns from user-facing views.

## Confirmed list identities

| List | GUID |
|---|---|
| QCMS Inspection Records | `f063543e-076d-4aff-9821-0311a2acc14e` |
| QCMS Inspection Responses | `2e6a665e-fbe1-4ee5-9f8d-89e617982c97` |
| QCMS Corrective Actions | `9a4fb9df-a3de-4ab4-a7c7-c5ac7c929149` |
| QCMS Departments | `64b77d53-a5d1-4751-952e-ede4020ebd6c` |
| QCMS Escalation Log | `8ba08827-5f8e-47a5-8cc3-7b5fbda4d4cc` |
| QCMS Workflow History | `a9ec78bb-a4ac-4d44-8d06-1eb6e80bdbf9` |
| QCMS Inspection Schedule | `b1ac096e-2a77-40d5-accc-5904fa74e843` |

QCMS Inspection Schedule was provisioned July 13, 2026. Its `ScheduleKey` is required, unique, and indexed; FormID, Department, DueDate, and Status are also indexed. The validated 785-row schedule covering August 1, 2026 through July 31, 2027 is loaded.

## Confirmed current field contracts

QCMS Corrective Actions currently has optional Text fields InspectionID, ChecklistItemID, Department, OwnerEmail, and Status; optional DateTime fields DueDate and ClosedDate; and optional Note field ResolutionNotes.

QCMS Workflow History has Text fields InspectionID, EventType, FromStatus, ToStatus, and ActorEmail; DateTime EventDate configured to retain time; Note Details; and deterministic EventKey support for retry-safe events.

## Known legacy mapping requiring live confirmation

| Canonical field | Existing field observed in flows/API |
|---|---|
| Inspection Records.InspectionID | `field_1` |
| Inspection Records.FormID | `field_2` |
| Inspection Records.DueDate | `field_5` |
| Inspection Records.Status | `field_8` / Status Value |
| Inspection Records.Department | `ResponsibleDepartmentText` |
| Inspection Records.CompletionPercent | `Completion_x0025_` |
| Responses.FormID | `field_2` |
| Responses.Requirement | `field_4` |
| Responses.Response | `field_5` / Response Value |
| Responses.Comments | `field_6` |
| Responses.CorrectiveActionRequired | `field_12` |
| Responses.Inspection lookup | `InspectionId` |
| Responses.Checklist Item lookup | `ChecklistItemId` |

Do not run a backfill until each mapping is verified against the live field endpoint.

## Migration sequence

1. Export list schemas, views, permissions, and a test-data backup.
2. Add missing canonical columns as optional and create required indexes.
3. Backfill in batches below list-threshold limits; write migration errors to a controlled log.
4. Verify counts, nulls, duplicates, lookup targets, and representative records.
5. Resolve all duplicate candidate keys before enabling uniqueness.
6. Update development flows to canonical columns and run the full test matrix.
7. Make canonical columns required where specified.
8. Switch views/Power Apps to canonical columns.
9. Keep legacy columns hidden for one rollback window; do not delete them during initial release.
10. Import the validated schedule only after ScheduleKey uniqueness is active. Completed July 13, 2026: all 785 rows were loaded after the constraint and indexes were verified.

## Current migration status

- Completed: schedule provisioning and load, Inspection ID uniqueness, response-key uniqueness, inspection/corrective-action query indexes, escalation-key constraint, workflow-history date-time correction, and department-routing coverage.
- Deferred to the approved pre-go-live wipe: make `QCMS Inspection Responses.ResponseKey` required after legacy null-key test rows are removed.
- Cutover-only: export schemas and data, run the final solution import, repeat the complete smoke matrix, hide legacy columns for the rollback window, and record the rollback point.

## Rollback

Disable modified flows, restore prior solution versions, re-expose legacy columns/views, and retain canonical backfill data for diagnosis. Do not delete either representation during the rollback window.
