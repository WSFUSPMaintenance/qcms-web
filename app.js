const inspections = [
    {
        id: "AIR001",
        name: "Air Curtains",
        department: "Maintenance",
        frequency: "Monthly",
        items: [
            {
                itemId: "AIR001-01",
                requirement: "Area thoroughly cleaned and free of dirt/debris"
            },
            {
                itemId: "AIR001-02",
                requirement: "Air curtains in good repair"
            }
        ]
    }
];

function showInspection() {
    document.getElementById("inspectionPanel").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
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

    info.innerHTML = `
        <h3>${inspection.id} - ${inspection.name}</h3>
        <p>Department: <strong>${inspection.department}</strong></p>
        <p>Frequency: <strong>${inspection.frequency}</strong></p>
    `;

    info.classList.remove("hidden");

    let html = "";

    inspection.items.forEach((item, index) => {
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
    const status = document.getElementById("statusMessage");

    const responseLines = [];

    for (let index = 0; index < inspection.items.length; index++) {
        const itemNumber = index + 1;
        const item = inspection.items[index];

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
