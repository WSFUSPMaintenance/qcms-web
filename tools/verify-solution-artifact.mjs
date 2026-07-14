import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { inspectSolutionArtifact } = require("../lib/solution-artifact.js");
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(
  repositoryRoot,
  "deployment",
  "artifacts",
  "USPQAComplianceManagementSystem_1_0_0_1.zip"
);

const expectedSha256 = "AA573445055236C3631069949F6F3A466952DCC00262B0B7EC24D57AC508D7A3";
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

console.log(`Verified ${path.basename(artifactPath)}`);
console.log(`SHA-256: ${result.sha256}`);
console.log(`Archive entries: ${result.entries.length}; workflows: ${workflowEntries.length}`);
