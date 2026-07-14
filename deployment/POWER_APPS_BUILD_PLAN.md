# QCMS Power Apps direct-SharePoint build plan

## Existing app audit — July 14, 2026

The existing canvas app `USP QCMS` (`dd029761-59cc-454b-a993-4c8438888977`) is the production-interface baseline. It already contains `scrHome`, `scrInspectionDetail`, `scrInspectionComplete`, and `scrInspection`, and its preview successfully rendered authenticated SharePoint inspection data.

Current connected data sources are QCMS Departments, Form Catalog, Checklist Items, Inspection Records, Inspection Responses, Escalation Log, Signature Log, Inspection Schedule, Corrective Actions, Workflow History, and Web Submission Bridge. Corrective Actions is now used by the first role-specific workspace; Inspection Schedule, Workflow History, and Web Submission Bridge remain intentionally unused until their screens are implemented.

The first live preview defects were repaired in the saved draft on July 14, 2026:

- Department values now use the text routing field with lookup and `Unassigned` fallbacks.
- Full inspection IDs render on one line without colliding with the Department column.
- The overlapping `My Open Inspections` heading was removed.
- Approved, Rejected, and Closed records no longer show a waiting age; active records without a submission timestamp show `Waiting: N/A`.
- App checker formula errors were reduced from 18 to zero by repairing `App.Formulas`, `Title4.Y`, `Due Date.Text`, and `galQuestions.Items`.

Six home KPI delegation warnings remain. They are not functional errors, but production scale requires maintained aggregate values or targeted flows rather than client-side `CountRows(Filter(...))` scans. `App.OnStart` now derives Department Manager and QA Reviewer capabilities from the active Department routing list and initializes draft version and Central-time metadata. A governed Administrator role source and additional small-reference caching remain pending.

The saved draft now includes `scrManagerDashboard`. Its home navigation is visible only when `varCanManageDepartments` is true. The workspace filters QCMS Corrective Actions to the authenticated manager's active Department routing, displays title, status, department, and due date, and opens the authoritative SharePoint action record. Preview regression verified home-to-manager and manager-to-home navigation. App checker remains at zero formula errors; its seventh formula finding is the documented SharePoint delegation warning on the manager gallery's collection-based Department authorization filter.

Do not publish the app until the role-based screen set is regression tested and the KPI aggregation/delegation approach is accepted or replaced.

## Architecture decision

The production operational interface is a responsive Power Apps canvas app that reads the existing QCMS SharePoint lists through the standard SharePoint connector. Existing Microsoft Forms and Power Automate flows remain authoritative for inspection submission, QA decisions, corrective-action closure, escalation, and audit generation during the transition.

The public GitHub repository remains source control and a synthetic-data regression/demo surface only. Live SharePoint snapshots are not published to GitHub, and no Entra application registration, GitHub personal access token, premium HTTP connector, or new cross-platform credential is required.

## Data sources

Add these existing SharePoint lists to the canvas app:

- QCMS Inspection Schedule
- QCMS Inspection Records
- QCMS Inspection Responses
- QCMS Corrective Actions
- QCMS Workflow History
- QCMS Departments
- QCMS Escalation Log
- QCMS Web Submission Bridge
- QCMS Form Catalog
- QCMS Checklist Items

Use friendly display names in formulas, but document the corresponding legacy internal names for migrated fields such as Inspection ID (`field_1`), Form ID (`field_2`), Due Date (`field_5`), Status (`field_8`), response Requirement (`field_4`), response value (`field_5`), and response Comment (`field_6`).

## App initialization

`App.OnStart` must:

1. Capture the authenticated user with `Set(varUserEmail, Lower(User().Email))`.
2. Load the small active Departments and Form Catalog reference lists into session collections.
3. Derive Inspector, Department Manager, QA Reviewer, and Administrator capabilities from SharePoint routing data; UI role checks do not replace SharePoint permissions.
4. Set Central-time display preferences and app version metadata.
5. Never store credentials, fixed reviewer identities, or client-supplied audit timestamps.

## Screens and minimum behavior

### Home

- KPI cards for Due/Open, Awaiting QA, Failed Findings, Open Corrective Actions, and Overdue Corrective Actions.
- Role-aware action cards and prominent overdue/error states.
- Refresh operational lists on entry; do not load full response or history lists for counts.

### My Inspections

- Filter QCMS Inspection Schedule by indexed Department, Status, and DueDate.
- Launch the authoritative Microsoft Form for the selected catalog item during transition.
- Display current schedule state and last related Inspection Record without scanning unrelated records.

### QA Queue and detail

- Filter Inspection Records by indexed Status = Awaiting QA and the reviewer's authorized departments.
- Retrieve Inspection Responses only for the selected Inspection ID.
- Launch the existing QA decision form; refresh and display the resulting authoritative status/history.
- Highlight Fail responses and require confirmation before leaving an unsent decision.

### Corrective Actions

- Filter by indexed Department, Status, DueDate, and owner routing.
- Display escalation level and delivery state from QCMS Escalation Log.
- Use the existing closure workflow; resolution notes remain mandatory and ClosedDate remains server-generated.

### Administration

- Department routing and active catalog visibility.
- Schedule counts and exception review.
- Failed Web Submission Bridge queue with durable external response identifiers.
- Workflow and audit-report launch links for authorized administrators.

## Delegation and performance rules

- Begin every operational query with delegable equality/range filters on indexed SharePoint columns.
- Cache only small reference tables; refresh queues on screen entry.
- Retrieve responses/history by a selected unique Inspection ID rather than loading entire lists.
- Avoid `Search`, `Lower`, `in`, `CountRows(Filter(...))`, and calculated client joins over large SharePoint lists unless delegation is verified in the authoring studio.
- Use a maintained aggregate or targeted flow when SharePoint cannot delegate an operational count.

## Security and release

- Share the app only with existing QCMS users or approved SharePoint groups.
- Verify every screen under Inspector, Manager, Reviewer, and Administrator accounts.
- Export the canvas app with the Power Automate flows in the QCMS solution and map SharePoint connection references during import.
- Keep both legacy GitHub export flows disabled and revoke the exposed token.
- Complete mobile, keyboard, error, empty-state, delegation-warning, and post-cutover smoke testing before production approval.
