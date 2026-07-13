import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const specifications = {
  "inspection-records.json": ["Title", "InspectionID", "FormID", "Department", "Status", "SubmittedDate", "CompletionPercent", "DueDate"],
  "inspection-responses.json": ["InspectionID", "ChecklistItem", "FormID", "Requirement", "Response", "Comments", "CorrectiveActionRequired"]
};

for (const [filename, allowedFields] of Object.entries(specifications)) {
  const path = resolve(root, "data", filename);
  const rows = JSON.parse(await readFile(path, "utf8"));
  const sanitized = rows.map(row => Object.fromEntries(
    allowedFields.filter(field => Object.hasOwn(row, field)).map(field => [field, row[field]])
  ));
  await writeFile(path, JSON.stringify(sanitized) + "\n", "utf8");
  console.log(`Sanitized ${sanitized.length} rows in ${filename}.`);
}
