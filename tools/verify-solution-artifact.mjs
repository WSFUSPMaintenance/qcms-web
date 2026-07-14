import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const fs = require("node:fs");
const { inspectSolutionArtifact, readZipEntry } = require("../lib/solution-artifact.js");
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(
  repositoryRoot,
  "deployment",
  "artifacts",
  "USPQAComplianceManagementSystem_1_0_0_2.zip"
);

const expectedSha256 = "6F13F6CEBDA1652970FB3B424862A9C7B8673128E850CECE41BC7303DFC4645F";
const expectedWorkflows = [
  "QCMS-CloseCorrectiveActions",
  "QCMS-SubmitInspectiontoQA",
  "QCMS-ProcessQADecisionv2",
  "QCMS-ProcessWebInspectionSubmissionv2",
  "QCMS-MonitorOverdueCorrectiveActions",
  "QCMSGenerateAuditReport"
];

const result = inspectSolutionArtifact(artifactPath);
const workflowEntries = result.entries
  .filter(entry => entry.name.startsWith("Workflows/") && entry.name.endsWith(".json"))
  .map(entry => entry.name);

if (result.sha256 !== expectedSha256) {
  throw new Error(`Solution artifact checksum mismatch: expected ${expectedSha256}, received ${result.sha256}.`);
}

if (result.entries.length !== 9) {
  throw new Error(`Solution artifact contains ${result.entries.length} entries; expected 9.`);
}

for (const requiredEntry of ["solution.xml", "customizations.xml", "[Content_Types].xml"]) {
  if (!result.entries.some(entry => entry.name === requiredEntry)) {
    throw new Error(`Solution artifact is missing ${requiredEntry}.`);
  }
}

if (workflowEntries.length !== expectedWorkflows.length) {
  throw new Error(`Solution artifact contains ${workflowEntries.length} workflow definitions; expected ${expectedWorkflows.length}.`);
}

for (const workflow of expectedWorkflows) {
  if (!workflowEntries.some(entry => entry.includes(workflow))) {
    throw new Error(`Solution artifact is missing workflow ${workflow}.`);
  }
}

const archiveBuffer = fs.readFileSync(artifactPath);
const webWorkflowName = workflowEntries.find(entry => entry.includes("QCMS-ProcessWebInspectionSubmissionv2"));
const webWorkflow = JSON.parse(readZipEntry(archiveBuffer, webWorkflowName).toString("utf8"));
const definition = webWorkflow.properties.definition;
const topLevel = definition.actions;
const duplicateGuard = topLevel.Duplicate_Submission;

if (topLevel.Get_Existing_Bridge.inputs.parameters.$top !== 1) {
  throw new Error("Web-submission duplicate lookup must retrieve at most one bridge row.");
}
if (!topLevel.Get_Existing_Bridge.inputs.parameters.$filter.includes("ExternalSubmissionID eq")) {
  throw new Error("Web-submission duplicate lookup does not filter by ExternalSubmissionID.");
}
if (duplicateGuard?.type !== "If" || duplicateGuard.actions?.Complete_Duplicate_Replay?.inputs?.runStatus !== "Succeeded") {
  throw new Error("Web-submission duplicate replay guard is missing or does not terminate successfully.");
}

function collectActions(actions) {
  return Object.values(actions).flatMap(action => [
    action,
    ...(action.actions ? collectActions(action.actions) : []),
    ...(action.else?.actions ? collectActions(action.else.actions) : [])
  ]);
}

const allActions = collectActions(definition.actions);
const sharePointConnections = allActions
  .filter(action => action.inputs?.host?.apiId?.endsWith("shared_sharepointonline"))
  .map(action => action.inputs.host.connectionName);
const formsConnections = [
  ...Object.values(definition.triggers),
  ...allActions
]
  .filter(action => action.inputs?.host?.apiId?.endsWith("shared_microsoftforms"))
  .map(action => action.inputs.host.connectionName);

if (sharePointConnections.length === 0 || sharePointConnections.some(name => name !== "shared_sharepointonline-1")) {
  throw new Error("Web-submission SharePoint actions are not consistently bound to the governed connection reference.");
}
if (formsConnections.length === 0 || formsConnections.some(name => name !== "shared_microsoftforms-1")) {
  throw new Error("Web-submission Forms actions are not consistently bound to the governed connection reference.");
}

console.log(`Verified ${path.basename(artifactPath)}`);
console.log(`SHA-256: ${result.sha256}`);
console.log(`Archive entries: ${result.entries.length}; workflows: ${workflowEntries.length}`);
console.log(`Verified duplicate replay guard and ${sharePointConnections.length + formsConnections.length} governed connector bindings`);
