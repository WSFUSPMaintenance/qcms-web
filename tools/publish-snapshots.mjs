import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acquireGraphToken,
  createGraphClient,
  readStableSnapshots,
  resolveListId,
  resolveSiteId
} from "../lib/snapshot-publisher.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const accessToken = await acquireGraphToken({ env: process.env });
const graphGet = createGraphClient({ accessToken });
const siteId = await resolveSiteId(graphGet, process.env.QCMS_SITE_URL);
const [recordListId, responseListId] = await Promise.all([
  resolveListId(graphGet, siteId, "QCMS Inspection Records"),
  resolveListId(graphGet, siteId, "QCMS Inspection Responses")
]);
const snapshots = await readStableSnapshots({ graphGet, siteId, recordListId, responseListId });

const outputs = [
  ["inspection-records.json", snapshots.records],
  ["inspection-responses.json", snapshots.responses]
];
await mkdir(resolve(root, "data"), { recursive: true });
for (const [filename, rows] of outputs) {
  const target = resolve(root, "data", filename);
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(rows)}\n`, { encoding: "utf8", mode: 0o600 });
}
for (const [filename] of outputs) {
  const target = resolve(root, "data", filename);
  await rename(`${target}.tmp`, target);
}

console.log(`Published coordinated snapshot: ${snapshots.records.length} inspections, ${snapshots.responses.length} responses.`);
