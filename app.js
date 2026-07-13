import { validateQcmsData } from "./lib/data-validation.mjs";

let inspections = [];
let checklistItems = [];
let inspectionRecords = [];
let inspectionResponses = [];
let activeQueueFilter = "open";
let failureCountsByInspection = new Map();
const BUSINESS_TIME_ZONE = "America/Chicago";

async function loadData() {
    const paths = ["forms.json", "checklist-items.json", "inspection-records.json", "inspection-responses.json"];
    const snapshotRequest = Date.now();
    const responses = await Promise.all(paths.map(path =>
        fetch(`./data/${path}?v=${snapshotRequest}`, { cache: "no-store" })
    ));
    const failedResponse = responses.find(response => !response.ok);

    if (failedResponse) {
        throw new Error(`Could not load QCMS data (${failedResponse.status}).`);
    }

    [inspections, checklistItems, inspectionRecords, inspectionResponses] =
        await Promise.all(responses.map(response => response.json()));

    validateQcmsData({ forms: inspections, checklistItems, inspectionRecords, inspectionResponses });

    failureCountsByInspection = buildFailureCountIndex(inspectionResponses);

    populateInspectionDropdown();
    populateReportFilters();
    updateDashboard();
    renderAttentionList();
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

    const today = getBusinessDateKey(new Date());
    const firstDay = `${today.slice(0, 8)}01`;

    const startInput = document.getElementById("reportStartDate");
    const endInput = document.getElementById("reportEndDate");

    if (startInput && !startInput.value) {
        startInput.value = firstDay;
    }

    if (endInput && !endInput.value) {
        endInput.value = today;
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
            const submittedDate = getBusinessDateKey(getRecordValue(record, ["SubmittedDate", "Submitted Date"]));
            const dueDate = getBusinessDateKey(getRecordValue(record, ["DueDate", "Due Date"]));

            return submittedDate && dueDate && submittedDate <= dueDate;
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

function showInspectionQueue(filter = "open") {
    activeQueueFilter = filter;
    hideAllPanels();
    document.getElementById("openInspectionsPanel").classList.remove("hidden");
    document.getElementById("inspectionQueueTitle").textContent = getQueueTitle(filter);
    document.getElementById("inspectionSearch").value = "";
    loadInspectionQueue();
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
    document.addEventListener("click", handleActionClick);

    try {
        await loadData();
        document.getElementById("inspectionSelect").addEventListener("change", loadInspection);
        document.getElementById("inspectionSearch").addEventListener("input", loadInspectionQueue);
        document.getElementById("inspectionSort").addEventListener("change", loadInspectionQueue);
    } catch (error) {
        document.getElementById("attentionList").innerHTML = `
            <div class="empty-state error-state">
                QCMS data could not be loaded. Refresh the page or verify the data files are available.
            </div>`;
        console.error(error);
    }
});

function handleActionClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const actions = {
        "show-inspection": () => showInspection(),
        "show-queue": () => showInspectionQueue(button.dataset.filter || "open"),
        "show-qa": () => showQAReview(),
        "show-completed": () => showCompletedInspections(),
        "show-reports": () => showReportCenter(),
        "home": () => backToHome(),
        "view-inspection": () => viewInspectionDetails(button.dataset.inspectionId, button.dataset.returnType),
        "approve-inspection": () => approveInspection(button.dataset.inspectionId),
        "reject-inspection": () => rejectInspection(button.dataset.inspectionId),
        "generate-report": () => generateReport(),
        "print-report": () => printReport(),
        "clear-report": () => clearReport()
    };

    actions[button.dataset.action]?.();
}

function getQueueTitle(filter) {
    return ({
        all: "All Inspections",
        approved: "Approved Inspections",
        rejected: "Rejected Inspections",
        pastDue: "Past-Due Inspections",
        failures: "Inspections with Failures",
        attention: "Inspections Needing Attention",
        open: "Open Inspections"
    })[filter] || "Inspections";
}

function recordMatchesQueue(record, filter) {
    const status = getRecordValue(record, ["Status", "Status Value"]);
    const inspectionId = getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"]);
    const hasFailures = getFailureCount(inspectionId) > 0;

    if (filter === "all") return true;
    if (filter === "approved") return status === "Approved";
    if (filter === "rejected") return status === "Rejected";
    if (filter === "pastDue") return isPastDue(record);
    if (filter === "failures") return hasFailures;
    if (filter === "attention") return isPastDue(record) || (hasFailures && status === "Awaiting QA");
    return status !== "Approved" && status !== "Rejected";
}

