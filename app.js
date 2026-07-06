/* ===========================================================
   FIFA World Cup 2026 Prediction League
   Stable single-page experience
   =========================================================== */

const WORLD_CUP_API = "https://worldcup26.ir/get";
const GAS_URL = "https://script.google.com/macros/s/AKfycbzfFdsmWNxM6ClEVpXIiT57uG3DmtGHr4kGyj_8sUe4RRlzdFMxFYSOT4hw6EELvKh3_A/exec";

const KNOCKOUT_ROUNDS = ["r32", "r16", "qf", "sf", "final"];
const ROUND_NAMES = {
    r32: "Round of 32",
    r16: "Round of 16",
    qf: "Quarter Final",
    sf: "Semi Final",
    final: "Final"
};

const DEFAULT_POINTS = {
    winner: 5,
    score: 10,
    scorer: 2,
    penaltyWinner: 3,
    penaltyScore: 4,
    penaltyScorer: 1
};

let teams = {};
let matches = [];
let predictions = [];
let leaderboard = [];
let pointSettings = DEFAULT_POINTS;
let selectedRound = "r32";
let selectedMatch = null;
let leaderboardExpanded = false;
let leaderboardMode = false;
let toastTimer = null;

const roundSelect = document.getElementById("roundSelect");
const matchSelect = document.getElementById("matchSelect");
const matchContainer = document.getElementById("matchContainer");
const predictionSection = document.getElementById("predictionSection");
const predictionContainer = document.getElementById("predictionContainer");
const predictionCount = document.getElementById("predictionCount");
const leaderboardSection = document.getElementById("leaderboardSection");
const leaderboardContainer = document.getElementById("leaderboardContainer");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");
const loading = document.getElementById("loading");
const toast = document.getElementById("toast");

async function getMatchPoints(matchId) {
    return await request(`${GAS_URL}?action=matchPoints&match_id=${matchId}`);
}

function showLoading() {
    if (loading) loading.classList.remove("hidden");
}

function hideLoading() {
    if (loading) loading.classList.add("hidden");
}

function showToast(message, type = "info") {
    if (!toast) return;

    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = "hidden fixed bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-2xl z-50";

    if (type === "success") {
        toast.classList.add("bg-emerald-700", "border", "border-emerald-400", "text-white");
    } else if (type === "error") {
        toast.classList.add("bg-red-700", "border", "border-red-400", "text-white");
    } else {
        toast.classList.add("bg-slate-800", "border", "border-slate-600", "text-white");
    }

    toast.classList.remove("hidden");
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 2500);
}

function isNull(value) {
    return value === null || value === undefined || String(value).trim() === "" || String(value).trim().toLowerCase() === "null";
}

