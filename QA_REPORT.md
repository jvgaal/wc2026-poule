# QA Report — WC 2026 Poule
**URL:** https://wc2026-poule.pages.dev/#  
**Date:** 2026-04-29  
**Tester:** Claude (automated browser QA via preview tools)  
**Codebase:** `/worldcup-2026-poule`  
**Test method:** Live browser testing at 1280×900, 768×1024, 375×812 viewports

---

## Summary

| Category | Count |
|---|---|
| 🔴 Critical bugs | 1 |
| 🟠 Medium bugs | 5 |
| 🟡 Minor / UX issues | 8 |
| 💡 Enhancement suggestions | 7 |
| ✅ Working correctly | 12 |

---

## 🔴 Critical Issues

### C1 — Admin password exposed in client-side JavaScript
**File:** `app.js:9`  
**Severity:** Critical (security)

```js
ADMIN_PASSWORD: 'worldcup2026',
```

The admin password is hardcoded in plaintext JavaScript that any visitor can read by opening DevTools → Sources. This means any participant can bypass the admin gate and enter/modify match results or lock rounds.

**Fix:** Move the password check to the Google Apps Script backend (`doPost`). The client should send the password with each admin request and the server validates it — never expose it in frontend code.

---

## 🟠 Medium Bugs

### M1 — Knockout bracket completely unusable on mobile (375px)
**File:** `app.js:712-725`, `style.css:704-731`

The `fitBracket()` function scales the 1260px-wide bracket tree into the mobile viewport (~375px), resulting in approximately 30% scale. All text, team names, score inputs, and flag buttons become unreadable and untappable.

**Steps to reproduce:** Open app on mobile → Predictions → Knockout tab.

**Fix options:**
- Add a horizontal scroll fallback (remove `overflow: hidden` on `.bkt-scroll`, allow scroll on mobile)
- Or add a dedicated mobile layout (collapsible round-by-round list view)
- At minimum, add a breakpoint hint to switch to scroll mode: `if (scale < 0.5) wrap.style.overflow = 'auto';`

---

### M2 — Admin panel requires manual scroll after unlock
**File:** `app.js:1062-1068`

After entering the correct admin password and clicking Unlock, the gate form disappears (`display: none`) but the admin content renders below the former gate position. The user must manually scroll down to find it.

**Fix:** Add `document.getElementById('admin-content').scrollIntoView({ behavior: 'smooth' })` after showing the admin content.

---

### M3 — Grammar: "1 participants" (singular/plural)
**File:** `app.js:373`  

```js
document.getElementById('lb-participant-count').textContent = totalParticipants;
// label: "FIFA World Cup 2026 · 1 participants"
```

The section subtitle is always "participants" even when count is 1.

**Fix:**
```js
`${totalParticipants} participant${totalParticipants === 1 ? '' : 's'}`
```
Same fix applies to the stat pill label and the modal subtitle ("95 players" is hardcoded — see M4).

---

### M4 — Modal subtitle "95 players" is hardcoded
**File:** `index.html:219`

```html
<div class="modal-logo-sub">Sam Media internal · 95 players</div>
```

This static number doesn't reflect the actual participant count fetched from the backend. As users join, this will become inaccurate.

**Fix:** Update this dynamically after `fetchRemote()` resolves:
```js
document.querySelector('.modal-logo-sub').textContent = 
  `Sam Media internal · ${S.allUsers.length} player${S.allUsers.length !== 1 ? 's' : ''}`;
```

---

### M5 — Avatar initials use real name, not nickname
**File:** `app.js:1528-1531`

```js
function avatarHtml(user, size = 28) {
  const initials = (user.name || '?').split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
```

A user named "QA Tester" with nickname "QABot" gets initials "QT" in their avatar throughout the app (leaderboard, browse, browse detail). The nickname is what's displayed as their name everywhere else, so the avatar should reflect it.

**Fix:**
```js
const displayStr = user.nickname || user.name || '?';
const initials = displayStr.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
```

---

## 🟡 Minor / UX Issues

### U1 — Home-win and away-win result badges are the same color
**File:** `style.css:602-604`

