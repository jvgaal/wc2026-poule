# WC 2026 Poule — Deployment Guide

## What you need
- A Google account (for Sheets + Apps Script)
- A Cloudflare account (for hosting)
- The Sam Media white logo SVG (copy to `assets/SAMMEDIA_white.svg`)

---

## Step 1 — Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new blank spreadsheet**
2. Name it **WC 2026 Poule**
3. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_IS_THE_ID`**`/edit`

---

## Step 2 — Google Apps Script

1. In your spreadsheet, go to **Extensions → Apps Script**
2. Delete the default empty function
3. Paste the entire contents of `Code.gs`
4. At the top of `Code.gs`, replace:
   - `YOUR_SPREADSHEET_ID_HERE` with the ID from Step 1
   - `worldcup2026` with your chosen admin password
5. In the Apps Script editor, run the `setupSheets` function once:
   - Select `setupSheets` in the function dropdown
   - Click **Run** ▶
   - Approve the permissions when prompted
   - You should see 4 new sheets appear in your spreadsheet
6. Deploy as a Web App:
   - Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfy…/exec`)

---

## Step 3 — Update app.js

Open `app.js` and replace the two placeholder values at the top:

```js
const CONFIG = {
  BACKEND_URL:    'https://script.google.com/macros/s/YOUR_ID/exec',  // ← paste here
  ADMIN_PASSWORD: 'yourpassword',  // ← must match Code.gs ADMIN_PW
};
```

---

## Step 4 — Add Sam Media Logo

Copy the white logo file to the `assets/` folder:
- Source: Sam Media brand assets → `SAMMEDIA_white.svg`
- Destination: `worldcup-2026-poule/assets/SAMMEDIA_white.svg`

If the file isn't found, the header will fall back gracefully to text.

---

## Step 5 — Deploy to Cloudflare Pages

1. Push this folder to a **GitHub repository** (or use Cloudflare's direct upload)

   **Option A — GitHub (recommended)**
   ```bash
   cd worldcup-2026-poule
   git init && git add . && git commit -m "WC 2026 Poule"
   # Create a repo on GitHub, then:
   git remote add origin https://github.com/YOUR_ORG/wc2026-poule.git
   git push -u origin main
   ```

   **Option B — Direct upload**
   - Go to [Cloudflare Pages](https://pages.cloudflare.com)
   - Click **Create a project → Upload assets**
   - Drag and drop the `worldcup-2026-poule/` folder

2. In Cloudflare Pages:
   - Build settings: **None** (static site, no build needed)
   - Root directory: `/` (or `worldcup-2026-poule` if it's a subfolder in your repo)
   - Click **Save and Deploy**

3. Your URL will be something like `https://wc2026-poule.pages.dev`
   - Share this URL with your 95 colleagues!

---

## Running the Admin Panel

1. Open the app and sign in with any name
2. Click the **Admin** tab (visible after sign-in)
3. Enter the admin password you set in Step 2/3
4. You can now:
   - **Enter match results** → scores auto-update for everyone
   - **Lock rounds** → prevent edits once a round starts
   - **Set prizes** → update what 1st/2nd/3rd place wins
   - **Export CSV** → download the full leaderboard

---

## Scoring System

| Event | Points |
|-------|--------|
| Correct exact score | **3 pts** |
| Correct result (W/D/L) | **1 pt** |
| Knockout R32 winner correct | **2 pts** |
| Knockout R16 winner correct | **3 pts** |
| Quarter-Final winner correct | **4 pts** |
| Semi-Final winner correct | **5 pts** |
| 3rd Place match winner | **3 pts** |
| Final winner correct | **8 pts** |
| Bonus: Tournament winner | **10 pts** |
| Bonus: Runner-up | **5 pts** |
| Bonus: Golden Boot | **8 pts** |
| Bonus: Golden Ball | **5 pts** |
| Bonus: Golden Glove | **4 pts** |
| Bonus: Best Young Player | **3 pts** |
| Bonus: Total goals (±3) | **5 pts** |
| Bonus: Total goals (±8) | **3 pts** |
| Bonus: Total goals (±15) | **1 pt** |
| Bonus: First team out | **3 pts** |
| Bonus: Red card in Final | **2 pts** |
| Bonus: Top scoring team | **4 pts** |
| **Maximum possible** | **≈ 358 pts** |

---

## Prediction deadline

Predictions are locked automatically by round:
- Group Stage: **June 11, 2026** (tournament kick-off)
- Round of 32: June 28 · Round of 16: July 5
- Quarter-Finals: July 10 · Semi-Finals: July 14
- Final: July 19

Locking is controlled manually from the **Admin → Lock Rounds** panel, so you have full control.

---

## Tips

- **Update results promptly** — the leaderboard recalculates in real time for everyone
- After a round locks, remind people to fill in their **Knockout** predictions before the next lock date
- The **Browse** tab lets everyone see and compare predictions — great for office banter!
- Want to change the admin password later? Update both `Code.gs` (re-deploy) and `app.js` (re-deploy to Cloudflare)
