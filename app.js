'use strict';

// ══════════════════════════════════════════════════════
//  CONFIG  —  update BACKEND_URL after deploying Apps Script
// ══════════════════════════════════════════════════════
const CONFIG = {
  BACKEND_URL:      'https://script.google.com/a/macros/sam-media.com/s/AKfycbxjuCp1CSdBBEIlV3q4i8iQpCYwQ8bWBgR0381drxz6mfHNXBed11I0GgyOQlMIQr7X/exec',
  ADMIN_PASSWORD:   'worldcup2026',
  GOOGLE_CLIENT_ID: '978303214297-jrpmd7gbaick1s3mt539a67q3npep1e2.apps.googleusercontent.com',      // ← paste from Google Cloud Console
};


const MAX_POSSIBLE = 358; // 216 group + 93 knockout + 49 bonus

// ══════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════
const S = {
  user:             null,
  predictions:      {},   // { matchId: { home: n, away: n } }
  bonusPredictions: {},   // { questionId: value }
  koPredictions:    {},   // { r32: [{home,away,winner}…], … }
  allUsers:         [],
  allPredictions:   {},   // { userId: { group, bonus, ko } }
  results:          {},   // { matchId: { home, away } } + ko_* + bonus_*
  config:           { locked: {}, prizes: { p1:'TBA', p2:'TBA', p3:'TBA' } },
  activeTab:        'leaderboard',
  activeSub:        'group',
  activeGroup:      'A',
  activeKoRound:    'r32',
  adminGroup:       'A',
  adminKoRound:     'r32',
  adminUnlocked:    false,
  saveTimer:        null,
  backendOk:        false,
};

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  loadLocal();

  if (S.user) {
    closeModal();
    updateHeaderUser();
    document.getElementById('admin-tab').style.display = '';
  } else {
    openModal();
  }

  initGoogleSSO();   // set up SSO or show fallback
  bindNav();
  bindSubTabs();
  bindModal();
  bindAdmin();
  buildKoRoundTabs();
  buildAdminKoRoundTabs();

  renderActiveView();

  // Fetch remote data in background; re-render when ready
  await fetchRemote();
  renderActiveView();
});

// ══════════════════════════════════════════════════════
//  PERSISTENCE — local storage
// ══════════════════════════════════════════════════════
function loadLocal() {
  try {
    S.user             = JSON.parse(localStorage.getItem('wc26_user'))    || null;
    S.predictions      = JSON.parse(localStorage.getItem('wc26_preds'))   || {};
    S.bonusPredictions = JSON.parse(localStorage.getItem('wc26_bonus'))   || {};
    S.koPredictions    = JSON.parse(localStorage.getItem('wc26_ko'))      || {};
    S.results          = JSON.parse(localStorage.getItem('wc26_results')) || {};
    S.config           = JSON.parse(localStorage.getItem('wc26_config'))  || { locked: {}, prizes: { p1:'TBA', p2:'TBA', p3:'TBA' } };
    // Clear legacy users who signed in before SSO (they'll re-auth via Google)
    if (S.user && !S.user.email) S.user = null;
  } catch(e) { /* corrupted data — start fresh */ }
}

function saveLocal() {
  localStorage.setItem('wc26_user',    JSON.stringify(S.user));
  localStorage.setItem('wc26_preds',   JSON.stringify(S.predictions));
  localStorage.setItem('wc26_bonus',   JSON.stringify(S.bonusPredictions));
  localStorage.setItem('wc26_ko',      JSON.stringify(S.koPredictions));
  localStorage.setItem('wc26_results', JSON.stringify(S.results));
  localStorage.setItem('wc26_config',  JSON.stringify(S.config));
}

// ══════════════════════════════════════════════════════
//  PERSISTENCE — remote (Google Apps Script)
// ══════════════════════════════════════════════════════
function isBackendConfigured() {
  return CONFIG.BACKEND_URL && !CONFIG.BACKEND_URL.startsWith('YOUR_');
}

async function fetchRemote() {
  if (!isBackendConfigured()) return;
  try {
    const res  = await fetch(`${CONFIG.BACKEND_URL}?action=getAll`, { redirect: 'follow' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    S.backendOk      = true;
    S.allUsers       = data.users        || [];
    S.allPredictions = data.predictions  || {};
    S.results        = data.results      || {};
    S.config         = data.config       || S.config;

    // Merge: our local predictions might be newer than server
    if (S.user) {
      const server = S.allPredictions[S.user.id] || {};
      // keep local if server has nothing for us yet
      if (!server.group) server.group = S.predictions;
      if (!server.bonus) server.bonus = S.bonusPredictions;
      if (!server.ko)    server.ko    = S.koPredictions;
    }
    saveLocal();
  } catch(e) {
    console.warn('Remote fetch failed:', e.message);
  }
}

async function syncRemote() {
  if (!isBackendConfigured() || !S.user) return;
  setStatus('saving');
  try {
    const form = new FormData();
    form.append('action',  'sync');
    form.append('userId',  S.user.id);
    form.append('name',    S.user.name);
    form.append('color',   S.user.picture || S.user.color || '#7DC242');
    form.append('group',   JSON.stringify(S.predictions));
    form.append('bonus',   JSON.stringify(S.bonusPredictions));
    form.append('ko',      JSON.stringify(S.koPredictions));
    await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: form, redirect: 'follow' });
    setStatus('saved');
  } catch(e) {
    setStatus('error');
  }
}

async function syncRemoteConfig() {
  if (!isBackendConfigured()) return;
  const form = new FormData();
  form.append('action',  'saveConfig');
  form.append('payload', JSON.stringify(S.config));
  form.append('pw',      CONFIG.ADMIN_PASSWORD);
  await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: form, redirect: 'follow' });
}

async function syncRemoteResults() {
  if (!isBackendConfigured()) return;
  const form = new FormData();
  form.append('action',  'saveResults');
  form.append('payload', JSON.stringify(S.results));
  form.append('pw',      CONFIG.ADMIN_PASSWORD);
  await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: form, redirect: 'follow' });
}

function debouncedSave() {
  setStatus('saving');
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(() => {
    saveLocal();
    syncRemote();
  }, 1200);
}