```css
.result-badge.home-win { background: rgba(125,194,66,0.15); color: var(--green); }
.result-badge.draw     { background: rgba(234,179,8,0.15);  color: var(--yellow); }
.result-badge.away-win { background: rgba(125,194,66,0.15); color: var(--green); }
```

Both home-win and away-win use identical green styling. There is no visual differentiation between the two, making it harder to scan a list of match predictions at a glance.

**Fix:** Give away-win a distinct color, e.g. blue:
```css
.result-badge.away-win { background: rgba(59,130,246,0.15); color: #60a5fa; }
```

---

### U2 — No loading / skeleton state during backend fetch
**File:** `app.js:41-65`

The app renders immediately from localStorage while `fetchRemote()` runs in the background. There is no visual indicator that remote data is loading. The leaderboard shows only the local user until the fetch completes, which could make participants think no one else has joined.

**Suggestion:** Show a subtle skeleton or spinner in the leaderboard list while `S.backendOk` is false.

---

### U3 — Sync error appears on every interaction when backend is unreachable
**File:** `app.js:158-163`

When the backend is down (or CORS-restricted), every score adjustment triggers `syncRemote()` which fails and shows "⚠ Error" in the header for 4 seconds. After multiple edits in quick succession, the error cycles repeatedly, which is distracting.

**Suggestion:** If the backend is unreachable, suppress further error toasts after the first failure, or show a single persistent "Offline — changes saved locally" banner instead of repeating transient toasts.

---

### U4 — Match cards show no scheduled date/time
**File:** `app.js:516-549`

Match cards only display "Group A · Round 1" — no actual date, time, or venue is shown. Users can't know when matches happen relative to their prediction deadline.

**Suggestion:** Add match dates to `data.js` matches and display them on the card:
```
Group A · Round 1 · Jun 11, 14:00 CT
```

---

### U5 — Leaderboard row click (→ Browse) has no visual affordance
**File:** `app.js:401`

```js
<div class="lb-row..." onclick="showUserInBrowse('${u.id}')">
```

