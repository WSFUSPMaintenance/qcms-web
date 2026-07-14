const assert = require("node:assert/strict");
const test = require("node:test");

test("escalation levels follow the production aging policy", async () => {
  const { escalationLevel } = await import("../lib/workflow-policy.mjs");
  assert.equal(escalationLevel("2026-08-01", "2026-08-01"), 0);
  assert.equal(escalationLevel("2026-08-01", "2026-08-02"), 1);
  assert.equal(escalationLevel("2026-08-01", "2026-08-04"), 2);
  assert.equal(escalationLevel("2026-08-01", "2026-08-08"), 3);
});

test("routing expands by level and removes duplicate recipients", async () => {
  const { escalationRecipients } = await import("../lib/workflow-policy.mjs");
  const department = { managerEmail: "manager@example.com", qaReviewerEmail: "qa@example.com", backupManagerEmail: "MANAGER@example.com" };
  assert.deepEqual(escalationRecipients(department, 1), ["manager@example.com"]);
  assert.deepEqual(escalationRecipients(department, 2), ["manager@example.com", "qa@example.com"]);
  assert.deepEqual(escalationRecipients(department, 3), ["manager@example.com", "qa@example.com"]);
});

test("escalation and closure keys are stable", async () => {
  const { escalationKey, closureEventKey } = await import("../lib/workflow-policy.mjs");
  assert.equal(escalationKey(42, 2), "CA-42|L2");
  assert.equal(closureEventKey(42), "CA-42|Closed");
});

test("closure requires closed status, inspection id, and resolution notes", async () => {
  const { validateCorrectiveActionClosure } = await import("../lib/workflow-policy.mjs");
  assert.equal(validateCorrectiveActionClosure({ status: "Closed", inspectionId: "I-1", resolutionNotes: "Fixed" }).valid, true);
  assert.match(validateCorrectiveActionClosure({ status: "Closed", inspectionId: "I-1", resolutionNotes: " " }).reason, /required/i);
});