// ══════════════════════════════════════════════════════
//  STATUS BAR
// ══════════════════════════════════════════════════════
function setStatus(state) {
  const el = document.getElementById('save-status');
  if (!el) return;
  const map = { saving: ['saving','Saving…'], saved: ['saved','✓ Saved'], error: ['error','⚠ Error'], idle: ['',''] };
  const [cls, txt] = map[state] || map.idle;
  el.className = `save-status ${cls}`;
  el.textContent = txt;
  if (state === 'saved') setTimeout(() => el.textContent = '', 3000);
}

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════
function bindNav() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  S.activeTab = tab;
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${tab}`));
  renderActiveView();
}

function bindSubTabs() {
  document.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      S.activeSub = btn.dataset.sub;
      document.querySelectorAll('.sub-tab').forEach(b => b.classList.toggle('active', b.dataset.sub === S.activeSub));
      document.querySelectorAll('.sub-view').forEach(v => v.classList.toggle('active', v.id === `sub-${S.activeSub}`));
      renderActiveSub();
    });
  });
}

function renderActiveView() {
  switch (S.activeTab) {
    case 'leaderboard':  renderLeaderboard(); break;
    case 'predictions':  renderActiveSub();   break;
    case 'bonus':        renderBonus();        break;
    case 'browse':       renderBrowse();       break;
    case 'admin':        renderAdmin();        break;
  }
}

function renderActiveSub() {
  if (S.activeSub === 'group')    renderGroupStage();
  if (S.activeSub === 'knockout') renderKnockout();
}

// ══════════════════════════════════════════════════════
//  SCORE CALCULATION ENGINE
// ══════════════════════════════════════════════════════
function calcScore(userId) {
  const isSelf = S.user && userId === S.user.id;
  const preds  = isSelf ? S.predictions      : (S.allPredictions[userId]?.group || {});
  const bonus  = isSelf ? S.bonusPredictions : (S.allPredictions[userId]?.bonus || {});
  const ko     = isSelf ? S.koPredictions    : (S.allPredictions[userId]?.ko    || {});

  let groupPts = 0, koPts = 0, bonusPts = 0;

  // Group stage
  WC.matches.forEach(m => {
    const p = preds[m.id];
    const r = S.results[m.id];
    if (!p || !r || r.home === '' || r.away === '') return;
    const ph = +p.home, pa = +p.away, rh = +r.home, ra = +r.away;
    if (ph === rh && pa === ra) {
      groupPts += WC.scoring.groupExact;
    } else if (Math.sign(ph - pa) === Math.sign(rh - ra)) {
      groupPts += WC.scoring.groupResult;
    }
  });

  // Knockout rounds
  WC.koRounds.forEach(round => {
    const rResults = S.results[`ko_${round.id}`] || [];
    const rPreds   = ko[round.id]                || [];
    rResults.forEach((res, i) => {
      if (!res?.winner) return;
      if (rPreds[i]?.winner === res.winner) koPts += round.pts;
    });
  });

  // Bonus questions
  WC.bonusQuestions.forEach(q => {
    const p = bonus[q.id];
    const r = S.results[`bonus_${q.id}`];
    if (!p || r === undefined || r === null || r === '') return;

    if (q.id === 'total_goals') {
      const diff = Math.abs(+p - +r);
      if (diff <= 3)  bonusPts += WC.scoring.bonus.total_goals_3;
      else if (diff <= 8)  bonusPts += WC.scoring.bonus.total_goals_8;
      else if (diff <= 15) bonusPts += WC.scoring.bonus.total_goals_15;
    } else if (q.id === 'red_card_final') {
      if (p === r) bonusPts += WC.scoring.bonus.red_card_final;
    } else {
      const key = q.id;
      const pts = WC.scoring.bonus[key] || 0;
      if (p.toString().toLowerCase() === r.toString().toLowerCase()) bonusPts += pts;
    }
  });

  return { group: groupPts, ko: koPts, bonus: bonusPts, total: groupPts + koPts + bonusPts };
}

function countFilled(userId) {
  const isSelf = S.user && userId === S.user.id;
  const preds = isSelf ? S.predictions : (S.allPredictions[userId]?.group || {});
  return WC.matches.filter(m => {
    const p = preds[m.id];
    return p && p.home !== undefined && p.away !== undefined;
  }).length;
}

function calcGroupStandings(groupId, userId) {
  const group = WC.groups.find(g => g.id === groupId);
  const isSelf = S.user && userId === S.user.id;
  const preds = isSelf ? S.predictions : (S.allPredictions[userId]?.group || {});

  const tbl = {};
  group.teams.forEach(c => { tbl[c] = { code: c, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });

  WC.matchesByGroup[groupId].forEach(m => {
    const p = preds[m.id];
    if (!p || p.home === undefined) return;
    const h = +p.home, a = +p.away;
    tbl[m.home].mp++; tbl[m.away].mp++;
    tbl[m.home].gf += h; tbl[m.home].ga += a;
    tbl[m.away].gf += a; tbl[m.away].ga += h;
    if (h > a) {
      tbl[m.home].w++; tbl[m.home].pts += 3; tbl[m.away].l++;
    } else if (h < a) {
      tbl[m.away].w++; tbl[m.away].pts += 3; tbl[m.home].l++;
    } else {
      tbl[m.home].d++; tbl[m.home].pts++;
      tbl[m.away].d++; tbl[m.away].pts++;
    }
  });

  return Object.values(tbl).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga);
    return b.gf - a.gf;
  });
}

// ══════════════════════════════════════════════════════
//  LEADERBOARD VIEW
// ══════════════════════════════════════════════════════
function renderLeaderboard() {
  // Prizes
  ['1','2','3'].forEach(n => {
    const el = document.getElementById(`prize-${n}`);
    if (el) el.textContent = S.config.prizes?.[`p${n}`] || 'TBA';
  });

  // Build ranked user list
  const allUserIds = new Set();
  if (S.user) allUserIds.add(S.user.id);
  S.allUsers.forEach(u => allUserIds.add(u.id));

  const getUserObj = id => {
    if (S.user && id === S.user.id) return S.user;
    return S.allUsers.find(u => u.id === id) || { id, name: 'Unknown', color: '#555' };
  };

  const ranked = [...allUserIds].map(id => {
    const score  = calcScore(id);
    const filled = countFilled(id);
    return { ...getUserObj(id), score, filled };
  }).sort((a, b) => b.score.total - a.score.total || b.filled - a.filled);

  // Stats
  const totalParticipants = ranked.length;
  document.getElementById('lb-participant-count').textContent = totalParticipants;

  const statsEl = document.getElementById('lb-stats');
  const maxScore = ranked[0]?.score.total || 0;
  statsEl.innerHTML = `
    <div class="stat-pill"><div class="val">${totalParticipants}</div><div class="lbl">Participants</div></div>
    <div class="stat-pill"><div class="val">${maxScore}</div><div class="lbl">Highest score</div></div>
    <div class="stat-pill"><div class="val">${Object.keys(S.results).filter(k => !k.startsWith('ko_') && !k.startsWith('bonus_')).length}</div><div class="lbl">Results in</div></div>
    <div class="stat-pill"><div class="val">${WC.matches.length - Object.keys(S.results).filter(k => !k.startsWith('ko_') && !k.startsWith('bonus_')).length}</div><div class="lbl">Matches left</div></div>
  `;

  // List
  const list = document.getElementById('leaderboard-list');
  if (ranked.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="emoji">⚽</div><h3>Be the first!</h3><p>Sign in and make your predictions to appear on the leaderboard.</p></div>`;
    return;
  }

  const topScore = Math.max(...ranked.map(u => u.score.total), 1);

  list.innerHTML = ranked.map((u, i) => {
    const rank = i + 1;
    const isMe = S.user && u.id === S.user.id;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    const barW = Math.round((u.score.total / topScore) * 100);

    return `
    <div class="lb-row${isMe ? ' me' : ''}" data-userid="${u.id}" onclick="showUserInBrowse('${u.id}')">
      <div class="lb-rank ${rankClass}">${rankEmoji}</div>
      <div class="lb-user">
        ${avatarHtml(u, 28)}
        <div>
          <div class="lb-name">${esc(u.name)}${isMe ? ' <span style="font-size:11px;color:var(--green)">(you)</span>' : ''}</div>
          <div class="lb-sub">${u.score.group}G · ${u.score.ko}K · ${u.score.bonus}B pts</div>
        </div>
      </div>
      <div>
        <div class="lb-bar-wrap"><div class="lb-bar" style="width:${barW}%"></div></div>
        <div class="lb-sub" style="text-align:right;margin-top:3px">${u.filled}/72 filled</div>
      </div>
      <div class="lb-pts">${u.score.total} pts</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════
//  GROUP STAGE VIEW
// ══════════════════════════════════════════════════════
function renderGroupStage() {
  if (!S.user) { renderLoginPrompt('group-content'); return; }

  // Build group selector buttons if not yet done
  const sel = document.getElementById('group-selector');
  if (!sel.children.length) {
    sel.innerHTML = WC.groups.map(g => `
      <button class="group-btn${g.id === S.activeGroup ? ' active' : ''}" onclick="selectGroup('${g.id}')">
        Group ${g.id}
      </button>`).join('');
  } else {
    sel.querySelectorAll('.group-btn').forEach(b =>
      b.classList.toggle('active', b.textContent.trim() === `Group ${S.activeGroup}`));
  }

  renderGroupContent(S.activeGroup);
}

function selectGroup(id) {
  S.activeGroup = id;
  renderGroupStage();
}

function renderGroupContent(groupId) {
  const el    = document.getElementById('group-content');
  const group = WC.groups.find(g => g.id === groupId);
  const matches = WC.matchesByGroup[groupId];
  const locked  = S.config.locked?.group;

  // Progress for this group
  const filled = matches.filter(m => S.predictions[m.id] !== undefined).length;

  // Group matches by round
  const byRound = { 1: [], 2: [], 3: [] };
  matches.forEach(m => byRound[m.round].push(m));

  const roundNames = { 1: 'Round 1', 2: 'Round 2', 3: 'Round 3 (simultaneous)' };

  const matchCards = [1, 2, 3].map(r => `
    <div class="match-label" style="margin-top:${r > 1 ? '20px' : '0'}">${roundNames[r]}</div>
    ${byRound[r].map(m => matchCard(m, locked)).join('')}
  `).join('');

  const standings = calcGroupStandings(groupId, S.user.id);
  const standingsHtml = renderStandingsTable(standings, groupId);

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:18px;font-weight:700">Group ${groupId}</div>
      <div class="progress-mini">
        <div class="progress-track"><div class="progress-fill" style="width:${Math.round(filled/6*100)}%"></div></div>
        <span>${filled}/6 filled</span>
      </div>
    </div>
    ${matchCards}
    ${standingsHtml}
  `;

  // Bind events
  el.querySelectorAll('.score-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { matchid, side, dir } = btn.dataset;
      adjustScore(matchid, side, +dir);
    });
  });
}

