// https://script.google.com/macros/s/AKfycbzfFdsmWNxM6ClEVpXIiT57uG3DmtGHr4kGyj_8sUe4RRlzdFMxFYSOT4hw6EELvKh3_A/exec


const ADMIN_ID = "admin";
const ADMIN_PASS = "1234";

const GAS_URL = "https://script.google.com/macros/s/AKfycbzfFdsmWNxM6ClEVpXIiT57uG3DmtGHr4kGyj_8sUe4RRlzdFMxFYSOT4hw6EELvKh3_A/exec";

let players = [];
let matches = [];
let selectedMatch = null;

async function parseResponse(res) {
    const text = await res.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

// ================== Date Time =================

// function formatDate(dateStr) {
//     if (!dateStr) return "";

//     const [date, time] = dateStr.split(" ");
//     const [month, day, year] = date.split("/");

//     const months = [
//         "Jan","Feb","Mar","Apr","May","Jun",
//         "Jul","Aug","Sep","Oct","Nov","Dec"
//     ];

//     return `${day} ${months[month-1]} ${year} ${time}`;
// }

//================== match started or not ================

// function isMatchStarted(matchData) {
//     return !!matchData &&
//         matchData.home_score !== "null" &&
//         matchData.away_score !== "null";
// }


// ================= LOGIN =================
function login() {
    const id = document.getElementById("adminId").value;
    const pass = document.getElementById("adminPass").value;

    if (id === ADMIN_ID && pass === ADMIN_PASS) {
        document.getElementById("loginCard").classList.add("hidden");
        document.getElementById("mainPanel").classList.remove("hidden");
        loadPlayers();
    } else {
        alert("Invalid credentials");
    }
}

// ================= PLAYERS =================
async function loadPlayers() {
    const res = await fetch(GAS_URL + "?action=players");
    const data = await parseResponse(res);

    players = data.players || [];

    const select = document.getElementById("playerSelect");

    select.innerHTML = `
        <option value="">Select Player</option>
        ${players.map(p => `<option value="${p.name}">${p.name}</option>`).join("")}
        <option value="__new__">+ Create New</option>
    `;
}

function handlePlayerSelect() {
    const value = document.getElementById("playerSelect").value;

    if (value === "__new__") {
        document.getElementById("createPlayerBox").classList.remove("hidden");
        return;
    }

    if (value) {
        document.getElementById("createPlayerBox").classList.add("hidden");
        document.getElementById("roundCard").classList.remove("hidden");
    }
}

async function createPlayer() {
    const name = document.getElementById("newPlayerName").value.trim().toUpperCase();
    if (!name) return;

    const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "createPlayer",
            name
        })
    });

    const data = await parseResponse(res);
    alert(data.message || "Player created successfully.");

    document.getElementById("newPlayerName").value = "";
    document.getElementById("createPlayerBox").classList.add("hidden");

    loadPlayers();
}

// ================= MATCHES =================
async function loadMatches() {
    const round = document.getElementById("roundSelect").value;

    const res = await fetch("https://worldcup26.ir/get/games");
    const data = await res.json();

    matches = data.games.filter(m => m.type === round);

    const matchSelect = document.getElementById("matchSelect");

    matchSelect.innerHTML = `
        <option value="">Select Match</option>
        ${matches.map((m, i) =>
            `<option value="${m.id}">
                Match ${i + 1} — ${m.home_team_name_en} vs ${m.away_team_name_en}
            </option>`
        ).join("")}
    `;

    document.getElementById("matchCard").classList.remove("hidden");
}

function selectMatch() {
    const matchId = document.getElementById("matchSelect").value;
    selectedMatch = matches.find(m => m.id === matchId);

    if (!selectedMatch) return;

    renderMatchPreview();
    renderScoreInputs();

    document.getElementById("scoreCard").classList.remove("hidden");
}

function renderMatchPreview() {
    document.getElementById("matchPreview").innerHTML = `
        <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div class="text-center text-2xl font-bold">
                ${selectedMatch.home_team_name_en}
                <span class="mx-3 text-blue-400">VS</span>
                ${selectedMatch.away_team_name_en}
            </div>
        </div>
    `;
}

// ================= SCORE =================
function renderScoreInputs() {
    document.getElementById("scoreInputs").innerHTML = `
        <div class="grid md:grid-cols-2 gap-4">
            <input
                id="homeScore"
                type="number"
                min="0"
                placeholder="${selectedMatch.home_team_name_en} Score"
                class="bg-slate-800 rounded-xl p-3"
            />

            <input
                id="awayScore"
                type="number"
                min="0"
                placeholder="${selectedMatch.away_team_name_en} Score"
                class="bg-slate-800 rounded-xl p-3"
            />
        </div>

        <button
            onclick="generateScorers()"
            class="w-full mt-4 bg-blue-600 rounded-xl py-3"
        >
            Confirm Score
        </button>
    `;
}

