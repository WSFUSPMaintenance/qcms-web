# QCMS Web

Static dashboard and inspection bridge for the Union Springs QA Compliance Management System. It reads sanitized JSON snapshots from `data/`, supports inspection entry through Microsoft Forms, routes QA decisions through the QA form bridge, and produces printable compliance summaries.

## Local verification

Requirements: Node.js 22 or later.

```powershell
npm test
node --check app.js
npm run generate:schedule
npm run generate:audit
npm run verify:solution
```

Serve the directory through an HTTP server; browser security rules prevent reliable JSON loading when `index.html` is opened directly from disk.

## Deployment controls

- Keep legacy per-item GitHub export flows disabled.
- Publish records and responses as one serialized, paginated snapshot.
- Do not include credentials or non-dashboard personal data in JSON exports.
- Run the security tests before every deployment.
- Follow the credential-rotation and engineering controls in `SECURITY.md`.
- Treat the generated sample audit as a rendering test only; a complete production package must also supply corrective actions and workflow history.

## Governed snapshot publisher

`.github/workflows/publish-snapshots.yml` replaces the disabled per-item Power Automate exports. It runs as a single serialized job, obtains a short-lived Microsoft Graph token through GitHub-to-Entra workload identity federation, reads every page from both SharePoint lists, detects concurrent list changes, and commits both sanitized snapshots together only after the complete test suite passes.

The `qcms-production` GitHub environment must define non-secret variables `QCMS_TENANT_ID` and `QCMS_CLIENT_ID`. The Entra application must trust this repository environment through a federated credential and receive least-privilege `Sites.Selected` access to only the QCMS SharePoint site. No personal access token or client secret is used by the publisher. Follow `deployment/SNAPSHOT_PUBLISHER_SETUP.md` for the one-time identity, environment, activation, and recovery procedure.