function parseList(value) {
    if (isNull(value)) return [];
    return String(value)
        .replace(/[{}\"]/g, "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");
}

function formatDate(dateString) {
    if (!dateString) return "";
    try {
        const [datePart, timePart] = dateString.split(" ");
        const [month, day, year] = datePart.split("/");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${day} ${months[month - 1] || month} ${year} ${timePart || ""}`.trim();
    } catch {
        return dateString;
    }
}

function getRoundName(round) {
    return ROUND_NAMES[round] || round;
}

function getTeam(id) {
    return teams[id] || null;
}

function getScoreText(match) {
    if (isNull(match.home_score) && isNull(match.away_score)) return "-";
    return `${match.home_score ?? 0} - ${match.away_score ?? 0}`;
}

function getStatus(match) {
    if (match.finished === "TRUE") {
        return { text: "Finished", className: "bg-emerald-600" };
    }
    if (!isNull(match.time_elapsed) && match.time_elapsed !== "notstarted") {
        return { text: "Live", className: "bg-red-600 animate-pulse" };
    }
    return { text: "Upcoming", className: "bg-slate-600" };
}

async function request(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }
    return response.json();
}

async function getPredictions(matchId) {
    const data = await request(`${GAS_URL}?action=predictions&match_id=${matchId}`);
    return data.predictions || [];
}

async function getLeaderboardData() {
    return await request(`${GAS_URL}?action=leaderboard`);
}

async function getPointSettings() {
    const data = await request(`${GAS_URL}?action=settings`);
    return data.settings || DEFAULT_POINTS;
}

async function loadData() {
    showLoading();

    try {
        const [teamData, matchData, leaderboardData, settingData] = await Promise.all([
            request(`${WORLD_CUP_API}/teams`),
            request(`${WORLD_CUP_API}/games`),
            getLeaderboardData(),
            getPointSettings()
        ]);

        teams = {};
        (teamData.teams || []).forEach(team => {
            teams[team.id] = team;
        });

        matches = (matchData.games || []).filter(match => KNOCKOUT_ROUNDS.includes(match.type));
        leaderboard = leaderboardData;
        pointSettings = settingData;
        console.log("Leaderboard:", leaderboard);

        renderRoundDropdown();
        showToast("Match data loaded", "success");
    } catch (error) {
        console.error(error);
        matchContainer.innerHTML = `
            <div class="rounded-2xl border border-red-700 bg-red-900/40 p-6 text-center">
                <h3 class="text-xl font-semibold">Unable to load the league</h3>
                <p class="mt-2 text-sm text-red-100">Please refresh the page or try again shortly.</p>
            </div>`;
        showToast("Unable to connect right now", "error");
    } finally {
        hideLoading();
    }
}

function renderRoundDropdown() {
    const rounds = [...new Set(matches.map(match => match.type))].filter(Boolean);

    if (!rounds.length) {
        roundSelect.innerHTML = '<option value="">No matches</option>';
        return;
    }

    roundSelect.innerHTML = rounds.map(round => `<option value="${round}">${getRoundName(round)}</option>`).join("");
    selectedRound = rounds.includes(selectedRound) ? selectedRound : rounds[0];
    roundSelect.value = selectedRound;
    renderMatchDropdown();
    updateViewMode();
}

function updateViewMode() {
    if (leaderboardMode) {
        matchContainer.classList.add("hidden");
        predictionSection?.classList.add("hidden");
        leaderboardSection?.classList.remove("hidden");
        showLeaderboardBtn.textContent = "Match View";
    } else {
        matchContainer.classList.remove("hidden");
        predictionSection?.classList.remove("hidden");
        leaderboardSection?.classList.add("hidden");
        showLeaderboardBtn.textContent = "Leaderboard";
    }
}

function renderMatchDropdown() {
    const currentMatches = matches.filter(match => match.type === selectedRound);

    if (!currentMatches.length) {
        matchSelect.innerHTML = '<option value="">No matches available</option>';
        selectedMatch = null;
        matchContainer.innerHTML = "";
        predictionContainer.innerHTML = "";
        leaderboardContainer.innerHTML = "";
        predictionCount.textContent = "0 Players";
        return;
    }

    matchSelect.innerHTML = currentMatches.map((match, index) => `
        <option value="${match.id}">Match ${index + 1} · ${escapeHtml(match.home_team_name_en)} vs ${escapeHtml(match.away_team_name_en)}</option>
    `).join("");

    const existingMatch = currentMatches.find(match => String(match.id) === String(selectedMatch?.id));
    selectedMatch = existingMatch || currentMatches[0];
    matchSelect.value = String(selectedMatch.id);
    renderCurrentMatch();
}

async function renderCurrentMatch() {
    if (!selectedMatch) return;

    matchContainer.innerHTML = `
        <div class="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 text-center text-slate-400">
            Loading match details…
        </div>`;

    predictionContainer.innerHTML = `
        <div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-center text-slate-400">
            Loading predictions…
        </div>`;

    try {
        const [matchDetails] = matches.filter(match => String(match.id) === String(selectedMatch.id));
        if (matchDetails) {
            selectedMatch = matchDetails;
        }

        renderMatchCard();
        renderGoalScorers();
        renderPenalty();
        predictions = await getPredictions(selectedMatch.id);
        const matchPoints = await getMatchPoints(selectedMatch.id);
        predictions = predictions.map(pred => {

            const player = matchPoints.find(
                p => p.player === pred.player
            );

            return {
                ...pred,
                points: player ? player.points : 0
            };

        });
        renderPredictions();
        renderLeaderboard();
    } catch (error) {
        console.error(error);
        predictionContainer.innerHTML = `
            <div class="rounded-2xl border border-red-700 bg-red-900/30 p-5 text-center text-red-200">
                Predictions could not be loaded.
            </div>`;
    }
}

function renderMatchCard() {
    if (!selectedMatch) return;

    const home = getTeam(selectedMatch.home_team_id) || {};
    const away = getTeam(selectedMatch.away_team_id) || {};
    const status = getStatus(selectedMatch);
    const scoreText = getScoreText(selectedMatch);

    matchContainer.innerHTML = `
        <div class="match-card">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-sm uppercase tracking-[0.35em] text-slate-400">${escapeHtml(getRoundName(selectedMatch.type))}</p>
                </div>
                <span class="rounded-full px-3 py-1 text-sm font-semibold ${status.className}">${status.text}</span>
            </div>

            <div class="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                <div class="flex flex-col items-center gap-2">
                    <img src="${home.flag || ""}" alt="${escapeHtml(home.name_en || selectedMatch.home_team_name_en)}" class="h-14 w-14 rounded-full object-cover ring-2 ring-slate-700">
                    <p class="font-semibold">${escapeHtml(home.name_en || selectedMatch.home_team_name_en)}</p>
                </div>
                <div class="flex flex-col items-center justify-center gap-2">
                    <p class="text-4xl font-black text-sky-400">${scoreText}</p>
                    <p class="text-sm text-slate-400">${formatDate(selectedMatch.local_date)}</p>
                </div>
                <div class="flex flex-col items-center gap-2">
                    <img src="${away.flag || ""}" alt="${escapeHtml(away.name_en || selectedMatch.away_team_name_en)}" class="h-14 w-14 rounded-full object-cover ring-2 ring-slate-700">
                    <p class="font-semibold">${escapeHtml(away.name_en || selectedMatch.away_team_name_en)}</p>
                </div>
            </div>
        </div>`;
}

function renderGoalScorers() {
    if (!selectedMatch) return;

    const homeGoals = parseList(selectedMatch.home_scorers);
    const awayGoals = parseList(selectedMatch.away_scorers);
    if (!homeGoals.length && !awayGoals.length) return;

    const sections = [];
    if (homeGoals.length) {
        sections.push(`
            <div class="goal-box">
                <h4 class="mb-3 font-semibold text-emerald-400">${escapeHtml(selectedMatch.home_team_name_en)}</h4>
                ${homeGoals.map(name => `<div class="mb-2 flex items-center gap-2">⚽ ${escapeHtml(name)}</div>`).join("")}
            </div>`);
    }
    if (awayGoals.length) {
        sections.push(`
            <div class="goal-box">
                <h4 class="mb-3 font-semibold text-emerald-400">${escapeHtml(selectedMatch.away_team_name_en)}</h4>
                ${awayGoals.map(name => `<div class="mb-2 flex items-center gap-2">⚽ ${escapeHtml(name)}</div>`).join("")}
            </div>`);
    }

    matchContainer.innerHTML += `<div class="mt-4 grid gap-4 md:grid-cols-2">${sections.join("")}</div>`;
}

function renderPenalty() {
    if (!selectedMatch) return;
    if (isNull(selectedMatch.home_penalty_score) || isNull(selectedMatch.away_penalty_score)) return;

    const homeScorers = parseList(selectedMatch.home_penalty_scorers);
    const awayScorers = parseList(selectedMatch.away_penalty_scorers);

    matchContainer.innerHTML += `
        <div class="penalty mt-4">
            <h4 class="mb-3 text-center text-xl font-semibold text-amber-300">Penalty Shootout</h4>
            <p class="mb-4 text-center text-lg font-medium">${escapeHtml(selectedMatch.home_team_name_en)} ${selectedMatch.home_penalty_score} - ${selectedMatch.away_penalty_score} ${escapeHtml(selectedMatch.away_team_name_en)}</p>
            <div class="grid gap-4 md:grid-cols-2">
                <div class="goal-box">
                    <h5 class="mb-3 font-semibold">${escapeHtml(selectedMatch.home_team_name_en)}</h5>
                    ${homeScorers.length ? homeScorers.map(player => `<div class="mb-2">✓ ${escapeHtml(player)}</div>`).join("") : '<p class="text-slate-400">No scorers listed.</p>'}
                </div>
                <div class="goal-box">
                    <h5 class="mb-3 font-semibold">${escapeHtml(selectedMatch.away_team_name_en)}</h5>
                    ${awayScorers.length ? awayScorers.map(player => `<div class="mb-2">✓ ${escapeHtml(player)}</div>`).join("") : '<p class="text-slate-400">No scorers listed.</p>'}
                </div>
            </div>
        </div>`;
}

function getMatchWinner(match) {
    if (isNull(match.home_score) || isNull(match.away_score)) return null;

    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);

    if (homeScore > awayScore) return "home";
    if (homeScore < awayScore) return "away";
    if (!isNull(match.home_penalty_score) && !isNull(match.away_penalty_score)) {
        return Number(match.home_penalty_score) > Number(match.away_penalty_score) ? "home" : "away";
    }
    return "draw";
}

function getPredictionWinner(prediction) {
    if (isNull(prediction.home_score) || isNull(prediction.away_score)) return null;

    const homeScore = Number(prediction.home_score);
    const awayScore = Number(prediction.away_score);

    if (homeScore > awayScore) return "home";
    if (homeScore < awayScore) return "away";
    return "draw";
}

function getPredictionOutcomeClass(prediction) {
    const actualWinner = getMatchWinner(selectedMatch);
    const predictedWinner = getPredictionWinner(prediction);

    if (!actualWinner || !predictedWinner) return "text-slate-100";
    return actualWinner === predictedWinner ? "text-emerald-300" : "text-rose-300";
}

function normalizeText(text) {
    return String(text || "").trim().toLowerCase();
}

function getMatchWinner(match) {
    if (isNull(match.home_score) || isNull(match.away_score)) return null;

    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);

    if (homeScore > awayScore) return "home";
    if (homeScore < awayScore) return "away";
    if (!isNull(match.home_penalty_score) && !isNull(match.away_penalty_score)) {
        return Number(match.home_penalty_score) > Number(match.away_penalty_score) ? "home" : "away";
    }
    return "draw";
}

function getPredictionWinner(prediction) {
    if (isNull(prediction.home_score) || isNull(prediction.away_score)) return null;

    const homeScore = Number(prediction.home_score);
    const awayScore = Number(prediction.away_score);

    if (homeScore > awayScore) return "home";
    if (homeScore < awayScore) return "away";
    return "draw";
}

function hasExactScoreMatch(prediction) {
    return !isNull(selectedMatch.home_score) && !isNull(selectedMatch.away_score) &&
        !isNull(prediction.home_score) && !isNull(prediction.away_score) &&
        Number(selectedMatch.home_score) === Number(prediction.home_score) &&
        Number(selectedMatch.away_score) === Number(prediction.away_score);
}

function parseScorerNames(list) {
    return parseList(list).map(name => normalizeText(name));
}

function anyScorerMatch(prediction) {
    const actualScorers = [...parseScorerNames(selectedMatch.home_scorers), ...parseScorerNames(selectedMatch.away_scorers)];
    const predictedScorers = [...parseScorerNames(prediction.home_scorers), ...parseScorerNames(prediction.away_scorers)];
    return predictedScorers.some(name => actualScorers.includes(name));
}

function anyPenaltyScorerMatch(prediction) {
    const actualScorers = [...parseScorerNames(selectedMatch.home_penalty_scorers), ...parseScorerNames(selectedMatch.away_penalty_scorers)];
    const predictedScorers = [...parseScorerNames(prediction.home_penalty_scorers), ...parseScorerNames(prediction.away_penalty_scorers)];
    return predictedScorers.some(name => actualScorers.includes(name));
}

function getPredictionOutcomeClass(prediction) {
    const actualWinner = getMatchWinner(selectedMatch);
    const predictedWinner = getPredictionWinner(prediction);

    if (!actualWinner || actualWinner === "draw" || !predictedWinner || predictedWinner === "draw") {
        return "text-slate-100";
    }
    return actualWinner === predictedWinner ? "text-emerald-300" : "text-rose-300";
}

function getPredictionCardClass(prediction) {
    const actualWinner = getMatchWinner(selectedMatch);
    const predictedWinner = getPredictionWinner(prediction);
    const exactScore = hasExactScoreMatch(prediction);
    const scorerMatch = anyScorerMatch(prediction);
    const penaltyMatch = anyPenaltyScorerMatch(prediction);
    const exactPenalty = !isNull(selectedMatch.home_penalty_score) && !isNull(selectedMatch.away_penalty_score) &&
        !isNull(prediction.home_penalty) && !isNull(prediction.away_penalty) &&
        Number(selectedMatch.home_penalty_score) === Number(prediction.home_penalty) &&
        Number(selectedMatch.away_penalty_score) === Number(prediction.away_penalty);

    if (actualWinner && predictedWinner && actualWinner !== predictedWinner) {
        return "bg-rose-950 border-rose-700";
    }
    if (exactScore || scorerMatch || penaltyMatch || exactPenalty || (actualWinner && predictedWinner && actualWinner === predictedWinner)) {
        return "bg-emerald-950 border-emerald-700";
    }
    return "";
}

function getPredictionScoreLineClass(prediction) {
    if (hasExactScoreMatch(prediction)) {
        return "text-emerald-300";
    }

    if (!isNull(selectedMatch.home_score) && !isNull(selectedMatch.away_score) &&
        !isNull(prediction.home_score) && !isNull(prediction.away_score)) {
        return "text-rose-300";
    }

    return "text-slate-300";
}

function getPredictionPenaltyLineClass(prediction) {
    if (isNull(selectedMatch.home_penalty_score) || isNull(selectedMatch.away_penalty_score) ||
        isNull(prediction.home_penalty) || isNull(prediction.away_penalty)) {
        return "text-sky-400";
    }
    const exactPenalty = Number(selectedMatch.home_penalty_score) === Number(prediction.home_penalty) &&
        Number(selectedMatch.away_penalty_score) === Number(prediction.away_penalty);
    if (exactPenalty || anyPenaltyScorerMatch(prediction)) {
        return "text-emerald-300";
    }
    return "text-rose-300";
}

function renderPredictionScore(prediction) {
    const home = getTeam(selectedMatch.home_team_id) || {};
    const away = getTeam(selectedMatch.away_team_id) || {};
    const lineClass = getPredictionScoreLineClass(prediction);

    return `
        <div class="mt-3 flex flex-wrap items-center justify-start gap-2 text-sm ${lineClass}">
            <span class="font-semibold">${escapeHtml(home.fifa_code || selectedMatch.home_team_name_en)}</span>
            <span class="font-bold">${prediction.home_score ?? "-"} - ${prediction.away_score ?? "-"}</span>
            <span class="font-semibold">${escapeHtml(away.fifa_code || selectedMatch.away_team_name_en)}</span>
        </div>`;
}

function renderPredictions() {
    predictionContainer.innerHTML = "";
    predictionCount.textContent = `${predictions.length} ${predictions.length === 1 ? "Player" : "Players"}`;

    if (!predictions.length) {
        predictionContainer.innerHTML = `<div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">No prediction submitted yet.</div>`;
        return;
    }

    const homeTeam = getTeam(selectedMatch.home_team_id) || {};
    const awayTeam = getTeam(selectedMatch.away_team_id) || {};

    predictions.slice().sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0)).forEach(prediction => {
        const cardClass = getPredictionCardClass(prediction);
        predictionContainer.innerHTML += `
            <article class="prediction-card ${cardClass}">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h3 class="text-lg font-semibold ${getPredictionOutcomeClass(prediction)}">${escapeHtml(prediction.player)}</h3>
                        ${renderPredictionScore(prediction)}
                    </div>
                    <div class="rounded-2xl bg-slate-800 px-3 py-2 text-center">
                        <div class="text-2xl font-black text-sky-400">${Number(prediction.points) || 0}</div>
                        <div class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Points</div>
                    </div>
                </div>
                ${renderPredictionScorers(prediction)}
                ${renderPredictionPenalty(prediction)}
            </article>`;
    });
}

