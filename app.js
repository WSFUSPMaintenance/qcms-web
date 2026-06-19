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

function hideAllPanels() {
    document.getElementById("homePanel").classList.add("hidden");
    document.getElementById("inspectionPanel").classList.add("hidden");
    document.getElementById("openInspectionsPanel").classList.add("hidden");
    document.getElementById("qaReviewPanel").classList.add("hidden");
    document.getElementById("completedInspectionsPanel").classList.add("hidden");
    document.getElementById("inspectionDetailsPanel").classList.add("hidden");
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

function backToHome() {
    hideAllPanels();
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
        const inspectionId = getRecordValue(record, ["Inspection ID", "InspectionID", "InspectionIDText"]);
        const name = getRecordValue(record, ["Inspection Name", "Title", "Form Name Text"]);
        const formId = getRecordValue(record, ["Form ID", "FormID"]);
        const department = getRecordValue(record, ["Responsible Department Text", "Department"]);
        const submittedBy = getRecordValue(record, ["Responsible Person", "SubmittedByEmail", "Submitted By"]);
        const status = getRecordValue(record, ["Status", "Status Value"]);
        const completion = getRecordValue(record, ["Completion %", "Completion"]);
        const submittedDate = getRecordValue(record, ["Submitted Date", "SubmittedDate"]);
        const qaReviewer = getRecordValue(record, ["QA Reviewer", "QAReviewer"]);
        const qaReviewDate = getRecordValue(record, ["QA Review Date", "QAReviewDate"]);
        const qaComments = getRecordValue(record, ["QA Comments", "QAComments"]);

        html += `
            <div class="inspection-list-card">
                <h3>${name}</h3>

                <div class="meta-row"><strong>Inspection ID:</strong> ${inspectionId}</div>
                <div class="meta-row"><strong>Form ID:</strong> ${formId}</div>
                <div class="meta-row"><strong>Department:</strong> ${department}</div>
                <div class="meta-row"><strong>Submitted By:</strong> ${submittedBy}</div>
                <div class="meta-row"><strong>Submitted Date:</strong> ${submittedDate}</div>
                <div class="meta-row"><strong>Completion:</strong> ${completion}%</div>
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
        const inspectionId = getRecordValue(record, ["Inspection ID", "InspectionID", "InspectionIDText"]);
        const name = getRecordValue(record, ["Inspection Name", "Title", "Form Name Text"]);
        const formId = getRecordValue(record, ["Form ID", "FormID"]);
        const department = getRecordValue(record, ["Responsible Department Text", "Department"]);
        const submittedBy = getRecordValue(record, ["Responsible Person", "SubmittedByEmail", "Submitted By"]);
        const status = getRecordValue(record, ["Status", "Status Value"]);
        const completion = getRecordValue(record, ["Completion %", "Completion"]);
        const submittedDate = getRecordValue(record, ["Submitted Date", "SubmittedDate"]);

        html += `
            <div class="inspection-list-card">
                <h3>${name}</h3>

                <div class="meta-row"><strong>Inspection ID:</strong> ${inspectionId}</div>
                <div class="meta-row"><strong>Form ID:</strong> ${formId}</div>
                <div class="meta-row"><strong>Department:</strong> ${department}</div>
                <div class="meta-row"><strong>Submitted By:</strong> ${submittedBy}</div>
                <div class="meta-row"><strong>Submitted Date:</strong> ${submittedDate}</div>
                <div class="meta-row"><strong>Completion:</strong> ${completion}%</div>

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
        const id = getRecordValue(item, ["Inspection ID", "InspectionID", "InspectionIDText"]);
        return id === inspectionId;
    });

    const responses = inspectionResponses.filter(item => {
        const id = getRecordValue(item, ["InspectionIDText", "Inspection ID", "Inspection"]);
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

    const name = getRecordValue(record, ["Inspection Name", "Title", "Form Name Text"]);
    const formId = getRecordValue(record, ["Form ID", "FormID"]);
    const department = getRecordValue(record, ["Responsible Department Text", "Department"]);
    const submittedBy = getRecordValue(record, ["Responsible Person", "SubmittedByEmail", "Submitted By"]);
    const status = getRecordValue(record, ["Status", "Status Value"]);
    const submittedDate = getRecordValue(record, ["Submitted Date", "SubmittedDate"]);
    const completion = getRecordValue(record, ["Completion %", "Completion"]);
    const qaReviewer = getRecordValue(record, ["QA Reviewer", "QAReviewer"]);
    const qaReviewDate = getRecordValue(record, ["QA Review Date", "QAReviewDate"]);
    const qaComments = getRecordValue(record, ["QA Comments", "QAComments"]);

    let html = `
        <div class="inspection-info">
            <h3>${name}</h3>
            <p><strong>Inspection ID:</strong> ${inspectionId}</p>
            <p><strong>Form ID:</strong> ${formId}</p>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Submitted By:</strong> ${submittedBy}</p>
            <p><strong>Submitted Date:</strong> ${submittedDate}</p>
            <p><strong>Completion:</strong> ${completion}%</p>
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
            const checklistItem = getRecordValue(response, ["ChecklistItemText", "Checklist Item", "Title"]);
            const requirement = getRecordValue(response, ["Requirement Text", "Requirement"]);
            const answer = getRecordValue(response, ["Response", "Response Value"]) || "N/A";
            const comment = getRecordValue(response, ["Comment", "Comments"]);

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

function approveInspection(inspectionId) {
    updateInspectionQAStatus(inspectionId, "Approved");
}

function rejectInspection(inspectionId) {
    const comments = document.getElementById("qaComments").value.trim();
    const message = document.getElementById("qaActionMessage");

    if (!comments) {
        message.textContent = "QA comments are required when rejecting an inspection.";
        message.style.color = "#ef4444";
        return;
    }

    updateInspectionQAStatus(inspectionId, "Rejected");
}

function updateInspectionQAStatus(inspectionId, newStatus) {
    const comments = document.getElementById("qaComments").value.trim();
    const message = document.getElementById("qaActionMessage");

    const record = inspectionRecords.find(item => {
        const id = getRecordValue(item, ["Inspection ID", "InspectionID", "InspectionIDText"]);
        return id === inspectionId;
    });

    if (!record) {
        message.textContent = "Unable to locate inspection record.";
        message.style.color = "#ef4444";
        return;
    }

    const reviewer = "Current User";
    const reviewDate = new Date().toLocaleDateString();

    setRecordValue(record, ["Status", "Status Value"], newStatus);
    setRecordValue(record, ["QA Reviewer", "QAReviewer"], reviewer);
    setRecordValue(record, ["QA Review Date", "QAReviewDate"], reviewDate);
    setRecordValue(record, ["QA Comments", "QAComments"], comments);

    message.textContent = `Inspection ${newStatus}. Moving to Completed Inspections.`;
    message.style.color = newStatus === "Approved" ? "#22c55e" : "#ef4444";

    setTimeout(() => {
        showCompletedInspections();
    }, 800);
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
