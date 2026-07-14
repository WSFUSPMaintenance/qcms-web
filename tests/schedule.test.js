const assert = require("node:assert/strict");
const test = require("node:test");

test("calendar recurrences remain anchored to the first of the month", async () => {
  const { nextDueDate, parseDateOnly, formatDateOnly } = await import("../tools/schedule.mjs");
  assert.equal(formatDateOnly(nextDueDate(parseDateOnly("2026-08-01"), "Monthly")), "2026-09-01");
  assert.equal(formatDateOnly(nextDueDate(parseDateOnly("2026-08-01"), "Every 2 Months")), "2026-10-01");
  assert.equal(formatDateOnly(nextDueDate(parseDateOnly("2026-08-01"), "Quarterly")), "2026-11-01");
});

test("weekly and biweekly recurrences use exact day intervals", async () => {
  const { nextDueDate, parseDateOnly, formatDateOnly } = await import("../tools/schedule.mjs");
  assert.equal(formatDateOnly(nextDueDate(parseDateOnly("2026-08-01"), "Weekly")), "2026-08-08");
  assert.equal(formatDateOnly(nextDueDate(parseDateOnly("2026-08-01"), "Bi-Weekly")), "2026-08-15");
});

test("special-event forms are not placed on a recurring schedule", async () => {
  const { generateSchedule } = await import("../tools/schedule.mjs");
  const rows = generateSchedule([
    { id: "SEC001", name: "Event", department: "QA", frequency: "Special Event" }
  ]);
  assert.deepEqual(rows, []);
});

test("schedule keys are unique and all recurring forms begin on go-live", async () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { generateSchedule } = await import("../tools/schedule.mjs");
  const forms = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../data/forms.json"), "utf8"));
  const rows = generateSchedule(forms);
  assert.equal(new Set(rows.map(row => row.ScheduleKey)).size, rows.length);
  assert.equal(new Set(rows.filter(row => row.DueDate === "2026-08-01").map(row => row.FormID)).size, 27);
});
