# QCMS Web

Reference dashboard, test harness, and deployment repository for the Union Springs QA Compliance Management System. The production operational interface is an authenticated Power Apps canvas app connected directly to the existing QCMS SharePoint lists. This static application remains a synthetic-data UX reference, regression fixture, and printable-report prototype; it is not the production data-delivery path.

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
- Do not publish live SharePoint records or responses to this public repository.
- Keep `data/` limited to synthetic, privacy-safe regression fixtures.
- Run the security tests before every deployment.
- Follow the credential-rotation and engineering controls in `SECURITY.md`.
- Treat the generated sample audit as a rendering test only; a complete production package must also supply corrective actions and workflow history.

## Production interface

The canvas app reads SharePoint through the standard connector already available in the tenant. It must follow `deployment/POWER_APPS_UX_SPEC.md` and `deployment/POWER_APPS_BUILD_PLAN.md`. Existing Forms and Power Automate flows remain the authoritative write and workflow paths during the UI transition.
