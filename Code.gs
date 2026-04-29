// ═══════════════════════════════════════════════════════
//  Sam Media — WC 2026 Poule · Google Apps Script Backend
//  Deploy as: Execute as Me · Access: Anyone
// ═══════════════════════════════════════════════════════

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';  // ← paste your Sheet ID

// Password stored in Script Properties — configure interval below
// Key: ADMIN_PW   Value: <your password>
// Key: REMINDER_DAYS  Value: <days since last update to trigger reminder, default 7>
function getAdminPw() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PW') || '';
}
function getReminderDays() {
  return parseInt(PropertiesService.getScriptProperties().getProperty('REMINDER_DAYS') || '7', 10);
}
const SHEET_USERS    = 'Users';
const SHEET_PREDS    = 'Predictions';
const SHEET_RESULTS  = 'Results';
const SHEET_CONFIG   = 'Config';

// ── GET handler ────────────────────────────────────────
function doGet(e) {
  const action = (e.parameter || {}).action || '';
  let result;
  try {
    switch (action) {
      case 'getAll': result = getAll(); break;
      default:       result = { error: `Unknown action: ${action}` };
    }
  } catch(err) {
    result = { error: err.toString() };
  }
  return json(result);
}

// ── POST handler ───────────────────────────────────────
function doPost(e) {
  const p = e.parameter || {};
  let result;
  try {
    switch (p.action) {
      case 'sync':        result = syncUser(p);         break;
      case 'checkAdmin':  result = checkAdmin(p);       break;
      case 'saveResults': result = saveResults(p);      break;
      case 'saveConfig':  result = saveConfig(p);       break;
      default:            result = { error: `Unknown action: ${p.action}` };
    }
  } catch(err) {
    result = { error: err.toString() };
  }
  return json(result);
}

// ── GET ALL ────────────────────────────────────────────
function getAll() {
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const users   = readSheet(ss, SHEET_USERS);
  const preds   = readSheet(ss, SHEET_PREDS);
  const resRows = readSheet(ss, SHEET_RESULTS);
  const cfgRows = readSheet(ss, SHEET_CONFIG);

  // Build users array
  const userList = users.slice(1).map(r => ({
    id:    r[0], name: r[1], color: r[2]
  })).filter(u => u.id);

  // Build predictions map { userId: { group, bonus, ko } }
  const predMap = {};
  preds.slice(1).forEach(r => {
    const uid = r[0];
    if (!uid) return;
    try {
      predMap[uid] = {
        group: JSON.parse(r[1] || '{}'),
        bonus: JSON.parse(r[2] || '{}'),
        ko:    JSON.parse(r[3] || '{}'),
      };
    } catch(_) {}
  });

  // Build results object
  const results = {};
  resRows.slice(1).forEach(r => {
    if (!r[0]) return;
    try { results[r[0]] = JSON.parse(r[1] || 'null'); } catch(_) {}
  });

  // Build config
  const config = { locked: {}, prizes: { p1:'TBA', p2:'TBA', p3:'TBA' } };
  cfgRows.slice(1).forEach(r => {
    if (!r[0]) return;
    try {
      const val = JSON.parse(r[1]);
      if (r[0] === 'locked') config.locked = val;
      if (r[0] === 'prizes') config.prizes = val;
    } catch(_) {}
  });

  return { users: userList, predictions: predMap, results, config };
}

// ── CHECK ADMIN ────────────────────────────────────────
function checkAdmin(p) {
  if (!p.pw || p.pw !== getAdminPw()) return { error: 'Unauthorized' };
  return { ok: true };
}