function matchCard(m, locked) {
  const pred   = S.predictions[m.id] || { home: 0, away: 0 };
  const result = S.results[m.id];
  const home   = WC.teams[m.home];
  const away   = WC.teams[m.away];
  const h      = pred.home ?? 0;
  const a      = pred.away ?? 0;

  const winClass  = h > a ? 'home-win' : h < a ? 'away-win' : 'draw';
  const winLabel  = h > a ? home.name : h < a ? away.name : 'Draw';
  const homeCls   = h > a ? 'winning' : '';
  const awayCls   = h < a ? 'winning' : '';

  let resultLine = '';
  if (result && result.home !== undefined && result.away !== undefined) {
    const rh = +result.home, ra = +result.away;
    const exact  = +h === rh && +a === ra;
    const correct = Math.sign(h - a) === Math.sign(rh - ra);
    resultLine = `
      <div class="actual-result">
        <span>Result: ${rh}–${ra}</span>
        <span class="${exact ? 'correct' : correct ? 'correct' : 'incorrect'}">
          ${exact ? `+${WC.scoring.groupExact}pts ✓` : correct ? `+${WC.scoring.groupResult}pt ✓` : '0pts ✗'}
        </span>
      </div>`;
  }

  return `
  <div class="match-card${locked ? ' locked' : ''}${result ? ' has-result' : ''}" id="mc-${m.id}">
    <div class="match-label">Group ${m.group} · Round ${m.round}</div>
    <div class="match-row">
      <div class="team-side">
        <div class="team-flag">${home.flag}</div>
        <div class="team-name ${homeCls}">${home.name}</div>
      </div>

      <div class="score-block">
        <div class="score-ctrl">
          <button class="score-btn" data-matchid="${m.id}" data-side="home" data-dir="1">+</button>
          <div class="score-num" id="sn-${m.id}-home">${h}</div>
          <button class="score-btn" data-matchid="${m.id}" data-side="home" data-dir="-1">−</button>
        </div>
        <div class="score-sep">:</div>
        <div class="score-ctrl">
          <button class="score-btn" data-matchid="${m.id}" data-side="away" data-dir="1">+</button>
          <div class="score-num" id="sn-${m.id}-away">${a}</div>
          <button class="score-btn" data-matchid="${m.id}" data-side="away" data-dir="-1">−</button>
        </div>
      </div>

      <div class="team-side">
        <div class="team-flag">${away.flag}</div>
        <div class="team-name ${awayCls}">${away.name}</div>
      </div>
    </div>

    <div class="match-footer">
      <span class="result-badge ${winClass}">${winLabel}</span>
      ${resultLine}
    </div>
  </div>`;
}

