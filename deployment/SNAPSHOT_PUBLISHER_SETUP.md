# Governed snapshot publisher setup

The QCMS snapshot publisher uses GitHub Actions workload identity federation to obtain a short-lived Microsoft Graph token. It does not require a GitHub personal access token, an Entra client secret, or credentials stored in Power Automate.

## One-time identity provisioning

1. Create a dedicated Entra application registration for the QCMS snapshot publisher. Do not create a client secret.
2. Add a federated identity credential with:
   - Issuer: `https://token.actions.githubusercontent.com`
   - Audience: `api://AzureADTokenExchange`
   - Subject: `repo:WSFUSPMaintenance/qcms-web:environment:qcms-production`
3. Grant the application Microsoft Graph application permission `Sites.Selected` and complete tenant-admin consent.
4. Grant that application `read` access only to `waynefarms.sharepoint.com:/teams/USPQAComplianceManagementSystem`. Do not substitute tenant-wide `Sites.Read.All` unless the security owner explicitly approves the broader scope.
5. Record the application object owner, credential subject, site grant, and review date in the operational access inventory.

## GitHub environment provisioning

1. Create the repository environment `qcms-production`.
2. Restrict deployment branches to `main` and add the required production reviewers if organizational policy requires them.
3. Add environment variable `QCMS_TENANT_ID` with the Wayne Farms tenant ID.
4. Add environment variable `QCMS_CLIENT_ID` with the dedicated Entra application client ID.
5. Confirm repository or organization policy permits this workflow's explicitly requested `contents: write` and `id-token: write` permissions. Do not add a personal access token.

## Activation test

1. Merge `.github/workflows/publish-snapshots.yml` to `main`.
2. Run `Publish QCMS snapshots` manually from GitHub Actions.
3. Confirm the identity exchange, both paginated SharePoint reads, concurrent-change check, and all automated tests succeed.
4. If data changed, confirm one commit updates only `data/inspection-records.json` and `data/inspection-responses.json` together. If data did not change, confirm the workflow exits successfully without a commit.
5. Open the deployed dashboard and confirm record counts, inspection details, privacy filtering, and browser console health.
6. Leave the hourly schedule enabled only after this activation test passes.

## Failure handling

- An OIDC exchange failure indicates a tenant/client variable, federated subject, audience, or environment-name mismatch.
- A Graph `403` indicates missing admin consent or a missing site-specific grant.
- Pagination cycles, missing keys, duplicate keys, orphan responses, identity leakage, concurrent list changes, or any regression-test failure stop publication before a commit.
- Keep both legacy direct-GitHub Power Automate flows disabled during recovery.
