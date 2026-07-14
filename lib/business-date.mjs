export const BUSINESS_TIME_ZONE = "America/Chicago";

export function getBusinessDateKey(value) {
  const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatBusinessDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", { timeZone: BUSINESS_TIME_ZONE });
}

export function formatBusinessDate(value) {
  if (!value) return "";
  const key = getBusinessDateKey(value);
  if (!key) return String(value);
  const [year, month, day] = key.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}
