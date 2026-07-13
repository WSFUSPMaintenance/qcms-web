export const PRODUCTION_START = "2026-08-01";

export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function nextDueDate(date, frequency) {
  const next = new Date(date);
  const daySteps = { Weekly: 7, "Bi-Weekly": 14 };
  const monthSteps = { Monthly: 1, "Every 2 Months": 2, Quarterly: 3 };

  if (daySteps[frequency]) {
    next.setUTCDate(next.getUTCDate() + daySteps[frequency]);
    return next;
  }

  if (monthSteps[frequency]) {
    next.setUTCMonth(next.getUTCMonth() + monthSteps[frequency]);
    return next;
  }

  if (frequency === "Special Event") return null;
  throw new Error(`Unsupported frequency: ${frequency}`);
}

export function generateSchedule(forms, start = PRODUCTION_START, end = "2027-07-31") {
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  const rows = [];

  for (const form of forms) {
    if (form.frequency === "Special Event") continue;
    let dueDate = new Date(startDate);
    let sequence = 1;

    while (dueDate <= endDate) {
      const date = formatDateOnly(dueDate);
      rows.push({
        ScheduleKey: `${form.id}|${date}`,
        FormID: form.id,
        InspectionName: form.name,
        Department: form.department,
        Frequency: form.frequency,
        DueDate: date,
        Sequence: sequence,
        Status: "Scheduled"
      });
      dueDate = nextDueDate(dueDate, form.frequency);
      sequence += 1;
    }
  }

  return rows.sort((a, b) => a.DueDate.localeCompare(b.DueDate) || a.FormID.localeCompare(b.FormID));
}