// ================= SCORERS =================
function generateScorers() {
    const home = Number(document.getElementById("homeScore").value);
    const away = Number(document.getElementById("awayScore").value);

    const scorers = document.getElementById("scorersContainer");
    const penalties = document.getElementById("penaltyContainer");
    const saveBtn = document.getElementById("saveBtn");

    scorers.innerHTML = "";
    penalties.innerHTML = "";
    saveBtn.classList.add("hidden");

    if (home > 0) {
        scorers.innerHTML += createScorerSection(
            selectedMatch.home_team_name_en,
            home,
            "home-scorer"
        );
    }

    if (away > 0) {
        scorers.innerHTML += createScorerSection(
            selectedMatch.away_team_name_en,
            away,
            "away-scorer"
        );
    }

    if (home === away) {
        penalties.innerHTML = `
            <div class="mt-6 border border-yellow-500 rounded-xl p-4">
                <div class="text-yellow-400 font-bold mb-4">
                    Match tied — Penalty required
                </div>

                <input id="homePenalty"
                    type="number"
                    min="0"
                    placeholder="${selectedMatch.home_team_name_en} Penalty"
                    class="w-full p-3 rounded bg-slate-800 mb-3">

                <input id="awayPenalty"
                    type="number"
                    min="0"
                    placeholder="${selectedMatch.away_team_name_en} Penalty"
                    class="w-full p-3 rounded bg-slate-800">

                <button onclick="generatePenaltyScorers()"
                    class="w-full mt-4 bg-yellow-600 py-3 rounded">
                    Confirm Penalty
                </button>
            </div>
        `;
    } else {
        saveBtn.classList.remove("hidden");
    }
}

function createScorerSection(teamName, count, className) {
    let html = `
        <div class="mt-4 bg-slate-800 rounded-xl p-4">
            <h3 class="font-bold mb-3">${teamName} Scorers</h3>
    `;

    for (let i = 1; i <= count; i++) {
        html += `
            <input
                class="${className} w-full p-3 rounded bg-slate-700 mb-2"
                placeholder="Scorer ${i}">
        `;
    }

    html += `</div>`;
    return html;
}

// ================= PENALTIES =================
function generatePenaltyScorers() {
    const home = Number(document.getElementById("homePenalty").value);
    const away = Number(document.getElementById("awayPenalty").value);

    if (home === away) {
        alert("Penalty scores cannot be equal.");
        return;
    }

    const penalties = document.getElementById("penaltyContainer");

    if (home > 0) {
        penalties.innerHTML += createScorerSection(
            selectedMatch.home_team_name_en + " Penalty",
            home,
            "home-penalty-scorer"
        );
    }

    if (away > 0) {
        penalties.innerHTML += createScorerSection(
            selectedMatch.away_team_name_en + " Penalty",
            away,
            "away-penalty-scorer"
        );
    }

    document.getElementById("saveBtn").classList.remove("hidden");
}

// ================= SAVE =================
async function savePrediction() {
    const homeScorers = [];
    const awayScorers = [];
    const homePenaltyScorers = [];
    const awayPenaltyScorers = [];

    document.querySelectorAll(".home-scorer").forEach(el => {
        if (el.value.trim()) homeScorers.push(el.value.trim());
    });

    document.querySelectorAll(".away-scorer").forEach(el => {
        if (el.value.trim()) awayScorers.push(el.value.trim());
    });

    document.querySelectorAll(".home-penalty-scorer").forEach(el => {
        if (el.value.trim()) homePenaltyScorers.push(el.value.trim());
    });

    document.querySelectorAll(".away-penalty-scorer").forEach(el => {
        if (el.value.trim()) awayPenaltyScorers.push(el.value.trim());
    });

    const payload = {
        action: "savePrediction",
        player: document.getElementById("playerSelect").value,
        round: document.getElementById("roundSelect").value,
        match_id: selectedMatch.id,
        home_team: selectedMatch.home_team_name_en,
        away_team: selectedMatch.away_team_name_en,
        home_score: Number(document.getElementById("homeScore").value),
        away_score: Number(document.getElementById("awayScore").value),
        home_scorers: homeScorers.join(", "),
        away_scorers: awayScorers.join(", "),
        home_penalty: document.getElementById("homePenalty")?.value || "",
        away_penalty: document.getElementById("awayPenalty")?.value || "",
        home_penalty_scorers: homePenaltyScorers.join(", "),
        away_penalty_scorers: awayPenaltyScorers.join(", ")
    };

    const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    });

    const data = await parseResponse(res);
    alert(data.message || (res.ok ? "Prediction saved successfully." : "Failed to save prediction."));
}