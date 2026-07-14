# Power Automate solution archive

## Baseline package

- File: `USPQAComplianceManagementSystem_1_0_0_1.zip`
- Export type: Unmanaged
- Exported: July 13, 2026 at 10:08 PM Central
- Export artifact version: `1.0.0.1`
- Source environment solution version: `1.0.0.0`
- Size: 18,458 bytes
- SHA-256: `AA573445055236C3631069949F6F3A466952DCC00262B0B7EC24D57AC508D7A3`
- Solution unique name: `USPQAComplianceManagementSystem`
- Solution ID: `a1ec2928-2f7f-f111-ab0e-000d3a35a18a`

The ZIP was opened and its package structure verified after download. It contains `solution.xml`, `customizations.xml`, three connection references, and the following six active workflows:

- QCMS - Process Web Inspection Submission v2
- QCMS - Submit Inspection to QA
- QCMS - Process QA Decision v2
- QCMS - Monitor Overdue Corrective Actions
- QCMS - Close Corrective Actions
- QCMS Generate Audit Report

Disabled legacy GitHub export flows, the placeholder-response flow, and the superseded QA flow are intentionally excluded. Solution checker completed after publication on July 13, 2026 at 10:02:16 PM with no findings.

## Import and recovery use

Treat this unmanaged package as the verified pre-production baseline and retain its checksum with any copied release artifact. Before importing into another environment, provision or select the intended SharePoint and Office 365 connections, map all connection references, validate environment-specific SharePoint URLs and list bindings, and keep outbound notifications gated. After import, publish customizations, run Solution checker, and execute the cutover smoke-test matrix before enabling production delivery.

For rollback, disable the affected flow, import the last known-good package, remap and validate its connections, then run a controlled test against retained test data before re-enabling the flow.