// ── SYNC USER ──────────────────────────────────────────
function syncUser(p) {
  const uid = p.userId, name = p.name, color = p.color, email = p.email || '';
  if (!uid) return { error: 'Missing userId' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Upsert user row (email in col 4)
  upsertRow(ss, SHEET_USERS, uid, [uid, name, color, email, new Date().toISOString()]);

  // Upsert predictions row
  const group = p.group || '{}';
  const bonus = p.bonus || '{}';
  const ko    = p.ko    || '{}';
  upsertRow(ss, SHEET_PREDS, uid, [uid, group, bonus, ko, new Date().toISOString()]);

  return { ok: true };
}

// ── SAVE RESULTS (admin) ───────────────────────────────
function saveResults(p) {
  if (!p.pw || p.pw !== getAdminPw()) return { error: 'Unauthorized' };
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const payload = JSON.parse(p.payload || '{}');

  Object.entries(payload).forEach(([key, val]) => {
    upsertRow(ss, SHEET_RESULTS, key, [key, JSON.stringify(val)]);
  });

  return { ok: true };
}

// ── SAVE CONFIG (admin) ────────────────────────────────
function saveConfig(p) {
  if (!p.pw || p.pw !== getAdminPw()) return { error: 'Unauthorized' };
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const payload = JSON.parse(p.payload || '{}');

  if (payload.locked !== undefined)
    upsertRow(ss, SHEET_CONFIG, 'locked', ['locked', JSON.stringify(payload.locked)]);
  if (payload.prizes !== undefined)
    upsertRow(ss, SHEET_CONFIG, 'prizes', ['prizes', JSON.stringify(payload.prizes)]);

  return { ok: true };
}

// ── HELPERS ────────────────────────────────────────────
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheet(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const last = sheet.getLastRow();
  if (last < 1) return [];
  return sheet.getRange(1, 1, last, sheet.getLastColumn() || 1).getValues();
}

function upsertRow(ss, sheetName, keyValue, rowData) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return; // created by setupSheets()

  const last = sheet.getLastRow();
  if (last < 1) {
    sheet.appendRow(rowData);
    return;
  }

  const col1 = sheet.getRange(1, 1, last, 1).getValues();
  let found = -1;
  for (let i = 0; i < col1.length; i++) {
    if (col1[i][0] === keyValue) { found = i + 1; break; }
  }

  if (found > 0) {
    sheet.getRange(found, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

// ── REMINDER EMAILS ─────────────────────────────────────
function sendReminders() {
  // Called by time-driven trigger — configurable interval via REMINDER_DAYS Script Property
  // To set up: Deploy → Triggers → New → sendReminders → Time-driven → Hourly/ Daily
  // REMINDER_DAYS controls how many days of inactivity triggers an email (default: 7)
  const days    = getReminderDays();
  const cutoff  = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const users   = readSheet(ss, SHEET_USERS);
  const preds   = readSheet(ss, SHEET_PREDS);

  // Build map of userId → last update time
  const lastUpdate = {};
  preds.slice(1).forEach(r => {
    if (!r[0] || !r[4]) return;
    const uid = r[0];
    const ts  = new Date(r[4]);
    if (!lastUpdate[uid] || ts > lastUpdate[uid]) lastUpdate[uid] = ts;
  });

  // Build email map from Users sheet
  const userEmail = {};
  users.slice(1).forEach(r => {
    if (!r[0]) return;
    // name field may contain email if set by manual login fallback
    userEmail[r[0]] = r[2] || '';  // col 2 = email
  });

  let sent = 0;
  users.slice(1).forEach(r => {
    if (!r[0]) return;
    const uid    = r[0];
    const email  = userEmail[uid];
    if (!email) return;
    const last   = lastUpdate[uid];
    if (last && last > cutoff) return;  // active recently
    if (!last) {
      // Never made a prediction — count as inactive
      GmailApp.sendEmail(email, '⚽ WC 2026 Poule — Reminder to join!',
        `Hi there!\n\nThe WC 2026 Poule is live and you haven't joined yet. Sign in, fill in your predictions, and compete for the prizes!\n\n👉 ${ScriptApp.getUrl()}\n\nGood luck!\n— Sam Media Poule Team`);
      sent++;
    } else if (last < cutoff) {
      GmailApp.sendEmail(email, '⚽ WC 2026 Poule — Prediction reminder',
        `Hi!\n\nYou haven't updated your predictions in ${days}+ days. The group stage kicks off June 11 — time to get your picks in!\n\n👉 ${ScriptApp.getUrl()}\n\nGood luck!\n— Sam Media Poule Team`);
      sent++;
    }
  });
  Logger.log(`Reminders sent: ${sent}`);
}

// ── SETUP (run once manually) ──────────────────────────
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const sheets = {
    [SHEET_USERS]:   ['id', 'name', 'color', 'createdAt'],
    [SHEET_PREDS]:   ['userId', 'groupPreds', 'bonusPreds', 'koPreds', 'updatedAt'],
    [SHEET_RESULTS]: ['key', 'value'],
    [SHEET_CONFIG]:  ['key', 'value'],
  };

  Object.entries(sheets).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      // Style header row
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#1a1a1a')
        .setFontColor('#7DC242')
        .setFontWeight('bold');
    }
  });

  Logger.log('✅ Sheets created successfully!');
}
