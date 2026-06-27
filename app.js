let inspections = [];
let checklistItems = [];
let inspectionRecords = [];
let inspectionResponses = [];

async function loadData() {
    const formsResponse = await fetch("./data/forms.json");
    inspections = await formsResponse.json();

    const checklistResponse = await fetch("./data/checklist-items.json");
    checklistItems = await checklistResponse.json();

    const recordsResponse = await fetch("./data/inspection-records.json");
    inspectionRecords = await recordsResponse.json();

    const responsesResponse = await fetch("./data/inspection-responses.json");
    inspectionResponses = await responsesResponse.json();

    populateInspectionDropdown();
    populateReportFilters();
    updateDashboard();
}

function populateInspectionDropdown() {
    const select = document.getElementById("inspectionSelect");

    select.innerHTML = '<option value="">Select Inspection</option>';

    inspections.forEach(inspection => {
        const option = document.createElement("option");
        option.value = inspection.id;
        option.textContent = `${inspection.id} - ${inspection.name}`;
        select.appendChild(option);
    });
}

function populateReportFilters() {
    const departmentSelect = document.getElementById("reportDepartment");
    const inspectionSelect = document.getElementById("reportInspection");

    if (!departmentSelect || !inspectionSelect) {
        return;
    }

    const departments = [...new Set(
        inspectionRecords
            .map(record => getRecordValue(record, ["Department", "Responsible Department Text"]))
            .filter(value => value)
    )].sort();

    departmentSelect.innerHTML = '<option value="All">All</option>';

    departments.forEach(department => {
        const option = document.createElement("option");
        option.value = department;
        option.textContent = department;
        departmentSelect.appendChild(option);
    });

    const inspectionNames = [...new Set(
        inspectionRecords
            .map(record => getRecordValue(record, ["Title", "Inspection Name", "Form Name Text"]))
            .filter(value => value)
    )].sort();

    inspectionSelect.innerHTML = '<option value="All">All</option>';

    inspectionNames.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        inspectionSelect.appendChild(option);
    });

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const startInput = document.getElementById("reportStartDate");
    const endInput = document.getElementById("reportEndDate");

    if (startInput && !startInput.value) {
        startInput.value = formatInputDate(firstDay);
    }

    if (endInput && !endInput.value) {
        endInput.value = formatInputDate(today);
    }
}

function updateDashboard() {
    const totalInspections = inspectionRecords.length;

    const openInspections = inspectionRecords.filter(record => {
        const status = getRecordValue(record, ["Status", "Status Value"]);
        return status !== "Approved" && status !== "Rejected";
    }).length;

    const awaitingQA = inspectionRecords.filter(record => {
        const status = getRecordValue(record, ["Status", "Status Value"]);
        return status === "Awaiting QA";
    }).length;

    const approved = inspectionRecords.filter(record => {
        const status = getRecordValue(record, ["Status", "Status Value"]);
        return status === "Approved";
    }).length;

    const rejected = inspectionRecords.filter(record => {
        const status = getRecordValue(record, ["Status", "Status Value"]);
        return status === "Rejected";
    }).length;

    const pastDue = inspectionRecords.filter(record => isPastDue(record)).length;

    const totalFailures = inspectionResponses.filter(response => {
        const answer = getRecordValue(response, ["Response", "Response Value"]);
        return answer === "Fail";
    }).length;

    const recordsWithDueDates = inspectionRecords.filter(record => {
        const dueDateValue = getRecordValue(record, ["DueDate", "Due Date"]);
        const submittedDateValue = getRecordValue(record, ["SubmittedDate", "Submitted Date"]);
        return dueDateValue && submittedDateValue;
    });

    let onTimePercent = "N/A";

    if (recordsWithDueDates.length > 0) {
        const onTimeCount = recordsWithDueDates.filter(record => {
            const submittedDate = new Date(getRecordValue(record, ["SubmittedDate", "Submitted Date"]));
            const dueDate = new Date(getRecordValue(record, ["DueDate", "Due Date"]));

            submittedDate.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);

            return submittedDate <= dueDate;
        }).length;

        onTimePercent = Math.round((onTimeCount / recordsWithDueDates.length) * 100) + "%";
    }

    setDashboardValue("openCount", openInspections);
    setDashboardValue("qaCount", awaitingQA);
    setDashboardValue("approvedCount", approved);
    setDashboardValue("rejectedCount", rejected);
    setDashboardValue("pastDueCount", pastDue);
    setDashboardValue("failureCount", totalFailures);
    setDashboardValue("onTimePercent", onTimePercent);
    setDashboardValue("inspectionCount", totalInspections);
}

function setDashboardValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function hideAllPanels() {
    document.getElementById("homePanel").classList.add("hidden");
    document.getElementById("inspectionPanel").classList.add("hidden");
    document.getElementById("openInspectionsPanel").classList.add("hidden");
    document.getElementById("qaReviewPanel").classList.add("hidden");
    document.getElementById("completedInspectionsPanel").classList.add("hidden");
    document.getElementById("inspectionDetailsPanel").classList.add("hidden");

    const reportPanel = document.getElementById("reportCenterPanel");

    if (reportPanel) {
        reportPanel.classList.add("hidden");
    }
}

function showInspection() {
    hideAllPanels();
    document.getElementById("inspectionPanel").classList.remove("hidden");
}

function showOpenInspections() {
    hideAllPanels();
    document.getElementById("openInspectionsPanel").classList.remove("hidden");
    loadInspectionList("open");
}

function showQAReview() {
    hideAllPanels();
    document.getElementById("qaReviewPanel").classList.remove("hidden");
    loadQAReviewList();
}

function showCompletedInspections() {
    hideAllPanels();
    document.getElementById("completedInspectionsPanel").classList.remove("hidden");
    loadInspectionList("completed");
}

function showReportCenter() {
    hideAllPanels();
    populateReportFilters();
    document.getElementById("reportCenterPanel").classList.remove("hidden");
}

function backToHome() {
    hideAllPanels();
    updateDashboard();
    document.getElementById("homePanel").classList.remove("hidden");

    document.getElementById("inspectionSelect").value = "";

    const info = document.getElementById("inspectionInfo");
    const container = document.getElementById("checklistContainer");

    info.classList.add("hidden");
    info.innerHTML = "";

    container.classList.add("hidden");
    container.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadData();

    const inspectionSelect = document.getElementById("inspectionSelect");
    inspectionSelect.addEventListener("change", loadInspection);
});

function loadInspection() {
    const selectedId = document.getElementById("inspectionSelect").value;
    const inspection = inspections.find(i => i.id === selectedId);

    const info = document.getElementById("inspectionInfo");
    const container = document.getElementById("checklistContainer");

    if (!inspection) {
        info.classList.add("hidden");
        container.classList.add("hidden");
        return;
    }

    const items = checklistItems.filter(item => item.formId === selectedId);

    info.innerHTML = `
        <h3>${inspection.id} - ${inspection.name}</h3>
        <p>Department: <strong>${inspection.department}</strong></p>
        <p>Frequency: <strong>${inspection.frequency}</strong></p>
    `;

    info.classList.remove("hidden");

    let html = "";

    items.forEach((item, index) => {
        const itemNumber = index + 1;

        html += `
            <div class="checklist-item">
                <h3>${itemNumber}. ${item.requirement}</h3>

                <label>
                    <input type="radio" name="item${itemNumber}" value="Pass">
                    Pass
                </label>

                <label>
                    <input type="radio" name="item${itemNumber}" value="Fail">
                    Fail
                </label>

                <label>
                    <input type="radio" name="item${itemNumber}" value="N/A">
                    N/A
                </label>

                <textarea
                    id="comment${itemNumber}"
                    rows="3"
                    placeholder="Comments"></textarea>
            </div>
        `;
    });

    html += `
        <button id="submitInspection">Submit Inspection</button>
        <div id="statusMessage"></div>
    `;

    container.innerHTML = html;
    container.classList.remove("hidden");

    document
        .getElementById("submitInspection")
        .addEventListener("click", submitInspection);
}