function loadInspectionQueue() {
    const search = document.getElementById("inspectionSearch").value.trim().toLowerCase();
    const sort = document.getElementById("inspectionSort").value;
    const records = inspectionRecords
        .filter(record => recordMatchesQueue(record, activeQueueFilter))
        .filter(record => !search || [
            getRecordValue(record, ["Title", "Inspection Name", "Form Name Text"]),
            getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"]),
            getRecordValue(record, ["Department", "Responsible Department Text"]),
            getRecordValue(record, ["SubmittedByEmail", "Responsible Person", "Submitted By"])
        ].some(value => String(value).toLowerCase().includes(search)))
        .sort((a, b) => compareInspectionRecords(a, b, sort));

    document.getElementById("inspectionResultCount").textContent =
        `${records.length} inspection${records.length === 1 ? "" : "s"}`;
    renderInspectionCards(document.getElementById("openInspectionList"), records, "queue");
}

function compareInspectionRecords(a, b, sort) {
    const dateA = new Date(getRecordValue(a, ["SubmittedDate", "Submitted Date"])).getTime() || 0;
    const dateB = new Date(getRecordValue(b, ["SubmittedDate", "Submitted Date"])).getTime() || 0;

    if (sort === "newest") return dateB - dateA;
    if (sort === "oldest") return dateA - dateB;
    if (sort === "name") {
        return String(getRecordValue(a, ["Title", "Inspection Name", "Form Name Text"]))
            .localeCompare(String(getRecordValue(b, ["Title", "Inspection Name", "Form Name Text"])));
    }

    const priority = record => isPastDue(record) ? 0 : getFailureCount(
        getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"])
    ) > 0 ? 1 : 2;
    return priority(a) - priority(b) || dateA - dateB;
}

function renderAttentionList() {
    const records = inspectionRecords
        .filter(record => recordMatchesQueue(record, "attention"))
        .sort((a, b) => compareInspectionRecords(a, b, "priority"));
    const container = document.getElementById("attentionList");

    if (!records.length) {
        container.innerHTML = '<div class="empty-state">No past-due inspections or QA submissions with failed findings.</div>';
        return;
    }

    container.innerHTML = records.slice(0, 4).map(record => {
        const id = getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"]);
        const name = getRecordValue(record, ["Title", "Inspection Name", "Form Name Text"]);
        const department = getRecordValue(record, ["Department", "Responsible Department Text"]);
        const failures = getFailureCount(id);
        const reason = isPastDue(record) ? "Past due" : `${failures} failed finding${failures === 1 ? "" : "s"}`;

        return `
            <button class="attention-item" data-action="view-inspection" data-inspection-id="${escapeAttribute(id)}" data-return-type="attention">
                <span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(department)} &middot; ${escapeHtml(id)}</small></span>
                <span class="attention-reason">${escapeHtml(reason)}</span>
            </button>`;
    }).join("");
}

