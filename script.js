
// SMART HOME POWER SAVER
// Daily energy tracking + date history + comparison

const RATE_PER_UNIT = 8;

// Default household appliances
const defaultAppliances = [
    { id: 1, name: "Fan", icon: "🌀", watts: 75, status: false, hours: 8, start: "08:00", end: "16:00" },
    { id: 2, name: "Television", icon: "📺", watts: 100, status: false, hours: 4, start: "18:00", end: "22:00" },
    { id: 3, name: "Air Conditioner", icon: "❄️", watts: 1500, status: false, hours: 6, start: "22:00", end: "04:00" },
    { id: 4, name: "Light", icon: "💡", watts: 15, status: false, hours: 5, start: "18:00", end: "23:00" },
    { id: 5, name: "Refrigerator", icon: "🧊", watts: 200, status: false, hours: 24, start: "00:00", end: "23:59" }
];

// Load saved appliances
function loadAppliances() {
    try {
        return JSON.parse(localStorage.getItem("homeAppliances"))
            || defaultAppliances;
    } catch {
        return defaultAppliances;
    }
}

let appliances = loadAppliances();

// Load saved daily history
function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem("energyHistory")) || {};
    } catch {
        return {};
    }
}

let energyHistory = loadHistory();

// Date in YYYY-MM-DD format
function getDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Previous date
function previousDate(dateString) {
    const date = new Date(dateString + "T12:00:00");
    date.setDate(date.getDate() - 1);
    return getDateString(date);
}

// Initialize appliance timers
appliances.forEach(device => {
    if (device.status && !device.lastAccountedAt) {
        device.lastAccountedAt = Date.now();
    }

    if (!device.status) {
        device.lastAccountedAt = null;
    }
});

// Create a daily history record
function createDailyRecord(date) {
    if (!energyHistory[date]) {
        energyHistory[date] = {};
    }

    return energyHistory[date];
}

// Save all information
function saveData() {
    localStorage.setItem(
        "homeAppliances",
        JSON.stringify(appliances)
    );

    localStorage.setItem(
        "energyHistory",
        JSON.stringify(energyHistory)
    );
}

// Record usage, including when usage crosses midnight
function recordUsage(device, startTime, endTime) {
    let current = startTime;

    while (current < endTime) {
        const date = getDateString(new Date(current));

        const midnight = new Date(
            new Date(date + "T00:00:00").getTime()
            + 24 * 60 * 60 * 1000
        ).getTime();

        const segmentEnd = Math.min(endTime, midnight);

        const seconds = (segmentEnd - current) / 1000;

        const record = createDailyRecord(date);

        record[device.id] =
            (record[device.id] || 0) + seconds;

        current = segmentEnd;
    }
}

// Update all active appliance timers
function updateTimers() {
    const now = Date.now();

    appliances.forEach(device => {
        if (device.status && device.lastAccountedAt) {
            recordUsage(
                device,
                device.lastAccountedAt,
                now
            );

            device.lastAccountedAt = now;
        }
    });

    saveData();
}

// Calculate energy for a particular date
function getDailyEnergy(date) {
    const record = energyHistory[date] || {};

    return appliances.reduce((total, device) => {
        const seconds = record[device.id] || 0;

        return total +
            (device.watts * seconds / 3600000);
    }, 0);
}

// Calculate appliance energy for a particular date
function getApplianceEnergy(device, date) {
    const seconds =
        (energyHistory[date] || {})[device.id] || 0;

    return device.watts * seconds / 3600000;
}

// Turn appliance ON or OFF
function toggleAppliance(id) {
    const device = appliances.find(
        item => item.id === id
    );

    if (!device) return;

    // Record usage before changing status
    updateTimers();

    if (device.status) {
        device.status = false;
        device.lastAccountedAt = null;
    } else {
        device.status = true;
        device.lastAccountedAt = Date.now();
    }

    saveData();

    renderAppliances();
    updateDashboard();
}

// Display appliances
function renderAppliances() {
    const list = document.getElementById("applianceList");

    list.innerHTML = "";

    appliances.forEach(device => {
        const card = document.createElement("div");

        card.className = "appliance-card";

        card.innerHTML = `
            <div class="device-icon">${device.icon}</div>

            <div class="device-info">
                <h3>${escapeHTML(device.name)}</h3>

                <span class="status ${device.status ? "on" : ""}">
                    ${device.status ? "● ON" : "● OFF"}
                </span>
            </div>

            <p style="margin-top:12px">
                Power: ${device.watts} Watts
            </p>

            <p style="margin-top:8px">
                Daily usage setting: ${device.hours} hours
            </p>

            <button
                class="power-btn ${device.status ? "active" : ""}"
                onclick="toggleAppliance(${device.id})">

                ${device.status ? "Turn OFF" : "Turn ON"}

            </button>
        `;

        list.appendChild(card);
    });

    document.getElementById("totalCount").textContent =
        appliances.length;

    document.getElementById("onCount").textContent =
        appliances.filter(device => device.status).length;
}

// Prevent entered appliance names from becoming HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Add a new appliance
function addAppliance() {
    const name = prompt("Enter appliance name:");

    if (!name || !name.trim()) return;

    const watts = Number(
        prompt("Enter appliance power in Watts:")
    );

    if (!Number.isFinite(watts) || watts <= 0) {
        alert("Enter a valid wattage.");
        return;
    }

    const device = {
        id: Date.now(),
        name: name.trim(),
        icon: "🔌",
        watts: watts,
        status: false,
        hours: 1,
        start: "09:00",
        end: "10:00",
        lastAccountedAt: null
    };

    appliances.push(device);

    saveData();
    renderAppliances();
    renderSchedules();
    updateDashboard();
}

