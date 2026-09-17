// ============================================================
// SUPABASE CONFIG — fill these in after creating your project
// Supabase Dashboard -> Project Settings -> API
// ============================================================
const SUPABASE_URL = "https://sittasodwwpnnrrqdgkh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_enxZMkyuLJpZdqpYJfra9Q_30wn_fqV";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Points awarded per win, by sport (badminton has no draws)
const POINTS_PER_WIN = { football: 3, badminton: 1 };

const ROUND_NAMES = {
  1: "Round 1", 2: "Round 2", 3: "Round 3", 4: "Round 4", 5: "Round 5",
  6: "Round 6", 7: "Round 7", 8: "Round 8", 9: "Round 9",
  10: "Pre-Quarter Final", 11: "Semi-Final 1", 12: "Semi-Final 2", 13: "Final"
};

const DEFAULT_LOGO = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310b981'%3E%3Cpath d='M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z'/%3E%3C/svg%3E";

let currentSport = 'football'; // 'football' | 'badminton'
let cachedTeamsAll = [];       // all teams, both sports
let cachedMatchesAll = [];     // all matches, both sports
let cachedTeamsMap = {};       // id -> logo (for quick lookup)
let cachedMatchesMap = {};     // id -> match row
let lastSelectedRound = localStorage.getItem('lastSelectedRound') || null;
let isAdmin = false;

function teamsForSport(sport) { return cachedTeamsAll.filter(t => t.sport === sport); }
function matchesForSport(sport) { return cachedMatchesAll.filter(m => m.sport === sport); }

function renderLogoTag(url, className = "team-logo") {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return `<img src="${DEFAULT_LOGO}" class="${className}">`;
  }
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('data:')) {
    return `<img src="${cleanUrl}" class="${className}">`;
  }
  return `<img src="${cleanUrl}" class="${className}" onerror="if(!this.dataset.retried){this.dataset.retried=true;this.src='https://corsproxy.io/?'+encodeURIComponent('${cleanUrl}');}else{this.onerror=null;this.src='${DEFAULT_LOGO}';}">`;
}

// ============================================================
// Navigation & Page Handling
// ============================================================
const navStandings = document.getElementById('navStandings');
const navMatches = document.getElementById('navMatches');
const navResults = document.getElementById('navResults');

const pageStandings = document.getElementById('pageStandings');
const pageMatches = document.getElementById('pageMatches');
const pageResults = document.getElementById('pageResults');
const pageAdmin = document.getElementById('pageAdmin');

const brandTitle = document.getElementById('brandTitle');
const dashboardBtn = document.getElementById('dashboardBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

const editMatchModal = document.getElementById('editMatchModal');
const closeEditMatchModal = document.getElementById('closeEditMatchModal');
const editMatchForm = document.getElementById('editMatchForm');

const roundMatchesModal = document.getElementById('roundMatchesModal');
const closeRoundMatchesModal = document.getElementById('closeRoundMatchesModal');

const scoreModal = document.getElementById('scoreModal');
const closeScoreModal = document.getElementById('closeScoreModal');
const cancelScoreBtn = document.getElementById('cancelScoreBtn');
const scoreModalForm = document.getElementById('scoreModalForm');

const bmScoreModal = document.getElementById('bmScoreModal');
const closeBmScoreModal = document.getElementById('closeBmScoreModal');
const bmCancelScoreBtn = document.getElementById('bmCancelScoreBtn');
const bmScoreModalForm = document.getElementById('bmScoreModalForm');

function switchPage(activePage, activeNav = null) {
  [pageStandings, pageMatches, pageResults, pageAdmin].forEach(p => p?.classList.remove('active'));
  [navStandings, navMatches, navResults].forEach(n => n?.classList.remove('active'));
  if (activePage) activePage.classList.add('active');
  if (activeNav) activeNav.classList.add('active');
}

if (navStandings) navStandings.addEventListener('click', () => { switchPage(pageStandings, navStandings); renderAll(); });
if (navMatches) navMatches.addEventListener('click', () => { switchPage(pageMatches, navMatches); renderAll(); });
if (navResults) navResults.addEventListener('click', () => { switchPage(pageResults, navResults); renderAll(); });

// ============================================================
// Sport Tabs
// ============================================================
document.querySelectorAll('.sport-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sport-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSport = btn.dataset.sport;
    updateSportLabels();
    renderAll();
  });
});

