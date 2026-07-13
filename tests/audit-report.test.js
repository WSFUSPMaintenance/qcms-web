const assert = require("node:assert/strict");
const test = require("node:test");

test("audit report filters by Central business date and escapes data", async () => {
  const { buildAuditReport } = await import("../lib/audit-report.mjs");
  const html = buildAuditReport({
    records: [{ InspectionID: "I-1", Title: "<Test>", Department: "QA", Status: "Approved", SubmittedDate: "2026-07-13T01:00:00Z" }],
    responses: [{ InspectionID: "I-1", Response: "Fail", Requirement: "A & B", Comments: "<script>" }],
    startDate: "2026-07-12", endDate: "2026-07-12"
  });
  assert.match(html, /&lt;Test&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /Failed Findings<\/strong><br>1/);
  assert.doesNotMatch(html, /<script>/);
});

test("audit report rejects reversed date ranges", async () => {
  const { buildAuditReport } = await import("../lib/audit-report.mjs");
  assert.throws(() => buildAuditReport({ records: [], responses: [], startDate: "2026-08-02", endDate: "2026-08-01" }), /valid inclusive/i);
});
