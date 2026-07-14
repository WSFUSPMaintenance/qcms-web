const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const fs = require("node:fs");
const { inspectSolutionArtifact, listZipEntries, readZipEntry } = require("../lib/solution-artifact.js");

const artifactPath = path.resolve(
  __dirname,
  "..",
  "deployment",
  "artifacts",
  "USPQAComplianceManagementSystem_1_0_0_2.zip"
);

test("archived Power Automate solution has the verified checksum and component set", () => {
  const artifact = inspectSolutionArtifact(artifactPath);
  const names = artifact.entries.map(entry => entry.name);

  assert.equal(artifact.size, 18627);
  assert.equal(artifact.sha256, "6F13F6CEBDA1652970FB3B424862A9C7B8673128E850CECE41BC7303DFC4645F");
  assert.equal(artifact.entries.length, 9);
  assert.ok(names.includes("solution.xml"));
  assert.ok(names.includes("customizations.xml"));
  assert.ok(names.includes("[Content_Types].xml"));
  assert.equal(names.filter(name => name.startsWith("Workflows/") && name.endsWith(".json")).length, 6);
});

test("archived web-submission flow includes clean duplicate replay handling and governed references", () => {
  const buffer = fs.readFileSync(artifactPath);
  const workflowName = listZipEntries(buffer).find(entry => entry.name.includes("QCMS-ProcessWebInspectionSubmissionv2")).name;
  const workflow = JSON.parse(readZipEntry(buffer, workflowName).toString("utf8"));
  const actions = workflow.properties.definition.actions;

  assert.equal(actions.Get_Existing_Bridge.inputs.parameters.$top, 1);
  assert.match(actions.Get_Existing_Bridge.inputs.parameters.$filter, /ExternalSubmissionID eq/);
  assert.deepEqual(actions.Duplicate_Submission.expression.and[0].greater, [
    "@length(body('Get_Existing_Bridge')?['value'])",
    0
  ]);
  assert.equal(actions.Duplicate_Submission.actions.Complete_Duplicate_Replay.inputs.runStatus, "Succeeded");
  assert.equal(actions.Create_item.runAfter.Duplicate_Submission[0], "Succeeded");
  assert.equal(workflow.properties.definition.triggers.When_a_new_response_is_submitted.inputs.host.connectionName, "shared_microsoftforms-1");
  assert.equal(actions.Get_response_details.inputs.host.connectionName, "shared_microsoftforms-1");
});

test("malformed solution archives fail closed", () => {
  assert.throws(() => listZipEntries(Buffer.from("not a zip")), /end-of-central-directory/);
});