function adjustScore(matchId, side, dir) {
  if (!S.predictions[matchId]) S.predictions[matchId] = { home: 0, away: 0 };
  const cur = S.predictions[matchId][side] ?? 0;
  const next = Math.max(0, cur + dir);
  S.predictions[matchId][side] = next;

  // Update DOM only (no full re-render for snappy UX)
  const numEl = document.getElementById(`sn-${matchId}-${side}`);
  if (numEl) numEl.textContent = next;

  // Update winning class
  const match = WC.matchById[matchId];
  if (match) {
    const card = document.getElementById(`mc-${matchId}`);
    if (card) {
      const h = S.predictions[matchId].home ?? 0;
      const a = S.predictions[matchId].away ?? 0;
      const homeNameEl = card.querySelector('.team-side:first-child .team-name');
      const awayNameEl = card.querySelector('.team-side:last-child .team-name');
      const badgeEl    = card.querySelector('.result-badge');
      if (homeNameEl) homeNameEl.className = `team-name${h > a ? ' winning' : ''}`;
      if (awayNameEl) awayNameEl.className = `team-name${a > h ? ' winning' : ''}`;
      if (badgeEl) {
        const home = WC.teams[match.home], away = WC.teams[match.away];
        badgeEl.className = `result-badge ${h > a ? 'home-win' : h < a ? 'away-win' : 'draw'}`;
        badgeEl.textContent = h > a ? home.name : h < a ? away.name : 'Draw';
      }
    }
  }

  debouncedSave();
}

function renderStandingsTable(standings, groupId) {
  const rows = standings.map((t, i) => {
    const team    = WC.teams[t.code];
    const gd      = t.gf - t.ga;
    const qualCls = i < 2 ? 'qualifies' : i === 2 ? 'qualifies-3rd' : '';
    return `
    <tr class="${qualCls}">
      <td><div class="std-team"><span>${team.flag}</span><span>${team.name}</span></div></td>
      <td>${t.mp}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td>
      <td>${t.gf}</td><td>${t.ga}</td><td>${gd >= 0 ? '+' : ''}${gd}</td>
      <td class="std-pts">${t.pts}</td>
    </tr>`;
  }).join('');

  return `
  <div class="standings-card" style="margin-top:20px">
    <div class="standings-title">📊 Predicted Standings — Group ${groupId}
      <span style="float:right;font-weight:400;color:var(--text-dim)">
        <span style="color:var(--green)">■</span> Advance  <span style="color:var(--yellow)">■</span> Possible 3rd
      </span>
    </div>
    <table class="standings-table">
      <thead>
        <tr>
          <th style="text-align:left">Team</th>
          <th>MP</th><th>W</th><th>D</th><th>L</th>
          <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  KNOCKOUT VIEW
// ══════════════════════════════════════════════════════
function buildKoRoundTabs() {
  const container = document.getElementById('ko-round-tabs');
  if (!container) return;
  container.innerHTML = WC.koRounds.map(r => `
    <button class="ko-round-btn${r.id === S.activeKoRound ? ' active' : ''}"
            onclick="selectKoRound('${r.id}')">
      ${r.name}
      <span class="pts-badge">${r.pts}pts</span>
    </button>`).join('');
}

function selectKoRound(id) {
  S.activeKoRound = id;
  document.querySelectorAll('#ko-round-tabs .ko-round-btn').forEach(b => {
    const matches = b.textContent.includes(WC.koRounds.find(r => r.id === id).name);
    b.classList.toggle('active', matches);
  });
  renderKnockout();
}

function renderKnockout() {
  if (!S.user) { renderLoginPrompt('ko-content'); return; }
  const round   = WC.koRounds.find(r => r.id === S.activeKoRound);
  const locked  = S.config.locked?.[S.activeKoRound];
  const content = document.getElementById('ko-content');

  if (!S.koPredictions[S.activeKoRound]) {
    S.koPredictions[S.activeKoRound] = Array.from({ length: round.matches }, () => ({
      home: '', away: '', winner: ''
    }));
  }

  const cards = S.koPredictions[S.activeKoRound].map((slot, i) => koMatchCard(round, i, slot, locked)).join('');

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="font-size:16px;font-weight:700">${round.name}</div>
      ${locked ? '<span class="result-badge home-win" style="font-size:11px">🔒 Locked</span>' : '<button class="btn btn-ghost btn-sm" onclick="autoFillKo()">⚡ Auto-fill from group predictions</button>'}
    </div>
    <div class="ko-match-grid">${cards}</div>`;

  content.querySelectorAll('.ko-winner-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const { round: r, idx } = sel.dataset;
      if (!S.koPredictions[r]) return;
      S.koPredictions[r][+idx].winner = sel.value;
      debouncedSave();
    });
  });
}

