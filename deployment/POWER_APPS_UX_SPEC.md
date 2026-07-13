# QCMS Power Apps / Web UX Contract

The existing qcms-web application is the operational dashboard and Microsoft Forms bridge. If a Power Apps canvas interface is used for list administration or replaces a bridge, it must preserve the same contracts rather than creating a second independent workflow model.

## Roles

- Inspector: sees assigned/due inspections, completes every checklist response, and submits once.
- Department Manager: owns corrective actions, supplies resolution notes, and closes work.
- QA Reviewer: reviews only Awaiting QA records for authorized departments and records an explicit decision.
- QCMS Administrator: manages catalog, departments, schedules, and support/retry queues.

## Required screens

1. Home: role-aware counts, overdue work, failed findings, and prominent pending actions.
2. Inspection: catalog metadata, progress count, Pass/Fail/N/A controls, comments, and final review.
3. QA Queue/Detail: immutable submitted responses, failure emphasis, comments, and explicit approve/reject confirmation.
4. Corrective Actions: owner, due date, aging/escalation state, required resolution notes, and closure confirmation.
5. Administration: department routing, active catalog, schedule preview/import status, failed bridge items, and workflow health.

## Validation and state rules

- Resolve catalog, department, ownership, and checklist metadata from SharePoint, not client parameters.
- Disable submit while a request is in flight and show success/failure with a durable record identifier.
- A rejected or failed request remains editable/retryable without creating a duplicate.
- Closing a corrective action requires ResolutionNotes.
- Rejection requires QA comments.
- QA identity comes from the authenticated session; dates come from the service.
- Display Central business dates and clearly distinguish date-only due dates from timestamps.
- Preserve keyboard access, visible focus, accessible labels, 44px touch targets, and responsive layouts.

## Performance and delegation

- Filter indexed SharePoint columns server-side.
- Avoid nondelegable full-list scans; query by unique keys or indexed Status/Department/DueDate.
- Cache stable catalog data per session, refresh operational queues on screen entry, and paginate long history.
- Never load all response history merely to show a count; use indexed queries or maintained aggregate fields.

## Release requirements

- Export the canvas app in a managed solution with environment variables and connection references.
- No hard-coded site URLs, form IDs, emails, reviewer names, or secrets in controls/formulas.
- Test Inspector, Manager, Reviewer, and Administrator roles separately.
- Document owners, support contacts, rollback package, and solution version.