function renderPredictionScorers(prediction) {
    const home = parseList(prediction.home_scorers);
    const away = parseList(prediction.away_scorers);
    let html = "";

    if (home.length) {
        html += `<div class="mt-3"><div class="mb-2 font-semibold text-emerald-400">${escapeHtml(selectedMatch.home_team_name_en)}</div>${home.map(name => `<div class="mb-1">⚽ ${escapeHtml(name)}</div>`).join("")}</div>`;
    }

    if (away.length) {
        html += `<div class="mt-3"><div class="mb-2 font-semibold text-emerald-400">${escapeHtml(selectedMatch.away_team_name_en)}</div>${away.map(name => `<div class="mb-1">⚽ ${escapeHtml(name)}</div>`).join("")}</div>`;
    }

    return html;
}

function renderPredictionPenalty(prediction) {
    if (isNull(prediction.home_penalty) && isNull(prediction.away_penalty)) return "";

    const home = parseList(prediction.home_penalty_scorers);
    const away = parseList(prediction.away_penalty_scorers);
    const penaltyClass = getPredictionPenaltyLineClass(prediction);

    return `
        <div class="mt-4 border-t border-slate-700 pt-4">
            <div class="mb-2 font-semibold text-slate-100">Penalty Shootout</div>
            <div class="mb-3 text-sm ${penaltyClass}">${escapeHtml(selectedMatch.home_team_name_en)} ${prediction.home_penalty ?? "-"} - ${prediction.away_penalty ?? "-"} ${escapeHtml(selectedMatch.away_team_name_en)}</div>
            <div class="grid gap-4 md:grid-cols-2">
                <div>${home.map(name => `<div class="mb-1 ${penaltyClass}">✓ ${escapeHtml(name)}</div>`).join("")}</div>
                <div>${away.map(name => `<div class="mb-1 ${penaltyClass}">✓ ${escapeHtml(name)}</div>`).join("")}</div>
            </div>
        </div>`;
}