function koMatchCard(round, idx, slot, locked) {
  const teamOpts = teamOptions(slot.winner);
  const homeOpts = teamOptions(slot.home);
  const awayOpts = teamOptions(slot.away);

  // Determine winner options (only the two selected teams, or all if teams not yet chosen)
  let winnerOpts = '';
  if (slot.home && slot.away) {
    const h = WC.teams[slot.home], a = WC.teams[slot.away];
    winnerOpts = `<option value="">— Pick winner —</option>
      <option value="${slot.home}" ${slot.winner === slot.home ? 'selected' : ''}>${h.flag} ${h.name}</option>
      <option value="${slot.away}" ${slot.winner === slot.away ? 'selected' : ''}>${a.flag} ${a.name}</option>`;
  } else {
    winnerOpts = `<option value="">— Select teams first —</option>`;
  }

  return `
  <div class="ko-match-card">
    <div class="ko-match-num">Match ${idx + 1}</div>
    <div class="ko-team-row${slot.home ? ' selected' : ''}">
      <select onchange="setKoTeam('${round.id}',${idx},'home',this.value)" ${locked ? 'disabled' : ''}>
        ${homeOpts}
      </select>
    </div>
    <div class="ko-vs">vs</div>
    <div class="ko-team-row${slot.away ? ' selected' : ''}">
      <select onchange="setKoTeam('${round.id}',${idx},'away',this.value)" ${locked ? 'disabled' : ''}>
        ${awayOpts}
      </select>
    </div>
    <div class="ko-winner-label">🏅 Who advances?</div>
    <select class="ko-winner-select" data-round="${round.id}" data-idx="${idx}" ${locked ? 'disabled' : ''}>
      ${winnerOpts}
    </select>
  </div>`;
}

function setKoTeam(roundId, idx, side, teamCode) {
  if (!S.koPredictions[roundId]) return;
  S.koPredictions[roundId][idx][side] = teamCode;
  // Reset winner if teams changed
  S.koPredictions[roundId][idx].winner = '';
  debouncedSave();
  renderKnockout();
}

function autoFillKo() {
  // Populate R32 home/away from predicted group top-2 finishers
  // Using a simplified bracket: A1 v ?, B1 v A2, C1 v B2, etc.
  const tops = {};
  WC.groups.forEach(g => {
    const s = calcGroupStandings(g.id, S.user.id);
    tops[g.id] = { first: s[0]?.code || '', second: s[1]?.code || '' };
  });

  // Standard 12-group R32 pairings (approximate, official seeding is more complex)
  const r32Pairs = [
    [tops.A?.first,  tops.B?.second],
    [tops.C?.first,  tops.D?.second],
    [tops.E?.first,  tops.F?.second],
    [tops.G?.first,  tops.H?.second],
    [tops.I?.first,  tops.J?.second],
    [tops.K?.first,  tops.L?.second],
    [tops.B?.first,  tops.A?.second],
    [tops.D?.first,  tops.C?.second],
    [tops.F?.first,  tops.E?.second],
    [tops.H?.first,  tops.G?.second],
    [tops.J?.first,  tops.I?.second],
    [tops.L?.first,  tops.K?.second],
    [tops.A?.first,  tops.C?.second],
    [tops.B?.first,  tops.D?.second],
    [tops.E?.first,  tops.G?.second],
    [tops.F?.first,  tops.H?.second],
  ];

  S.koPredictions.r32 = r32Pairs.slice(0, 16).map(([h, a]) => ({
    home: h || '', away: a || '', winner: ''
  }));

  debouncedSave();
  renderKnockout();
  showToast('Bracket auto-filled from your group predictions!', 'success');
}

// ══════════════════════════════════════════════════════
//  BONUS VIEW
// ══════════════════════════════════════════════════════
function renderBonus() {
  if (!S.user) { renderLoginPromptInView('bonus-grid'); return; }

  const grid = document.getElementById('bonus-grid');
  grid.innerHTML = WC.bonusQuestions.map(q => bonusCard(q)).join('');

  // Wire up inputs
  grid.querySelectorAll('[data-qid]').forEach(el => {
    const event = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(event, () => {
      S.bonusPredictions[el.dataset.qid] = el.value;
      debouncedSave();
    });
  });

  grid.querySelectorAll('.bool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qid = btn.dataset.qid;
      const val = btn.dataset.val;
      S.bonusPredictions[qid] = val;
      // Update UI
      btn.closest('.bool-toggle').querySelectorAll('.bool-btn').forEach(b => {
        b.classList.remove('selected-yes', 'selected-no');
      });
      btn.classList.add(val === 'yes' ? 'selected-yes' : 'selected-no');
      debouncedSave();
    });
  });
}

