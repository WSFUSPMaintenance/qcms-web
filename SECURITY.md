# QCMS Security

## Credential incident requiring owner action

A GitHub fine-grained personal access token was discovered in two legacy Power Automate exports on July 12, 2026. Workspace copies were redacted, but the original token must be revoked in GitHub and its audit activity reviewed. The legacy per-item JSON export flows must remain disabled.

Do not embed a replacement token in a flow action, definition export, source file, log, screenshot, ticket, or chat. Use a governed connection or approved secret store and enable Secure Inputs and Secure Outputs.

## Reporting a vulnerability

Report suspected QCMS credential exposure, unauthorized access, data disclosure, workflow bypass, or integrity defects through the company-approved security/support channel. Do not include live credentials in the report.

## Engineering requirements

- Treat SharePoint, Forms, and JSON snapshot values as untrusted input.
- Run `npm test` before deployment.
- Keep the Content Security Policy and no-referrer policy enabled.
- Do not reintroduce inline event handlers or client-supplied QA identity/date fields.
- Publish only the minimum dashboard data required for the authenticated audience.
- Use unique indexed idempotency keys for submissions, responses, schedules, history, and escalations.
- Keep outbound notification flows disabled until routing and duplicate-prevention tests pass.
