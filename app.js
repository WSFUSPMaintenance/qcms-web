function showInspection() {
    document.getElementById("inspectionPanel").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", function () {

    const submitBtn = document.getElementById("submitInspection");

    submitBtn.addEventListener("click", function () {

        const department =
            document.getElementById("department").value;

        const floor =
            document.querySelector(
                'input[name="floorCondition"]:checked'
            )?.value;

        const equipment =
            document.querySelector(
                'input[name="equipmentCondition"]:checked'
            )?.value;

        const comments =
            document.getElementById("comments").value;

        const status =
            document.getElementById("statusMessage");

        if (!department || !floor || !equipment) {

            status.innerHTML =
                "Please complete all required fields.";

            status.style.color = "#ef4444";

            return;
        }

        const formUrl =
            "https://forms.office.com/Pages/ResponsePage.aspx?id=3JG89IfD0E6e175TItrr8LO9tidJOFRAtBCVSjfTIJdUQUlVMkM4SEgxS1NPWTRZUUlRU1RXQkxLSS4u" +
            "&rb9344b3d05ed4543ae44a4869b290642=" + encodeURIComponent("QCMS Inspection") +
            "&r1b4d2b79b78f41b9a8f2f487705dcbcb=" + encodeURIComponent(department) +
            "&rd0e7b9a2b3b1410a929537e7ffdaa148=" + encodeURIComponent("GitHub QCMS Submission") +
            "&r0de6943bbe694fd29a7c2bb651ca2542=" + encodeURIComponent(comments) +
            "&r1df9198d75624d9d9d554c92d0adca1f=" + encodeURIComponent(floor) +
            "&r922e0dfea54e49f680cf5abf11c6de6f=" + encodeURIComponent(equipment);

        status.innerHTML =
            "Opening inspection submission form...";

        status.style.color = "#22c55e";

        window.open(formUrl, "_blank");
    });

});
