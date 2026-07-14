# Power Automate solution archive

## Baseline package

- File: `USPQAComplianceManagementSystem_1_0_0_2.zip`
- Export type: Unmanaged
- Exported: July 14, 2026 at 6:04 AM Central
- Export artifact version: `1.0.0.2`
- Source environment solution version at export: `1.0.0.1`
- Size: 18,627 bytes
- SHA-256: `6F13F6CEBDA1652970FB3B424862A9C7B8673128E850CECE41BC7303DFC4645F`
- Solution unique name: `USPQAComplianceManagementSystem`
- Solution ID: `a1ec2928-2f7f-f111-ab0e-000d3a35a18a`

The ZIP was opened and its package structure verified after download. It contains `solution.xml`, `customizations.xml`, three connection references, and the following six active workflows:

- QCMS - Process Web Inspection Submission v2
- QCMS - Submit Inspection to QA
- QCMS - Process QA Decision v2
- QCMS - Monitor Overdue Corrective Actions
- QCMS - Close Corrective Actions
- QCMS Generate Audit Report

Disabled legacy GitHub export flows, the placeholder-response flow, and the superseded QA flow are intentionally excluded. Version `1.0.0.2` adds clean duplicate-trigger termination to the web-submission flow and binds all of that flow's Forms and SharePoint actions to the solution-generated governed connection references. The package was exported with Solution Checker enabled after publishing all customizations.

Run `npm run verify:solution` from the repository root before deployment or recovery. The check recalculates the checksum, validates and decompresses ZIP entries, requires the three solution metadata files, confirms exactly six intended workflow definitions, verifies the duplicate-replay guard, and enforces governed Forms and SharePoint connection bindings in the web-submission definition.

The prior `1.0.0.1` package is retained only as historical rollback evidence. `1.0.0.2` is the active pre-production baseline.

## Import and recovery use

Treat this unmanaged package as the verified pre-production baseline and retain its checksum with any copied release artifact. Before importing into another environment, provision or select the intended SharePoint and Office 365 connections, map all connection references, validate environment-specific SharePoint URLs and list bindings, and keep outbound notifications gated. After import, publish customizations, run Solution checker, and execute the cutover smoke-test matrix before enabling production delivery.

For rollback, disable the affected flow, import the last known-good package, remap and validate its connections, then run a controlled test against retained test data before re-enabling the flow.
