# QCMS Web

Static dashboard and inspection bridge for the Union Springs QA Compliance Management System. It reads sanitized JSON snapshots from `data/`, supports inspection entry through Microsoft Forms, routes QA decisions through the QA form bridge, and produces printable compliance summaries.

## Local verification

Requirements: Node.js 22 or later.

```powershell
npm test
node --check app.js
```

Serve the directory through an HTTP server; browser security rules prevent reliable JSON loading when `index.html` is opened directly from disk.

## Deployment controls

- Keep legacy per-item GitHub export flows disabled.
- Publish records and responses as one serialized, paginated snapshot.
- Do not include credentials or non-dashboard personal data in JSON exports.
- Run the security tests before every deployment.
- Follow the credential-rotation and engineering controls in `SECURITY.md`.