function loadInspectionList(type) {
    const isCompleted = type === "completed";

    const container = document.getElementById(
        isCompleted ? "completedInspectionList" : "openInspectionList"
    );

    const filteredRecords = inspectionRecords.filter(record => {
        const status = getRecordValue(record, ["Status", "Status Value"]);

        return isCompleted
            ? status === "Approved" || status === "Rejected"
            : status !== "Approved" && status !== "Rejected";
    });

    if (filteredRecords.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No ${isCompleted ? "completed" : "open"} inspections found.
            </div>
        `;
        return;
    }

    let html = "";

    filteredRecords.forEach(record => {
        const inspectionId = getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"]);
        const name = getRecordValue(record, ["Title", "Inspection Name", "Form Name Text"]);
        const formId = getRecordValue(record, ["FormID", "Form ID"]);
        const department = getRecordValue(record, ["Department", "Responsible Department Text"]);
        const submittedBy = getRecordValue(record, ["SubmittedByEmail", "Responsible Person", "Submitted By"]);
        const status = getRecordValue(record, ["Status", "Status Value"]);
        const completion = getRecordValue(record, ["CompletionPercent", "Completion %", "Completion"]);
        const submittedDate = formatDate(getRecordValue(record, ["SubmittedDate", "Submitted Date"]));
        const dueDate = formatDateOnly(getRecordValue(record, ["DueDate", "Due Date"]));
        const qaReviewer = getRecordValue(record, ["QAReviewer", "QA Reviewer"]);
        const qaReviewDate = formatDate(getRecordValue(record, ["QAReviewDate", "QA Review Date"]));
        const qaComments = getRecordValue(record, ["QAComments", "QA Comments", "Comments"]);
        const failureCount = getFailureCount(inspectionId);

        html += `
            <div class="inspection-list-card">
                <h3>${name}</h3>

                <div class="meta-row"><strong>Inspection ID:</strong> ${inspectionId}</div>
                <div class="meta-row"><strong>Form ID:</strong> ${formId}</div>
                <div class="meta-row"><strong>Department:</strong> ${department}</div>
                <div class="meta-row"><strong>Submitted By:</strong> ${submittedBy}</div>
                <div class="meta-row"><strong>Submitted Date:</strong> ${submittedDate}</div>
                <div class="meta-row"><strong>Due Date:</strong> ${dueDate || "Not Set"}</div>
                <div class="meta-row"><strong>Completion:</strong> ${completion}%</div>
                <div class="meta-row ${failureCount > 0 ? "failure-row" : ""}">
                    <strong>Failures:</strong> ${failureCount}
                </div>
        `;

        if (isCompleted) {
            html += `
                <div class="meta-row"><strong>QA Reviewer:</strong> ${qaReviewer || "Not Recorded"}</div>
                <div class="meta-row"><strong>QA Review Date:</strong> ${qaReviewDate || "Not Recorded"}</div>
                <div class="meta-row"><strong>QA Comments:</strong> ${qaComments || "None"}</div>
            `;
        }

        html += `
                <span class="status-pill ${statusClass(status)}">${status}</span>

                <br>

                <button class="detail-button" onclick="viewInspectionDetails('${inspectionId}', '${type}')">
                    View Details
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function loadQAReviewList() {
    const container = document.getElementById("qaReviewList");

    const filteredRecords = inspectionRecords.filter(record => {
        const status = getRecordValue(record, ["Status", "Status Value"]);
        return status === "Awaiting QA";
    });

    if (filteredRecords.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No inspections awaiting QA review.
            </div>
        `;
        return;
    }

    let html = "";

    filteredRecords.forEach(record => {
        const inspectionId = getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"]);
        const name = getRecordValue(record, ["Title", "Inspection Name", "Form Name Text"]);
        const formId = getRecordValue(record, ["FormID", "Form ID"]);
        const department = getRecordValue(record, ["Department", "Responsible Department Text"]);
        const submittedBy = getRecordValue(record, ["SubmittedByEmail", "Responsible Person", "Submitted By"]);
        const status = getRecordValue(record, ["Status", "Status Value"]);
        const completion = getRecordValue(record, ["CompletionPercent", "Completion %", "Completion"]);
        const submittedDate = formatDate(getRecordValue(record, ["SubmittedDate", "Submitted Date"]));
        const dueDate = formatDateOnly(getRecordValue(record, ["DueDate", "Due Date"]));
        const failureCount = getFailureCount(inspectionId);

        html += `
            <div class="inspection-list-card">
                <h3>${name}</h3>

                <div class="meta-row"><strong>Inspection ID:</strong> ${inspectionId}</div>
                <div class="meta-row"><strong>Form ID:</strong> ${formId}</div>
                <div class="meta-row"><strong>Department:</strong> ${department}</div>
                <div class="meta-row"><strong>Submitted By:</strong> ${submittedBy}</div>
                <div class="meta-row"><strong>Submitted Date:</strong> ${submittedDate}</div>
                <div class="meta-row"><strong>Due Date:</strong> ${dueDate || "Not Set"}</div>
                <div class="meta-row"><strong>Completion:</strong> ${completion}%</div>
                <div class="meta-row ${failureCount > 0 ? "failure-row" : ""}">
                    <strong>Failures:</strong> ${failureCount}
                </div>

                <span class="status-pill ${statusClass(status)}">${status}</span>

                <br>

                <button class="detail-button" onclick="viewInspectionDetails('${inspectionId}', 'qa')">
                    Review Inspection
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function viewInspectionDetails(inspectionId, returnType) {
    hideAllPanels();
    document.getElementById("inspectionDetailsPanel").classList.remove("hidden");

    const backButton = document.getElementById("detailsBackButton");

    if (returnType === "completed") {
        backButton.textContent = "← Back to Completed Inspections";
        backButton.onclick = showCompletedInspections;
    } else if (returnType === "qa") {
        backButton.textContent = "← Back to QA Review";
        backButton.onclick = showQAReview;
    } else {
        backButton.textContent = "← Back to Open Inspections";
        backButton.onclick = showOpenInspections;
    }

    const record = inspectionRecords.find(item => {
        const id = getRecordValue(item, ["InspectionID", "Inspection ID", "InspectionIDText"]);
        return id === inspectionId;
    });

    const responses = inspectionResponses.filter(item => {
        const id = getRecordValue(item, ["InspectionID", "InspectionIDText", "Inspection ID", "Inspection"]);
        return id === inspectionId;
    });

    const container = document.getElementById("inspectionDetailsContent");

    if (!record) {
        container.innerHTML = `
            <div class="empty-state">
                Inspection record not found.
            </div>
        `;
        return;
    }

    const name = getRecordValue(record, ["Title", "Inspection Name", "Form Name Text"]);
    const formId = getRecordValue(record, ["FormID", "Form ID"]);
    const department = getRecordValue(record, ["Department", "Responsible Department Text"]);
    const submittedBy = getRecordValue(record, ["SubmittedByEmail", "Responsible Person", "Submitted By"]);
    const status = getRecordValue(record, ["Status", "Status Value"]);
    const submittedDate = formatDate(getRecordValue(record, ["SubmittedDate", "Submitted Date"]));
    const dueDate = formatDateOnly(getRecordValue(record, ["DueDate", "Due Date"]));
    const completion = getRecordValue(record, ["CompletionPercent", "Completion %", "Completion"]);
    const qaReviewer = getRecordValue(record, ["QAReviewer", "QA Reviewer"]);
    const qaReviewDate = formatDate(getRecordValue(record, ["QAReviewDate", "QA Review Date"]));
    const qaComments = getRecordValue(record, ["QAComments", "QA Comments", "Comments"]);
    const failureCount = getFailureCount(inspectionId);

    let html = `
        <div class="inspection-info">
            <h3>${name}</h3>
            <p><strong>Inspection ID:</strong> ${inspectionId}</p>
            <p><strong>Form ID:</strong> ${formId}</p>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Submitted By:</strong> ${submittedBy}</p>
            <p><strong>Submitted Date:</strong> ${submittedDate}</p>
            <p><strong>Due Date:</strong> ${dueDate || "Not Set"}</p>
            <p><strong>Completion:</strong> ${completion}%</p>
            <p class="${failureCount > 0 ? "failure-row" : ""}"><strong>Failures:</strong> ${failureCount}</p>
            <p><strong>Status:</strong> ${status}</p>
    `;

    if (status === "Approved" || status === "Rejected") {
        html += `
            <p><strong>QA Reviewer:</strong> ${qaReviewer || "Not Recorded"}</p>
            <p><strong>QA Review Date:</strong> ${qaReviewDate || "Not Recorded"}</p>
            <p><strong>QA Comments:</strong> ${qaComments || "None"}</p>
        `;
    }

    html += `
        </div>
    `;

    if (responses.length === 0) {
        html += `
            <div class="empty-state">
                No checklist responses found for this inspection.
            </div>
        `;
    } else {
        responses.forEach(response => {
            const checklistItem = getRecordValue(response, ["ChecklistItem", "ChecklistItemText", "Checklist Item", "Title"]);
            const requirement = getRecordValue(response, ["Requirement", "Requirement Text"]);
            const answer = getRecordValue(response, ["Response", "Response Value"]) || "N/A";
            const comment = getRecordValue(response, ["Comments", "Comment"]);

            html += `
                <div class="response-card ${responseClass(answer)}">
                    <h3>${checklistItem}</h3>
                    <div class="meta-row"><strong>Requirement:</strong> ${requirement}</div>
                    <div class="meta-row"><strong>Response:</strong> ${answer}</div>
                    <div class="meta-row"><strong>Comment:</strong> ${comment || "None"}</div>
                </div>
            `;
        });
    }

    if (returnType === "qa") {
        html += `
            <div class="qa-action-card">
                <h3>QA Review Decision</h3>

                <label for="qaComments"><strong>QA Comments</strong></label>
                <textarea
                    id="qaComments"
                    rows="4"
                    placeholder="Enter QA comments"></textarea>

                <button class="approve-button" onclick="approveInspection('${inspectionId}')">
                    Approve Inspection
                </button>

                <button class="reject-button" onclick="rejectInspection('${inspectionId}')">
                    Reject Inspection
                </button>

                <div id="qaActionMessage" class="qa-message"></div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function generateReport() {
    const startDateValue = document.getElementById("reportStartDate").value;
    const endDateValue = document.getElementById("reportEndDate").value;
    const departmentFilter = document.getElementById("reportDepartment").value;
    const inspectionFilter = document.getElementById("reportInspection").value;
    const statusFilter = document.getElementById("reportStatus").value;
    const reportType = document.getElementById("reportType").value;
    const output = document.getElementById("reportOutput");

    if (!startDateValue || !endDateValue) {
        output.innerHTML = `
            <div class="empty-state">
                Please select both a start date and an end date.
            </div>
        `;
        return;
    }

    const startDate = new Date(startDateValue + "T00:00:00");
    const endDate = new Date(endDateValue + "T23:59:59");

    let filteredRecords = inspectionRecords.filter(record => {
        const submittedDateValue = getRecordValue(record, ["SubmittedDate", "Submitted Date"]);

        if (!submittedDateValue) {
            return false;
        }

        const submittedDate = new Date(submittedDateValue);

        if (submittedDate < startDate || submittedDate > endDate) {
            return false;
        }

        const department = getRecordValue(record, ["Department", "Responsible Department Text"]);
        const inspectionName = getRecordValue(record, ["Title", "Inspection Name", "Form Name Text"]);
        const status = getRecordValue(record, ["Status", "Status Value"]);

        if (departmentFilter !== "All" && department !== departmentFilter) {
            return false;
        }

        if (inspectionFilter !== "All" && inspectionName !== inspectionFilter) {
            return false;
        }

        if (statusFilter !== "All" && status !== statusFilter) {
            return false;
        }

        if (reportType === "Failed" && getFailureCount(getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"])) === 0) {
            return false;
        }

        return true;
    });

    if (filteredRecords.length === 0) {
        output.innerHTML = `
            <div class="empty-state">
                No inspections matched the selected report filters.
            </div>
        `;
        return;
    }

    const filteredInspectionIds = filteredRecords.map(record =>
        getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"])
    );

    const filteredResponses = inspectionResponses.filter(response => {
        const inspectionId = getRecordValue(response, ["InspectionID", "InspectionIDText", "Inspection ID", "Inspection"]);
        const responseValue = getRecordValue(response, ["Response", "Response Value"]);

        if (!filteredInspectionIds.includes(inspectionId)) {
            return false;
        }

        if (reportType === "Failed" && responseValue !== "Fail") {
            return false;
        }

        return true;
    });

    const approvedCount = filteredRecords.filter(record =>
        getRecordValue(record, ["Status", "Status Value"]) === "Approved"
    ).length;

    const awaitingQACount = filteredRecords.filter(record =>
        getRecordValue(record, ["Status", "Status Value"]) === "Awaiting QA"
    ).length;

    const rejectedCount = filteredRecords.filter(record =>
        getRecordValue(record, ["Status", "Status Value"]) === "Rejected"
    ).length;

    const pastDueCount = filteredRecords.filter(record => isPastDue(record)).length;

    const failedFindingCount = filteredResponses.filter(response =>
        getRecordValue(response, ["Response", "Response Value"]) === "Fail"
    ).length;

    const passCount = filteredResponses.filter(response =>
        getRecordValue(response, ["Response", "Response Value"]) === "Pass"
    ).length;

    const countedResponses = filteredResponses.filter(response => {
        const value = getRecordValue(response, ["Response", "Response Value"]);
        return value === "Pass" || value === "Fail";
    }).length;

    const compliancePercent = countedResponses > 0
        ? Math.round((passCount / countedResponses) * 100) + "%"
        : "N/A";

    let html = `
        <div class="report-document">
            <div class="report-header">
                <h1>WAYNE SANDERSON FARMS</h1>
                <p>Union Springs, Alabama</p>
                <h2>QA Compliance Management System (QCMS)</h2>
                <h2>Compliance Audit Report</h2>
            </div>

            <div class="report-section">
                <h2>Report Information</h2>
                <p><strong>Report Date:</strong> ${formatDate(new Date())}</p>
                <p><strong>Reporting Period:</strong> ${formatDateOnly(startDateValue)} through ${formatDateOnly(endDateValue)}</p>
                <p><strong>Department:</strong> ${departmentFilter}</p>
                <p><strong>Inspection:</strong> ${inspectionFilter}</p>
                <p><strong>Status:</strong> ${statusFilter}</p>
                <p><strong>Report Type:</strong> ${getReportTypeLabel(reportType)}</p>
            </div>

            <div class="report-section">
                <h2>Executive Summary</h2>

                <div class="report-summary-grid">
                    <div class="report-summary-card">
                        <div class="report-summary-number">${filteredRecords.length}</div>
                        <div class="report-summary-label">Total Inspections</div>
                    </div>

                    <div class="report-summary-card">
                        <div class="report-summary-number">${approvedCount}</div>
                        <div class="report-summary-label">Approved</div>
                    </div>

                    <div class="report-summary-card">
                        <div class="report-summary-number">${awaitingQACount}</div>
                        <div class="report-summary-label">Awaiting QA</div>
                    </div>

                    <div class="report-summary-card">
                        <div class="report-summary-number">${rejectedCount}</div>
                        <div class="report-summary-label">Rejected</div>
                    </div>

                    <div class="report-summary-card">
                        <div class="report-summary-number">${pastDueCount}</div>
                        <div class="report-summary-label">Past Due</div>
                    </div>

                    <div class="report-summary-card">
                        <div class="report-summary-number">${failedFindingCount}</div>
                        <div class="report-summary-label">Failed Findings</div>
                    </div>

                    <div class="report-summary-card">
                        <div class="report-summary-number">${compliancePercent}</div>
                        <div class="report-summary-label">Compliance</div>
                    </div>
                </div>
            </div>
    `;

    if (reportType !== "Summary") {
        html += `
            <div class="report-section">
                <h2>Inspection Details</h2>
        `;

        filteredRecords.forEach(record => {
            const inspectionId = getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"]);
            const name = getRecordValue(record, ["Title", "Inspection Name", "Form Name Text"]);
            const formId = getRecordValue(record, ["FormID", "Form ID"]);
            const department = getRecordValue(record, ["Department", "Responsible Department Text"]);
            const submittedBy = getRecordValue(record, ["SubmittedByEmail", "Responsible Person", "Submitted By"]);
            const status = getRecordValue(record, ["Status", "Status Value"]);
            const completion = getRecordValue(record, ["CompletionPercent", "Completion %", "Completion"]);
            const submittedDate = formatDate(getRecordValue(record, ["SubmittedDate", "Submitted Date"]));
            const dueDate = formatDateOnly(getRecordValue(record, ["DueDate", "Due Date"]));
            const failureCount = getFailureCount(inspectionId);

            const relatedResponses = filteredResponses.filter(response => {
                const responseInspectionId = getRecordValue(response, ["InspectionID", "InspectionIDText", "Inspection ID", "Inspection"]);
                return responseInspectionId === inspectionId;
            });

            html += `
                <div class="report-inspection-block">
                    <div class="report-inspection-header">
                        <h3>${escapeHtml(name)}</h3>

                        <div class="report-inspection-meta">
                            <div><strong>Inspection ID:</strong> ${escapeHtml(inspectionId)}</div>
                            <div><strong>Form ID:</strong> ${escapeHtml(formId)}</div>
                            <div><strong>Department:</strong> ${escapeHtml(department)}</div>
                            <div><strong>Status:</strong> ${escapeHtml(status)}</div>
                            <div><strong>Submitted:</strong> ${escapeHtml(submittedDate)}</div>
                            <div><strong>Submitted By:</strong> ${escapeHtml(submittedBy)}</div>
                            <div><strong>Due Date:</strong> ${escapeHtml(dueDate || "Not Set")}</div>
                            <div><strong>Completion:</strong> ${escapeHtml(completion)}%</div>
                            <div><strong>Failures:</strong> ${failureCount}</div>
                        </div>
                    </div>

                    <table class="report-table">
                        <thead>
                            <tr>
                                <th style="width: 12%;">Result</th>
                                <th style="width: 58%;">Requirement</th>
                                <th style="width: 30%;">Comments</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (relatedResponses.length === 0) {
                html += `
                    <tr>
                        <td colspan="3">No checklist responses found.</td>
                    </tr>
                `;
            } else {
                relatedResponses.forEach(response => {
                    const answer = getRecordValue(response, ["Response", "Response Value"]) || "N/A";
                    const requirement = getRecordValue(response, ["Requirement", "Requirement Text"]);
                    const comments = getRecordValue(response, ["Comments", "Comment"]) || "";

                    html += `
                        <tr>
                            <td class="${reportResultClass(answer)}">${escapeHtml(answer)}</td>
                            <td>${escapeHtml(requirement)}</td>
                            <td>${escapeHtml(comments || "None")}</td>
                        </tr>
                    `;
                });
            }

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        html += `
            </div>
        `;
    }

    html += `
            <div class="report-section">
                <h2>Report Summary</h2>
                <p><strong>Total Inspections:</strong> ${filteredRecords.length}</p>
                <p><strong>Approved:</strong> ${approvedCount}</p>
                <p><strong>Awaiting QA:</strong> ${awaitingQACount}</p>
                <p><strong>Rejected:</strong> ${rejectedCount}</p>
                <p><strong>Past Due:</strong> ${pastDueCount}</p>
                <p><strong>Total Checklist Items:</strong> ${filteredResponses.length}</p>
                <p><strong>Failed Findings:</strong> ${failedFindingCount}</p>
                <p><strong>Overall Compliance:</strong> ${compliancePercent}</p>
            </div>

            <div class="report-footer">
                Wayne Sanderson Farms | QA Compliance Management System | Generated ${formatDate(new Date())}
            </div>
        </div>
    `;

    output.innerHTML = html;
}

function printReport() {
    const output = document.getElementById("reportOutput");

    if (!output || !output.innerHTML.trim()) {
        alert("Generate a report before printing.");
        return;
    }

    window.print();
}

function clearReport() {
    const output = document.getElementById("reportOutput");

    if (output) {
        output.innerHTML = "";
    }
}

function getReportTypeLabel(value) {
    if (value === "Summary") {
        return "Executive Summary";
    }

    if (value === "Failed") {
        return "Failed Findings Only";
    }

    return "Detailed Audit Report";
}

function reportResultClass(response) {
    if (response === "Pass") {
        return "report-result-pass";
    }

    if (response === "Fail") {
        return "report-result-fail";
    }

    return "report-result-na";
}

function isPastDue(record) {
    const status = getRecordValue(record, ["Status", "Status Value"]);
    const dueDateValue = getRecordValue(record, ["DueDate", "Due Date"]);

    if (!dueDateValue) {
        return false;
    }

    if (status === "Approved" || status === "Rejected") {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(dueDateValue);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
}

function approveInspection(inspectionId) {
    submitQAReview(inspectionId, "Approved");
}

function rejectInspection(inspectionId) {
    const comments = document.getElementById("qaComments").value.trim();
    const message = document.getElementById("qaActionMessage");

    if (!comments) {
        message.textContent = "QA comments are required when rejecting an inspection.";
        message.style.color = "#ef4444";
        return;
    }

    submitQAReview(inspectionId, "Rejected");
}

function submitQAReview(inspectionId, decision) {
    const comments = document.getElementById("qaComments")?.value || "";
    const reviewDate = new Date().toLocaleDateString("en-US");
    const reviewer = "Dennis Barr";

    const qaFormUrl =
        "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=3JG89IfD0E6e175TItrr8LO9tidJOFRAtBCVSjfTIJdUQUFQUDFJSVowOVpIREM1RlJEUTJQUzMxVi4u" +
        "&r74f9b757fd384314b10657196e52b8d3=" +
        encodeURIComponent(inspectionId) +
        "&r51900abbe1134ba49bb1161d1ee25b72=" +
        encodeURIComponent(decision) +
        "&r71ed9222d2d4423db637e10e5c7d7571=" +
        encodeURIComponent(reviewer) +
        "&r170cdb462c9c4aa79acce5b7d531cd81=" +
        encodeURIComponent(reviewDate) +
        "&r48621006bdef491cb6110340f090d784=" +
        encodeURIComponent(comments);

    window.open(qaFormUrl, "_blank");

    const message = document.getElementById("qaActionMessage");

    if (message) {
        message.innerHTML =
            "QA Review Bridge opened. Submit the form to permanently update SharePoint.";
        message.style.color = "#22c55e";
    }
}

function getFailureCount(inspectionId) {
    return inspectionResponses.filter(response => {
        const responseInspectionId = getRecordValue(response, ["InspectionID", "InspectionIDText", "Inspection ID", "Inspection"]);
        const answer = getRecordValue(response, ["Response", "Response Value"]);
        return responseInspectionId === inspectionId && answer === "Fail";
    }).length;
}

function getRecordValue(record, possibleNames) {
    for (const name of possibleNames) {
        if (record[name] !== undefined && record[name] !== null && record[name] !== "") {
            return record[name];
        }
    }

    return "";
}

function setRecordValue(record, possibleNames, value) {
    for (const name of possibleNames) {
        if (record[name] !== undefined) {
            record[name] = value;
            return;
        }
    }

    record[possibleNames[0]] = value;
}

function statusClass(status) {
    if (status === "Approved") {
        return "status-approved";
    }

    if (status === "Rejected") {
        return "status-rejected";
    }

    return "status-open";
}

function responseClass(response) {
    if (response === "Pass") {
        return "response-pass";
    }

    if (response === "Fail") {
        return "response-fail";
    }

    return "response-na";
}

function formatDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-US");
}

function formatDateOnly(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-US");
}

function formatInputDate(date) {
    return date.toISOString().split("T")[0];
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function cleanText(value) {
    return String(value || "")
        .replaceAll("|", "/")
        .replaceAll("~", "-")
        .replaceAll("\n", " ")
        .replaceAll("\r", " ")
        .trim();
}

function submitInspection() {
    const inspectionId = document.getElementById("inspectionSelect").value;
    const inspection = inspections.find(i => i.id === inspectionId);
    const items = checklistItems.filter(item => item.formId === inspectionId);
    const status = document.getElementById("statusMessage");

    const responseLines = [];

    for (let index = 0; index < items.length; index++) {
        const itemNumber = index + 1;
        const item = items[index];

        const response = document.querySelector(
            `input[name="item${itemNumber}"]:checked`
        )?.value;

        const comment = document.getElementById(`comment${itemNumber}`).value;

        if (!response) {
            status.innerHTML = `Please answer item ${itemNumber}.`;
            status.style.color = "#ef4444";
            return;
        }

        responseLines.push(
            [
                cleanText(item.itemId),
                cleanText(item.requirement),
                cleanText(response),
                cleanText(comment)
            ].join("|")
        );
    }

    const payloadText = [
        `FORMID=${cleanText(inspection.id)}`,
        `FORMNAME=${cleanText(inspection.name)}`,
        `DEPARTMENT=${cleanText(inspection.department)}`,
        `FREQUENCY=${cleanText(inspection.frequency)}`,
        `RESPONSES=${responseLines.join("~")}`
    ].join("\n");

    const formUrl =
        "https://forms.office.com/Pages/ResponsePage.aspx?id=3JG89IfD0E6e175TItrr8LO9tidJOFRAtBCVSjfTIJdUQUlVMkM4SEgxS1NPWTRZUUlRU1RXQkxLSS4u" +
        "&rb9344b3d05ed4543ae44a4869b290642=" +
        encodeURIComponent(inspection.name) +
        "&r1b4d2b79b78f41b9a8f2f487705dcbcb=" +
        encodeURIComponent(inspection.department) +
        "&rd0e7b9a2b3b1410a929537e7ffdaa148=" +
        encodeURIComponent(inspection.id) +
        "&r0de6943bbe694fd29a7c2bb651ca2542=" +
        encodeURIComponent(payloadText);

    status.innerHTML = "Opening Microsoft Form submission...";
    status.style.color = "#22c55e";

    window.open(formUrl, "_blank");
}
