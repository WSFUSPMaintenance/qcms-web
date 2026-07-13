const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const dataDirectory = path.resolve(__dirname, "../data");
const load = name => JSON.parse(fs.readFileSync(path.join(dataDirectory, name), "utf8"));

test("deployed snapshots pass runtime validation", async () => {
  const { validateQcmsData } = await import("../lib/data-validation.mjs");
  assert.equal(validateQcmsData({
    forms: load("forms.json"),
    checklistItems: load("checklist-items.json"),
    inspectionRecords: load("inspection-records.json"),
    inspectionResponses: load("inspection-responses.json")
  }), true);
});

test("runtime validation rejects duplicate form identifiers", async () => {
  const { validateQcmsData } = await import("../lib/data-validation.mjs");
  const form = { id: "DUP001", name: "Duplicate", department: "QA", frequency: "Weekly" };
  assert.throws(() => validateQcmsData({
    forms: [form, { ...form }],
    checklistItems: [],
    inspectionRecords: [],
    inspectionResponses: []
  }), /duplicate id/i);
});

test("runtime validation rejects orphan checklist items", async () => {
  const { validateQcmsData } = await import("../lib/data-validation.mjs");
  assert.throws(() => validateQcmsData({
    forms: [],
    checklistItems: [{ itemId: "ORPHAN", formId: "NONE", requirement: "Invalid" }],
    inspectionRecords: [],
    inspectionResponses: []
  }), /invalid form/i);
});
