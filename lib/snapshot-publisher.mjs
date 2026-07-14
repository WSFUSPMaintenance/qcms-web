const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const OIDC_AUDIENCE = "api://AzureADTokenExchange";

function requireValue(value, name) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function readJson(response, context) {
  const text = await response.text();
  if (!response.ok) throw new Error(`${context} failed (${response.status}): ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

export async function acquireGraphToken({ env, fetchImpl = fetch }) {
  const requestUrl = new URL(requireValue(env.ACTIONS_ID_TOKEN_REQUEST_URL, "ACTIONS_ID_TOKEN_REQUEST_URL"));
  requestUrl.searchParams.set("audience", OIDC_AUDIENCE);
  const oidcResponse = await fetchImpl(requestUrl, {
    headers: { Authorization: `bearer ${requireValue(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, "ACTIONS_ID_TOKEN_REQUEST_TOKEN")}` }
  });
  const oidc = await readJson(oidcResponse, "GitHub OIDC token request");

  const tenantId = requireValue(env.QCMS_TENANT_ID, "QCMS_TENANT_ID");
  const body = new URLSearchParams({
    client_id: requireValue(env.QCMS_CLIENT_ID, "QCMS_CLIENT_ID"),
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: requireValue(oidc.value, "GitHub OIDC assertion")
  });
  const tokenResponse = await fetchImpl(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
  );
  const token = await readJson(tokenResponse, "Microsoft Graph token exchange");
  return requireValue(token.access_token, "Microsoft Graph access token");
}

export function createGraphClient({ accessToken, fetchImpl = fetch, sleepImpl = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  requireValue(accessToken, "Microsoft Graph access token");
  return async function graphGet(url) {
    let response;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
      if (response.ok) return readJson(response, `Microsoft Graph GET ${url}`);
      if (response.status !== 429 && response.status < 500) break;
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleepImpl(Number.isFinite(retryAfter) ? retryAfter * 1000 : 500 * (2 ** attempt));
    }
    return readJson(response, `Microsoft Graph GET ${url}`);
  };
}

export async function readAllPages(graphGet, initialUrl, maximumPages = 1000) {
  const rows = [];
  const visited = new Set();
  let next = initialUrl;
  while (next) {
    if (visited.has(next)) throw new Error("Microsoft Graph pagination returned a repeated nextLink.");
    if (visited.size >= maximumPages) throw new Error(`Microsoft Graph pagination exceeded ${maximumPages} pages.`);
    visited.add(next);
    const page = await graphGet(next);
    if (!Array.isArray(page.value)) throw new Error("Microsoft Graph page did not contain a value array.");
    rows.push(...page.value);
    next = page["@odata.nextLink"] || null;
  }
  return rows;
}

export async function resolveSiteId(graphGet, siteUrl) {
  const parsed = new URL(requireValue(siteUrl, "QCMS_SITE_URL"));
  const site = await graphGet(`${GRAPH_ROOT}/sites/${parsed.hostname}:${parsed.pathname}?$select=id`);
  return requireValue(site.id, "QCMS SharePoint site id");
}

export async function resolveListId(graphGet, siteId, displayName) {
  const lists = await readAllPages(graphGet, `${GRAPH_ROOT}/sites/${encodeURIComponent(siteId)}/lists?$select=id,displayName`);
  const matches = lists.filter(list => list.displayName === displayName);
  if (matches.length !== 1) throw new Error(`Expected exactly one SharePoint list named ${displayName}; found ${matches.length}.`);
  return matches[0].id;
}

function valueOrNull(value) {
  return value === undefined || value === "" ? null : value;
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Expected a finite number; received ${value}.`);
  return number;
}

function booleanOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  if (value === true || value === false) return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  throw new Error(`Expected a boolean; received ${value}.`);
}

function requireUnique(rows, keySelector, label) {
  const keys = rows.map(keySelector);
  if (keys.some(key => !key)) throw new Error(`${label} contains a missing key.`);
  if (new Set(keys).size !== keys.length) throw new Error(`${label} contains a duplicate key.`);
}

export function buildSnapshots(recordItems, responseItems) {
  const records = recordItems.map(item => {
    const fields = item.fields || {};
    return {
      Title: valueOrNull(fields.Title || fields.FormNameText || fields.field_2),
      InspectionID: valueOrNull(fields.field_1),
      FormID: valueOrNull(fields.field_2),
      Department: valueOrNull(fields.ResponsibleDepartmentText),
      Status: valueOrNull(fields.field_8),
      SubmittedDate: valueOrNull(fields.SubmittedDate || fields.field_4),
      CompletionPercent: numberOrNull(fields.Completion_x0025_),
      DueDate: valueOrNull(fields.field_5)
    };
  });

  const responses = responseItems.map(item => {
    const fields = item.fields || {};
    return {
      InspectionID: valueOrNull(fields.InspectionIDText),
      ChecklistItem: valueOrNull(fields.ChecklistItemText),
      FormID: valueOrNull(fields.field_2),
      Requirement: valueOrNull(fields.field_4),
      Response: valueOrNull(fields.field_5),
      Comments: valueOrNull(fields.field_6),
      CorrectiveActionRequired: booleanOrNull(fields.CorrectiveActionRequired)
    };
  });

  requireUnique(records, row => row.InspectionID, "Inspection records");
  requireUnique(responses, row => row.InspectionID && row.ChecklistItem && `${row.InspectionID}|${row.ChecklistItem}`, "Inspection responses");
  const inspectionIds = new Set(records.map(row => row.InspectionID));
  const orphan = responses.find(row => !inspectionIds.has(row.InspectionID));
  if (orphan) throw new Error(`Inspection response references unknown inspection ${orphan.InspectionID}.`);
  records.sort((left, right) => left.InspectionID.localeCompare(right.InspectionID));
  responses.sort((left, right) => `${left.InspectionID}|${left.ChecklistItem}`.localeCompare(`${right.InspectionID}|${right.ChecklistItem}`));
  return { records, responses };
}

async function listState(graphGet, siteId, listId) {
  const state = await graphGet(`${GRAPH_ROOT}/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}?$select=id,lastModifiedDateTime`);
  requireValue(state.lastModifiedDateTime, `SharePoint list ${listId} lastModifiedDateTime`);
  return state;
}

async function listItems(graphGet, siteId, listId) {
  return readAllPages(
    graphGet,
    `${GRAPH_ROOT}/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items?$expand=fields&$top=999`
  );
}

export async function readStableSnapshots({ graphGet, siteId, recordListId, responseListId, maximumAttempts = 3 }) {
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const before = await Promise.all([
      listState(graphGet, siteId, recordListId),
      listState(graphGet, siteId, responseListId)
    ]);
    const [recordItems, responseItems] = await Promise.all([
      listItems(graphGet, siteId, recordListId),
      listItems(graphGet, siteId, responseListId)
    ]);
    const after = await Promise.all([
      listState(graphGet, siteId, recordListId),
      listState(graphGet, siteId, responseListId)
    ]);
    const stable = before.every((state, index) => state.lastModifiedDateTime === after[index].lastModifiedDateTime);
    if (stable) return buildSnapshots(recordItems, responseItems);
  }
  throw new Error(`SharePoint data changed during all ${maximumAttempts} coordinated snapshot attempts.`);
}