function renderLeaderboard() {

    console.log("Rendering leaderboard", leaderboard);

    const visible = leaderboardExpanded
        ? leaderboard
        : leaderboard.slice(0, 5);

    leaderboardBtn.textContent =
        leaderboardExpanded ? "Show Less" : "View All";

    leaderboardContainer.innerHTML = "";

    visible.forEach((player, index) => {

        leaderboardContainer.innerHTML += `
        <div class="mb-2 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">

            <div class="flex items-center gap-3">

                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold">
                    ${index + 1}
                </div>

                <div class="font-semibold">
                    ${player.player}
                </div>

            </div>

            <div class="text-lg font-black text-sky-400">

                ${player.total_points}

            </div>

        </div>
        `;

    });

}

roundSelect.addEventListener("change", () => {
    selectedRound = roundSelect.value;
    renderMatchDropdown();
});

matchSelect.addEventListener("change", () => {
    selectedMatch = matches.find(match => String(match.id) === matchSelect.value) || null;
    renderCurrentMatch();
});

leaderboardBtn.addEventListener("click", () => {
    leaderboardExpanded = !leaderboardExpanded;
    renderLeaderboard();
});

showLeaderboardBtn.addEventListener("click", () => {
    leaderboardMode = !leaderboardMode;
    updateViewMode();
    if (leaderboardMode) {
        renderLeaderboard();
    }
});

setInterval(async () => {
    try {
        const latest = await request(`${WORLD_CUP_API}/games`);
        matches = (latest.games || []).filter(match => KNOCKOUT_ROUNDS.includes(match.type));
        if (selectedMatch) {
            const currentMatch = matches.find(match => String(match.id) === String(selectedMatch.id));
            if (currentMatch) {
                selectedMatch = currentMatch;
                renderCurrentMatch();
            }
        }
    } catch (error) {
        console.log("Auto-refresh skipped", error);
    }
}, 300000);

loadData();
