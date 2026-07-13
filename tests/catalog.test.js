const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const dataDirectory = path.resolve(__dirname, "../data");
const forms = JSON.parse(fs.readFileSync(path.join(dataDirectory, "forms.json"), "utf8"));
const checklistItems = JSON.parse(fs.readFileSync(path.join(dataDirectory, "checklist-items.json"), "utf8"));

test("form and checklist identifiers are unique", () => {
  assert.equal(new Set(forms.map(form => form.id)).size, forms.length);
  assert.equal(new Set(checklistItems.map(item => item.itemId)).size, checklistItems.length);
});

test("every checklist item references a known form", () => {
  const formIds = new Set(forms.map(form => form.id));
  const orphans = checklistItems.filter(item => !formIds.has(item.formId));
  assert.deepEqual(orphans, []);
});

test("every form has required routing and recurrence metadata", () => {
  const allowedFrequencies = new Set(["Weekly", "Bi-Weekly", "Monthly", "Every 2 Months", "Quarterly", "Special Event"]);
  for (const form of forms) {
    assert.ok(form.id && form.name && form.department, `missing required form metadata: ${form.id || "unknown"}`);
    assert.ok(allowedFrequencies.has(form.frequency), `unsupported frequency on ${form.id}`);
    assert.ok(checklistItems.some(item => item.formId === form.id), `form ${form.id} has no checklist items`);
  }
});
