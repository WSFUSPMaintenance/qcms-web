# QCMS Operations and Recovery Runbook

## Service scope

This runbook covers the USP QA Compliance Management System SharePoint site, the `qcms-web` dashboard, Microsoft Forms bridges, Power Automate workflows, and the private QCMS Reports library.

The current primary owner and first-line support contact is **Barr, Dennis**. All verified active flows currently run on the owner's plan. A secondary owner or governed service account must be added before production cutover so operation does not depend on one person.

## Active workflow inventory

| Workflow | Flow ID | Trigger/type | Current state | Primary integration |
|---|---|---|---|---|
| QCMS - Process Web Inspection Submission v2 | `a8ae3b63-bc53-4872-b8b4-ed931dc1043b` | Automated | On | SharePoint submission bridge and inspection lists |
| QCMS - Submit Inspection to QA | `e046e32f-51d4-4d2f-b6ba-546dbe42d778` | Automated | On | SharePoint, QA routing, notification connection |
| QCMS - Process QA Decision v2 | `c67a3677-3e67-4753-b5ca-81e3d9d836cd` | Automated | On | Microsoft Forms and SharePoint |
| QCMS - Monitor Overdue Corrective Actions | `737a55aa-f8ff-4a13-a2bf-c68d4e76d5f7` | Scheduled | On; outbound email gated | SharePoint and Office 365 Outlook |
| QCMS - Close Corrective Actions | `f6d291fc-d483-40a7-be75-1788694dc578` | Automated | On | SharePoint corrective actions and workflow history |
| QCMS Generate Audit Report | `c534f2d7-8187-4cee-9a5e-b389ca6059f5` | Instant/manual | On | SharePoint lists and QCMS Reports library |

The two legacy direct-GitHub export flows (`41dc601f-e3f0-4c18-b59d-a6636d9aaef5` and `8c83e853-a88e-43a1-8e63-205d26e8f769`) must remain disabled. The placeholder-response flow (`9c80f18c-4f98-44d2-ac8c-82a556c24c39`) and superseded QA flow (`ca192e70-7c1c-451a-b498-d0aac0a4a7fa`) must also remain disabled.

## Deployment solution

- Display name: `USP QA Compliance Management System`
- Unique name: `USPQAComplianceManagementSystem`
- Solution ID: `a1ec2928-2f7f-f111-ab0e-000d3a35a18a`
- Current environment version at export: `1.0.0.1`
- Verified unmanaged export: `deployment/artifacts/USPQAComplianceManagementSystem_1_0_0_2.zip` (artifact version `1.0.0.2`, 18,627 bytes)
- Export SHA-256: `6F13F6CEBDA1652970FB3B424862A9C7B8673128E850CECE41BC7303DFC4645F`
- Publisher: `USP QCMS` (`USPQCMSPublisher`, prefix `qcms`, choice prefix `83420`)
- Contents: the six active workflows listed above and three generated connection references

Publish all customizations and run Solution checker before every export. The baseline analysis completed July 13, 2026 at 10:02:16 PM with no findings. The refreshed unmanaged export completed July 14, 2026 with Solution Checker enabled, was copied into the deployment artifacts directory, and its ZIP structure, connector bindings, duplicate-replay guard, and checksum were verified. Disabled legacy, placeholder, and superseded flows must remain outside the production solution.

## Routine health checks

1. Review the 28-day run history for every active workflow and investigate new failures.
2. Confirm submission-bridge items end in `Processed` or an actionable `Failed` state.
3. Confirm Inspection Records do not remain `Processing` beyond the normal submission window.
4. Review `QCMS Escalation Log` for `Failed` or `Skipped` delivery states and preserve the deterministic EscalationKey.
5. Review corrective actions for overdue open items and confirm each closed item has ResolutionNotes, ClosedDate, and one workflow-history closure event.
6. Run an audit-package smoke test and confirm a non-empty timestamped HTML file appears in the private QCMS Reports library.
7. Run `npm test` and `npm run verify:solution` in `qcms-web`; the release baseline is 23 passing tests plus a checksum- and manifest-verified solution archive.

## Incident recovery

1. Identify the failed flow, run ID, first failed action, connector status, and affected SharePoint item IDs.
2. Disable only the affected flow when repeated triggers could create duplicate or conflicting data. Leave unrelated workflows operating.
3. Preserve the failed run details and affected list rows before editing or replaying anything.
4. Correct configuration or connection state. Never remove deterministic keys to force a replay.
5. Reprocess using the existing item and key when the workflow supports retry. Do not create a second response, escalation, corrective action, or history event for the same business event.
6. Run Flow checker, then execute one controlled test case covering both the success path and the relevant failure/validation path.
7. Verify final SharePoint state directly, re-enable the flow if it was disabled, and record the run ID and outcome in `DEVELOPMENT_LOG.md`.

## Rollback procedure

- **Power Automate:** disable the changed flow, restore the prior exported solution/version, validate its connections, and run a controlled replay against test data before enabling it.
- **SharePoint schema:** prefer additive rollback. Remove new fields from views before deleting anything. Do not drop unique keys or indexes while flows depend on them. Restore changed Required settings only when existing data satisfies the prior contract.
- **SharePoint data:** restore from the approved backup/retention source. Never bulk-delete production rows without a captured backup and change approval.
- **Web application:** redeploy the last known-good Git commit or release artifact. Re-run automated tests and desktop/mobile smoke tests after rollback.
- **Notifications:** set the outbound-delivery gate to disabled before troubleshooting routing or connector failures. Re-enable only after a controlled recipient test.

## Cutover and ownership requirements

- Retain the checksum-verified Power Automate solution archive and connection-reference manifest with the release artifacts.
- Add a secondary owner or governed service account to every active workflow.
- Provision QCMS Owners, operational Members, and read-only/visitor access according to approved business roles.
- Record the approved support distribution list and escalation contact.
- Confirm recovery artifacts are accessible to at least two authorized administrators.
- Record go-live approval, timestamp, solution version, and rollback point in the engineering log.
