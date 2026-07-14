const assert = require("node:assert/strict");
const test = require("node:test");

function jsonResponse(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), { status, headers });
}

test("snapshot publisher exchanges GitHub OIDC for a short-lived Graph token", async () => {
  const { acquireGraphToken } = await import("../lib/snapshot-publisher.mjs");
  const requests = [];
  const token = await acquireGraphToken({
    env: {
      ACTIONS_ID_TOKEN_REQUEST_URL: "https://actions.example.test/oidc",
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "runner-token",
      QCMS_TENANT_ID: "tenant-id",
      QCMS_CLIENT_ID: "client-id"
    },
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      return requests.length === 1 ? jsonResponse({ value: "oidc-assertion" }) : jsonResponse({ access_token: "graph-token" });
    }
  });

  assert.equal(token, "graph-token");
  assert.match(requests[0].url, /audience=api%3A%2F%2FAzureADTokenExchange/);
  assert.match(String(requests[1].options.body), /client_assertion=oidc-assertion/);
  assert.doesNotMatch(String(requests[1].options.body), /client_secret/);
});

test("pagination follows nextLink and fails closed on a cycle", async () => {
  const { readAllPages } = await import("../lib/snapshot-publisher.mjs");
  const pages = new Map([
    ["page-1", { value: [{ id: 1 }], "@odata.nextLink": "page-2" }],
    ["page-2", { value: [{ id: 2 }] }]
  ]);
  assert.deepEqual(await readAllPages(async url => pages.get(url), "page-1"), [{ id: 1 }, { id: 2 }]);
  await assert.rejects(
    readAllPages(async url => ({ value: [], "@odata.nextLink": url }), "cycle"),
    /repeated nextLink/
  );
});

test("snapshot mapping uses live internal names, strips identities, and orders deterministically", async () => {
  const { buildSnapshots } = await import("../lib/snapshot-publisher.mjs");
  const result = buildSnapshots([
    { fields: { field_1: "B-2", field_2: "B", Title: "Second", ResponsibleDepartmentText: "QA", field_8: "Approved", SubmittedDate: "2026-07-14T02:00:00Z", Completion_x0025_: "100", SubmittedByEmail: "private@example.com" } },
    { fields: { field_1: "A-1", field_2: "A", Title: "First", ResponsibleDepartmentText: "Maintenance", field_8: "Awaiting QA", field_4: "2026-07-14T01:00:00Z", field_5: "2026-08-01", Completion_x0025_: 50 } }
  ], [
    { fields: { InspectionIDText: "B-2", ChecklistItemText: "B-01", field_2: "B", field_4: "Requirement B", field_5: "Pass", CorrectiveActionRequired: false, SubmittedByEmail: "private@example.com" } },
    { fields: { InspectionIDText: "A-1", ChecklistItemText: "A-01", field_2: "A", field_4: "Requirement A", field_5: "Fail", field_6: "Repair", CorrectiveActionRequired: "true" } }
  ]);

  assert.deepEqual(result.records.map(row => row.InspectionID), ["A-1", "B-2"]);
  assert.deepEqual(result.responses.map(row => row.ChecklistItem), ["A-01", "B-01"]);
  assert.equal(result.records[0].Department, "Maintenance");
  assert.equal(result.responses[0].CorrectiveActionRequired, true);
  assert.equal(Object.hasOwn(result.records[0], "SubmittedByEmail"), false);
  assert.equal(Object.hasOwn(result.responses[0], "SubmittedByEmail"), false);
});

test("snapshot mapping fails closed on missing, duplicate, and orphan keys", async () => {
  const { buildSnapshots } = await import("../lib/snapshot-publisher.mjs");
  assert.throws(() => buildSnapshots([{ fields: { field_2: "A" } }], []), /missing key/);
  assert.throws(() => buildSnapshots([
    { fields: { field_1: "A-1" } },
    { fields: { field_1: "A-1" } }
  ], []), /duplicate key/);
  assert.throws(() => buildSnapshots([], [
    { fields: { InspectionIDText: "A-1", ChecklistItemText: "A-01" } }
  ]), /unknown inspection/);
});

test("coordinated snapshot retries when either SharePoint list changes during pagination", async () => {
  const { readStableSnapshots } = await import("../lib/snapshot-publisher.mjs");
  let recordStateReads = 0;
  const graphGet = async url => {
    if (url.includes("/lists/records?") ) {
      recordStateReads += 1;
      return { id: "records", lastModifiedDateTime: recordStateReads === 1 ? "v1" : "v2" };
    }
    if (url.includes("/lists/responses?")) return { id: "responses", lastModifiedDateTime: "stable" };
    if (url.includes("/lists/records/items")) return { value: [{ fields: { field_1: "A-1", field_2: "A", Title: "First", ResponsibleDepartmentText: "QA", field_8: "Approved" } }] };
    if (url.includes("/lists/responses/items")) return { value: [{ fields: { InspectionIDText: "A-1", ChecklistItemText: "A-01", field_2: "A", field_4: "Requirement", field_5: "Pass" } }] };
    throw new Error(`Unexpected URL ${url}`);
  };

  const snapshots = await readStableSnapshots({ graphGet, siteId: "site", recordListId: "records", responseListId: "responses" });
  assert.equal(recordStateReads, 4);
  assert.equal(snapshots.records.length, 1);
  assert.equal(snapshots.responses.length, 1);
});
