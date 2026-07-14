const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { inspectSolutionArtifact, listZipEntries } = require("../lib/solution-artifact.js");

const artifactPath = path.resolve(
  __dirname,
  "..",
  "deployment",
  "artifacts",
  "USPQAComplianceManagementSystem_1_0_0_1.zip"
);

test("archived Power Automate solution has the verified checksum and component set", () => {
  const artifact = inspectSolutionArtifact(artifactPath);
  const names = artifact.entries.map(entry => entry.name);

  assert.equal(artifact.size, 18458);
  assert.equal(artifact.sha256, "AA573445055236C3631069949F6F3A466952DCC00262B0B7EC24D57AC508D7A3");
  assert.equal(artifact.entries.length, 9);
  assert.ok(names.includes("solution.xml"));
  assert.ok(names.includes("customizations.xml"));
  assert.ok(names.includes("[Content_Types].xml"));
  assert.equal(names.filter(name => name.startsWith("Workflows/") && name.endsWith(".json")).length, 6);
});

test("malformed solution archives fail closed", () => {
  assert.throws(() => listZipEntries(Buffer.from("not a zip")), /end-of-central-directory/);
});
