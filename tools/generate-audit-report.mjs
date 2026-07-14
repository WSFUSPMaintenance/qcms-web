import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAuditReport } from "../lib/audit-report.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const records = JSON.parse(await readFile(resolve(root, "data/inspection-records.json"), "utf8"));
const responses = JSON.parse(await readFile(resolve(root, "data/inspection-responses.json"), "utf8"));
const html = buildAuditReport({
  records,
  responses,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  generatedAt: "2026-07-13T02:42:55Z"
});
await writeFile(resolve(root, "deployment/sample-audit-report.html"), html, "utf8");
console.log("Generated deployment/sample-audit-report.html");
