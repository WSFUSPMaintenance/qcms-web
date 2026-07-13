import { formatBusinessDate, formatBusinessDateTime, getBusinessDateKey } from "./business-date.mjs";

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export function buildAuditReport({ records, responses, correctiveActions = null, workflowHistory = null, startDate, endDate, department = "All", generatedAt = new Date() }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
    throw new Error("A valid inclusive audit date range is required.");
  }
  const selected = records.filter(record => {
    const date = getBusinessDateKey(record.SubmittedDate);
    return date >= startDate && date <= endDate && (department === "All" || record.Department === department);
  });
  const ids = new Set(selected.map(record => record.InspectionID));
  const selectedResponses = responses.filter(response => ids.has(response.InspectionID));
  const failures = selectedResponses.filter(response => response.Response === "Fail");
  const counted = selectedResponses.filter(response => response.Response === "Pass" || response.Response === "Fail");
  const passes = counted.filter(response => response.Response === "Pass").length;
  const compliance = counted.length ? `${Math.round((passes / counted.length) * 100)}%` : "N/A";

  const detail = selected.map(record => {
    const rows = selectedResponses.filter(response => response.InspectionID === record.InspectionID).map(response => `
      <tr><td>${escapeHtml(response.Response || "N/A")}</td><td>${escapeHtml(response.Requirement)}</td><td>${escapeHtml(response.Comments || "None")}</td></tr>`).join("");
    return `<section><h2>${escapeHtml(record.Title)}</h2>
      <p><strong>Inspection ID:</strong> ${escapeHtml(record.InspectionID)} | <strong>Department:</strong> ${escapeHtml(record.Department)} | <strong>Status:</strong> ${escapeHtml(record.Status)}</p>
      <p><strong>Submitted:</strong> ${escapeHtml(formatBusinessDateTime(record.SubmittedDate))} | <strong>Due:</strong> ${escapeHtml(formatBusinessDate(record.DueDate) || "Not set")}</p>
      <table><thead><tr><th>Result</th><th>Requirement</th><th>Comments</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No responses supplied.</td></tr>'}</tbody></table></section>`;
  }).join("\n");

  const correctiveStatus = correctiveActions === null ? "Not supplied" : `${correctiveActions.filter(action => ids.has(action.InspectionID)).length} records`;
  const historyStatus = workflowHistory === null ? "Not supplied" : `${workflowHistory.filter(event => ids.has(event.InspectionID)).length} events`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>QCMS Audit Report</title><style>
    body{font:14px Arial,sans-serif;color:#111827;margin:32px;line-height:1.45}h1,h2{color:#0f172a}header{border-bottom:3px solid #1d4ed8;margin-bottom:24px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{border:1px solid #cbd5e1;padding:12px}table{width:100%;border-collapse:collapse;margin:12px 0 24px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e2e8f0}@media print{body{margin:12mm}section{break-inside:avoid}}</style></head><body>
    <header><h1>QCMS Compliance Audit Report</h1><p>Union Springs | ${escapeHtml(formatBusinessDate(startDate))} through ${escapeHtml(formatBusinessDate(endDate))} | Department: ${escapeHtml(department)}</p></header>
    <div class="metrics"><div class="metric"><strong>Inspections</strong><br>${selected.length}</div><div class="metric"><strong>Responses</strong><br>${selectedResponses.length}</div><div class="metric"><strong>Failed Findings</strong><br>${failures.length}</div><div class="metric"><strong>Compliance</strong><br>${compliance}</div></div>
    <p><strong>Corrective actions:</strong> ${escapeHtml(correctiveStatus)} | <strong>Workflow history:</strong> ${escapeHtml(historyStatus)}</p>${detail || "<p>No inspections matched the selected period.</p>"}
    <footer><p>Generated ${escapeHtml(formatBusinessDateTime(generatedAt))}. Audit packages are complete only when corrective actions and workflow history are supplied.</p></footer></body></html>`;
}