function bonusCard(q) {
  const val  = S.bonusPredictions[q.id] || '';
  const links = q.links.map(l => `<a class="odds-link" href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('');

  let input = '';
  if (q.type === 'team') {
    input = `<select class="bonus-input" data-qid="${q.id}">
      <option value="">— Select team —</option>
      ${WC.teamList.map(t => `<option value="${t.code}" ${val === t.code ? 'selected' : ''}>${t.flag} ${t.name}</option>`).join('')}
    </select>`;
  } else if (q.type === 'player') {
    input = `<input class="bonus-input" type="text" data-qid="${q.id}"
               value="${esc(val)}" placeholder="Player name…" />`;
  } else if (q.type === 'number') {
    input = `<input class="bonus-input" type="number" data-qid="${q.id}"
               value="${val}" placeholder="e.g. 280" min="0" max="500" />`;
  } else if (q.type === 'boolean') {
    const yesClass = val === 'yes' ? 'selected-yes' : '';
    const noClass  = val === 'no'  ? 'selected-no'  : '';
    input = `<div class="bool-toggle">
      <button class="bool-btn ${yesClass}" data-qid="${q.id}" data-val="yes">✅ Yes</button>
      <button class="bool-btn ${noClass}"  data-qid="${q.id}" data-val="no">❌ No</button>
    </div>`;
  }

  const ptsDisplay = typeof q.points === 'number' ? `${q.points} pts` : q.points;

  return `
  <div class="bonus-card">
    <div class="bonus-header">
      <div class="bonus-emoji">${q.emoji}</div>
      <div class="bonus-question">${q.question}</div>
      <div class="bonus-pts">${ptsDisplay}</div>
    </div>
    <div class="bonus-tip">${q.tip}</div>
    ${input}
    ${links ? `<div class="bonus-links">${links}</div>` : ''}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  BROWSE VIEW
// ══════════════════════════════════════════════════════
function renderBrowse() {
  renderUserGrid('');
  const search = document.getElementById('browse-search');
  if (search) {
    search.oninput = () => renderUserGrid(search.value.toLowerCase());
  }
}

function renderUserGrid(filter) {
  const allIds = new Set();
  if (S.user) allIds.add(S.user.id);
  S.allUsers.forEach(u => allIds.add(u.id));

  const getUserObj = id => {
    if (S.user && id === S.user.id) return S.user;
    return S.allUsers.find(u => u.id === id) || { id, name: 'Unknown', color: '#555' };
  };

  const filtered = [...allIds]
    .map(id => getUserObj(id))
    .filter(u => !filter || u.name.toLowerCase().includes(filter));

  const el = document.getElementById('browse-users');
  if (filtered.length === 0) {
    el.innerHTML = !isBackendConfigured()
      ? `<div class="empty-state" style="grid-column:1/-1"><div class="emoji">🔗</div><h3>Backend not connected</h3><p>Connect Google Sheets to see everyone's predictions.</p></div>`
      : `<div style="color:var(--text-sub);padding:20px">No users found.</div>`;
    return;
  }

  el.innerHTML = filtered.map(u => {
    const score = calcScore(u.id);
    const isMe  = S.user && u.id === S.user.id;
    return `
    <div class="browse-user-card${isMe ? ' me' : ''}" onclick="viewUserPredictions('${u.id}')">
      ${avatarHtml(u, 32)}
      <div class="browse-user-info">
        <div class="browse-user-name">${esc(u.name)}${isMe ? ' (you)' : ''}</div>
        <div class="browse-user-pts">${score.total} pts · ${countFilled(u.id)}/72</div>
      </div>
    </div>`;
  }).join('');
}

function viewUserPredictions(userId) {
  const getUserObj = id => {
    if (S.user && id === S.user.id) return S.user;
    return S.allUsers.find(u => u.id === id) || { id, name: '?', color: '#555' };
  };

  const user = getUserObj(userId);
  const isSelf = S.user && userId === S.user.id;
  const preds  = isSelf ? S.predictions      : (S.allPredictions[userId]?.group || {});
  const bonus  = isSelf ? S.bonusPredictions : (S.allPredictions[userId]?.bonus || {});
  const score  = calcScore(userId);

  const detail = document.getElementById('browse-detail');

  // Group predictions table
  const groupRows = WC.groups.map(g => {
    const matches = WC.matchesByGroup[g.id];
    return matches.map(m => {
      const p    = preds[m.id];
      const res  = S.results[m.id];
      const home = WC.teams[m.home], away = WC.teams[m.away];
      const predTxt = p ? `${p.home}–${p.away}` : '—';
      const resTxt  = res ? `${res.home}–${res.away}` : '—';
      let pts = '', cls = 'pred-empty';
      if (p && res) {
        const ph = +p.home, pa = +p.away, rh = +res.home, ra = +res.away;
        if (ph === rh && pa === ra) { pts = `+${WC.scoring.groupExact}`; cls = 'pred-correct'; }
        else if (Math.sign(ph-pa) === Math.sign(rh-ra)) { pts = `+${WC.scoring.groupResult}`; cls = 'pred-partial'; }
        else { pts = '0'; cls = 'pred-incorrect'; }
      }
      return `
      <tr>
        <td>${home.flag} ${home.name} vs ${away.flag} ${away.name}</td>
        <td><span class="pred-score ${cls}">${predTxt}</span></td>
        <td style="color:var(--text-sub)">${resTxt}</td>
        <td><span class="${cls}">${pts}</span></td>
      </tr>`;
    }).join('');
  }).join('');

  // Bonus answers
  const bonusRows = WC.bonusQuestions.map(q => {
    const p = bonus[q.id] || '—';
    const r = S.results[`bonus_${q.id}`];
    let display = p;
    if (q.type === 'team' && p !== '—') {
      const t = WC.teams[p];
      display = t ? `${t.flag} ${t.name}` : p;
    }
    return `<tr>
      <td>${q.emoji} ${q.question}</td>
      <td><strong>${esc(display)}</strong></td>
      <td style="color:var(--text-sub)">${r || '—'}</td>
    </tr>`;
  }).join('');

  detail.innerHTML = `
  <div style="margin-bottom:32px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      ${avatarHtml(user, 40)}
      <div>
        <div style="font-size:18px;font-weight:700">${esc(user.name)}</div>
        <div style="color:var(--text-sub);font-size:13px">${score.total} pts · ${countFilled(userId)}/72 matches filled</div>
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="closeBrowseDetail()">✕ Close</button>
    </div>

    <div class="compare-table-wrap" style="margin-bottom:24px">
      <table class="compare-table">
        <thead><tr><th>Match</th><th>Prediction</th><th>Result</th><th>Points</th></tr></thead>
        <tbody>${groupRows}</tbody>
      </table>
    </div>

    <div style="font-size:15px;font-weight:700;margin-bottom:12px">⭐ Bonus Predictions</div>
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th>Question</th><th>Answer</th><th>Actual</th></tr></thead>
        <tbody>${bonusRows}</tbody>
      </table>
    </div>
  </div>`;
}

function closeBrowseDetail() {
  document.getElementById('browse-detail').innerHTML = '';
}

function showUserInBrowse(userId) {
  switchTab('browse');
  viewUserPredictions(userId);
}

// ══════════════════════════════════════════════════════
//  ADMIN VIEW
// ══════════════════════════════════════════════════════
function bindAdmin() {
  document.getElementById('admin-login-btn')?.addEventListener('click', () => {
    const pw = document.getElementById('admin-pw-input').value;
    if (pw === CONFIG.ADMIN_PASSWORD) {
      S.adminUnlocked = true;
      document.getElementById('admin-gate-wrap').style.display = 'none';
      document.getElementById('admin-content').style.display   = 'block';
      renderAdminContent();
    } else {
      showToast('Incorrect password', 'error');
    }
  });

  document.getElementById('admin-pw-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('admin-login-btn').click();
  });
}

function renderAdmin() {
  if (S.adminUnlocked) renderAdminContent();
}

function renderAdminContent() {
  renderLockGrid();
  renderAdminGroupSelector();
  renderAdminResultGrid(S.adminGroup);
  renderAdminKoResultGrid(S.adminKoRound);
  renderPrizeInputs();

  document.getElementById('save-prizes-btn')?.addEventListener('click', savePrizes);
  document.getElementById('admin-export-btn')?.addEventListener('click', exportCSV);
}

function renderLockGrid() {
  const grid = document.getElementById('lock-grid');
  if (!grid) return;
  const rounds = [
    { id: 'group', label: 'Group Stage' },
    ...WC.koRounds.map(r => ({ id: r.id, label: r.name })),
  ];
  grid.innerHTML = rounds.map(r => `
    <div class="lock-item">
      <span class="lock-label">${r.label}</span>
      <label class="toggle-switch">
        <input type="checkbox" ${S.config.locked?.[r.id] ? 'checked' : ''}
               onchange="toggleLock('${r.id}', this.checked)" />
        <span class="toggle-slider"></span>
      </label>
      <span style="font-size:12px;color:var(--text-dim)">${S.config.locked?.[r.id] ? '🔒 Locked' : '🔓 Open'}</span>
    </div>`).join('');
}

function toggleLock(roundId, locked) {
  if (!S.config.locked) S.config.locked = {};
  S.config.locked[roundId] = locked;
  saveLocal();
  syncRemoteConfig();
  showToast(`${roundId} ${locked ? 'locked 🔒' : 'unlocked 🔓'}`, 'info');
  renderLockGrid();
}

function renderAdminGroupSelector() {
  const sel = document.getElementById('admin-group-selector');
  if (!sel) return;
  sel.innerHTML = WC.groups.map(g => `
    <button class="group-btn${g.id === S.adminGroup ? ' active' : ''}"
            onclick="selectAdminGroup('${g.id}')">Group ${g.id}</button>`).join('');
}

function selectAdminGroup(id) {
  S.adminGroup = id;
  renderAdminGroupSelector();
  renderAdminResultGrid(id);
}

function renderAdminResultGrid(groupId) {
  const el = document.getElementById('admin-result-grid');
  if (!el) return;
  const matches = WC.matchesByGroup[groupId];
  el.innerHTML = matches.map(m => {
    const res = S.results[m.id] || {};
    const home = WC.teams[m.home], away = WC.teams[m.away];
    return `
    <div class="result-entry-card">
      <div class="result-entry-label">Group ${m.group} R${m.round} · ${home.flag} vs ${away.flag}</div>
      <div class="result-entry-row">
        <span>${home.name}</span>
        <input type="number" id="adm-${m.id}-home" value="${res.home ?? ''}" min="0" max="20"
               onchange="saveResult('${m.id}','home',this.value)" />
        <span>–</span>
        <input type="number" id="adm-${m.id}-away" value="${res.away ?? ''}" min="0" max="20"
               onchange="saveResult('${m.id}','away',this.value)" />
        <span>${away.name}</span>
      </div>
    </div>`;
  }).join('');
}

function saveResult(matchId, side, value) {
  if (!S.results[matchId]) S.results[matchId] = {};
  S.results[matchId][side] = value === '' ? undefined : +value;
  saveLocal();
  syncRemoteResults();
}

function buildAdminKoRoundTabs() {
  const el = document.getElementById('admin-ko-round-tabs');
  if (!el) return;
  el.innerHTML = WC.koRounds.map(r => `
    <button class="ko-round-btn${r.id === S.adminKoRound ? ' active' : ''}"
            onclick="selectAdminKoRound('${r.id}')">
      ${r.short}
    </button>`).join('');
}

function selectAdminKoRound(id) {
  S.adminKoRound = id;
  document.querySelectorAll('#admin-ko-round-tabs .ko-round-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === WC.koRounds.find(r => r.id === id).short);
  });
  renderAdminKoResultGrid(id);
}