function renderInspectionCards(container, records, returnType) {
    if (!records.length) {
        container.innerHTML = '<div class="empty-state">No inspections match this view.</div>';
        return;
    }

    container.innerHTML = records.map(record => {
        const inspectionId = getRecordValue(record, ["InspectionID", "Inspection ID", "InspectionIDText"]);
        const name = getRecordValue(record, ["Title", "Inspection Name", "Form Name Text"]);
        const department = getRecordValue(record, ["Department", "Responsible Department Text"]);
        const submittedBy = getRecordValue(record, ["SubmittedByEmail", "Responsible Person", "Submitted By"]);
        const status = getRecordValue(record, ["Status", "Status Value"]) || "Open";
        const dueDate = formatDateOnly(getRecordValue(record, ["DueDate", "Due Date"]));
        const submittedDate = formatDate(getRecordValue(record, ["SubmittedDate", "Submitted Date"]));
        const failureCount = getFailureCount(inspectionId);

        return `
            <article class="inspection-list-card">
                <div class="card-heading"><h3>${escapeHtml(name)}</h3><span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span></div>
                <div class="record-meta-grid">
                    <div><span>Department</span><strong>${escapeHtml(department || "Not set")}</strong></div>
                    <div><span>Submitted</span><strong>${escapeHtml(submittedDate || "Not recorded")}</strong></div>
                    <div><span>Due</span><strong class="${isPastDue(record) ? "failure-row" : ""}">${escapeHtml(dueDate || "Not set")}</strong></div>
                    <div><span>Failed findings</span><strong class="${failureCount ? "failure-row" : ""}">${failureCount}</strong></div>
                </div>
                <p class="record-id">${escapeHtml(inspectionId)} &middot; ${escapeHtml(submittedBy || "Submitter not published")}</p>
                <button class="detail-button" data-action="view-inspection" data-inspection-id="${escapeAttribute(inspectionId)}" data-return-type="${escapeAttribute(returnType)}">View details</button>
            </article>`;
    }).join("");
}

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
        <h3>${escapeHtml(inspection.id)} - ${escapeHtml(inspection.name)}</h3>
        <p>Department: <strong>${escapeHtml(inspection.department)}</strong></p>
        <p>Frequency: <strong>${escapeHtml(inspection.frequency)}</strong></p>
    `;

    info.classList.remove("hidden");

    let html = "";

    items.forEach((item, index) => {
        const itemNumber = index + 1;

        html += `
            <div class="checklist-item">
                <h3>${itemNumber}. ${escapeHtml(item.requirement)}</h3>

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
                <h3>${escapeHtml(name)}</h3>

                <div class="meta-row"><strong>Inspection ID:</strong> ${escapeHtml(inspectionId)}</div>
                <div class="meta-row"><strong>Form ID:</strong> ${escapeHtml(formId)}</div>
                <div class="meta-row"><strong>Department:</strong> ${escapeHtml(department)}</div>
                <div class="meta-row"><strong>Submitted By:</strong> ${escapeHtml(submittedBy || "Not published")}</div>
                <div class="meta-row"><strong>Submitted Date:</strong> ${escapeHtml(submittedDate)}</div>
                <div class="meta-row"><strong>Due Date:</strong> ${escapeHtml(dueDate || "Not Set")}</div>
                <div class="meta-row"><strong>Completion:</strong> ${escapeHtml(completion)}%</div>
                <div class="meta-row ${failureCount > 0 ? "failure-row" : ""}">
                    <strong>Failures:</strong> ${failureCount}
                </div>
        `;

        if (isCompleted) {
            html += `
                <div class="meta-row"><strong>QA Reviewer:</strong> ${escapeHtml(qaReviewer || "Not Recorded")}</div>
                <div class="meta-row"><strong>QA Review Date:</strong> ${escapeHtml(qaReviewDate || "Not Recorded")}</div>
                <div class="meta-row"><strong>QA Comments:</strong> ${escapeHtml(qaComments || "None")}</div>
            `;
        }

        html += `
                <span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>

                <br>

                <button class="detail-button" data-action="view-inspection" data-inspection-id="${escapeAttribute(inspectionId)}" data-return-type="${escapeAttribute(type)}">
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
                <h3>${escapeHtml(name)}</h3>

                <div class="meta-row"><strong>Inspection ID:</strong> ${escapeHtml(inspectionId)}</div>
                <div class="meta-row"><strong>Form ID:</strong> ${escapeHtml(formId)}</div>
                <div class="meta-row"><strong>Department:</strong> ${escapeHtml(department)}</div>
                <div class="meta-row"><strong>Submitted By:</strong> ${escapeHtml(submittedBy || "Not published")}</div>
                <div class="meta-row"><strong>Submitted Date:</strong> ${escapeHtml(submittedDate)}</div>
                <div class="meta-row"><strong>Due Date:</strong> ${escapeHtml(dueDate || "Not Set")}</div>
                <div class="meta-row"><strong>Completion:</strong> ${escapeHtml(completion)}%</div>
                <div class="meta-row ${failureCount > 0 ? "failure-row" : ""}">
                    <strong>Failures:</strong> ${failureCount}
                </div>

                <span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>

                <br>

                <button class="detail-button" data-action="view-inspection" data-inspection-id="${escapeAttribute(inspectionId)}" data-return-type="qa">
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
    } else if (returnType === "attention") {
        backButton.textContent = "Back to Dashboard";
        backButton.onclick = backToHome;
    } else if (returnType === "queue") {
        backButton.textContent = `Back to ${getQueueTitle(activeQueueFilter)}`;
        backButton.onclick = () => showInspectionQueue(activeQueueFilter);
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
            <h3>${escapeHtml(name)}</h3>
            <p><strong>Inspection ID:</strong> ${escapeHtml(inspectionId)}</p>
            <p><strong>Form ID:</strong> ${escapeHtml(formId)}</p>
            <p><strong>Department:</strong> ${escapeHtml(department)}</p>
            <p><strong>Submitted By:</strong> ${escapeHtml(submittedBy || "Not published")}</p>
            <p><strong>Submitted Date:</strong> ${escapeHtml(submittedDate)}</p>
            <p><strong>Due Date:</strong> ${escapeHtml(dueDate || "Not Set")}</p>
            <p><strong>Completion:</strong> ${escapeHtml(completion)}%</p>
            <p class="${failureCount > 0 ? "failure-row" : ""}"><strong>Failures:</strong> ${failureCount}</p>
            <p><strong>Status:</strong> ${escapeHtml(status)}</p>
    `;

    if (status === "Approved" || status === "Rejected") {
        html += `
            <p><strong>QA Reviewer:</strong> ${escapeHtml(qaReviewer || "Not Recorded")}</p>
            <p><strong>QA Review Date:</strong> ${escapeHtml(qaReviewDate || "Not Recorded")}</p>
            <p><strong>QA Comments:</strong> ${escapeHtml(qaComments || "None")}</p>
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
                    <h3>${escapeHtml(checklistItem)}</h3>
                    <div class="meta-row"><strong>Requirement:</strong> ${escapeHtml(requirement)}</div>
                    <div class="meta-row"><strong>Response:</strong> ${escapeHtml(answer)}</div>
                    <div class="meta-row"><strong>Comment:</strong> ${escapeHtml(comment || "None")}</div>
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

                <button class="approve-button" data-action="approve-inspection" data-inspection-id="${escapeAttribute(inspectionId)}">
                    Approve Inspection
                </button>

                <button class="reject-button" data-action="reject-inspection" data-inspection-id="${escapeAttribute(inspectionId)}">
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

    let filteredRecords = inspectionRecords.filter(record => {
        const submittedDateValue = getRecordValue(record, ["SubmittedDate", "Submitted Date"]);

        if (!submittedDateValue) {
            return false;
        }

        const submittedDate = getBusinessDateKey(submittedDateValue);

        if (!submittedDate || submittedDate < startDateValue || submittedDate > endDateValue) {
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
                <p><strong>Department:</strong> ${escapeHtml(departmentFilter)}</p>
                <p><strong>Inspection:</strong> ${escapeHtml(inspectionFilter)}</p>
                <p><strong>Status:</strong> ${escapeHtml(statusFilter)}</p>
                <p><strong>Report Type:</strong> ${escapeHtml(getReportTypeLabel(reportType))}</p>
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
                            <div><strong>Submitted By:</strong> ${escapeHtml(submittedBy || "Not published")}</div>
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

    const today = getBusinessDateKey(new Date());
    const dueDate = getBusinessDateKey(dueDateValue);

    return Boolean(dueDate) && dueDate < today;
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
    const qaFormUrl =
        "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=3JG89IfD0E6e175TItrr8LO9tidJOFRAtBCVSjfTIJdUQUFQUDFJSVowOVpIREM1RlJEUTJQUzMxVi4u" +
        "&r74f9b757fd384314b10657196e52b8d3=" +
        encodeURIComponent(inspectionId) +
        "&r51900abbe1134ba49bb1161d1ee25b72=" +
        encodeURIComponent(decision) +
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
    return failureCountsByInspection.get(String(inspectionId)) || 0;
}

function buildFailureCountIndex(responses) {
    const counts = new Map();

    responses.forEach(response => {
        const responseInspectionId = getRecordValue(response, ["InspectionID", "InspectionIDText", "Inspection ID", "Inspection"]);
        const answer = getRecordValue(response, ["Response", "Response Value"]);

        if (answer === "Fail" && responseInspectionId) {
            const key = String(responseInspectionId);
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    });

    return counts;
}

function getRecordValue(record, possibleNames) {
    for (const name of possibleNames) {
        if (record[name] !== undefined && record[name] !== null && record[name] !== "") {
            return record[name];
        }
    }

    return "";
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

    return date.toLocaleString("en-US", { timeZone: BUSINESS_TIME_ZONE });
}

function formatDateOnly(value) {
    if (!value) {
        return "";
    }

    const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
        return `${Number(dateOnlyMatch[2])}/${Number(dateOnlyMatch[3])}/${dateOnlyMatch[1]}`;
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-US", { timeZone: BUSINESS_TIME_ZONE });
}

function getBusinessDateKey(value) {
    const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
        return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) return "";

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: BUSINESS_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

    return `${values.year}-${values.month}-${values.day}`;
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
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
