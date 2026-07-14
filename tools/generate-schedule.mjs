import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSchedule } from "./schedule.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const forms = JSON.parse(await readFile(resolve(root, "data/forms.json"), "utf8"));
const rows = generateSchedule(forms);
const headers = Object.keys(rows[0]);
const csvEscape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csv = [headers.map(csvEscape).join(","), ...rows.map(row => headers.map(key => csvEscape(row[key])).join(","))].join("\n") + "\n";

await writeFile(resolve(root, "deployment/initial-inspection-schedule.csv"), csv, "utf8");
console.log(`Generated ${rows.length} schedule rows.`);