function renderAdminKoResultGrid(roundId) {
  const el    = document.getElementById('admin-ko-result-grid');
  if (!el) return;
  const round = WC.koRounds.find(r => r.id === roundId);
  const resArr = S.results[`ko_${roundId}`] || Array(round.matches).fill(null);

  el.innerHTML = Array.from({ length: round.matches }, (_, i) => {
    const res  = resArr[i] || {};
    const team = teamOptions(res.winner || '');
    return `
    <div class="result-entry-card">
      <div class="result-entry-label">${round.name} · Match ${i + 1}</div>
      <div class="result-entry-row">
        <span>Winner:</span>
        <select style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:6px"
                onchange="saveKoResult('${roundId}',${i},this.value)">
          ${team}
        </select>
      </div>
    </div>`;
  }).join('');
}

function saveKoResult(roundId, idx, winner) {
  if (!S.results[`ko_${roundId}`]) S.results[`ko_${roundId}`] = [];
  if (!S.results[`ko_${roundId}`][idx]) S.results[`ko_${roundId}`][idx] = {};
  S.results[`ko_${roundId}`][idx].winner = winner;
  saveLocal();
  syncRemoteResults();
}

function renderPrizeInputs() {
  ['1','2','3'].forEach(n => {
    const el = document.getElementById(`prize-input-${n}`);
    if (el) el.value = S.config.prizes?.[`p${n}`] || '';
  });
}

function savePrizes() {
  S.config.prizes = {
    p1: document.getElementById('prize-input-1')?.value || 'TBA',
    p2: document.getElementById('prize-input-2')?.value || 'TBA',
    p3: document.getElementById('prize-input-3')?.value || 'TBA',
  };
  saveLocal();
  syncRemoteConfig();
  showToast('Prizes saved!', 'success');
}