// Display schedules
function renderSchedules() {
    const list = document.getElementById("scheduleList");

    list.innerHTML = "";

    appliances.forEach(device => {
        const item = document.createElement("div");

        item.className = "schedule-item";

        item.innerHTML = `
            <div>
                <strong>${device.icon} ${escapeHTML(device.name)}</strong>
                <p>Daily usage hours</p>

                <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    id="hours-${device.id}"
                    value="${device.hours}">
            </div>

            <div>
                <label>Start time</label>

                <input
                    type="time"
                    id="start-${device.id}"
                    value="${device.start}">
            </div>

            <div>
                <label>End time</label>

                <input
                    type="time"
                    id="end-${device.id}"
                    value="${device.end}">
            </div>

            <button
                class="save-btn"
                onclick="saveSchedule(${device.id})">

                Save

            </button>
        `;

        list.appendChild(item);
    });
}

// Save appliance schedule
function saveSchedule(id) {
    const device = appliances.find(
        item => item.id === id
    );

    const hours = Number(
        document.getElementById(`hours-${id}`).value
    );

    const start = document.getElementById(`start-${id}`).value;
    const end = document.getElementById(`end-${id}`).value;

    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        alert("Enter hours between 0 and 24.");
        return;
    }

    if (!start || !end) {
        alert("Select start and end times.");
        return;
    }

    device.hours = hours;
    device.start = start;
    device.end = end;

    saveData();
    updateDashboard();

    alert("Schedule saved successfully!");
}

// Create daily comparison section
function createHistorySection() {
    const report = document.getElementById("reports");

    if (document.getElementById("historyPanel")) return;

    const panel = document.createElement("div");

    panel.id = "historyPanel";
    panel.className = "report-card";

    panel.innerHTML = `
        <h2>📊 Daily Energy History</h2>

        <p>Select a date to view electricity consumption.</p>

        <input
            type="date"
            id="historyDate"
            max="${getDateString()}"
            value="${getDateString()}">

        <h3 id="selectedEnergy" style="margin-top:20px">
            Today's Energy: 0 kWh
        </h3>

        <p id="selectedCost"></p>

        <hr style="margin:20px 0">

        <h3>Day Comparison</h3>

        <p id="comparisonResult"></p>

        <h3 style="margin-top:20px">Appliance-wise Usage</h3>

        <div id="applianceHistory"></div>

        <h3 style="margin-top:20px">Previous 7 Days</h3>

        <div id="weeklyHistory"></div>
    `;

    report.appendChild(panel);

    document.getElementById("historyDate")
        .addEventListener("change", updateDashboard);
}

// Refresh daily reports and comparisons
function updateHistory() {
    const dateInput = document.getElementById("historyDate");

    if (!dateInput) return;

    const selectedDate = dateInput.value || getDateString();

    const previous = previousDate(selectedDate);

    const selectedEnergy = getDailyEnergy(selectedDate);
    const previousEnergy = getDailyEnergy(previous);

    const cost = selectedEnergy * RATE_PER_UNIT;

    document.getElementById("selectedEnergy").textContent =
        `Energy on ${selectedDate}: ${selectedEnergy.toFixed(3)} kWh`;

    document.getElementById("selectedCost").textContent =
        `Estimated cost: ₹${cost.toFixed(2)}`;

    const difference = selectedEnergy - previousEnergy;

    let message = "";

    if (difference > 0.0005) {
        message = `Energy increased by ${difference.toFixed(3)} kWh compared with ${previous}.`;
    } else if (difference < -0.0005) {
        message = `Energy decreased by ${Math.abs(difference).toFixed(3)} kWh compared with ${previous}.`;
    } else {
        message = `Energy consumption is the same as ${previous}.`;
    }

    document.getElementById("comparisonResult").textContent =
        `Previous day: ${previousEnergy.toFixed(3)} kWh. ${message}`;

    const applianceHistory =
        document.getElementById("applianceHistory");

    applianceHistory.innerHTML = "";

    appliances.forEach(device => {
        const energy = getApplianceEnergy(device, selectedDate);

        const row = document.createElement("p");

        row.style.marginTop = "10px";

        row.textContent =
            `${device.icon} ${device.name}: ${energy.toFixed(3)} kWh`;

        applianceHistory.appendChild(row);
    });

    const weeklyHistory =
        document.getElementById("weeklyHistory");

    weeklyHistory.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const date = new Date(selectedDate + "T12:00:00");

        date.setDate(date.getDate() - i);

        const day = getDateString(date);
        const energy = getDailyEnergy(day);

        const row = document.createElement("p");

        row.style.marginTop = "10px";

        row.textContent =
            `${day}: ${energy.toFixed(3)} kWh`;

        weeklyHistory.appendChild(row);
    }
}

// Update dashboard automatically
function updateDashboard() {
    const today = getDateString();

    const energy = getDailyEnergy(today);

    const cost = energy * RATE_PER_UNIT;

    document.getElementById("totalCount").textContent =
        appliances.length;

    document.getElementById("onCount").textContent =
        appliances.filter(device => device.status).length;

    document.getElementById("energyUsed").textContent =
        energy.toFixed(3) + " kWh";

    document.getElementById("reportEnergy").textContent =
        energy.toFixed(3) + " kWh";

    document.getElementById("reportCost").textContent =
        "Today's estimated cost: ₹" + cost.toFixed(2);

    updateHistory();
}

// INITIALIZE APPLICATION

updateTimers();

renderAppliances();
renderSchedules();

createHistorySection();
updateDashboard();

// Update energy every second
setInterval(() => {
    updateTimers();
    updateDashboard();
}, 1000);