function updateSportLabels() {
  const isFootball = currentSport === 'football';
  document.getElementById('standingsTitle').textContent = isFootball ? 'League Table' : 'Standings';
  document.getElementById('colGF').textContent = isFootball ? 'GF' : 'GW';
  document.getElementById('colGA').textContent = isFootball ? 'GA' : 'GL';
  document.getElementById('colDraw').style.display = isFootball ? '' : 'none';
  document.querySelectorAll('#leagueTableBody td:nth-child(4)').forEach(td => td.style.display = isFootball ? '' : 'none');
  document.getElementById('adminSportTag').textContent = isFootball ? 'Football' : 'Badminton';
}

// ============================================================
// 3-Tap Admin Trigger (on brand title)
// ============================================================
let tapCount = 0;
let tapTimer = null;
if (brandTitle) {
  brandTitle.addEventListener('click', () => {
    tapCount++;
    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 1200);

    if (tapCount >= 3) {
      tapCount = 0;
      clearTimeout(tapTimer);
      if (isAdmin) {
        switchPage(pageAdmin);
      } else {
        loginModal?.classList.remove('hidden');
      }
    }
  });
}

if (dashboardBtn) {
  dashboardBtn.addEventListener('click', () => switchPage(pageAdmin));
}

if (closeModal) closeModal.addEventListener('click', () => loginModal?.classList.add('hidden'));
if (closeEditMatchModal) closeEditMatchModal.addEventListener('click', () => editMatchModal?.classList.add('hidden'));
if (closeRoundMatchesModal) closeRoundMatchesModal.addEventListener('click', () => roundMatchesModal?.classList.add('hidden'));
if (closeScoreModal) closeScoreModal.addEventListener('click', () => scoreModal?.classList.add('hidden'));
if (cancelScoreBtn) cancelScoreBtn.addEventListener('click', () => scoreModal?.classList.add('hidden'));
if (closeBmScoreModal) closeBmScoreModal.addEventListener('click', () => bmScoreModal?.classList.add('hidden'));
if (bmCancelScoreBtn) bmCancelScoreBtn.addEventListener('click', () => bmScoreModal?.classList.add('hidden'));

// ============================================================
// Auth
// ============================================================
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return alert("Login Failed: " + error.message);

    loginModal?.classList.add('hidden');
    switchPage(pageAdmin);
    loginForm.reset();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    switchPage(pageStandings, navStandings);
  });
}

sb.auth.onAuthStateChange((_event, session) => {
  isAdmin = !!session;
  dashboardBtn?.classList.toggle('hidden', !isAdmin);
  if (!isAdmin && pageAdmin?.classList.contains('active')) {
    switchPage(pageStandings, navStandings);
  }
});

// ============================================================
// Theme Toggle
// ============================================================
const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => document.body.classList.toggle('light-mode'));
}

// ============================================================
// Data Loading (initial fetch + realtime refresh)
// ============================================================
async function fetchAllData() {
  const [{ data: teams, error: tErr }, { data: matches, error: mErr }] = await Promise.all([
    sb.from('teams').select('*'),
    sb.from('matches').select('*')
  ]);
  if (tErr) return console.error(tErr);
  if (mErr) return console.error(mErr);

  cachedTeamsAll = teams || [];
  cachedMatchesAll = matches || [];
  cachedTeamsMap = {};
  cachedMatchesMap = {};
  cachedTeamsAll.forEach(t => cachedTeamsMap[t.id] = t.logo || '');
  cachedMatchesAll.forEach(m => cachedMatchesMap[m.id] = m);

  renderAll();
}

function renderAll() {
  const teams = teamsForSport(currentSport);
  const matches = matchesForSport(currentSport);

  const sorted = [...teams].sort((a, b) => {
    const gdA = (a.gf || 0) - (a.ga || 0);
    const gdB = (b.gf || 0) - (b.ga || 0);
    if ((b.pts || 0) !== (a.pts || 0)) return (b.pts || 0) - (a.pts || 0);
    if (gdB !== gdA) return gdB - gdA;
    return (b.gf || 0) - (a.gf || 0);
  });

  renderTable(sorted);
  populateSelects(sorted);
  renderAdminTeams(sorted);
  renderUpcomingView(matches.filter(m => m.status === 'upcoming'));
  renderResultsView(matches.filter(m => m.status === 'completed'));
  renderAdminRoundGroups(matches);
}

