function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) throw new Error(`Invalid date key: ${value}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function overdueDays(dueDateKey, asOfDateKey) {
  return Math.floor((parseDateKey(asOfDateKey) - parseDateKey(dueDateKey)) / 86400000);
}

export function escalationLevel(dueDateKey, asOfDateKey) {
  const days = overdueDays(dueDateKey, asOfDateKey);
  if (days < 1) return 0;
  if (days <= 2) return 1;
  if (days <= 6) return 2;
  return 3;
}

export function escalationKey(correctiveActionId, level) {
  if (!correctiveActionId || ![1, 2, 3].includes(level)) throw new Error("Invalid escalation key inputs.");
  return `CA-${correctiveActionId}|L${level}`;
}

export function escalationRecipients(department, level) {
  if (!department?.managerEmail) throw new Error("Department manager routing is required.");
  const candidates = [department.managerEmail];
  if (level >= 2) candidates.push(department.qaReviewerEmail);
  if (level >= 3) candidates.push(department.backupManagerEmail);
  const seen = new Set();
  return candidates.filter(Boolean).filter(email => {
    const key = String(email).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validateCorrectiveActionClosure(action) {
  if (action?.status !== "Closed") return { valid: false, reason: "Status is not Closed." };
  if (!String(action.resolutionNotes || "").trim()) return { valid: false, reason: "Resolution notes are required." };
  if (!action.inspectionId) return { valid: false, reason: "Inspection ID is required." };
  return { valid: true, reason: "" };
}

export function closureEventKey(correctiveActionId) {
  if (!correctiveActionId) throw new Error("Corrective action ID is required.");
  return `CA-${correctiveActionId}|Closed`;
}