The leaderboard rows are clickable (they navigate to the Browse tab and expand that user's prediction detail), but there is no cursor hint or hover label indicating this. The `cursor: pointer` CSS helps, but users may not discover this interaction.

**Suggestion:** Add a subtle `→ View predictions` label or icon that appears on hover, or add a tooltip.

---

### U6 — Browse detail doesn't auto-scroll into view
**File:** `app.js:963-1044`

When clicking a user card in Browse, the detail table is appended below the user grid. On longer user lists or smaller viewports, the detail is out of view and the user must scroll down manually.

**Fix:**
```js
detail.innerHTML = `...`;
detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
```

---

### U7 — No deadline badge shown on leaderboard
**File:** `index.html:62`, `app.js` (no deadline logic found)

The `#lb-deadline-badge` element exists but is never populated. Users have no visible indication of the prediction deadline, which is critical for a poule — especially the group stage lock date.

**Suggestion:** Populate this with the configured lock date for the group stage from `S.config.locked`, or add a deadline field to the config that admins can set.

---

### U8 — "0/6 filled" progress misleads on 0–0 defaults
**File:** `app.js:304-311`

`countFilled()` counts a match as filled if the prediction object exists, even if the scores are both 0. When a user sets a score to something and then resets it to 0–0, the match still counts as "filled." The match card also shows `DRAW` as the result badge for every uninitiated 0–0 match.

**Suggestion:** Consider showing a neutral/empty state badge (e.g., "—") for matches where the user hasn't explicitly interacted, rather than defaulting to "DRAW". One approach: only create a prediction entry on explicit first interaction, and show a distinct "Not set" state until then.

---

## 💡 Enhancement Suggestions

### E1 — Knockout bracket: add horizontal scroll on smaller screens
Rather than scaling to unreadable sizes, allow the bracket to scroll horizontally on tablets and mobile (see M1 fix).

### E2 — Leaderboard: add max possible points reference
Show `X / 358 pts possible` next to each user's score to give context on how far they can still rise. `MAX_POSSIBLE = 358` is already defined in `app.js:13`.

### E3 — Predictions progress: show total across all groups
The prediction view only shows per-group progress (`0/6 filled`). A global counter (e.g., "42/72 total matches filled") in the tab header or section header would help users track completion.

### E4 — Admin: confirm before locking a round
Locking a round is irreversible from the user's perspective. Add a `confirm()` dialog or a modal before `toggleLock()` sets `locked = true`, especially for the Group Stage which affects 72 predictions.

### E5 — Bonus: show points breakdown on total score
The leaderboard sub-line shows `0G · 0K · 0B pts` (Group, Knockout, Bonus). The bonus questions have variable point values (2–10 pts each). A tooltip or info icon explaining the scoring breakdown per category would help users understand their score.

### E6 — Admin result entry: highlight unset matches
Admin match result cards have empty inputs. When there are 72 matches to fill in, it's easy to miss one. Add a visual indicator (e.g. border color) on cards where both inputs are empty.

### E7 — Add a "share my poule" link
Since this is an internal competition, a shareable invite link (or just a visible URL) on the leaderboard page would make it easier for participants to invite colleagues.

---

## ✅ Things Working Correctly

1. **Google SSO flow** — modal appears for unauthenticated users, restricts to `@sam-media.com` domain, nickname step works
2. **Score adjustment buttons** — `+` increments, `−` decrements, correctly prevents going below 0
3. **Score auto-saves** — debounced 1.2s save to localStorage + backend sync triggers correctly
4. **Win/draw/loss badge** — updates in real-time as scores change without full re-render
5. **Standings table** — correctly computes predicted standings from entered scores, shows qualification coloring
6. **Auto-fill R32 from groups** — correctly derives 1st/2nd place finishers and populates the R32 bracket
7. **Bracket cascade** — picking a winner in R32 cascades through to R16, QF, SF, Final correctly
8. **Bonus questions** — all 10 questions render; team select, text, number and boolean inputs all save to state
9. **Bonus state persistence** — switching tabs and returning restores bonus answers correctly
10. **Browse search** — filters user cards by name in real-time
11. **Admin password gate** — wrong password shows toast, correct password unlocks panel
12. **Admin lock toggles** — toggle switches fire `syncRemoteConfig()` and update state correctly; render `🔒` on bracket cards when locked
13. **Admin CSV export** — generates and triggers download of `wc2026-scores.csv` correctly
14. **Toast notifications** — success, error, and info toasts all display and auto-dismiss after 3.5s
15. **Responsive layout** — header, leaderboard, group stage, bonus, browse all reflow correctly at tablet (768px) and mobile (375px)
16. **Leaderboard → Browse navigation** — clicking a leaderboard row switches to Browse and expands that user's detail view
17. **User menu dropdown** — profile photo/initials in header, dropdown shows name/email, change nickname and sign out work
18. **Nickname persistence** — nickname is stored separately in `wc26_nicknames` so it survives sign-out/re-sign-in

---

## Technical Notes

- **Backend:** Google Apps Script (`exec` endpoint) — all requests fail in local dev (expected). The app gracefully falls back to localStorage.
- **Google SSO button:** Returns 403 on localhost (domain restriction) — expected; works on production domain.
- **No external CSS/JS framework** — pure vanilla JS + CSS custom properties. No bundle step needed.
- **Data file:** `data.js` contains all 48 teams, 12 groups, 72 matches, 7 KO rounds, 10 bonus questions — well structured.
- **`MAX_POSSIBLE = 358`** is defined but never displayed to users.

---

## Priority Fix Order

| Priority | Issue | Effort |
|---|---|---|
| 1 | C1 — Admin password security | Medium |
| 2 | M1 — Mobile bracket unusable | Medium |
| 3 | M2 — Admin scroll after unlock | Trivial |
| 4 | M3 — Grammar "1 participants" | Trivial |
| 5 | M5 — Avatar initials use real name | Trivial |
| 6 | U1 — Home/away-win same color | Trivial |
| 7 | M4 — Hardcoded "95 players" | Small |
| 8 | U3 — Repeated sync error toasts | Small |
| 9 | U6 — Browse detail auto-scroll | Trivial |
| 10 | U4 — No match dates on cards | Medium |