sb.channel('public:teams')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchAllData)
  .subscribe();

sb.channel('public:matches')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchAllData)
  .subscribe();

// ============================================================
// Standings Table
// ============================================================
function renderTable(teams) {
  const body = document.getElementById('leagueTableBody');
  if (!body) return;
  const isFootball = currentSport === 'football';
  body.innerHTML = '';
  teams.forEach((team, index) => {
    const mp = (team.w || 0) + (team.d || 0) + (team.l || 0);
    const gd = (team.gf || 0) - (team.ga || 0);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="sticky-col club-cell">
        <span class="rank-num">${index + 1}</span>
        ${renderLogoTag(team.logo)}
        <span>${team.name}</span>
      </td>
      <td>${mp}</td>
      <td>${team.w || 0}</td>
      <td style="${isFootball ? '' : 'display:none'}">${team.d || 0}</td>
      <td>${team.l || 0}</td>
      <td>${team.gf || 0}</td>
      <td>${team.ga || 0}</td>
      <td>${gd > 0 ? '+' + gd : gd}</td>
      <td class="highlight-col">${team.pts || 0}</td>
    `;
    body.appendChild(row);
  });
}

function populateSelects(teams) {
  const homeSelect = document.getElementById('homeTeamSelect');
  const awaySelect = document.getElementById('awayTeamSelect');
  const editHomeSelect = document.getElementById('editHomeTeamSelect');
  const editAwaySelect = document.getElementById('editAwayTeamSelect');
  const roundSelect = document.getElementById('roundSelect');

  const options = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  if (homeSelect) homeSelect.innerHTML = '<option value="" disabled selected>Select Home Team</option>' + options;
  if (awaySelect) awaySelect.innerHTML = '<option value="" disabled selected>Select Away Team</option>' + options;
  if (editHomeSelect) editHomeSelect.innerHTML = options;
  if (editAwaySelect) editAwaySelect.innerHTML = options;
  if (roundSelect && lastSelectedRound) roundSelect.value = lastSelectedRound;
}

const roundSelectElemGlobal = document.getElementById('roundSelect');
if (roundSelectElemGlobal) {
  roundSelectElemGlobal.addEventListener('change', (e) => {
    lastSelectedRound = e.target.value;
    localStorage.setItem('lastSelectedRound', lastSelectedRound);
  });
}

// ============================================================
// Add Team
// ============================================================
const addTeamForm = document.getElementById('addTeamForm');
if (addTeamForm) {
  addTeamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('teamNameInput').value.trim();
    const logo = document.getElementById('teamLogoInput').value.trim();
    e.target.reset();

    const { error } = await sb.from('teams').insert({
      sport: currentSport, name, logo, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
    });
    if (error) alert(error.message);
  });
}

// ============================================================
// Schedule Match
// ============================================================
const scheduleMatchForm = document.getElementById('scheduleMatchForm');
if (scheduleMatchForm) {
  scheduleMatchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roundSelectElem = document.getElementById('roundSelect');
    const round = parseInt(roundSelectElem.value);
    const matchNumber = parseInt(document.getElementById('matchNumberInput').value);
    const homeId = document.getElementById('homeTeamSelect').value;
    const awayId = document.getElementById('awayTeamSelect').value;

    if (homeId === awayId) return alert("Home and Away teams must be different!");

    const existing = matchesForSport(currentSport).find(m => m.round === round && m.match_number === matchNumber);
    if (existing) return alert(`Match No. ${matchNumber} is already created in ${ROUND_NAMES[round] || 'Round ' + round}!`);

    lastSelectedRound = round.toString();
    localStorage.setItem('lastSelectedRound', lastSelectedRound);

    const homeTeam = cachedTeamsAll.find(t => t.id === homeId);
    const awayTeam = cachedTeamsAll.find(t => t.id === awayId);

    document.getElementById('matchNumberInput').value = matchNumber + 1;
    document.getElementById('homeTeamSelect').selectedIndex = 0;
    document.getElementById('awayTeamSelect').selectedIndex = 0;
    roundSelectElem.value = lastSelectedRound;

    const { error } = await sb.from('matches').insert({
      sport: currentSport,
      round,
      match_number: matchNumber,
      home_id: homeId,
      home_name: homeTeam?.name || "Home Team",
      away_id: awayId,
      away_name: awayTeam?.name || "Away Team",
      status: 'upcoming'
    });
    if (error) alert(error.message);
  });
}

// ============================================================
// Matches & Results Rendering
// ============================================================
function groupByRound(list) {
  return list.reduce((acc, m) => {
    if (m && m.round) { acc[m.round] = acc[m.round] || []; acc[m.round].push(m); }
    return acc;
  }, {});
}

function renderUpcomingView(upcomingMatches) {
  const container = document.getElementById('upcomingRoundsContainer');
  if (!container) return;
  container.innerHTML = '';
  const grouped = groupByRound(upcomingMatches);
  const rounds = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  if (rounds.length === 0) { container.innerHTML = '<p class="empty-msg">No upcoming matches scheduled.</p>'; return; }

  rounds.forEach(r => {
    const roundSection = document.createElement('div');
    roundSection.className = 'round-block';
    roundSection.innerHTML = `<h3 class="round-title">${ROUND_NAMES[r] || 'Round ' + r}</h3>`;
    const matchGroup = (grouped[r] || []).sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
    matchGroup.forEach(m => {
      const hLogo = cachedTeamsMap[m.home_id] || '';
      const aLogo = cachedTeamsMap[m.away_id] || '';
      roundSection.innerHTML += `
        <div class="match-card">
          <span class="match-num-tag">Match #${m.match_number || '?'}</span>
          <div class="match-team home">${renderLogoTag(hLogo)}<span>${m.home_name || 'Home'}</span></div>
          <span class="vs-tag">VS</span>
          <div class="match-team away"><span>${m.away_name || 'Away'}</span>${renderLogoTag(aLogo)}</div>
        </div>`;
    });
    container.appendChild(roundSection);
  });
}

function renderResultsView(completedMatches) {
  const container = document.getElementById('resultsRoundsContainer');
  if (!container) return;
  container.innerHTML = '';
  const grouped = groupByRound(completedMatches);
  const rounds = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  if (rounds.length === 0) { container.innerHTML = '<p class="empty-msg">No completed matches yet.</p>'; return; }

  rounds.forEach(r => {
    const roundSection = document.createElement('div');
    roundSection.className = 'round-block';
    roundSection.innerHTML = `<h3 class="round-title">${ROUND_NAMES[r] || 'Round ' + r}</h3>`;
    const matchGroup = (grouped[r] || []).sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
    matchGroup.forEach(m => {
      const hLogo = cachedTeamsMap[m.home_id] || '';
      const aLogo = cachedTeamsMap[m.away_id] || '';
      const scoreLabel = `${m.home_score ?? 0} - ${m.away_score ?? 0}`;
      roundSection.innerHTML += `
        <div class="match-card">
          <span class="match-num-tag">Match #${m.match_number || '?'}</span>
          <div class="match-team home">${renderLogoTag(hLogo)}<span>${m.home_name || 'Home'}</span></div>
          <span class="match-score-badge">${scoreLabel}</span>
          <div class="match-team away"><span>${m.away_name || 'Away'}</span>${renderLogoTag(aLogo)}</div>
        </div>`;
    });
    container.appendChild(roundSection);
  });
}

// ============================================================
// Admin: Round Groups + Round Modal
// ============================================================
function renderAdminRoundGroups(allMatches) {
  const upcomingContainer = document.getElementById('adminUpcomingRoundsList');
  const completedContainer = document.getElementById('adminCompletedRoundsList');
  if (!upcomingContainer || !completedContainer) return;
  upcomingContainer.innerHTML = '';
  completedContainer.innerHTML = '';

  const upcoming = allMatches.filter(m => m.status === 'upcoming');
  const completed = allMatches.filter(m => m.status === 'completed');
  const upcomingGrouped = groupByRound(upcoming);
  const completedGrouped = groupByRound(completed);

  const upcomingRounds = Object.keys(upcomingGrouped).map(Number).sort((a, b) => a - b);
  if (upcomingRounds.length === 0) {
    upcomingContainer.innerHTML = '<p class="empty-msg-sm">No scheduled upcoming matches.</p>';
  } else {
    upcomingRounds.forEach(r => {
      const count = (upcomingGrouped[r] || []).length;
      const btn = document.createElement('button');
      btn.className = 'round-group-card';
      btn.innerHTML = `<strong>${ROUND_NAMES[r] || 'Round ' + r}</strong> <span>${count} Match${count > 1 ? 'es' : ''}</span>`;
      btn.onclick = () => openRoundMatchesModal(r, 'upcoming');
      upcomingContainer.appendChild(btn);
    });
  }

  const completedRounds = Object.keys(completedGrouped).map(Number).sort((a, b) => a - b);
  if (completedRounds.length === 0) {
    completedContainer.innerHTML = '<p class="empty-msg-sm">No completed matches.</p>';
  } else {
    completedRounds.forEach(r => {
      const count = (completedGrouped[r] || []).length;
      const btn = document.createElement('button');
      btn.className = 'round-group-card completed';
      btn.innerHTML = `<strong>${ROUND_NAMES[r] || 'Round ' + r}</strong> <span>${count} Result${count > 1 ? 's' : ''}</span>`;
      btn.onclick = () => openRoundMatchesModal(r, 'completed');
      completedContainer.appendChild(btn);
    });
  }
}

window.openRoundMatchesModal = function (roundNumber, statusType) {
  const roundTitle = ROUND_NAMES[roundNumber] || 'Round ' + roundNumber;
  const titleElem = document.getElementById('roundModalTitle');
  if (titleElem) titleElem.innerText = `${roundTitle} (${statusType.toUpperCase()})`;

  const filteredMatches = matchesForSport(currentSport)
    .filter(m => parseInt(m.round) === parseInt(roundNumber) && m.status === statusType)
    .sort((a, b) => (a.match_number || 0) - (b.match_number || 0));

  const listContainer = document.getElementById('roundMatchesList');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (filteredMatches.length === 0) {
    listContainer.innerHTML = '<p class="empty-msg-sm">No matches found in this round.</p>';
  } else {
    filteredMatches.forEach(m => {
      const row = document.createElement('div');
      row.className = 'admin-team-row';

      if (statusType === 'upcoming') {
        row.innerHTML = `
          <div class="admin-team-info"><span><strong>[Match #${m.match_number}]</strong> ${m.home_name} vs ${m.away_name}</span></div>
          <div class="admin-team-actions">
            <button class="btn-primary-sm" onclick="openScoreEntry('${m.id}')">Score</button>
            <button class="btn-edit" onclick="openEditMatchModal('${m.id}')">Edit</button>
            <button class="btn-delete" onclick="deleteMatch('${m.id}')">Delete</button>
          </div>`;
      } else {
        const scoreLabel = `${m.home_score} - ${m.away_score}`;
        row.innerHTML = `
          <div class="admin-team-info"><span><strong>[Match #${m.match_number}]</strong> ${m.home_name} ${scoreLabel} ${m.away_name}</span></div>
          <div class="admin-team-actions">
            <button class="btn-edit" onclick="openScoreEntry('${m.id}')">Edit Score</button>
            <button class="btn-delete" onclick="deleteCompletedMatch('${m.id}')">Delete</button>
          </div>`;
      }
      listContainer.appendChild(row);
    });
  }
  roundMatchesModal?.classList.remove('hidden');
};

// Routes to the right score modal depending on the current sport
window.openScoreEntry = function (matchId) {
  if (currentSport === 'football') openCustomScoreModal(matchId);
  else openBmScoreModal(matchId);
};

// ============================================================
// Football Score Entry
// ============================================================
window.openCustomScoreModal = function (matchId) {
  const match = cachedMatchesMap[matchId];
  if (!match) return;
  const hLogo = cachedTeamsMap[match.home_id] || '';
  const aLogo = cachedTeamsMap[match.away_id] || '';

  document.getElementById('scoreMatchId').value = matchId;
  document.getElementById('scoreHomeName').innerText = match.home_name || 'Home';
  document.getElementById('scoreAwayName').innerText = match.away_name || 'Away';
  document.getElementById('scoreHomeLogoContainer').innerHTML = renderLogoTag(hLogo);
  document.getElementById('scoreAwayLogoContainer').innerHTML = renderLogoTag(aLogo);
  document.getElementById('homeScoreInput').value = match.home_score ?? '';
  document.getElementById('awayScoreInput').value = match.away_score ?? '';

  scoreModal?.classList.remove('hidden');
};

if (scoreModalForm) {
  scoreModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const matchId = document.getElementById('scoreMatchId').value;
    const homeScore = parseInt(document.getElementById('homeScoreInput').value);
    const awayScore = parseInt(document.getElementById('awayScoreInput').value);
    if (isNaN(homeScore) || isNaN(awayScore)) return alert("Please enter valid numerical scores.");

    scoreModal?.classList.add('hidden');
    const { error } = await sb.from('matches').update({
      status: 'completed', home_score: homeScore, away_score: awayScore
    }).eq('id', matchId);
    if (error) return alert("Error saving score: " + error.message);
    await recalculateAllTeamStats('football');
  });
}

// ============================================================
// Badminton Score Entry (best of 3 games)
// ============================================================
window.openBmScoreModal = function (matchId) {
  const match = cachedMatchesMap[matchId];
  if (!match) return;

  document.getElementById('bmScoreMatchId').value = matchId;
  document.getElementById('bmHomeName').innerText = match.home_name || 'Home';
  document.getElementById('bmAwayName').innerText = match.away_name || 'Away';
  document.getElementById('bmG1Home').value = match.game1_home ?? '';
  document.getElementById('bmG1Away').value = match.game1_away ?? '';
  document.getElementById('bmG2Home').value = match.game2_home ?? '';
  document.getElementById('bmG2Away').value = match.game2_away ?? '';
  document.getElementById('bmG3Home').value = match.game3_home ?? '';
  document.getElementById('bmG3Away').value = match.game3_away ?? '';
  document.getElementById('bmWinnerPreview').textContent = '';

  bmScoreModal?.classList.remove('hidden');
};

function computeBadmintonResult(g1h, g1a, g2h, g2a, g3h, g3a) {
  const games = [[g1h, g1a], [g2h, g2a], [g3h, g3a]].filter(([h, a]) => !isNaN(h) && !isNaN(a));
  if (games.length < 2) return { valid: false, error: "Enter at least Game 1 and Game 2." };

  let homeWins = 0, awayWins = 0;
  for (const [h, a] of games) {
    if (h === a) return { valid: false, error: "A game cannot end in a tie." };
    if (h > a) homeWins++; else awayWins++;
  }
  if (homeWins < 2 && awayWins < 2) return { valid: false, error: "Enter Game 3 — the match isn't decided yet." };

  return { valid: true, homeGamesWon: homeWins, awayGamesWon: awayWins };
}

if (bmScoreModalForm) {
  ['bmG1Home', 'bmG1Away', 'bmG2Home', 'bmG2Away', 'bmG3Home', 'bmG3Away'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      const g1h = parseInt(document.getElementById('bmG1Home').value);
      const g1a = parseInt(document.getElementById('bmG1Away').value);
      const g2h = parseInt(document.getElementById('bmG2Home').value);
      const g2a = parseInt(document.getElementById('bmG2Away').value);
      const g3h = parseInt(document.getElementById('bmG3Home').value);
      const g3a = parseInt(document.getElementById('bmG3Away').value);
      const result = computeBadmintonResult(g1h, g1a, g2h, g2a, g3h, g3a);
      const preview = document.getElementById('bmWinnerPreview');
      preview.textContent = result.valid
        ? `Games: ${result.homeGamesWon} - ${result.awayGamesWon}`
        : (result.error || '');
    });
  });

  bmScoreModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const matchId = document.getElementById('bmScoreMatchId').value;
    const g1h = parseInt(document.getElementById('bmG1Home').value);
    const g1a = parseInt(document.getElementById('bmG1Away').value);
    const g2h = parseInt(document.getElementById('bmG2Home').value);
    const g2a = parseInt(document.getElementById('bmG2Away').value);
    const g3hRaw = document.getElementById('bmG3Home').value;
    const g3aRaw = document.getElementById('bmG3Away').value;
    const g3h = g3hRaw === '' ? NaN : parseInt(g3hRaw);
    const g3a = g3aRaw === '' ? NaN : parseInt(g3aRaw);

    const result = computeBadmintonResult(g1h, g1a, g2h, g2a, g3h, g3a);
    if (!result.valid) return alert(result.error);

    const match = cachedMatchesMap[matchId];
    const winnerId = result.homeGamesWon > result.awayGamesWon ? match.home_id : match.away_id;

    bmScoreModal?.classList.add('hidden');
    const { error } = await sb.from('matches').update({
      status: 'completed',
      game1_home: g1h, game1_away: g1a,
      game2_home: g2h, game2_away: g2a,
      game3_home: isNaN(g3h) ? null : g3h,
      game3_away: isNaN(g3a) ? null : g3a,
      home_score: result.homeGamesWon,
      away_score: result.awayGamesWon,
      winner_id: winnerId
    }).eq('id', matchId);
    if (error) return alert("Error saving result: " + error.message);
    await recalculateAllTeamStats('badminton');
  });
}

// ============================================================
// Edit Match
// ============================================================
window.openEditMatchModal = function (matchId) {
  const match = cachedMatchesMap[matchId];
  if (!match) return;
  document.getElementById('editMatchId').value = matchId;
  document.getElementById('editRoundSelect').value = match.round;
  document.getElementById('editMatchNumberInput').value = match.match_number;
  document.getElementById('editHomeTeamSelect').value = match.home_id;
  document.getElementById('editAwayTeamSelect').value = match.away_id;
  editMatchModal?.classList.remove('hidden');
};

if (editMatchForm) {
  editMatchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const matchId = document.getElementById('editMatchId').value;
    const round = parseInt(document.getElementById('editRoundSelect').value);
    const matchNumber = parseInt(document.getElementById('editMatchNumberInput').value);
    const homeId = document.getElementById('editHomeTeamSelect').value;
    const awayId = document.getElementById('editAwayTeamSelect').value;

    if (homeId === awayId) return alert("Home and Away teams must be different!");

    const existing = matchesForSport(currentSport).find(m => m.round === round && m.match_number === matchNumber && m.id !== matchId);
    if (existing) return alert(`Match No. ${matchNumber} already exists in ${ROUND_NAMES[round] || 'Round ' + round}!`);

    const homeTeam = cachedTeamsAll.find(t => t.id === homeId);
    const awayTeam = cachedTeamsAll.find(t => t.id === awayId);
    editMatchModal?.classList.add('hidden');

    const { error } = await sb.from('matches').update({
      round, match_number: matchNumber,
      home_id: homeId, home_name: homeTeam?.name || "Home Team",
      away_id: awayId, away_name: awayTeam?.name || "Away Team"
    }).eq('id', matchId);
    if (error) alert("Failed to update match: " + error.message);
  });
}

// ============================================================
// Stats Recalculation (shared logic, scoped by sport)
// ============================================================
async function recalculateAllTeamStats(sport) {
  const [{ data: teamsData, error: tErr }, { data: matchesData, error: mErr }] = await Promise.all([
    sb.from('teams').select('id').eq('sport', sport),
    sb.from('matches').select('*').eq('sport', sport).eq('status', 'completed')
  ]);
  if (tErr || mErr) return console.error(tErr || mErr);

  const pointsPerWin = POINTS_PER_WIN[sport] || 3;
  const statsMap = {};
  teamsData.forEach(t => statsMap[t.id] = { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });

  matchesData.forEach(m => {
    if (sport === 'football' && parseInt(m.round) > 9) return; // knockout rounds excluded from table, matches original behavior
    const hId = m.home_id, aId = m.away_id;
    const hScore = m.home_score ?? 0, aScore = m.away_score ?? 0;
    if (!statsMap[hId] || !statsMap[aId]) return;

    statsMap[hId].gf += hScore; statsMap[hId].ga += aScore;
    statsMap[aId].gf += aScore; statsMap[aId].ga += hScore;

    if (hScore > aScore) {
      statsMap[hId].w += 1; statsMap[hId].pts += pointsPerWin; statsMap[aId].l += 1;
    } else if (aScore > hScore) {
      statsMap[aId].w += 1; statsMap[aId].pts += pointsPerWin; statsMap[hId].l += 1;
    } else if (sport === 'football') {
      statsMap[hId].d += 1; statsMap[hId].pts += 1;
      statsMap[aId].d += 1; statsMap[aId].pts += 1;
    }
  });

  await Promise.all(Object.keys(statsMap).map(id =>
    sb.from('teams').update(statsMap[id]).eq('id', id)
  ));
}

// ============================================================
// Revert / Delete Matches
// ============================================================
window.deleteCompletedMatch = function (matchId) {
  const currentMatch = cachedMatchesMap[matchId];
  if (!currentMatch) return;
  if (!confirm(`Revert match #${currentMatch.match_number} (${currentMatch.home_name} vs ${currentMatch.away_name}) back to Upcoming?`)) return;

  const sport = currentMatch.sport;
  sb.from('matches').update({
    status: 'upcoming',
    home_score: null, away_score: null,
    game1_home: null, game1_away: null, game2_home: null, game2_away: null,
    game3_home: null, game3_away: null, winner_id: null
  }).eq('id', matchId).then(({ error }) => {
    if (error) return alert("Failed to revert match: " + error.message);
    roundMatchesModal?.classList.add('hidden');
    recalculateAllTeamStats(sport);
  });
};

window.deleteMatch = function (id) {
  const currentMatch = cachedMatchesMap[id];
  if (!currentMatch) return;
  if (!confirm(`Permanently delete scheduled Match #${currentMatch.match_number} (${currentMatch.home_name} vs ${currentMatch.away_name})?`)) return;

  sb.from('matches').delete().eq('id', id).then(({ error }) => {
    if (error) return alert("Failed to delete match: " + error.message);
    roundMatchesModal?.classList.add('hidden');
  });
};

// ============================================================
// Manage Teams
// ============================================================
function renderAdminTeams(teams) {
  const list = document.getElementById('adminTeamsList');
  if (!list) return;
  list.innerHTML = '';
  teams.forEach(team => {
    list.innerHTML += `
      <div class="admin-team-row">
        <div class="admin-team-info">${renderLogoTag(team.logo)}<span>${team.name}</span></div>
        <div class="admin-team-actions">
          <button class="btn-edit" onclick="editTeam('${team.id}', '${team.name.replace(/'/g, "\\'")}', '${(team.logo || '').replace(/'/g, "\\'")}')">Edit</button>
          <button class="btn-delete" onclick="deleteTeam('${team.id}')">Delete</button>
        </div>
      </div>`;
  });
}

window.editTeam = function (id, name, logo) {
  const n = prompt("Edit Name:", name);
  const l = prompt("Edit Logo URL:", logo);
  if (n) sb.from('teams').update({ name: n.trim(), logo: l ? l.trim() : '' }).eq('id', id).then(({ error }) => { if (error) alert(error.message); });
};

window.deleteTeam = function (id) {
  const sport = cachedTeamsAll.find(t => t.id === id)?.sport || currentSport;
  if (confirm("Delete team?")) {
    sb.from('teams').delete().eq('id', id).then(({ error }) => {
      if (error) return alert(error.message);
      recalculateAllTeamStats(sport);
    });
  }
};

// ============================================================
// Audio Controls
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('entrance-audio');
  const toggleBtn = document.getElementById('music-toggle-btn');
  if (audio && toggleBtn) {
    let isStarted = false;
    const startAudio = () => {
      if (!isStarted) audio.play().then(() => { isStarted = true; toggleBtn.textContent = '🔊 Mute Music'; }).catch(() => {});
    };
    startAudio();
    const handleFirstInteraction = () => {
      if (!isStarted) startAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (audio.paused) { audio.play(); isStarted = true; toggleBtn.textContent = '🔊 Mute Music'; }
      else { audio.pause(); toggleBtn.textContent = '🔇 Play Music'; }
    });
  }
});

// ============================================================
// Init
// ============================================================
updateSportLabels();
fetchAllData();
