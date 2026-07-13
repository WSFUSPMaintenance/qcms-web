const SUPPORTED_FREQUENCIES = new Set([
  "Weekly", "Bi-Weekly", "Monthly", "Every 2 Months", "Quarterly", "Special Event"
]);

function requireArray(value, name) {
  if (!Array.isArray(value)) throw new Error(`${name} snapshot must be an array.`);
}

function requireUnique(items, key, name) {
  const values = items.map(item => item?.[key]).filter(Boolean);
  if (values.length !== items.length) throw new Error(`${name} contains a missing ${key}.`);
  if (new Set(values).size !== values.length) throw new Error(`${name} contains a duplicate ${key}.`);
}

export function validateQcmsData({ forms, checklistItems, inspectionRecords, inspectionResponses }) {
  requireArray(forms, "Forms");
  requireArray(checklistItems, "Checklist items");
  requireArray(inspectionRecords, "Inspection records");
  requireArray(inspectionResponses, "Inspection responses");

  requireUnique(forms, "id", "Forms");
  requireUnique(checklistItems, "itemId", "Checklist items");

  const formIds = new Set(forms.map(form => form.id));
  for (const form of forms) {
    if (!form.name || !form.department || !SUPPORTED_FREQUENCIES.has(form.frequency)) {
      throw new Error(`Form ${form.id} has invalid catalog metadata.`);
    }
  }

  for (const item of checklistItems) {
    if (!formIds.has(item.formId) || !item.requirement) {
      throw new Error(`Checklist item ${item.itemId} has invalid form or requirement metadata.`);
    }
  }

  const recordIds = inspectionRecords.map(record =>
    record.InspectionID || record["Inspection ID"] || record.InspectionIDText
  ).filter(Boolean);
  if (new Set(recordIds).size !== recordIds.length) {
    throw new Error("Inspection records contain a duplicate InspectionID.");
  }

  return true;
}
