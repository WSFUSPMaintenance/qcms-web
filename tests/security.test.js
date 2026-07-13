const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(repositoryRoot, "..");
const scanRoot = fs.existsSync(path.join(workspaceRoot, "power-automate-review")) ? workspaceRoot : repositoryRoot;
const appSource = fs.readFileSync(path.join(repositoryRoot, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(repositoryRoot, "index.html"), "utf8");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

test("workspace contains no GitHub personal access tokens", () => {
  const tokenPattern = /\b(?:github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]{20,})\b/g;
  const findings = walk(scanRoot)
    .filter(file => !/\.(?:png|jpe?g|gif|pdf|zip)$/i.test(file))
    .flatMap(file => {
      const contents = fs.readFileSync(file, "utf8");
      return contents.match(tokenPattern)?.map(() => path.relative(scanRoot, file)) || [];
    });
  assert.deepEqual(findings, []);
});

test("dynamic inspection and response fields are escaped", () => {
  for (const unsafeTemplate of [
    "${name}</", "${inspectionId}</", "${formId}</", "${department}</",
    "${submittedBy}</", "${qaComments ||", "${checklistItem}</", "${requirement}</",
    "${comment ||"
  ]) {
    assert.equal(appSource.includes(unsafeTemplate), false, `unsafe template remains: ${unsafeTemplate}`);
  }
});

test("HTML and generated templates contain no inline event handlers", () => {
  assert.doesNotMatch(htmlSource, /<[a-z][^>]+\son[a-z]+\s*=/i);
  assert.doesNotMatch(appSource, /<[a-z][^>]+\son[a-z]+\s*=/i);
});

test("page enforces a restrictive script and connection policy", () => {
  assert.match(htmlSource, /Content-Security-Policy/);
  assert.match(htmlSource, /script-src 'self'/);
  assert.match(htmlSource, /connect-src 'self'/);
  assert.doesNotMatch(htmlSource, /script-src[^;]*(?:unsafe-inline|unsafe-eval)/);
});

test("published snapshots contain no email addresses or identity fields", () => {
  for (const filename of ["inspection-records.json", "inspection-responses.json"]) {
    const contents = fs.readFileSync(path.join(repositoryRoot, "data", filename), "utf8");
    assert.doesNotMatch(contents, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, `${filename} contains an email address`);
    const rows = JSON.parse(contents);
    for (const row of rows) {
      assert.equal(Object.hasOwn(row, "SubmittedByEmail"), false, `${filename} contains SubmittedByEmail`);
      assert.equal(Object.hasOwn(row, "OwnerEmail"), false, `${filename} contains OwnerEmail`);
      assert.equal(Object.hasOwn(row, "ActorEmail"), false, `${filename} contains ActorEmail`);
    }
  }
});