function exportCSV() {
  const allIds = new Set([
    ...(S.user ? [S.user.id] : []),
    ...S.allUsers.map(u => u.id),
  ]);
  const getUserObj = id => {
    if (S.user && id === S.user.id) return S.user;
    return S.allUsers.find(u => u.id === id) || { name: 'Unknown' };
  };

  const rows = [['Name','Group Pts','Knockout Pts','Bonus Pts','Total','Filled']];
  [...allIds].forEach(id => {
    const u = getUserObj(id);
    const s = calcScore(id);
    rows.push([u.name, s.group, s.ko, s.bonus, s.total, countFilled(id)]);
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wc2026-scores.csv';
  a.click();
}

// ══════════════════════════════════════════════════════
//  GOOGLE SSO
// ══════════════════════════════════════════════════════
function initGoogleSSO() {
  const hasClientId = CONFIG.GOOGLE_CLIENT_ID && !CONFIG.GOOGLE_CLIENT_ID.startsWith('YOUR_');

  if (!hasClientId) {
    // Client ID not configured — fall back to manual name/colour login
    document.getElementById('sso-block').style.display = 'none';
    document.getElementById('manual-login-block').style.display = '';
    buildColorPicker();
    return;
  }

  // Wait for the GSI library to load then render the button
  const tryInit = () => {
    if (typeof google === 'undefined') { setTimeout(tryInit, 150); return; }
    google.accounts.id.initialize({
      client_id:   CONFIG.GOOGLE_CLIENT_ID,
      callback:    handleGoogleSignIn,
      hd:          'sam-media.com',   // restrict to sam-media.com workspace
      auto_select: false,
    });
    const btnEl = document.getElementById('google-signin-btn');
    if (btnEl) {
      google.accounts.id.renderButton(btnEl, {
        theme:          'filled_black',
        size:           'large',
        shape:          'rectangular',
        text:           'signin_with',
        logo_alignment: 'left',
        width:          280,
      });
    }
  };
  tryInit();
}

window.handleGoogleSignIn = function(response) {
  try {
    // Decode JWT payload (no library needed — just base64url decode)
    const b64 = response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));

    if (!payload.email?.endsWith('@sam-media.com')) {
      showToast('Please use your @sam-media.com Google account', 'error');
      return;
    }

    S.user = {
      id:      `g_${payload.sub}`,
      name:    payload.name,
      email:   payload.email,
      picture: payload.picture || '',
      color:   '#7DC242',
    };

    saveLocal();
    closeModal();
    updateHeaderUser();
    document.getElementById('admin-tab').style.display = '';
    syncRemote();
    renderActiveView();
    showToast(`Welcome, ${payload.given_name || payload.name}! ⚽`, 'success');
  } catch(e) {
    console.error('SSO error', e);
    showToast('Sign-in failed — please try again', 'error');
  }
};

function signOut() {
  if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
  S.user = null;
  localStorage.removeItem('wc26_user');
  closeUserMenu();
  updateHeaderUser();
  document.getElementById('admin-tab').style.display = 'none';
  openModal();
  renderActiveView();
}

// ══════════════════════════════════════════════════════
//  MODAL (Login)
// ══════════════════════════════════════════════════════
function buildColorPicker() {
  const AVATAR_COLORS = [
    '#7DC242','#3B82F6','#EC4899','#F97316','#8B5CF6',
    '#06B6D4','#EF4444','#10B981','#F59E0B','#6366F1',
  ];
  const el = document.getElementById('color-picker');
  if (!el) return;
  const selected = S.user?.color || AVATAR_COLORS[0];
  el.innerHTML = AVATAR_COLORS.map(c => `
    <div class="color-dot${c === selected ? ' selected' : ''}"
         style="background:${c}" data-color="${c}"
         onclick="pickColor(this,'${c}')"></div>`).join('');
}

function pickColor(el, color) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  if (S.user) { S.user.color = color; updateHeaderUser(); }
}

function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('login-name')?.focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function openUserMenu() {
  const menu = document.getElementById('user-menu');
  if (!menu || !S.user) return;
  document.getElementById('user-menu-name').textContent  = S.user.name;
  document.getElementById('user-menu-email').textContent = S.user.email || '';
  menu.style.display = '';
  // close on outside click
  setTimeout(() => document.addEventListener('click', closeUserMenuOnOutside, { once: true }), 0);
}

function closeUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.style.display = 'none';
}

function closeUserMenuOnOutside(e) {
  if (!document.getElementById('user-menu')?.contains(e.target)) closeUserMenu();
}

function bindModal() {
  // Manual fallback login
  const btn  = document.getElementById('login-btn');
  const name = document.getElementById('login-name');
  btn?.addEventListener('click', registerUser);
  name?.addEventListener('keydown', e => { if (e.key === 'Enter') registerUser(); });

  // Header user button — open menu if logged in, modal if not
  document.getElementById('user-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (S.user) openUserMenu();
    else openModal();
  });
}

function registerUser() {
  const nameEl = document.getElementById('login-name');
  const name   = nameEl?.value.trim();
  if (!name) { nameEl?.focus(); showToast('Please enter your name', 'error'); return; }

  const selectedDot = document.querySelector('.color-dot.selected');
  const color = selectedDot?.dataset.color || '#7DC242';

  S.user = S.user
    ? { ...S.user, name, color }
    : { id: `u_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, name, color, email: '' };

  saveLocal();
  closeModal();
  updateHeaderUser();
  document.getElementById('admin-tab').style.display = '';
  syncRemote();
  renderActiveView();
  showToast(`Welcome, ${name}! 🎉`, 'success');
}

function updateHeaderUser() {
  const av = document.getElementById('header-avatar');
  const nm = document.getElementById('header-name');

  if (!S.user) {
    if (av) { av.innerHTML = '?'; av.style.background = '#333'; }
    if (nm) nm.textContent = 'Sign in';
    return;
  }

  if (av) {
    if (S.user.picture) {
      av.innerHTML = `<img src="${S.user.picture}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
      av.style.background = 'transparent';
    } else {
      const initials = S.user.name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
      av.innerHTML = initials;
      av.style.background = S.user.color || '#7DC242';
    }
  }
  if (nm) nm.textContent = S.user.name.split(' ')[0];
}

// ══════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════
function showToast(msg, type = 'info') {
  const el  = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function avatarHtml(user, size = 28) {
  const initials = (user.name || '?').split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
  return `<div class="avatar" style="background:${user.color};width:${size}px;height:${size}px;font-size:${Math.floor(size*0.4)}px">${initials}</div>`;
}

function teamOptions(selected = '') {
  const none = `<option value="">— Select team —</option>`;
  const opts = WC.teamList.map(t =>
    `<option value="${t.code}" ${selected === t.code ? 'selected' : ''}>${t.flag} ${t.name}</option>`
  ).join('');
  return none + opts;
}

function renderLoginPrompt(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="empty-state"><div class="emoji">👋</div><h3>Sign in to predict</h3><p>Click your name in the top-right corner to get started.</p><button class="btn btn-primary" onclick="openModal()">Sign in</button></div>`;
}

function renderLoginPromptInView(containerId) {
  renderLoginPrompt(containerId);
}
